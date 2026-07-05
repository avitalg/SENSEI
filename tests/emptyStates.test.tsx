// No-results / empty states across list pages. When a search matches nothing the
// list swaps to a dedicated empty state (announced via aria-live) and stops rendering
// data rows. We reach these states the real way — by typing a non-matching query into
// each page's search input — rather than via the demoEmpty flag, so the assertions
// exercise the same code path a user hits.
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

const NO_MATCH = 'זזזזזזז'

describe('list empty states — no-results on a non-matching search', () => {
  it('patients: a non-matching query shows the no-results state and hides all rows', async () => {
    mount({ view: 'app', route: 'patients' })
    await settle()

    // rows render before searching
    await waitFor(() => expect(document.querySelector('.pat-row')).toBeTruthy())

    const search = document.querySelector('.pat-search') as HTMLInputElement
    expect(search).toBeTruthy()
    fireEvent.change(search, { target: { value: NO_MATCH } })

    // the no-results empty state appears...
    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו מטופלים תואמים'))
    expect(document.body.textContent).toContain('נסו לשנות את מונחי החיפוש או לאפס את המסננים')
    // ...and no patient rows remain
    expect(document.querySelector('.pat-row')).toBeFalsy()
    // a recovery affordance to clear the search is offered
    expect(document.querySelector('.pat-clear')?.textContent).toContain('ניקוי החיפוש')
  })

  it('patients: clearing the search restores the roster', async () => {
    mount({ view: 'app', route: 'patients' })
    await settle()
    const search = document.querySelector('.pat-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: NO_MATCH } })
    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו מטופלים תואמים'))

    fireEvent.click(document.querySelector('.pat-clear') as HTMLElement)
    await waitFor(() => expect(document.querySelector('.pat-row')).toBeTruthy())
    expect(document.body.textContent).not.toContain('לא נמצאו מטופלים תואמים')
  })

  it('sessions: a non-matching query shows the no-results state naming the query', async () => {
    mount({ view: 'app', route: 'sessions' })
    await settle()

    // session rows render before searching
    await waitFor(() => expect(document.querySelector('.ses-row-head')).toBeTruthy())

    const search = document.querySelector('.ses-search') as HTMLInputElement
    expect(search).toBeTruthy()
    fireEvent.change(search, { target: { value: NO_MATCH } })

    // the no-results copy echoes the searched term and offers a clear affordance
    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו תוצאות עבור'))
    expect(document.body.textContent).toContain(NO_MATCH)
    expect(document.querySelector('.ses-row-head')).toBeFalsy()
    expect(document.querySelector('.ses-clear')?.textContent).toContain('ניקוי החיפוש')
  })
})
