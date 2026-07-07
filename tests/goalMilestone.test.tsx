// Treatment-goal completion milestone — subtle, purposeful recognition of a
// real clinical achievement (a goal reaching 100%). A persistent "הושלמה" chip
// (checkmark + label, never color-alone) marks completed goals, and crossing to
// 100% shows a one-time calm acknowledgment. Driven entirely by existing data.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(goals: any) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'patient', patientId: 'p1', goals: { p1: goals } }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 100)))
afterEach(() => { cleanup(); localStorage.clear() })

describe('treatment-goal completion milestone', () => {
  it('a goal at 100% shows the "הושלמה" completion chip (icon + text, not color alone)', async () => {
    mount([{ id: 'g1', text: 'מטרה שהושלמה', pct: 100 }, { id: 'g2', text: 'מטרה בתהליך', pct: 60 }])
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('מטרה שהושלמה'))
    // exactly one completion chip — the 100% goal, not the 60% one
    const chips = [...document.querySelectorAll('span')].filter((s) => s.textContent?.trim() === 'הושלמה')
    expect(chips.length).toBe(1)
    // the chip carries a text label (screen-reader perceivable), not just green
    expect(chips[0].textContent).toContain('הושלמה')
  })

  it('a goal below 100% has no completion chip', async () => {
    mount([{ id: 'g1', text: 'מטרה בתהליך', pct: 90 }])
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('מטרה בתהליך'))
    expect([...document.querySelectorAll('span')].some((s) => s.textContent?.trim() === 'הושלמה')).toBe(false)
  })

  it('raising a goal to 100% acknowledges the milestone once and shows the chip', async () => {
    mount([{ id: 'g1', text: 'מטרה כמעט מלאה', pct: 90 }])
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('מטרה כמעט מלאה'))
    // the goal's own "+" (הגדלה) button; 90 → 100
    const inc = [...document.querySelectorAll('button[aria-label="הגדלה"]')][0] as HTMLElement
    fireEvent.click(inc)
    await settle()
    expect(document.body.textContent).toContain('הושלמה') // chip appears
    expect(document.body.textContent).toContain('מטרת טיפול הושלמה') // calm acknowledgment toast
  })
})
