// Onboarding checklist truthfulness — the getting-started steps must reflect
// what the user actually did. Previously steps 3 (upload) and 4 (approve an AI
// summary) were hardcoded "not done": completing the suggested action was never
// acknowledged and the banner sat at "2 מתוך 4" forever — a broken feedback
// loop at the exact moment of first success.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard', ...patch }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 100)))
afterEach(() => { cleanup(); localStorage.clear() })

describe('onboarding progress reflects real actions', () => {
  it('an approved AI summary marks step 4 done (3 מתוך 4)', async () => {
    mount({ summaryApproved: { p3: '30.06.2026' } })
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('3 מתוך 4 הושלמו'))
  })

  it('a completed upload marks step 3 done, and both together complete the checklist', async () => {
    mount({ hasUploaded: true, summaryApproved: { p3: '30.06.2026' } })
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('4 מתוך 4 הושלמו'))
  })

  it('finishing a real upload sets the persisted hasUploaded flag', async () => {
    mount({ route: 'upload' })
    await settle()
    await waitFor(() => expect(document.querySelector('[style*="dashed"]')).toBeTruthy())
    const dz = document.querySelector('[style*="dashed"]') as HTMLElement
    fireEvent.drop(dz, { dataTransfer: { files: [new File(['x'], 'session.mp3', { type: 'audio/mpeg' })] } })
    // ride the simulated pipeline to success (380ms ticks, ~8 needed), then the
    // 500ms debounced persister
    await waitFor(() => expect(document.body.textContent).toContain('ההקלטה עובדה בהצלחה'), { timeout: 10000 })
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PKEY) || '{}').hasUploaded).toBe(true), { timeout: 3000 })
  }, 15000)
})
