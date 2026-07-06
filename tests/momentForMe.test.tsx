// "רגע בשבילי" (Moment for Me) v1 — the Mativ-guidelines P0 wellbeing feature.
// Locks the binding design constraints: always optional (dismiss persists),
// fully removable (settings toggle), never trapping (Escape + early finish),
// and accessible (dialog semantics + polite phase cues).
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

const card = () => [...document.querySelectorAll('button')].find((b) => b.textContent === 'תרגיל נשימה של דקה')
const dialog = () => document.querySelector('[role="dialog"][aria-label="תרגיל נשימה של דקה"]')

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
    // persisted: a fresh mount (same storage) must not resurface the suggestion
    await act(() => new Promise((r) => setTimeout(r, 700))) // ride out the 500ms persist debounce
    cleanup()
    render(<AppStoreProvider><App /></AppStoreProvider>)
    await settle()
    expect(card(), 'dismissal is remembered').toBeFalsy()
  })

  it('the settings toggle disables the feature and re-enabling clears a dismissal', async () => {
    mount({ momentDismissed: true, route: 'settings', settingsTab: 'notifications' })
    await settle()
    const toggle = () => document.querySelector('[aria-label="הצעות רגע בשבילי"]') as HTMLElement
    await waitFor(() => expect(toggle()).toBeTruthy())
    expect(toggle().getAttribute('aria-checked')).toBe('true')
    fireEvent.click(toggle()) // off
    await waitFor(() => expect(toggle().getAttribute('aria-checked')).toBe('false'))
    fireEvent.click(toggle()) // on again — must also clear the old dismissal
    await waitFor(() => expect(toggle().getAttribute('aria-checked')).toBe('true'))
    // back on the dashboard (hash navigation) the card is visible again
    act(() => { window.location.hash = '#/dashboard'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    await settle()
    await waitFor(() => expect(card(), 're-enabling resurfaces the suggestion').toBeTruthy())
  })

  it('the breathing exercise opens as an accessible dialog with polite phase cues and never traps', async () => {
    vi.useFakeTimers()
    try {
      mount({})
      await act(() => vi.advanceTimersByTimeAsync(100))
      fireEvent.click(card() as HTMLElement)
      await act(() => vi.advanceTimersByTimeAsync(50))
      expect(dialog(), 'dialog with aria-modal semantics').toBeTruthy()
      expect(dialog()!.getAttribute('aria-modal')).toBe('true')
      expect(document.body.textContent).toContain('שאיפה…') // first phase cue
      await act(() => vi.advanceTimersByTimeAsync(4000))
      expect(document.body.textContent).toContain('נשיפה…') // rhythm alternates
      // never traps: Escape closes mid-exercise via the global cascade
      fireEvent.keyDown(document.body, { key: 'Escape' })
      await act(() => vi.advanceTimersByTimeAsync(50))
      expect(dialog(), 'Escape closes the exercise immediately').toBeFalsy()
    } finally { vi.useRealTimers() }
  })

  it('after 60 seconds the exercise completes with a calm closing message', async () => {
    vi.useFakeTimers()
    try {
      mount({})
      await act(() => vi.advanceTimersByTimeAsync(100))
      fireEvent.click(card() as HTMLElement)
      await act(() => vi.advanceTimersByTimeAsync(61000))
      expect(document.body.textContent).toContain('הדקה הסתיימה')
      fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent === 'חזרה לעבודה') as HTMLElement)
      await act(() => vi.advanceTimersByTimeAsync(50))
      expect(dialog()).toBeFalsy()
    } finally { vi.useRealTimers() }
  })
})
