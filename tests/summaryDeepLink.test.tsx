// Summary deep links — the meeting lives in the URL, so a copied link or a hard
// refresh reopens the SAME meeting instead of falling back to seeded copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MID = '11111111-1111-4111-8111-111111111111';
const OTHER_PID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const {
  isApiConfiguredMock, pollMock, listPatientsMock, loadPatientsWithFallback, loadPatientPastEvents,
} = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => true),
  pollMock: vi.fn(),
  listPatientsMock: vi.fn(),
  loadPatientsWithFallback: vi.fn(async (current: Array<{ id: string; name: string }>) => ({ patients: current })),
  loadPatientPastEvents: vi.fn(async () => [] as any[]),
}));

vi.mock('../src/services/calendar', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/calendar')>();
  return { ...actual, loadPatientPastEvents };
});

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
});
vi.mock('../src/services/meetingSummary', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/meetingSummary')>();
  return { ...actual, pollMeetingSummary: pollMock };
});
vi.mock('../src/services/patients', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/patients')>();
  return { ...actual, loadPatientsWithFallback, listPatients: listPatientsMock };
});

const PATIENTS = [
  { id: PID, name: 'Live Patient', phone: '050-0000000', email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: OTHER_PID, name: 'Other Patient', phone: '050-1111111', email: null, created_at: '2026-01-01T00:00:00Z' },
];

function pastEvent() {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  end.setHours(11, 0, 0, 0);
  return {
    id: 'db-' + MID,
    title: 'פגישה',
    description: '',
    location: '',
    htmlLink: '',
    meetLink: '',
    allDay: false,
    start: new Date(end.getTime() - 50 * 60_000),
    end,
    status: 'confirmed',
    attendees: [{ name: 'Live Patient', email: '', self: false, response: 'accepted' }],
    source: 'db' as const,
    patientId: PID,
  };
}

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '';
  vi.clearAllMocks();
});
beforeEach(() => {
  isApiConfiguredMock.mockReturnValue(true);
  listPatientsMock.mockResolvedValue(PATIENTS);
  loadPatientsWithFallback.mockImplementation(async () => ({ patients: PATIENTS }));
  loadPatientPastEvents.mockResolvedValue([]);
  pollMock.mockResolvedValue({
    meeting_id: MID,
    status: 'ready',
    text: 'סיכום אמיתי מהשרת לפגישה שבקישור.',
    summary: null,
  });
});

describe('summary deep link — the meeting is in the URL', () => {
  it('a copied #/summary/<pid>/<mid> link polls that meeting, with no seeded copy', async () => {
    window.location.hash = `#/summary/${PID}/${MID}`;
    mount({ route: 'dashboard', patients: PATIENTS });
    await settle();

    await waitFor(() => expect(pollMock).toHaveBeenCalled());
    expect(pollMock.mock.calls[0][0]).toBe(MID);
    await waitFor(() => expect(document.body.textContent).toContain('סיכום אמיתי מהשרת'));
    expect(document.body.textContent).not.toContain('תוכן הדגמה');
  });

  it('navigating to another patient drops the previous meeting id', async () => {
    window.location.hash = `#/summary/${PID}/${MID}`;
    mount({ route: 'dashboard', patients: PATIENTS });
    await settle();
    await waitFor(() => expect(window.location.hash).toBe(`#/summary/${PID}/${MID}`));

    window.location.hash = `#/summary/${OTHER_PID}`;
    await settle();

    await waitFor(() => expect(window.location.hash).toBe(`#/summary/${OTHER_PID}`));
    expect(window.location.hash).not.toContain(MID);
  });

  it('a patient-only link resolves the newest meeting and rewrites the URL to name it', async () => {
    loadPatientPastEvents.mockResolvedValue([pastEvent()]);
    window.location.hash = `#/summary/${PID}`;
    mount({ route: 'dashboard', patients: PATIENTS });
    await settle();

    await waitFor(() => expect(pollMock).toHaveBeenCalled());
    expect(pollMock.mock.calls[0][0]).toBe(MID);
    await waitFor(() => expect(window.location.hash).toBe(`#/summary/${PID}/${MID}`));
  });
});
