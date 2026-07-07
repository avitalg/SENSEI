// Search-match highlighting on the remaining list pages (sessions + resources), using
// the app's canonical hlParts — completes the consistency started for the patients list
// and the transcript/global search: every search surface now highlights the matched term.
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

// a hlParts highlight = a leaf span whose text is exactly the query, styled with --selection
const highlights = (q: string) =>
  [...document.querySelectorAll('#main-content span')].filter(
    (s) => s.textContent === q && s.children.length === 0 && (s.getAttribute('style') || '').includes('--selection'),
  )

describe('list search highlighting — sessions & resources', () => {
  it('sessions search highlights the matched term (patient name / topic) in the row', async () => {
    mount({ view: 'app', route: 'sessions' })
    await settle()
    await waitFor(() => expect(document.querySelector('.ses-search')).toBeTruthy())
    fireEvent.input(document.querySelector('.ses-search')!, { target: { value: 'דנה' } })
    await waitFor(() => expect(highlights('דנה').length).toBeGreaterThan(0))
  })

  it('resources search highlights the matched term in the title/description', async () => {
    mount({ view: 'app', route: 'resources' })
    await settle()
    await waitFor(() => expect(document.querySelector('.res-search-input')).toBeTruthy())
    fireEvent.input(document.querySelector('.res-search-input')!, { target: { value: 'CBT' } })
    await waitFor(() => expect(highlights('CBT').length).toBeGreaterThan(0))
  })
})
