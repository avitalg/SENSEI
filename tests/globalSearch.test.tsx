// Global search (app-bar combobox) — a critical everyday journey and its no-results
// empty state. Typing surfaces a live results listbox of matching patients; a query
// that matches nothing shows the "no results" empty state rather than an empty/broken
// panel. Exercises the real store + search ranking through the rendered app.
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

const search = () => document.querySelector('.shell-search-input') as HTMLInputElement

async function boot() {
  mount({ view: 'app', route: 'dashboard' })
  await settle()
  await waitFor(() => expect(search()).toBeTruthy())
}

describe('global search — results & empty state', () => {
  it('a matching query opens the results listbox with the patient as a selectable option', async () => {
    await boot()
    fireEvent.input(search(), { target: { value: 'דנה' } })
    await waitFor(() => expect(document.querySelector('#gsearch-listbox [role="option"]')).toBeTruthy())
    const listbox = document.getElementById('gsearch-listbox') as HTMLElement
    expect(listbox.textContent).toContain('דנה לוי')
  })

  it('a query that matches nothing shows the no-results empty state (not a broken panel)', async () => {
    await boot()
    fireEvent.input(search(), { target: { value: 'זזזזזזזז' } })
    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו תוצאות'))
    // and no result options are offered
    expect(document.querySelectorAll('#gsearch-listbox [role="option"]').length).toBe(0)
  })

  it('clearing the query closes the results panel', async () => {
    await boot()
    fireEvent.input(search(), { target: { value: 'דנה' } })
    await waitFor(() => expect(document.getElementById('gsearch-listbox')).toBeTruthy())
    fireEvent.input(search(), { target: { value: '' } })
    await waitFor(() => expect(document.getElementById('gsearch-listbox')).toBeFalsy())
  })
})
