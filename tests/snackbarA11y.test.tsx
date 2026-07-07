// Toast live-region politeness (WCAG 4.1.3). Severity determines whether the
// screen reader is interrupted: errors/warnings are assertive (role=alert),
// routine success/info are polite (role=status) so they don't cut off whatever
// the user is reading. Guards that the mapping stays correct.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { AppStoreProvider, useApp } from '../src/store/AppStore'
import Snackbar from '../src/components/layout/Snackbar'

let api: any
function Probe() { api = useApp(); return null }
function mount() { render(<AppStoreProvider><Probe /><Snackbar /></AppStoreProvider>) }
const bar = () => document.querySelector('[role="status"],[role="alert"]') as HTMLElement | null
afterEach(cleanup)

describe('toast severity → live-region politeness', () => {
  it('success is polite (role=status, does not interrupt)', () => {
    mount()
    act(() => api.toast('המשימה נשמרה', 'success'))
    expect(bar()?.getAttribute('role')).toBe('status')
    expect(bar()?.getAttribute('aria-live')).toBe('polite')
  })
  it('info is polite', () => {
    mount()
    act(() => api.toast('מידע', 'info'))
    expect(bar()?.getAttribute('role')).toBe('status')
    expect(bar()?.getAttribute('aria-live')).toBe('polite')
  })
  it('error is assertive (role=alert, interrupts)', () => {
    mount()
    act(() => api.toast('משהו השתבש', 'error'))
    expect(bar()?.getAttribute('role')).toBe('alert')
    expect(bar()?.getAttribute('aria-live')).toBe('assertive')
  })
  it('warning is assertive', () => {
    mount()
    act(() => api.toast('שימו לב', 'warning'))
    expect(bar()?.getAttribute('role')).toBe('alert')
    expect(bar()?.getAttribute('aria-live')).toBe('assertive')
  })
  it('the message text and dismiss control are always present + labelled', () => {
    mount()
    act(() => api.toast('הודעה', 'success'))
    expect(bar()?.textContent).toContain('הודעה')
    expect(document.querySelector('[aria-label="סגירת הודעה"]')).toBeTruthy()
  })
  it('the dismiss control is a native <button> (keyboard-operable, WCAG 2.1.1)', () => {
    // Regression guard: it was a bare <svg role="button" tabIndex=0 onClick> with
    // no key handler — focusable but not activatable by Enter/Space. A native
    // button restores keyboard operability for free.
    mount()
    act(() => api.toast('הודעה', 'success'))
    const x = document.querySelector('[aria-label="סגירת הודעה"]') as HTMLElement
    expect(x.tagName).toBe('BUTTON')
    act(() => x.click())
    expect(bar()).toBeNull()
  })
})
