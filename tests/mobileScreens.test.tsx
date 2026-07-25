// Mobile prep-report and patient profile — the bespoke
// mobile screens rendered by MobileApp for the report / patient routes. Same
// matchMedia mobile gating as mobileDayView.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';
import { MOCK_PATIENTS } from '../src/data/mockPatients';
import type { CalendarUiEvent } from '../src/services/calendar';
import { fmtDate } from '../src/utils/dates';

const {
  isApiConfiguredMock,
  pollMock,
  regenMock,
  loadPatientPastEvents,
  loadPatientUpcomingEvents,
  fetchMeetingSummary,
  listPatients,
} = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => false),
  pollMock: vi.fn(),
  regenMock: vi.fn(),
  loadPatientPastEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  loadPatientUpcomingEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  fetchMeetingSummary: vi.fn(async () => ({ meeting_id: '', status: 'ready' as const, text: '' as string | null })),
  // live mode swaps the store roster for GET /patients (usePatientsQuery), so
  // every API-mode case must supply the patients it navigates to
  listPatients: vi.fn(async () => [] as any[]),
}));

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
});
vi.mock('../src/services/nextMeetingReport', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/nextMeetingReport')>();
  return { ...actual, pollNextMeetingReport: pollMock, regenerateNextMeetingReport: regenMock };
});
vi.mock('../src/services/calendar', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/calendar')>();
  return { ...actual, loadPatientPastEvents, loadPatientUpcomingEvents };
});
vi.mock('../src/services/meetingSummary', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/meetingSummary')>();
  return { ...actual, fetchMeetingSummary };
});
vi.mock('../src/services/patients', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/patients')>();
  return { ...actual, listPatients };
});

const PKEY = 'sensei_session_react_v1';

