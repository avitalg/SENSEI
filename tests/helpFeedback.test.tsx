// In-app feedback / issue-report action on the Help screen. Users must be able
// to report a problem or suggest an improvement quickly, with useful context
// pre-filled, without composing an email from scratch or leaving the app.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
const settle = () => act(() => new Promise((r) => setTimeout(r, 100)))
afterEach(() => { cleanup(); localStorage.clear() })

async function openHelp() {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'help' }))
  render(<AppStoreProvider><App /></AppStoreProvider>)
  await settle()
  await waitFor(() => expect(document.querySelector('h1')?.textContent).toContain('עזרה'))
}

describe('help — in-app feedback / issue report', () => {
  it('exposes a one-click feedback action that opens a pre-filled mail draft', async () => {
    await openHelp()
    const btn = [...document.querySelectorAll('a')].find((a) => a.textContent?.includes('שליחת משוב או דיווח')) as HTMLAnchorElement
    expect(btn, 'feedback action present').toBeTruthy()
    const href = decodeURIComponent(btn.getAttribute('href') || '')
    expect(href.startsWith('mailto:')).toBe(true)
    expect(href).toContain('support@sensei.co.il')        // addressed to support
    expect(href).toContain('subject=')                     // has a subject
    expect(href).toContain('סוג הפנייה')                   // structured body: issue type
    expect(href).toContain('תיאור')                        // ...and a description prompt
  })

  it('keeps the plain support email available as a secondary path', async () => {
    await openHelp()
    const mails = [...document.querySelectorAll('a[href^="mailto:support@sensei.co.il"]')]
    expect(mails.length).toBeGreaterThanOrEqual(1)
  })
})
