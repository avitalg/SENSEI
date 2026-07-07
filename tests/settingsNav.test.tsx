// Settings tab rail — accessibility contract. The rail was previously a set of
// bare <a onClick> with no role/tabIndex/keyboard handler/active-state, i.e.
// unreachable and unoperable by keyboard and silent to screen readers. This locks
// the fix: a labelled <nav> landmark whose tabs are keyboard-operable
// (role=button, focusable, Enter/Space activate) and announce the active pane
// (aria-current) and the locked pane (aria-disabled).
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)))
afterEach(() => { cleanup(); localStorage.clear() })

const rail = () => document.querySelector('nav[aria-label="ניווט הגדרות"]') as HTMLElement
const tabs = () => [...(rail()?.querySelectorAll('[role="button"]') || [])] as HTMLElement[]
const tabByText = (t: string) => tabs().find((el) => el.textContent?.includes(t)) as HTMLElement

describe('settings tab rail — keyboard + screen-reader contract', () => {
  it('is a labelled navigation landmark with focusable tabs', async () => {
    mount({ route: 'settings', settingsTab: 'profile' })
    await settle()
    expect(rail()).toBeTruthy()
    const list = tabs()
    expect(list.length).toBeGreaterThanOrEqual(6)
    // every tab is reachable by keyboard
    expect(list.every((el) => el.getAttribute('tabindex') === '0')).toBe(true)
  })

  it('marks the active pane with aria-current="page" and moves it on keyboard activation', async () => {
    mount({ route: 'settings', settingsTab: 'profile' })
    await settle()
    expect(tabByText('פרופיל').getAttribute('aria-current')).toBe('page')
    expect(tabByText('חשבון').getAttribute('aria-current')).toBeNull()
    // Enter activates the Account tab (no mouse) → aria-current follows
    act(() => { fireEvent.keyDown(tabByText('חשבון'), { key: 'Enter' }) })
    await settle()
    expect(tabByText('חשבון').getAttribute('aria-current')).toBe('page')
    expect(tabByText('פרופיל').getAttribute('aria-current')).toBeNull()
  })

  it('exposes the locked language tab as aria-disabled', async () => {
    mount({ route: 'settings', settingsTab: 'profile' })
    await settle()
    expect(tabByText('שפה').getAttribute('aria-disabled')).toBe('true')
  })
})
