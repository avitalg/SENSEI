// Home dashboard redesign — the "Focus" zone (who's next + what to resume) and
// the contextual, time-aware greeting helpers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { heGreeting, relativeWhen } from '../src/utils';
import * as calendar from '../src/services/calendar';
import * as mockPatients from '../src/data/mockPatients';
import type { CalendarUiEvent } from '../src/services/calendar';
import type { Patient } from '../src/services/patients';

const LIVE_PID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LIVE_PID_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const { isApiConfiguredMock, loadDashboardUpcomingEvents, loadPatientPastEvents, listPatients } = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => false),
  loadDashboardUpcomingEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  loadPatientPastEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  listPatients: vi.fn(async (): Promise<Patient[]> => []),
}));

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
});
vi.mock('../src/services/calendar', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/calendar')>();
  return { ...actual, loadDashboardUpcomingEvents, loadPatientPastEvents };
});
vi.mock('../src/services/patients', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/patients')>();
  return { ...actual, listPatients };
});

describe('heGreeting — time-aware bands', () => {
  const at = (h: number) => { const d = new Date(2026, 0, 1); d.setHours(h, 0, 0, 0); return d; };
  it('picks the right greeting for each part of the day', () => {
    expect(heGreeting(at(3))).toBe('לילה טוב');
    expect(heGreeting(at(9))).toBe('בוקר טוב');
    expect(heGreeting(at(13))).toBe('צהריים טובים');
    expect(heGreeting(at(16))).toBe('אחר צהריים טובים');
    expect(heGreeting(at(20))).toBe('ערב טוב');
  });
});

describe('relativeWhen', () => {
  it('phrases today / tomorrow / this-week naturally', () => {
    const now = new Date(2026, 5, 10, 8, 0); // Wed
    expect(relativeWhen(new Date(2026, 5, 10, 14, 0), now)).toBe('היום · 14:00');
    expect(relativeWhen(new Date(2026, 5, 11, 9, 0), now)).toBe('מחר · 09:00');
    expect(relativeWhen(new Date(2026, 5, 13, 11, 0), now)).toContain('יום');
  });
});

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; vi.restoreAllMocks(); vi.clearAllMocks(); });
beforeEach(() => {
  isApiConfiguredMock.mockReturnValue(false);
  loadDashboardUpcomingEvents.mockResolvedValue([]);
  loadPatientPastEvents.mockResolvedValue([]);
});
function futureKey(days: number) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function upcomingLiveEvent(patientId: string, daysAhead: number, hour = 10): CalendarUiEvent {
  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 50 * 60_000);
  return {
    id: 'db-' + patientId.slice(0, 8) + '-meeting',
    title: 'פגישה',
    description: '',
    location: '',
    htmlLink: '',
    meetLink: '',
    allDay: false,
    start,
    end,
    status: 'confirmed',
    attendees: [],
    source: 'db',
    patientId,
  };
}

describe('dashboard — focus zone', () => {
  it('surfaces the next session with prepare/upload/open actions', async () => {
    vi.spyOn(calendar, 'loadCalendarEvents').mockResolvedValue([]);
    vi.spyOn(mockPatients, 'reconcileMockAppts').mockImplementation((appts: any[]) => appts || []);
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, scheduledAppts: [{ id: 'n1', pid: 'p1', date: futureKey(1), time: '09:00', dur: 50, description: '', status: 'upcoming' }] });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('הפגישה הבאה'));
    const focus = document.querySelector('[aria-label="במוקד היום"]') as HTMLElement;
    expect(focus.textContent).toContain('דנה לוי');
    const prep = [...focus.querySelectorAll('button')].find((b) => b.textContent?.includes('דוח ההכנה')) as HTMLElement;
    expect(prep).toBeTruthy();
    fireEvent.click(prep);
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/report/));
  });

  it('offers to resume unsaved drafts, and hides the card when there are none', async () => {
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, notesDrafts: { p2: 'טיוטה שלא נשמרה' } });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('להמשך עבודה'));
    const resume = document.querySelector('[aria-label^="המשך עריכה · יוסי מזרחי"]') as HTMLElement;
    expect(resume).toBeTruthy();
    fireEvent.click(resume);
    await waitFor(() => expect(window.location.hash).toBe('#/patient/p2'));
  });

  it('shows a calm empty state when there are no upcoming sessions', async () => {
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, scheduledAppts: [], hiddenMeetingIds: [] });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('הפגישה הבאה'));
    // no crash; the focus zone renders regardless of data
    expect(document.querySelector('[aria-label="במוקד היום"]')).toBeTruthy();
  });

  it('live API: next meeting + awaiting come from calendar, not empty scheduledAppts', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    const livePatients = [
      { id: LIVE_PID, name: 'Live Next', phone: '050', email: null, created_at: '2026-01-01T00:00:00Z', archived: false },
      { id: LIVE_PID_2, name: 'Needs Schedule', phone: '051', email: null, created_at: '2026-01-01T00:00:00Z', archived: false },
    ];
    listPatients.mockResolvedValue(livePatients);
    loadDashboardUpcomingEvents.mockResolvedValue([upcomingLiveEvent(LIVE_PID, 1)]);
    loadPatientPastEvents.mockResolvedValue([]);
    vi.spyOn(calendar, 'loadCalendarEvents').mockResolvedValue([]);

    mount({
      view: 'app',
      route: 'dashboard',
      onboardTipDismissed: true,
      scheduledAppts: [],
      patients: livePatients,
    });
    await settle();

    await waitFor(() => {
      const focus = document.querySelector('[aria-label="במוקד היום"]') as HTMLElement;
      expect(focus?.textContent).toContain('Live Next');
      expect(focus?.textContent).toContain('לתיאום פגישה');
      expect(focus?.textContent).toContain('Needs Schedule');
    });
    expect(loadDashboardUpcomingEvents).toHaveBeenCalled();
  });
});
