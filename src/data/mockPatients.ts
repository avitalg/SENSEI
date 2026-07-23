// Offline demo roster — used only when VITE_API_BASE_URL is unset.
// Derived entirely from the canonical mock-patient repository (mock_patients/
// markdown via mockPatientsRepo.ts): the roster is whatever folders the
// repository contains — no hardcoded patient list. Contact fields the dataset
// does not provide stay empty (the UI renders its usual "—"), never invented.
import type { Patient } from '../services/patients';
import { repoPatients, type RepoPatient } from './mockPatientsRepo';

export interface MockScheduledAppt {
  id: string
  pid: string
  date: string
  time: string
  dur: number
  description: string
  /** Clinic room, shown in the appointment-details popup (e.g. "קליניקה · חדר 2"). */
  location?: string
}

/** DD/MM/YY (dataset date) → ISO instant; '' when the input is absent/invalid. */
function ddmmyyToIso(ddmmyy: string, time = '00:00'): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(ddmmyy || '');
  if (!m) return '';
  return `20${m[3]}-${m[2]}-${m[1]}T${time.padStart(5, '0')}:00Z`;
}

/** Treatment start = the patient's first recorded session date. */
function firstSessionIso(rp: RepoPatient): string {
  const first = rp.sessions.find((s) => s.date);
  return first ? ddmmyyToIso(first.date, '00:00') : '';
}

/**
 * The demo roster IS the repository — one Patient per discovered folder.
 * `created_at` comes from the first session's real date; phone/email/address
 * are not part of the dataset and stay empty ("not provided").
 */
export const MOCK_PATIENTS: Patient[] = repoPatients().map((rp) => ({
  id: rp.id,
  name: rp.name,
  phone: '',
  email: null,
  address: null,
  created_at: firstSessionIso(rp),
}));

/** Seed roster ids retired when the repository became the single data source. */
export const RETIRED_SEED_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];

/**
 * The repository contains historical sessions, not future appointments.
 * Returning an empty seed prevents inferred cadence from becoming fabricated
 * production data. User-created appointments are preserved separately.
 */
export function buildMockScheduledAppts(_now = new Date()): MockScheduledAppt[] {
  return [];
}

/**
 * Merge newly added demo patients into a cached offline roster.
 * `knownAbsentIds` are seed ids that are intentionally not in the active list —
 * archived or permanently-deleted patients — and must NOT be re-seeded, or an
 * archived patient would resurrect (and duplicate the archived copy) on reload.
 * Roster entries from the retired pre-repository seed (p1–p7) are dropped so a
 * returning demo user converges on the repository roster.
 */
export function reconcileMockPatients(current: Patient[], knownAbsentIds: Iterable<string> = []): Patient[] {
  const known = new Set(knownAbsentIds);
  const retired = new Set(RETIRED_SEED_IDS);
  const kept = current.filter((p) => !retired.has(p.id));
  if (!kept.length) return MOCK_PATIENTS.filter((p) => !known.has(p.id)).map((p) => ({ ...p }));
  const byId = new Map(kept.map((p) => [p.id, p]));
  let changed = kept.length !== current.length;
  for (const mock of MOCK_PATIENTS) {
    const existing = byId.get(mock.id);
    if (!existing) {
      if (known.has(mock.id)) continue; // archived / permanently-deleted — do not resurrect
      byId.set(mock.id, { ...mock });
      changed = true;
    }
  }
  return changed ? Array.from(byId.values()) : current;
}

/**
 * Merge newly added demo appointments into a cached offline schedule.
 * `dismissed.apptIds` (deleted meetings, from hiddenMeetingIds) and
 * `dismissed.removedPids` (permanently-deleted patients) are never re-seeded —
 * otherwise deleting a patient's meetings would resurrect them on reload.
 * Appointments belonging to the retired seed roster are dropped.
 */
export function reconcileMockAppts(
  current: MockScheduledAppt[],
  dismissed: { apptIds?: Iterable<string>; removedPids?: Iterable<string> } = {},
  now = new Date(),
): MockScheduledAppt[] {
  const hidden = new Set(dismissed.apptIds || []);
  const removedPids = new Set(dismissed.removedPids || []);
  const retired = new Set(RETIRED_SEED_IDS);
  const notDismissed = (a: MockScheduledAppt) => !hidden.has(a.id) && !removedPids.has(a.pid);
  void now;
  const kept = current.filter((a) =>
    !retired.has(a.pid)
    && !a.id.startsWith('mock-appt-')
    && notDismissed(a));
  return kept.length === current.length ? current : kept;
}
