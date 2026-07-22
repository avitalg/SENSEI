// The Calendar route is the full calendar workspace (components/calendar/
// CalendarHome): h1 "יומן" + toolbar/grid, WITHOUT the dashboard greeting or
// workload strip. The dashboard is a separate calm focus surface: greeting +
// workload + today's agenda, and NOT the calendar toolbar. Plus: local demo
// appointments carry a clinic room that flows into the appointment-details popup.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { buildMockScheduledAppts, MOCK_PATIENTS, reconcileMockAppts } from '../src/data/mockPatients';
import { scheduledApptToUiEvent, toCalEventDetail } from '../src/services/calendar';

const PKEY = 'sensei_session_react_v1';
const settle = () => act(() => new Promise((r) => setTimeout(r, 140)));
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
afterEach(() => { cleanup(); localStorage.clear(); });

describe('dashboard (calm focus) vs calendar (full workspace)', () => {
  it('the יומן route renders the widget full-page (h1 "יומן", toolbar) without the dashboard greeting', async () => {
    const { container } = mount({ view: 'app', route: 'calendar' });
    await settle();
    await waitFor(() => expect(container.querySelector('.calh-toolbar')).toBeTruthy());
    expect(container.querySelector('#main-content h1')?.textContent).toBe('יומן');
    // dashboard-only chrome is suppressed on the calendar page
    expect(container.textContent).not.toContain('ברוכים הבאים');
    expect(container.textContent).not.toContain('פגישות השבוע'); // the workload summary strip
  });

  it('the dashboard is a calm focus surface — greeting + workload + today agenda, not the calendar toolbar', async () => {
    const { container } = mount({ view: 'app', route: 'dashboard' });
    await settle();
    // greeting h1 (personalized), the workload strip, and today's agenda are present…
    await waitFor(() => expect(container.querySelector('[aria-label="הפגישות שלך היום"]')).toBeTruthy());
    expect(container.querySelector('#main-content h1')?.textContent).not.toBe('יומן');
    expect(container.textContent).toContain('פגישות השבוע');
    // …but the full calendar workspace toolbar lives on the Calendar route, not here
    expect(container.querySelector('.calh-toolbar')).toBeNull();
  });
});

describe('appointment room flows into the details popup', () => {
  it('clinic appointments carry a room; scheduledApptToUiEvent + toCalEventDetail preserve it', () => {
    const appts = buildMockScheduledAppts(new Date('2026-06-17T10:00:00Z'));
    const clinic = appts.find((a) => a.location);
    expect(clinic?.location, 'a clinic appointment has a room').toMatch(/קליניקה · חדר \d/);
    const patient = MOCK_PATIENTS.find((p) => p.id === clinic!.pid)!;
    const ui = scheduledApptToUiEvent(clinic!, patient.name);
    expect(ui.location).toBe(clinic!.location); // survives the UI-event mapping
    const detail = toCalEventDetail(ui, clinic!.pid);
    expect(detail.location).toBe(clinic!.location); // reaches the popup view-model
  });

  it('reconcileMockAppts backfills the room onto a cached schedule that predates it', () => {
    const cached = buildMockScheduledAppts().map((a) => { const { location: _drop, ...rest } = a; return rest as any; });
    expect(cached.every((a) => a.location == null)).toBe(true);
    const merged = reconcileMockAppts(cached);
    expect(merged.some((a) => /קליניקה · חדר \d/.test(a.location || ''))).toBe(true);
  });
});
