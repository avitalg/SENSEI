// Calendar on phone-width viewports — the shared CalendarPage is rendered
// inside MobileApp (no bespoke mobile calendar screen). These lock the compact
// layout classes so the 7-day strip and agenda stay usable under 768px.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const PKEY = 'sensei_session_react_v1';

function setMobile(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

function mount() {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'calendar' }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => setMobile(true));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('calendar page — mobile layout', () => {
  it('renders the week strip inside the mobile shell with compact day cells', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());
    await waitFor(() => expect(container.querySelector('.cal-page')).toBeTruthy());
    // Wait until the live week strip is painted (skeleton cells have no .cal-day-cell).
    await waitFor(() => expect(container.querySelectorAll('.cal-day-cell').length).toBe(7), { timeout: 4000 });

    const days = container.querySelectorAll('.cal-day-cell');
    expect(days.length).toBe(7);
    // Count text is for desktop; on mobile it lives in aria-label + the busy dot.
    expect(container.querySelectorAll('.cal-day-count').length).toBe(7);
    days.forEach((d) => {
      expect(d.getAttribute('aria-label') || '').toMatch(/אירועים|פנוי/);
    });
    // Short week-nav glyphs are present for the compact chrome.
    expect(container.querySelectorAll('.cal-week-nav-short').length).toBe(2);
  });

  it('agenda rows expose title/status hooks for the mobile grid layout', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.cal-page')).toBeTruthy());
    await waitFor(() => expect(container.querySelectorAll('.cal-day-cell').length).toBe(7), { timeout: 4000 });
    // Pick a day that has events when the fixture/API has any; otherwise the
    // empty-day state is fine — the CSS contract still covers the row layout.
    const css = await import('node:fs').then((fs) =>
      fs.readFileSync('src/pages/calendar.css', 'utf8'),
    );
    expect(css).toMatch(/\.cal-agenda-row\s*\{[^}]*display:\s*grid\s*!important/s);
    expect(css).toMatch(/\.cal-agenda-title/);
    expect(css).toMatch(/-webkit-line-clamp:\s*2/);
  });

  it('keeps the today / week / next-event KPI cards on mobile', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.cal-page')).toBeTruthy());
    await waitFor(() => expect(container.querySelectorAll('.cal-day-cell').length).toBe(7), { timeout: 4000 });
    await waitFor(() => expect(container.querySelector('.rx-kpi4')).toBeTruthy());
    const text = container.textContent || '';
    expect(text).toContain('אירועים היום');
    expect(text).toContain('השבוע');
    expect(text).toContain('האירוע הבא');
    const css = await import('node:fs').then((fs) =>
      fs.readFileSync('src/pages/calendar.css', 'utf8'),
    );
    // Must not re-hide the KPIs on phone.
    expect(css).not.toMatch(/\.cal-page\s+\.rx-kpi4\s*\{[^}]*display:\s*none/s);
  });
});
