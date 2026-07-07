// Empty-state recovery — filtered-empty states now offer a clear next action that
// returns the user to a populated view (no dead-ends). Covers the reachable cases:
// Reports (no-match search → "clear search & filter") and Messages (no-match
// conversation search → "clear search"). DocumentsPage uses the same pattern but its
// empty state is not reachable from seed data (every status has documents).
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
const byText = (t: string) =>
  [...document.querySelectorAll('#main-content button, #main-content [role="button"], #main-content a')]
    .find((e) => (e.textContent || '').includes(t)) as HTMLElement

describe('empty-state recovery — no dead-ends on filtered-empty views', () => {
  it('reports: a no-match search shows the empty state with a clear-filters action that restores rows', async () => {
    mount({ view: 'app', route: 'reports' })
    await settle()
    await waitFor(() => expect(document.querySelector('.rep-search')).toBeTruthy())
    fireEvent.change(document.querySelector('.rep-search')!, { target: { value: 'זזזזזזזז' } })
    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו דוחות תואמים'))
    const clear = byText('ניקוי החיפוש והסינון')
    expect(clear, 'a clear-search-and-filter recovery is offered').toBeTruthy()
    fireEvent.click(clear)
    await waitFor(() => expect(document.querySelectorAll('.rep-row').length).toBeGreaterThan(0))
  })

  it('messages: a no-match conversation search shows an empty state with a clear action that restores threads', async () => {
    mount({ view: 'app', route: 'messages' })
    await settle()
    await waitFor(() => expect(document.querySelector('.msg-search-input')).toBeTruthy())
    fireEvent.change(document.querySelector('.msg-search-input')!, { target: { value: 'זזזזזזזז' } })
    await waitFor(() => expect(document.body.textContent).toContain('אין שיחות תואמות'))
    const clear = byText('ניקוי החיפוש')
    expect(clear, 'a clear-search recovery is offered').toBeTruthy()
    fireEvent.click(clear)
    await waitFor(() => expect(document.querySelectorAll('.msg-conv-row').length).toBeGreaterThan(0))
  })
})
