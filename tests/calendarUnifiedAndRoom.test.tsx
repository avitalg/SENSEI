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
  it('an appointment room is preserved end-to-end when present (user-scheduled)', () => {
    // The repository dataset carries no rooms, so the derived schedule has none —
    // but a room a therapist adds must survive the mapping to the details popup.
    const appt = { id: 'u1', pid: MOCK_PATIENTS[0].id, date: '2026-06-17', time: '10:00', dur: 50, description: 'פגישה', location: 'קליניקה · חדר 2' };
    const ui = scheduledApptToUiEvent(appt as any, MOCK_PATIENTS[0].name);
    expect(ui.location).toBe(appt.location); // survives the UI-event mapping
    const detail = toCalEventDetail(ui, appt.pid);
    expect(detail.location).toBe(appt.location); // reaches the popup view-model
    // the derived schedule itself never invents a room
    expect(buildMockScheduledAppts().every((a) => a.location == null)).toBe(true);
  });

  it('reconcileMockAppts drops retired-seed appointments from a cached schedule', () => {
    const cached = [{ id: 'mock-appt-1', pid: 'p1', date: '2026-06-17', time: '09:00', dur: 50, description: 'x' } as any, ...buildMockScheduledAppts()];
    const merged = reconcileMockAppts(cached);
    expect(merged.some((a) => a.pid === 'p1')).toBe(false);
    expect(merged.length).toBe(cached.length - 1);
  });
});
