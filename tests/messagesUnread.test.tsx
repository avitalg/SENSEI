// Unread-message perceivability — the unread signal must not be a colored dot
// alone (WCAG 1.4.1 Use of Color, and invisible to screen readers). Guards the
// accessible label on the indicator and the heavier preview treatment, and that
// opening a conversation clears them.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
const settle = () => act(() => new Promise((r) => setTimeout(r, 100)))
afterEach(() => { cleanup(); localStorage.clear() })

describe('messages — unread is perceivable beyond color', () => {
  it('unread rows expose an accessible indicator + heavier preview; opening clears both', async () => {
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'messages' }))
    render(<AppStoreProvider><App /></AppStoreProvider>)
    await settle()
    // seed has נועה שפירא (p5) unread
    await waitFor(() => expect(document.querySelector('[aria-label="הודעה שלא נקראה"]')).toBeTruthy())
    const dot = document.querySelector('[aria-label="הודעה שלא נקראה"]') as HTMLElement
    const row = dot.closest('.msg-conv-row') as HTMLElement
    const preview = row.querySelector('div[style*="ellipsis"][style*="font-weight"]') as HTMLElement
    expect(preview.style.fontWeight, 'unread preview is heavier').toBe('600')
    // opening the conversation marks it read: indicator gone, weight relaxes
    fireEvent.click(row)
    await settle()
    expect(document.querySelector('[aria-label="הודעה שלא נקראה"]'), 'indicator cleared after opening').toBeFalsy()
  })
})
