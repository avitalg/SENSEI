// Calendar network discipline — in the client-only build (no VITE_API_BASE_URL)
// the calendar must render its integration fixture WITHOUT firing any request:
// the previous implementation hit /api/integrations/google-calendar/events on
// every visit and refresh, producing a guaranteed 404 (console noise + a wasted
// round trip) and bypassing the canonical apiClient's isApiConfigured() gate.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

describe('calendar — client-only build never fires the doomed integration fetch', () => {
  const fetchSpy = vi.fn()
  beforeEach(() => { vi.stubGlobal('fetch', fetchSpy) })
  afterEach(() => { vi.unstubAllGlobals(); cleanup(); localStorage.clear() })

  it('renders calendar events from the fixture with zero network requests', async () => {
    localStorage.setItem('sensei_session_react_v1', JSON.stringify({ view: 'app', route: 'calendar' }))
    const { container } = render(
      <AppStoreProvider>
        <App />
      </AppStoreProvider>,
    )
    await waitFor(() => expect(container.querySelector('h1')?.textContent).toContain('יומן'))
    // let the calendar's async load settle to its ready state (fixture events render)
    await waitFor(() => expect(container.textContent).toMatch(/פגישה שבועית|פגישת מעקב/), { timeout: 4000 })
    const calCalls = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('google-calendar'))
    expect(calCalls, 'no request may target the nonexistent integration endpoint').toHaveLength(0)
    expect(fetchSpy, 'the client-only calendar makes no network calls at all').not.toHaveBeenCalled()
  }, 15000)
})
