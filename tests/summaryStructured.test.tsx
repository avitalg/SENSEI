// Summary page — when the backend sends the section-split `summary` object, the
// page renders those sections (title/subtitle/insights/topics/risk) instead of
// dumping the flat markdown text into one paragraph.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOCK_PATIENTS } from '../src/data/mockPatients';

const MID = '22222222-2222-4222-8222-222222222222';

const TEXT = [
  'אינטגרציה — כבוד עצמי מחודש',
  '',
  'מולאן · 22/07/26 · 15:00 · 50 דק׳',
  '',
  '**תובנות מרכזיות**',
  'שיתוף לראשונה עם חברה קרובה על הסיפור האמיתי.',
  '',
  '**סיכום הפגישה**',
  'מטופלת שיתפה חברה קרובה בחלק מהסיפור האמיתי מהצבא.',
].join('\n');

const STRUCTURED = {
  title: 'אינטגרציה — כבוד עצמי מחודש',
  subtitle: 'מולאן · 22/07/26 · 15:00 · 50 דק׳',
  insights: 'שיתוף לראשונה עם חברה קרובה על הסיפור האמיתי.',
  session_summary: 'מטופלת שיתפה חברה קרובה בחלק מהסיפור האמיתי מהצבא.',
  session_main_topics: ['שיתוף ראשון של הסיפור האמיתי', 'ניסוח מחדש של מושג האומץ'],
  session_risk_flags: {
    level: 'נמוך',
    note: 'מגמה חיובית ברורה, שינוי זהותי מוצק.',
    attention: 'לבחון טריגרים סביבתיים בחזרה לסביבה המקורית.',
    disclaimer: 'אינדיקטור בלבד. אינו מהווה אבחנה רפואית',
  },
  therapist_interventions: ['שיקוף רגשי', 'מיקוד בנרטיב'],
  follow_up: ['מעקב אחר זיכרונות נוספים'],
};

const { isApiConfiguredMock, pollMock, listPatientsMock, loadPatientsWithFallback } = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => true),
  pollMock: vi.fn(),
  listPatientsMock: vi.fn(),
  loadPatientsWithFallback: vi.fn(),
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
function mount(patch: Record<string, any> = {}) {
  localStorage.setItem(PKEY, JSON.stringify({
    __savedAt: Date.now(),
    view: 'app',
    route: 'summary',
    patientId: 'p1',
    meetingId: MID,
    patients: MOCK_PATIENTS,
    transcriptsByPatient: { p1: { text: 'תמלול בדיקה', meetingId: MID } },
    ...patch,
  }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
const headings = () => Array.from(document.querySelectorAll('h2')).map((h) => h.textContent?.trim());

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
beforeEach(() => {
  isApiConfiguredMock.mockReturnValue(true);
  listPatientsMock.mockResolvedValue(MOCK_PATIENTS);
  loadPatientsWithFallback.mockImplementation(async () => ({ patients: MOCK_PATIENTS }));
  pollMock.mockResolvedValue({
    meeting_id: MID,
    status: 'ready',
    text: TEXT,
    model: 'seed',
    summary: STRUCTURED,
  });
});

describe('summary page — backend section split', () => {
  it('renders title, subtitle and the section boxes from the summary object', async () => {
    mount();
    await settle();

    await waitFor(() => {
      expect(document.body.textContent).toContain('אינטגרציה — כבוד עצמי מחודש');
    });
    expect(document.body.textContent).toContain('מולאן · 22/07/26 · 15:00 · 50 דק׳');
    expect(headings()).toEqual(expect.arrayContaining([
      'תובנות מרכזיות', 'סיכום הפגישה', 'דגלי סיכון', 'נושאים מרכזיים', 'המשך ומעקב',
    ]));
    // Gendered per profile (המטפל / המטפלת) — no slash form.
    expect(headings().some((h) => /^התערבויות המטפלת?$/.test(h || ''))).toBe(true);
    expect(document.body.textContent).toContain('שיתוף לראשונה עם חברה קרובה');
    expect(document.body.textContent).toContain('שיתוף ראשון של הסיפור האמיתי');
    expect(document.body.textContent).toContain('שיקוף רגשי');
    expect(document.body.textContent).toContain('מעקב אחר זיכרונות נוספים');
  });

  it('shows the risk level and the attention row as separate flags', async () => {
    mount();
    await settle();

    await waitFor(() => {
      expect(document.body.textContent).toContain('מגמה חיובית ברורה');
    });
    expect(document.body.textContent).toContain('נמוך');
    expect(document.body.textContent).toContain('לתשומת לב');
    expect(document.body.textContent).toContain('לבחון טריגרים סביבתיים');
  });

  it('never prints the raw markdown headings from the flat text', async () => {
    mount();
    await settle();

    await waitFor(() => {
      expect(document.body.textContent).toContain('מטופלת שיתפה חברה קרובה');
    });
    expect(document.body.textContent).not.toContain('**');
  });

  it('falls back to parsing the flat text when the section split is absent', async () => {
    pollMock.mockResolvedValue({
      meeting_id: MID,
      status: 'ready',
      text: '## נושאים מרכזיים\n- דפוסי שינה\n## סימני סיכון\nלא נאמרו אמירות מפורשות של סיכון',
      model: 'seed',
      summary: null,
    });
    mount();
    await settle();

    await waitFor(() => {
      expect(document.body.textContent).toContain('דפוסי שינה');
    });
    expect(document.body.textContent).toContain('לא נאמרו אמירות מפורשות של סיכון');
  });
});
