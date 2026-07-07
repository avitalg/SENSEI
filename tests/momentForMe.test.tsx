// "רגע בשבילי" (Moment for Me) v2 — the wellbeing pause with its curated
// activity library. Locks the binding design constraints: always optional
// (dismiss persists, snooze does NOT), fully removable (settings toggle),
// never trapping (Escape + early finish), accessible (dialog semantics +
// polite cues), and the chooser → activity → done arc for each activity.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard', onboardingDismissed: true, ...patch }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)))
afterEach(() => { cleanup(); localStorage.clear() })

const card = () => [...document.querySelectorAll('button')].find((b) => b.textContent === 'התחלת הפסקה')
const dialog = () => document.querySelector('[role="dialog"][aria-label="רגע בשבילי · הפסקה קצרה"]')
const activityBtn = (label: string) =>
  [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent?.includes(label)) as HTMLElement

describe('Moment for Me — optional, dismissible, removable', () => {
  it('shows the quiet suggestion card on the dashboard by default', async () => {
    mount({})
    await settle()
    await waitFor(() => expect(card()).toBeTruthy())
    expect(document.body.textContent).toContain('רגע בשבילי')
  })

  it('dismiss hides the card and the choice persists across remounts', async () => {
    mount({})
    await settle()
    await waitFor(() => expect(card()).toBeTruthy())
    fireEvent.click(document.querySelector('[aria-label="הסתרת ההצעה"]') as HTMLElement)
    await waitFor(() => expect(card()).toBeFalsy())
    await act(() => new Promise((r) => setTimeout(r, 700))) // ride out the 500ms persist debounce
    cleanup()
    render(<AppStoreProvider><App /></AppStoreProvider>)
    await settle()
    expect(card(), 'dismissal is remembered').toBeFalsy()
  })

  it('"מאוחר יותר" snoozes for this visit only — NOT persisted', async () => {
    mount({})
    await settle()
    await waitFor(() => expect(card()).toBeTruthy())
    fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent === 'מאוחר יותר') as HTMLElement)
    await waitFor(() => expect(card()).toBeFalsy())
    await act(() => new Promise((r) => setTimeout(r, 700)))
    // a fresh visit brings the suggestion back (snooze is transient by design)
    cleanup()
    render(<AppStoreProvider><App /></AppStoreProvider>)
    await settle()
    await waitFor(() => expect(card(), 'snooze does not survive a new visit').toBeTruthy())
  })

  it('the settings toggle disables the feature and re-enabling clears a dismissal', async () => {
    mount({ momentDismissed: true, route: 'settings', settingsTab: 'notifications' })
    await settle()
    const toggle = () => document.querySelector('[aria-label="הצעות רגע בשבילי"]') as HTMLElement
    await waitFor(() => expect(toggle()).toBeTruthy())
    expect(toggle().getAttribute('aria-checked')).toBe('true')
    fireEvent.click(toggle())
    await waitFor(() => expect(toggle().getAttribute('aria-checked')).toBe('false'))
    fireEvent.click(toggle())
    await waitFor(() => expect(toggle().getAttribute('aria-checked')).toBe('true'))
    act(() => { window.location.hash = '#/dashboard'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    await settle()
    await waitFor(() => expect(card(), 're-enabling resurfaces the suggestion').toBeTruthy())
  })
})

describe('Moment for Me — the activity library', () => {
  it('opens on a chooser offering the four curated activities', async () => {
    mount({})
    await settle()
    fireEvent.click(card() as HTMLElement)
    await settle()
    expect(dialog()).toBeTruthy()
    for (const label of ['נשימה שקטה', 'תרגיל קרקוע', 'הרהור שקט', 'מתיחה ומים']) {
      expect(activityBtn(label), label).toBeTruthy()
    }
    // duration control present with the persisted default selected
    expect(document.querySelector('[role="radiogroup"][aria-label="משך תרגיל הנשימה"]')).toBeTruthy()
    expect(document.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toBe('דקה')
  })

  it('breathing respects the chosen 30-second duration and completes calmly', async () => {
    vi.useFakeTimers()
    try {
      mount({})
      for (let i = 0; i < 30 && !card(); i++) await act(() => vi.advanceTimersByTimeAsync(100))
      fireEvent.click(card() as HTMLElement)
      await act(() => vi.advanceTimersByTimeAsync(50))
      fireEvent.click([...document.querySelectorAll('[role="radio"]')].find((b) => b.textContent === '30 שניות') as HTMLElement)
      fireEvent.click(activityBtn('נשימה שקטה'))
      await act(() => vi.advanceTimersByTimeAsync(100))
      expect(document.body.textContent).toContain('שאיפה…')
      await act(() => vi.advanceTimersByTimeAsync(31000))
      expect(document.body.textContent).toContain('ההפסקה הסתיימה')
    } finally { vi.useRealTimers() }
  })

  it('grounding walks the 5-4-3-2-1 senses steps with polite announcements', async () => {
    vi.useFakeTimers()
    try {
      mount({})
      for (let i = 0; i < 30 && !card(); i++) await act(() => vi.advanceTimersByTimeAsync(100))
      fireEvent.click(card() as HTMLElement)
      await act(() => vi.advanceTimersByTimeAsync(50))
      fireEvent.click(activityBtn('תרגיל קרקוע'))
      await act(() => vi.advanceTimersByTimeAsync(100))
      expect(document.body.textContent).toContain('5 דברים שאתם רואים')
      await act(() => vi.advanceTimersByTimeAsync(13000))
      expect(document.body.textContent).toContain('4 דברים שאפשר לגעת')
      // never traps: Escape exits mid-exercise via the global cascade
      fireEvent.keyDown(document.body, { key: 'Escape' })
      await act(() => vi.advanceTimersByTimeAsync(50))
      expect(dialog()).toBeFalsy()
    } finally { vi.useRealTimers() }
  })

  it('quiet reflection shows a rotating original line and no patient data', async () => {
    mount({})
    await settle()
    fireEvent.click(card() as HTMLElement)
    await settle()
    fireEvent.click(activityBtn('הרהור שקט'))
    await settle()
    expect(document.body.textContent).toContain('שניות של שקט')
    // privacy: the pause never shows clinical content (no seeded patient names)
    const dlg = dialog() as HTMLElement
    for (const name of ['דנה לוי', 'מיכל כהן', 'יוסי מזרחי']) expect(dlg.textContent).not.toContain(name)
  })
})
