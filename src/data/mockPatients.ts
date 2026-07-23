// Offline demo roster — used only when VITE_API_BASE_URL is unset.
// Derived entirely from the canonical mock-patient repository (mock_patients/
// markdown via mockPatientsRepo.ts): the roster is whatever folders the
// repository contains — no hardcoded patient list. Contact fields the dataset
// does not provide stay empty (the UI renders its usual "—"), never invented.
import type { Patient } from '../services/patients';
import { dayKey } from '../services/calendar';
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
 * Upcoming local appointments for the offline demo — a mechanical continuation
 * of each patient's own observed cadence: the dataset's sessions run weekly at
 * a fixed time (e.g. simba 10:00, aladdin 18:00), so the schedule extends that
 * exact weekday/time/duration forward from the last recorded session. Nothing
 * about the slot (time, length, weekly rhythm) is invented — only projected.
 */
export function buildMockScheduledAppts(now = new Date()): MockScheduledAppt[] {
  const out: MockScheduledAppt[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  for (const rp of repoPatients()) {
    const last = [...rp.sessions].reverse().find((s) => s.date && s.time);
    if (!last) continue; // no dated sessions → nothing to project
    const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(last.date)!;
    const lastDate = new Date(2000 + parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10), 12, 0, 0, 0);
    // First weekly occurrence on/after today, then one more the week after.
    const msWeek = 7 * 24 * 3600 * 1000;
    const weeksAhead = Math.max(1, Math.ceil((today.getTime() - lastDate.getTime()) / msWeek));
    for (let k = 0; k < 2; k++) {
      const d = new Date(lastDate.getTime() + (weeksAhead + k) * msWeek);
      out.push({
        id: 'mock-appt-' + rp.id + '-' + (k + 1),
        pid: rp.id,
        date: dayKey(d),
        time: last.time.padStart(5, '0'),
        dur: last.durationMin || 50,
        description: 'פגישה שבועית',
      });
    }
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
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
  const fresh = buildMockScheduledAppts(now);
  const hidden = new Set(dismissed.apptIds || []);
  const removedPids = new Set(dismissed.removedPids || []);
  const retired = new Set(RETIRED_SEED_IDS);
  const notDismissed = (a: MockScheduledAppt) => !hidden.has(a.id) && !removedPids.has(a.pid);
  const kept = current.filter((a) => !retired.has(a.pid));
  if (!kept.length) return fresh.filter(notDismissed);
  const changed = kept.length !== current.length;
  const ids = new Set(kept.map((a) => a.id));
  const pidsWithAppts = new Set(kept.map((a) => a.pid));
  const added = fresh.filter((a) => !ids.has(a.id) && !pidsWithAppts.has(a.pid) && notDismissed(a));
  if (added.length) return [...kept, ...added];
  return changed ? kept : current;
}
