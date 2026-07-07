// Prep-report onward navigation (JTBD: prepping for a session). The report is the
// "prepare for the next session" hub; the natural next step is the patient's full
// history, so it links directly to the timeline instead of dead-ending at the patient.
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

describe('prep report — onward navigation to the timeline', () => {
  it('offers a full-timeline link that navigates to the patient timeline', async () => {
    mount({ view: 'app', route: 'report', patientId: 'p1' })
    await settle()
    await waitFor(() => expect(document.querySelector('.rep-timeline-link')).toBeTruthy())
    fireEvent.click(document.querySelector('.rep-timeline-link')!)
    await waitFor(() => expect(document.querySelector('#main-content h1')?.textContent).toContain('ציר זמן'))
  })
})
