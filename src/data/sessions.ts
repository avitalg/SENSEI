// Canonical session projections. Repository patients get their source values;
// patients outside the repository remain empty unless real user data exists.
import { PATIENT_SESSION_CONTENT } from './patientSessionContent';

export const SESSION_DATES: string[] = [];

// Effective session dates for a patient. A patient with bespoke content that
// carries its own `dates` (e.g. the roster demo patients) gets those real
// per-patient dates; everyone else shares the neutral SESSION_DATES. Same
// override/fallback pattern as sessionSummaries, so every session surface
// (history, detail, prep report, search, mobile) shows the right dates.
export function sessionDates(p?: { id?: string }): string[] {
  const bespoke = p?.id ? PATIENT_SESSION_CONTENT[p.id] : undefined;
  if (bespoke?.dates?.length) return bespoke.dates;
  return SESSION_DATES;
}

// Neutral session summaries (no patient gender/risk fields). A patient with
// bespoke content (e.g. Simba/p5) gets their own arc; everyone else shares these.
export function sessionSummaries(p?: { id?: string }): string[] {
  const bespoke = p?.id ? PATIENT_SESSION_CONTENT[p.id] : undefined;
  if (bespoke) return bespoke.summaries;
  return [];
}

// Per-session risk levels. Repository patients carry their sessions' real
// דגלי-סיכון buckets (most-recent-first, from the dataset); patients without
// bespoke content have no seeded risk claims.
export function sessionRisk(p?: { id?: string }): string[] {
  const bespoke = p?.id ? PATIENT_SESSION_CONTENT[p.id] : undefined;
  if (bespoke?.riskKeys?.length) return bespoke.riskKeys.map((k) => k || 'none');
  return [];
}
