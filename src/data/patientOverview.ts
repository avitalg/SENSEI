// Structured "Patient Overview" — a concise, scannable snapshot shown at the top
// of the patient file: current treatment summary, primary goals, current
// challenges, and the therapist's prep notes ahead of the next session.
// DERIVED per patient from the canonical mock-patient repository:
//   summary    ← the patient file's רקע קליני + גישה טיפולית (verbatim)
//   goals      ← the latest session's "לפעם הבאה" focus (the stated next goal)
//   challenges ← the latest session's נושאים מרכזיים
// Patients outside the repository share a neutral default. Stored edits live in
// the store's `overviewOverrides`.
import { repoPatients } from './mockPatientsRepo';

export interface PatientOverview {
  summary: string
  goals: string
  challenges: string
}

const NOT_STATED = 'לא צוין במאגר ההדגמה.';

const PATIENT_OVERVIEWS: Record<string, PatientOverview> = Object.fromEntries(
  repoPatients().map((p) => {
    const latest = p.sessions[p.sessions.length - 1];
    return [p.id, {
      summary: [p.background, p.approach ? 'גישה טיפולית מרכזית: ' + p.approach : ''].filter(Boolean).join(' '),
      goals: latest?.nextFocus || NOT_STATED,
      challenges: latest?.topics.length ? latest.topics.join(' · ') : NOT_STATED,
    }];
  }),
);

const DEFAULT_OVERVIEW: PatientOverview = {
  summary: NOT_STATED,
  goals: NOT_STATED,
  challenges: NOT_STATED,
};

export function patientOverviewDefault(patientId: string): PatientOverview {
  return { ...(PATIENT_OVERVIEWS[patientId] || DEFAULT_OVERVIEW) };
}

/** Empty overview for live API mode — no seeded clinical copy. */
export const EMPTY_OVERVIEW: PatientOverview = {
  summary: '',
  goals: '',
  challenges: '',
};

/** Seeded defaults offline; blank (plus local overrides) when the API is live. */
export function patientOverviewBase(patientId: string, useApi: boolean): PatientOverview {
  return useApi ? { ...EMPTY_OVERVIEW } : patientOverviewDefault(patientId);
}

export const OVERVIEW_FIELDS: { key: keyof PatientOverview; label: string }[] = [
  { key: 'summary', label: 'סיכום הטיפול הנוכחי' },
  { key: 'goals', label: 'מטרות הטיפול המרכזיות' },
  { key: 'challenges', label: 'אתגרים נוכחיים' },
];