function setMobile() {
  window.matchMedia = ((q: string) => ({
    matches: q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

const LIVE_PID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LIVE_MEETING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function pastUiEvent(patientId: string): CalendarUiEvent {
  const end = new Date();
  end.setDate(end.getDate() - 3);
  end.setHours(12, 0, 0, 0);
  const start = new Date(end.getTime() - 50 * 60_000);
  return {
    id: 'db-' + LIVE_MEETING_ID,
    title: 'פגישה',
    description: '',
    location: '',
    htmlLink: '',
    meetLink: '',
    allDay: false,
    start,
    end,
    status: 'confirmed',
    attendees: [{ name: 'Live Patient', email: '', self: false, response: 'accepted' }],
    source: 'db',
    patientId,
  };
}

const LIVE_PATIENT = {
  id: LIVE_PID,
  name: 'Live Patient',
  phone: '050-0000000',
  email: null as string | null,
  created_at: '2026-01-01T00:00:00Z',
  archived: false,
};

beforeEach(() => {
  setMobile();
  isApiConfiguredMock.mockReturnValue(false);
  loadPatientPastEvents.mockResolvedValue([]);
  loadPatientUpcomingEvents.mockResolvedValue([]);
  fetchMeetingSummary.mockResolvedValue({ meeting_id: '', status: 'ready', text: '' });
  listPatients.mockResolvedValue([]);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('mobile header brand', () => {
  it('shows the Sensei mark on a light disc next to the wordmark', async () => {
    const { container } = mount({ route: 'dashboard' });
    await waitFor(() => expect(container.querySelector('.mob-header')).toBeTruthy());
    expect(container.querySelector('.mob-header .mob-wordmark')?.textContent).toBe('סנסיי');
    const mark = container.querySelector('.mob-header .mob-brand-mark');
    expect(mark).toBeTruthy();
    expect(mark?.querySelector('img[src="/assets/sensei-mark.png"]')).toBeTruthy();
  });
});

describe('mobile prep report', () => {
  it('renders the prep sections with bullet lists (no goal checkboxes)', async () => {
    const { container } = mount({ route: 'report', patientId: 'p3' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('סיכום הפגישה הקודמת');
    expect(container.textContent).toContain('נקודות למעקב');
    expect(container.textContent).toContain('מטרות לפגישה הקרובה');
    // demo mode — no refresh control
    expect(container.querySelector('[aria-label="רענון דוח"]')).toBeNull();
    // goals are bullets like follow-ups, not interactive checkboxes
    expect(container.querySelector('.mob-goal')).toBeNull();
    expect(container.querySelector('.mob-check')).toBeNull();
  });

  it('offers upload (not direct recording) from the prep report, and no record control remains', async () => {
    const { container } = mount({ route: 'report', patientId: 'p3' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    // direct recording removed — the footer CTA is now the upload flow
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'התחל הקלטה'), 'no direct-record CTA').toBe(false);
    const upload = [...container.querySelectorAll('button')].find((b) => b.textContent === 'העלאת הקלטה') as HTMLElement;
    expect(upload, 'upload CTA present').toBeTruthy();
    fireEvent.click(upload);
    await waitFor(() => expect(window.location.hash).toBe('#/upload'));
  });

  it('API mode: shows רענון דוח and regenerates on click', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    listPatients.mockResolvedValue(MOCK_PATIENTS);
    pollMock.mockResolvedValue({
      patient_id: 'p3', status: 'ready',
      intro: 'LIVE INTRO', changes: ['c1'], open_topics: ['t1'],
      last_summary_excerpt: 'excerpt', model: 'llama3.1:latest',
    });
    regenMock.mockResolvedValue({
      patient_id: 'p3', status: 'ready',
      intro: 'REFRESHED', changes: ['c2'], open_topics: ['t2'],
      last_summary_excerpt: 'new excerpt', model: 'llama3.1:latest',
    });

    const { container } = mount({
      route: 'report',
      patientId: 'p3',
      patients: MOCK_PATIENTS,
    });
    await waitFor(() => expect(container.textContent).toContain('LIVE INTRO'));

    const refresh = container.querySelector('[aria-label="רענון דוח"]') as HTMLButtonElement;
    expect(refresh, 'refresh control').toBeTruthy();
    expect(refresh.textContent).toContain('רענון דוח');
    fireEvent.click(refresh);
    await waitFor(() => expect(regenMock).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toContain('REFRESHED'));
  });
});

describe('mobile patient profile', () => {
  it('renders the patient header, next meeting, and recent sessions', async () => {
    const { container } = mount({ route: 'patient', patientId: 'p1' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('תיק מטופל');
    expect(container.textContent).toContain('הפגישה הבאה');
    expect(container.textContent).toContain('פגישות אחרונות');
    expect(container.querySelectorAll('.mob-sess-row').length).toBeGreaterThan(0);
  });

  it('API mode: recent sessions come from the calendar, not the seeded demo list', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    const event = pastUiEvent(LIVE_PID);
    loadPatientPastEvents.mockResolvedValue([event]);
    fetchMeetingSummary.mockResolvedValue({
      meeting_id: LIVE_MEETING_ID,
      status: 'ready',
      text: 'סיכום אמיתי מהשרת על התקדמות בטיפול.',
    });
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    // the recap lands in a second query (per-meeting summaries), after the rows
    await waitFor(() => expect(container.textContent).toContain('סיכום אמיתי מהשרת'));
    expect(container.textContent).toContain(fmtDate(event.start));
    // the seeded demo history must not leak into a live patient's file
    expect(container.textContent).not.toContain('22/06/26');
    expect(loadPatientPastEvents).toHaveBeenCalled();
  });

  it('API mode: tapping a session opens the summary with the real meeting, not the demo session page', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    loadPatientPastEvents.mockResolvedValue([pastUiEvent(LIVE_PID)]);
    fetchMeetingSummary.mockResolvedValue({
      meeting_id: LIVE_MEETING_ID,
      status: 'ready',
      text: 'סיכום אמיתי מהשרת.',
    });
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    // Wait until the live row is stable (summary text filled), then click that
    // node — not a fresh querySelector that can race a loading re-render.
    const row = await waitFor(() => {
      const el = container.querySelector('.mob-sess-row');
      if (!el || !container.textContent?.includes('סיכום אמיתי מהשרת')) {
        throw new Error('live session row not ready');
      }
      return el;
    });
    fireEvent.click(row);
    await waitFor(() => expect(window.location.hash.startsWith('#/summary/')).toBe(true));
  });

  it('API mode: shows a loading status while the meeting history is in flight', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    let release: (v: CalendarUiEvent[]) => void = () => {};
    loadPatientPastEvents.mockReturnValue(new Promise<CalendarUiEvent[]>((resolve) => { release = resolve; }));
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    await waitFor(() => expect(container.querySelector('[role="status"]')).toBeTruthy());
    expect(container.textContent).toContain('טוענים את היסטוריית הפגישות…');
    expect(container.textContent).not.toContain('22/06/26');

    await act(async () => { release([]); });
  });

  it('API mode: shows an error card when the meeting history fails to load', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    loadPatientPastEvents.mockRejectedValue(new Error('לא ניתן לטעון את היסטוריית הפגישות'));
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    // the shared query client retries once with backoff before surfacing the error
    await waitFor(() => expect(container.querySelector('[role="alert"]')).toBeTruthy(), { timeout: 3000 });
    expect(container.textContent).toContain('לא ניתן לטעון את היסטוריית הפגישות');
    expect(container.querySelectorAll('.mob-sess-row').length).toBe(0);
    expect(container.textContent).not.toContain('22/06/26');
  });

  it('API mode: shows the empty state when the patient has no past meetings', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    loadPatientPastEvents.mockResolvedValue([]);
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    await waitFor(() => expect(container.textContent).toContain('אין פגישות קודמות'));
    expect(container.querySelectorAll('.mob-sess-row').length).toBe(0);
    expect(container.textContent).not.toContain('22/06/26');
  });
});

describe('mobile drawer — focus restore (WCAG focus management)', () => {
  it('closing the drawer returns focus to the menu button', async () => {
    localStorage.setItem('sensei_session_react_v1', JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await act(() => new Promise((r) => setTimeout(r, 150)));
    const menu = document.querySelector('[aria-label="פתיחת התפריט"]') as HTMLButtonElement;
    expect(menu).toBeTruthy();
    fireEvent.click(menu);
    await act(() => new Promise((r) => setTimeout(r, 100)));
    // close via the scrim
    fireEvent.click(document.querySelector('.nav-scrim') as HTMLElement);
    await waitFor(() => expect(document.activeElement).toBe(menu));
  });
});
