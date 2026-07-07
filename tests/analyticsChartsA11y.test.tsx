// Analytics charts — screen-reader summaries. The div-based bar charts would
// otherwise expose a loose run of numbers with no framing (verified via the
// accessibility tree). Each chart is a role="img" with a data-derived aria-label
// so assistive tech hears one coherent sentence. Guards that the summaries exist
// and stay in sync with the rendered data.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)))
afterEach(() => { cleanup(); localStorage.clear() })

async function openAnalytics() {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'analytics' }))
  render(<AppStoreProvider><App /></AppStoreProvider>)
  await settle()
  await waitFor(() => expect(document.querySelector('h1')?.textContent).toContain('תובנות'))
}
const imgs = () => [...document.querySelectorAll('#main-content [role="img"]')].map((e) => e.getAttribute('aria-label') || '')

describe('analytics charts expose coherent screen-reader summaries', () => {
  it('all three charts are role="img" with a data-bearing aria-label', async () => {
    await openAnalytics()
    const labels = imgs()
    expect(labels.length, 'three summarized charts').toBe(3)
    const sessions = labels.find((l) => l.includes('מספר פגישות מעובדות'))
    const risk = labels.find((l) => l.includes('התפלגות רמות סיכון'))
    const topics = labels.find((l) => l.includes('נושאים נפוצים'))
    expect(sessions, 'sessions summary present').toBeTruthy()
    expect(risk, 'risk summary present').toBeTruthy()
    expect(topics, 'topics summary present').toBeTruthy()
    // the summary carries the actual data, not just a title
    expect(sessions).toContain('38') // the peak week value
    expect(sessions).toMatch(/מגמת עלייה/) // trend derived from the data
    expect(topics).toContain('חרדה ולחץ 24') // top topic + count
    expect(risk).toMatch(/סיכון גבוה \d+ \(\d+%\)/) // level, count, percentage
  })

  it('the risk summary tracks the seeded patient mix (not a hardcoded string)', async () => {
    await openAnalytics()
    const risk = imgs().find((l) => l.includes('התפלגות רמות סיכון')) || ''
    // seed: 2 high-risk patients of 9 → 22%
    expect(risk).toContain('סיכון גבוה 2 (22%)')
  })
})
