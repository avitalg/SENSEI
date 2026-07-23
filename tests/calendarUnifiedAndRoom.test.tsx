// The Calendar route is the full calendar workspace (components/calendar/
// CalendarHome): h1 "יומן" + toolbar/grid, WITHOUT the dashboard greeting or
// workload strip. The dashboard makes that same calendar the primary planning
// surface while retaining the focus/workload sections below it. Plus: local demo
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

describe('dashboard and calendar share the canonical workspace', () => {
  it('the יומן route renders the widget full-page (h1 "יומן", toolbar) without the dashboard greeting', async () => {
    const { container } = mount({ view: 'app', route: 'calendar' });
    await settle();
    await waitFor(() => expect(container.querySelector('.calh-toolbar')).toBeTruthy());
    expect(container.querySelector('#main-content h1')?.textContent).toBe('יומן');
    // dashboard-only chrome is suppressed on the calendar page
    expect(container.textContent).not.toContain('ברוכים הבאים');
    expect(container.textContent).not.toContain('פגישות השבוע'); // the workload summary strip
  });

  it('the dashboard leads with the full calendar and retains workload + today agenda', async () => {
    const { container } = mount({ view: 'app', route: 'dashboard' });
    await settle();
    // The calendar is the primary home experience; existing contextual modules
    // remain available below it.
    await waitFor(() => expect(container.querySelector('[aria-label="הפגישות שלך היום"]')).toBeTruthy());
    expect(container.textContent).toContain('לוח השנה שלי');
    expect(container.textContent).toContain('פגישות השבוע');
    expect(container.querySelector('.calh-toolbar')).toBeTruthy();
    for (const label of ['חודש', 'שבוע', 'יום', 'סדר יום']) {
      expect([...container.querySelectorAll('button')].some((b) => b.textContent?.trim() === label)).toBe(true);
    }
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

  it('a meeting location shows on the calendar block itself (spec: no click needed)', async () => {
    // Schedule an appointment WITH a room in the current week, then open the
    // week view — the room text must appear on the event block, not only in
    // the details popup.
    const d = new Date();
    const dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const appt = { id: 'room-1', pid: MOCK_PATIENTS[0].id, date: dateKey, time: '09:00', dur: 60, description: 'פגישה', location: 'קליניקה · חדר 2' };
    const { container } = mount({ view: 'app', route: 'calendar', scheduledAppts: [appt] });
    await settle();
    await waitFor(() => expect(container.querySelector('.calh-event')).toBeTruthy());
    const blocks = [...container.querySelectorAll('.calh-event')];
    expect(blocks.some((b) => (b.textContent || '').includes('קליניקה · חדר 2')), 'room rendered on the block').toBe(true);
  });

  it('reconcileMockAppts drops retired-seed appointments from a cached schedule', () => {
    const cached = [{ id: 'mock-appt-1', pid: 'p1', date: '2026-06-17', time: '09:00', dur: 50, description: 'x' } as any, ...buildMockScheduledAppts()];
    const merged = reconcileMockAppts(cached);
    expect(merged.some((a) => a.pid === 'p1')).toBe(false);
    expect(merged.length).toBe(cached.length - 1);
  });
});
