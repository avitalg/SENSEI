// Meeting-details dialog "מהפגישה הקודמת" must use live summaries (or hide),
// never seeded mock copy when the API is configured.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import type { CalendarUiEvent } from '../src/services/calendar';
import type { Patient } from '../src/services/patients';

const LIVE_PID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MOCK_RECAP_SNIPPET = 'שיפור מתון בתחושת השליטה';

const {
  isApiConfiguredMock,
  loadPatientPastEvents,
  loadPatientUpcomingEvents,
  fetchMeetingSummary,
  listPatients,
} = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => false),
  loadPatientPastEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  loadPatientUpcomingEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  fetchMeetingSummary: vi.fn(),
  listPatients: vi.fn(async (): Promise<Patient[]> => []),
}));

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
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
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));

function upcomingEvent(): CalendarUiEvent {
  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 50 * 60_000);
  return {
    id: 'db-cccccccc-cccc-cccc-cccc-cccccccccccc',
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
    patientId: LIVE_PID,
    guestName: 'Live Patient',
  } as CalendarUiEvent;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
beforeEach(() => {
  isApiConfiguredMock.mockReturnValue(false);
  loadPatientPastEvents.mockResolvedValue([]);
  loadPatientUpcomingEvents.mockResolvedValue([]);
});

describe('meeting details dialog — previous-session recap', () => {
  it('live API with no summaries: hides mock "מהפגישה הקודמת" copy', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    const livePatient = {
      id: LIVE_PID,
      name: 'Live Patient',
      phone: '050',
      email: null as string | null,
      created_at: '2026-01-01T00:00:00Z',
      archived: false,
    };
    listPatients.mockResolvedValue([livePatient]);
    loadPatientUpcomingEvents.mockResolvedValue([upcomingEvent()]);
    loadPatientPastEvents.mockResolvedValue([]);

    mount({
      view: 'app',
      route: 'patient',
      patientId: LIVE_PID,
      patients: [livePatient],
    });
    await settle();

    const row = await waitFor(() => {
      const el = document.querySelector('.pd-upcoming-row button') as HTMLElement;
      expect(el).toBeTruthy();
      return el;
    });
    fireEvent.click(row);
    await settle();

    const dialog = await waitFor(() => {
      const d = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(d).toBeTruthy();
      return d;
    });
    await act(() => new Promise((r) => setTimeout(r, 250)));
    expect(dialog.textContent).not.toContain(MOCK_RECAP_SNIPPET);
    expect(dialog.textContent).not.toContain('מהפגישה הקודמת');
    expect(dialog.textContent).toContain('העלאת הקלטה');
  });

  it('demo mode still shows a seeded recap', async () => {
    mount({ view: 'app', route: 'dashboard' });
    await settle();
    const event = await waitFor(() => {
      const el = document.querySelector('.calh-event') as HTMLElement;
      expect(el).toBeTruthy();
      return el;
    });
    fireEvent.click(event);
    const dialog = await waitFor(() => {
      const d = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(d).toBeTruthy();
      return d;
    });
    expect(dialog.textContent).toContain('מהפגישה הקודמת');
  });
});
