// Patients list — in-page search now highlights the matched term in the row (name +
// focus) via the app's canonical `hlParts`, matching the global search / palette /
// transcript. Makes it obvious *why* a patient matched (esp. topic/focus searches).
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

const search = () => document.querySelector('.pat-search') as HTMLInputElement
// a hlParts highlight = a leaf span whose text is exactly the query and whose inline
// style carries the --selection token
const highlights = (q: string) =>
  [...document.querySelectorAll('#main-content span')].filter(
    (s) => s.textContent === q && s.children.length === 0 && (s.getAttribute('style') || '').includes('--selection'),
  )

async function openPatients() {
  mount({ view: 'app', route: 'patients' })
  await settle()
  await waitFor(() => expect(search()).toBeTruthy())
}

describe('patients list — search match highlighting', () => {
  it('highlights a matched topic term (focus) in the result row', async () => {
    await openPatients()
    fireEvent.input(search(), { target: { value: 'חרדה' } }) // matches p1's focus
    await waitFor(() => expect(highlights('חרדה').length).toBeGreaterThan(0))
  })

  it('highlights a matched name and removes highlighting when the query is cleared', async () => {
    await openPatients()
    fireEvent.input(search(), { target: { value: 'דנה' } }) // matches "דנה לוי"
    await waitFor(() => expect(highlights('דנה').length).toBeGreaterThan(0))
    fireEvent.input(search(), { target: { value: '' } })
    await waitFor(() => expect(highlights('דנה').length).toBe(0))
  })
})
