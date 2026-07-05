// Transcript viewer — rendering, in-transcript search filtering, and match highlighting.
// The transcript search now reuses the app's canonical `hlParts` highlighter (as the
// global search / palette / search page do), so a matched term is both filtered to and
// visually highlighted — consistent search UX across the whole app. Regression guard for
// that behaviour.
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

const searchBox = () => document.querySelector('.trs-search') as HTMLInputElement
const bubbles = () => document.querySelectorAll('#main-content [style*="max-width: 76%"]')
// a highlighted match = a span whose own text is exactly the query (hlParts wraps the match)
const highlightsOf = (q: string) =>
  [...document.querySelectorAll('#main-content span')].filter((s) => s.textContent === q && s.children.length === 0)

async function openTranscript() {
  mount({ view: 'app', route: 'transcript', patientId: 'p1' })
  await settle()
  await waitFor(() => expect(searchBox()).toBeTruthy())
}

describe('transcript viewer — rendering, search filter & highlight', () => {
  it('renders the two-sided transcript (speaker labels + timestamps)', async () => {
    await openTranscript()
    expect(bubbles().length, 'multiple transcript lines render').toBeGreaterThan(1)
    // gendered speaker label + a timestamp are present
    expect(document.body.textContent).toMatch(/\d\d:\d\d/) // e.g. 00:12
  })

  it('a query filters to matching lines and highlights the matched term', async () => {
    await openTranscript()
    const all = bubbles().length
    fireEvent.change(searchBox(), { target: { value: 'הצגה' } })
    await waitFor(() => expect(highlightsOf('הצגה').length).toBeGreaterThan(0))
    // filtered to fewer lines than the full transcript, and every shown match is highlighted
    expect(bubbles().length).toBeLessThan(all)
    const hl = highlightsOf('הצגה')[0] as HTMLElement
    // assert on the inline style tokens (jsdom does not resolve var() in getComputedStyle;
    // the real browser renders var(--selection) + bold — verified in preview)
    expect(hl.style.fontWeight, 'match is bolded').toBe('700')
    expect(hl.style.background, 'match carries the selection highlight token').toContain('--selection')
  })

  it('clearing the query restores all lines and removes highlighting', async () => {
    await openTranscript()
    const all = bubbles().length
    fireEvent.change(searchBox(), { target: { value: 'הצגה' } })
    await waitFor(() => expect(bubbles().length).toBeLessThan(all))
    fireEvent.change(searchBox(), { target: { value: '' } })
    await waitFor(() => expect(bubbles().length).toBe(all))
    expect(highlightsOf('הצגה').length, 'no highlight spans once the query is cleared').toBe(0)
  })
})
