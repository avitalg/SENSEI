// Duplicate-merge UI journey. The dedup ALGORITHM is unit-tested in dedup.test;
// this covers the human-facing merge flow: the dedup screen surfaces the
// {יוסי מזרחי, יוסף מזרחי} cluster, "סקירת מיזוג" opens a merge dialog, confirming
// with "אישור מיזוג" removes the non-canonical duplicate, closes the dialog, and
// announces a success toast — after which only ONE of the two names remains active.
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

const dialog = () => document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement
const byText = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(t)) as HTMLElement
const toast = () => document.querySelector('[role="alert"]') as HTMLElement

const NAME_A = 'יוסי מזרחי'
const NAME_B = 'יוסף מזרחי'

async function openMergeDialog() {
  const { container } = mount({ view: 'app', route: 'dedup' })
  await settle()
  // the dedup screen surfaces the duplicate cluster with BOTH names
  await waitFor(() => expect(byText('סקירת מיזוג')).toBeTruthy())
  expect(container.textContent).toContain(NAME_A)
  expect(container.textContent).toContain(NAME_B)
  fireEvent.click(byText('סקירת מיזוג'))
  await waitFor(() => expect(dialog()).toBeTruthy())
  return container
}

describe('duplicate merge — UI journey', () => {
  it('surfaces the cluster and opens a merge dialog naming both records', async () => {
    await openMergeDialog()
    // the merge dialog is the one titled מיזוג רשומות כפולות and lists both members
    const d = dialog()
    expect(d.textContent).toContain('מיזוג רשומות כפולות')
    expect(d.textContent).toContain(NAME_A)
    expect(d.textContent).toContain(NAME_B)
    // and the confirm control is present
    expect(byText('אישור מיזוג'), 'the merge dialog offers a confirm action').toBeTruthy()
  })

  it('confirming the merge closes the dialog and announces success', async () => {
    await openMergeDialog()
    fireEvent.click(byText('אישור מיזוג'))
    // dialog closes on confirm (async) — poll for determinism under parallel load
    await waitFor(() => expect(dialog(), 'dialog closes after confirming the merge').toBeFalsy())
    // a success toast is announced (role="alert")
    await waitFor(() => expect(toast()).toBeTruthy())
    expect(toast().textContent, 'the toast confirms the records were merged').toContain('מוזגו')
  })

  it('after merging, only one of the two duplicate names remains active', async () => {
    await openMergeDialog()
    fireEvent.click(byText('אישור מיזוג'))
    await waitFor(() => expect(dialog()).toBeFalsy())
    // navigate to the patients list via the dedup breadcrumb and assert exactly
    // one duplicate name survives
    const crumb = [...document.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'מטופלים') as HTMLElement
    fireEvent.click(crumb)
    await settle()
    await waitFor(() => {
      const t = document.querySelector('#main-content')?.textContent || ''
      const hasA = t.includes(NAME_A)
      const hasB = t.includes(NAME_B)
      // exactly one of the two duplicate records remains active in the list
      expect(hasA !== hasB, 'exactly one of the duplicate names remains active').toBe(true)
    })
  })
})
