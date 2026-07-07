// Pager UI navigation — the rendered click-through of the shared pagination bar
// (the pager ALGORITHM is unit-tested in pager.test). With 9 seeded patients and a
// page size of 6, the patients roster paginates into 2 pages (6 + 3). We drive the
// real next/prev controls and assert the visible patient set actually changes and
// then returns, so the wiring between the pager view model and the rendered rows holds.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)))
afterEach(() => { cleanup(); localStorage.clear() })

// Each patient row carries exactly one delete button — a reliable per-row marker.
const deleteBtns = () => [...document.querySelectorAll('[aria-label="מחיקת מטופל"]')]
// A row's name is exposed as the aria-label of its open button (avatar + name button).
const nextBtn = () => document.querySelector('[aria-label="עמוד הבא"]') as HTMLButtonElement
const prevBtn = () => document.querySelector('[aria-label="עמוד קודם"]') as HTMLButtonElement

// The visible patient names: the delete button's row. We read each row's name button.
function visibleNames(): string[] {
  return [...document.querySelectorAll('.pat-row')].map((row) => {
    // the first button in the row is the open button; its aria-label is the patient name
    const openBtn = row.querySelector('button[aria-label]') as HTMLElement
    return (openBtn?.getAttribute('aria-label') || '').trim()
  }).filter(Boolean)
}

async function mountPatients() {
  mount({ view: 'app', route: 'patients' })
  await settle()
  await waitFor(() => expect(deleteBtns().length).toBeGreaterThan(0))
}

describe('pager interaction — patients roster paginates by click', () => {
  it('page 1 renders exactly 6 patient rows and shows the next-page control', async () => {
    await mountPatients()
    await waitFor(() => expect(deleteBtns().length).toBe(6))
    // 9 patients / size 6 → more than one page, so next is available
    expect(nextBtn(), 'a next-page control is rendered').toBeTruthy()
    expect(nextBtn().disabled, 'next is enabled on page 1').toBe(false)
    expect(prevBtn().disabled, 'previous is disabled on page 1').toBe(true)
  })

  it('clicking next shows the remaining 3 patients (a different, non-overlapping set)', async () => {
    await mountPatients()
    await waitFor(() => expect(deleteBtns().length).toBe(6))
    const page1 = visibleNames()
    expect(page1.length).toBe(6)

    fireEvent.click(nextBtn())
    // page 2 holds the remaining 3 of 9 patients
    await waitFor(() => expect(deleteBtns().length).toBe(3))
    const page2 = visibleNames()
    expect(page2.length).toBe(3)

    // the two pages are disjoint — nobody on page 1 appears on page 2
    const overlap = page2.filter((n) => page1.includes(n))
    expect(overlap, 'page 2 shows patients not seen on page 1').toEqual([])

    // and together they cover all 9 seeded patients
    expect(new Set([...page1, ...page2]).size).toBe(9)
  })

  it('clicking previous returns to page 1 with its original set', async () => {
    await mountPatients()
    await waitFor(() => expect(deleteBtns().length).toBe(6))
    const page1 = visibleNames()

    fireEvent.click(nextBtn())
    await waitFor(() => expect(deleteBtns().length).toBe(3))

    fireEvent.click(prevBtn())
    await waitFor(() => expect(deleteBtns().length).toBe(6))
    const back = visibleNames()

    // same set of names as the original page 1 (order-independent)
    expect(new Set(back)).toEqual(new Set(page1))
    // and we are truly back on page 1 (previous disabled again)
    expect(prevBtn().disabled).toBe(true)
  })
})
