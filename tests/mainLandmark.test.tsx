// A11y invariant (SPA orientation, WCAG 2.4.1/2.4.6 spirit): on client-side
// navigation the store focuses #main-content, so the main landmark's accessible
// name must be the current page title — otherwise screen-reader users hear a
// generic "main content" instead of where they landed. Locks the name to the
// route title and that it updates on navigation.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { AppStoreProvider, useApp } from '../src/store/AppStore'
import App from '../src/App'
import { ROUTE_TITLES } from '../src/nav/navConfig'

const PKEY = 'sensei_session_react_v1'
let api: any
function Probe() { api = useApp(); return null }
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }))
  return render(<AppStoreProvider><Probe /><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)))
const main = () => document.getElementById('main-content') as HTMLElement
afterEach(() => { cleanup(); localStorage.clear() })

describe('main landmark is named after the current page (SR route orientation)', () => {
  it('labels #main-content with the route title on load', async () => {
    mount({ route: 'analytics' })
    await settle()
    expect(main().getAttribute('aria-label')).toBe(ROUTE_TITLES.analytics)
  })

  it('updates the label when the route changes', async () => {
    mount({ route: 'dashboard' })
    await settle()
    expect(main().getAttribute('aria-label')).toBe(ROUTE_TITLES.dashboard)
    act(() => api.navigate('outcomes'))
    await settle()
    expect(main().getAttribute('aria-label')).toBe(ROUTE_TITLES.outcomes)
  })
})
