// Per-patient bespoke session content — DERIVED from the canonical mock-patient
// repository (mock_patients/ markdown via mockPatientsRepo.ts). This module
// keeps the array-shaped view the session builders consume; it declares no
// clinical copy of its own. Arrays are ordered most-recent-first (index 0 =
// latest session) to match the session-index convention in patientSessions.ts.
import { repoPatients, type RepoSession } from './mockPatientsRepo';

export interface PatientSessionContent {
  titles: string[]
  summaries: string[]
  /** תובנות מרכזיות per session. */
  insights: string[]
  /** Per-session dates, DD/MM/YY, ordered most-recent-first (aligned with the
      arrays above). When present the session builders use these instead of the
      shared SESSION_DATES, so each patient's history carries its own real dates. */
  dates?: string[]
  /** Per-session start time (HH:MM) — '' when the dataset omits it. */
  times?: string[]
  /** Per-session duration in minutes — 0 when the dataset omits it. */
  durations?: number[]
  /** נושאים מרכזיים per session. */
  topics?: string[][]
  /** Normalized risk bucket per session ('low' | 'medium' | 'high'; '' = none). */
  riskKeys?: string[]
  /** The dataset's own risk label per session, verbatim (e.g. "בינוני-גבוה"). */
  riskLabels?: string[]
  /** The risk explanation text per session. */
  riskTexts?: string[]
  /** לתשומת לב per session ('' when absent). */
  attention?: string[]
  /** The therapist's spoken session recording (verbatim). */
  recordings?: string[]
  /** The therapist note per session (verbatim). */
  therapistNotes?: string[]
  /** The "לפעם הבאה" focus per session ('' when absent). */
  nextFocus?: string[]
  // Richer structured fields (legacy v3 dataset) — not part of the repository;
  // kept optional so the session-detail screen simply hides them.
  phases?: string[]
  protocols?: string[]
  distress?: string[]
  homework?: string[]
  focus?: string[]
  interventions?: string[]
  patientState?: string[]
  beliefTrajectory?: string[]
}

/** Most-recent-first projection of one repo field. */
function desc<T>(sessions: RepoSession[], pick: (s: RepoSession) => T): T[] {
  return [...sessions].reverse().map(pick);
}

function contentFor(sessions: RepoSession[]): PatientSessionContent {
  return {
    titles: desc(sessions, (s) => s.title),
    summaries: desc(sessions, (s) => s.summary),
    insights: desc(sessions, (s) => s.insight),
    dates: desc(sessions, (s) => s.date),
    times: desc(sessions, (s) => s.time),
    durations: desc(sessions, (s) => s.durationMin || 0),
    topics: desc(sessions, (s) => s.topics),
    riskKeys: desc(sessions, (s) => s.risk?.levelKey || ''),
    riskLabels: desc(sessions, (s) => s.risk?.label || ''),
    riskTexts: desc(sessions, (s) => s.risk?.text || ''),
    attention: desc(sessions, (s) => s.attention || ''),
    recordings: desc(sessions, (s) => s.recording),
    therapistNotes: desc(sessions, (s) => s.therapistNote),
    nextFocus: desc(sessions, (s) => s.nextFocus || ''),
  };
}

/** Every repository patient's session arc, keyed by patient id. */
export const PATIENT_SESSION_CONTENT: Record<string, PatientSessionContent> =
  Object.fromEntries(repoPatients().filter((p) => p.sessions.length).map((p) => [p.id, contentFor(p.sessions)]));
