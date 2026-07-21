// Summary page — when live summary is missing/failed, users must still reach
// the transcript and can retry via the upload screen (not a dead-end re-poll).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOCK_PATIENTS } from '../src/data/mockPatients';

const MID = '11111111-1111-4111-8111-111111111111';

const { isApiConfiguredMock, pollMock, listPatientsMock, loadPatientsWithFallback } = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => true),
  pollMock: vi.fn(),
  listPatientsMock: vi.fn(),
  loadPatientsWithFallback: vi.fn(async (current: Array<{ id: string; name: string }>) => ({ patients: current })),
}));

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

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
beforeEach(() => {
  isApiConfiguredMock.mockReturnValue(true);
  listPatientsMock.mockResolvedValue(MOCK_PATIENTS);
  loadPatientsWithFallback.mockImplementation(async () => ({ patients: MOCK_PATIENTS }));
  pollMock.mockRejectedValue(Object.assign(new Error('אין עדיין סיכום לפגישה זו'), { code: 'NOT_FOUND', status: 404 }));
});

describe('summary page — missing/failed summary recovery', () => {
  it('shows transcript + upload actions on error (not a dead-end re-poll)', async () => {
    mount({
      view: 'app',
      route: 'summary',
      patientId: 'p1',
      meetingId: MID,
      patients: MOCK_PATIENTS,
      transcriptsByPatient: {
        p1: { text: 'שלום זה תמלול בדיקה', meetingId: MID },
      },
    });
    await settle();

    await waitFor(() => {
      expect(document.body.textContent).toContain('לא ניתן להציג את הסיכום');
    });
    expect(document.body.textContent).toContain('צפייה בתמלול');
    expect(document.body.textContent).toContain('נסו שוב');
    expect(document.body.textContent).toContain('מחיקה והעלאה מחדש');

    fireEvent.click(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'נסו שוב')!);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/העלאת|בחירת קובץ|גררו/);
    });
  });

  it('opens the transcript from the error panel', async () => {
    mount({
      view: 'app',
      route: 'summary',
      patientId: 'p1',
      meetingId: MID,
      patients: MOCK_PATIENTS,
      activeTranscriptPatientId: 'p1',
      transcriptsByPatient: {
        p1: { text: 'שורה ראשונה של התמלול לבדיקה', meetingId: MID },
      },
    });
    await settle();

    await waitFor(() => {
      expect(document.body.textContent).toContain('צפייה בתמלול');
    });
    fireEvent.click(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'צפייה בתמלול')!);
    await waitFor(() => {
      expect(document.body.textContent).toContain('שורה ראשונה של התמלול לבדיקה');
    });
  });
});
