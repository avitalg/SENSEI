// Domain-layer fallback and edge behavior — the paths a repository patient never
// exercises but a REAL user hits: a therapist-created patient (outside the
// mock_patients repository), a file with no email/address, an archived file with
// a missing or malformed date, a session list with deletions, and the neutral
// content every non-repository id falls back to.
//
// These are the branches that keep the app from rendering "undefined"/NaN or
// throwing for user-created records; they are logic-layer, so they are unit
// tested here rather than through a screen.
import { describe, expect, it } from 'vitest';
import {
  patientInitials, formatPatientSince, displayPatientEmail, formatTreatmentSpan,
  archivePatient, restorePatient, localPatient,
  loadPatientsWithFallback, loadArchivedPatientsWithFallback, type Patient,
} from '../src/services/patients';
import { demoSessionCount, buildPatientSessions, enrichPatientSessions } from '../src/utils/patientSessions';
import {
  sessionMainTopics, sessionRiskFlags, sessionInsight, sessionTitle,
  sessionMeta, beliefTrajectory, sessionIndexForNum, SESSION_MAIN_TOPICS, SESSION_RISK_FLAGS,
} from '../src/data/sessionDetail';
import { repoPatients } from '../src/data/mockPatientsRepo';

const REPO_ID = repoPatients()[0].id;      // a discovered repository patient
const OUTSIDE_ID = 'user-created-patient';  // a therapist-created id, never in the repo

const patient = (over: Partial<Patient> = {}): Patient => ({
  id: 'x1', name: 'שם בדיקה', phone: '050-0000000', email: null,
  created_at: '2026-01-15T00:00:00Z', ...over,
});

describe('patient display helpers — empty and malformed input never leak to the UI', () => {
  it('initials: empty/whitespace falls back to the em-dash placeholder, long names cap at two', () => {
    expect(patientInitials('')).toBe('—');
    expect(patientInitials('   ')).toBe('—');
    expect(patientInitials('סימבה')).toBe('ס');
    expect(patientInitials('מרלין אביו של נמו')).toHaveLength(2);
  });

  it('since-date: an unparsable created_at renders the placeholder, not "NaN/NaN"', () => {
    expect(formatPatientSince('not-a-date')).toBe('—');
    expect(formatPatientSince('2026-03-09T00:00:00Z')).toBe('03/26');
  });

  it('email: null, empty and whitespace all render the placeholder; a real address is trimmed', () => {
    expect(displayPatientEmail(null)).toBe('—');
    expect(displayPatientEmail(undefined)).toBe('—');
    expect(displayPatientEmail('   ')).toBe('—');
    expect(displayPatientEmail('  a@b.co  ')).toBe('a@b.co');
  });

  it('treatment span: malformed start → placeholder; no/!invalid end → start only; valid end → span + months', () => {
    expect(formatTreatmentSpan('nonsense')).toBe('—');
    expect(formatTreatmentSpan('2026-01-15T00:00:00Z')).toBe('01/26');            // still open
    expect(formatTreatmentSpan('2026-01-15T00:00:00Z', 'nonsense')).toBe('01/26'); // unusable end
    const span = formatTreatmentSpan('2026-01-15T00:00:00Z', '2026-04-15T00:00:00Z');
    expect(span).toContain('01/26');
    expect(span).toContain('04/26');
    expect(span).toContain('חודשים');
  });
});

describe('patient lifecycle transforms are pure and reversible', () => {
  it('archive stamps archived_at; restore clears it without mutating the input', () => {
    const p = patient();
    const archived = archivePatient(p);
    expect(archived.archived).toBe(true);
    expect(archived.archived_at).toBeTruthy();
    expect(p.archived).toBeUndefined(); // input untouched

    const restored = restorePatient(archived);
    expect(restored.archived).toBe(false);
    expect(restored.archived_at).toBeNull();
  });

  it('localPatient trims, and turns blank email/address into null (never empty strings)', () => {
    const created = localPatient({ name: '  דנה  ', phone: ' 050-1234567 ', email: '   ', address: '' });
    expect(created.name).toBe('דנה');
    expect(created.phone).toBe('050-1234567');
    expect(created.email).toBeNull();
    expect(created.address).toBeNull();
    expect(created.archived).toBe(false);
    expect(created.id).not.toBe(localPatient({ name: 'a', phone: 'b' }).id); // unique
  });
});

describe('offline roster loading (no VITE_API_BASE_URL)', () => {
  it('an empty cache seeds the repository roster; archived files are excluded', async () => {
    const { patients, source } = await loadPatientsWithFallback([]);
    expect(source).toBe('mock');
    expect(patients.length).toBeGreaterThan(0);
    expect(patients.every((p) => !p.archived)).toBe(true);
  });

  it('a populated cache wins over the seed, minus its archived entries', async () => {
    const cached = [patient({ id: 'a' }), patient({ id: 'b', archived: true })];
    const { patients } = await loadPatientsWithFallback(cached);
    expect(patients.map((p) => p.id)).toEqual(['a']);
  });

  it('the archive view is the mirror image — only archived entries', async () => {
    const cached = [patient({ id: 'a' }), patient({ id: 'b', archived: true })];
    const { patients, source } = await loadArchivedPatientsWithFallback(cached);
    expect(patients.map((p) => p.id)).toEqual(['b']);
    expect(source).toBe('mock');
  });
});

describe('session-count derivation', () => {
  it('a repository patient uses its real arc length', () => {
    expect(demoSessionCount({ id: REPO_ID })).toBe(repoPatients()[0].sessions.length);
  });

  it('an explicit count is honored; absent/non-positive data never creates a synthetic history', () => {
    expect(demoSessionCount({ id: OUTSIDE_ID, sessions: 3 })).toBe(3);
    expect(demoSessionCount({ id: OUTSIDE_ID, sessions: 0 })).toBe(0);
    expect(demoSessionCount({ id: OUTSIDE_ID })).toBe(0);
  });
});

describe('buildPatientSessions', () => {
  const ctx = { navigate: () => {}, set: () => {} };

  it('numbers sessions newest-first, skips deleted keys, and honors a limit', () => {
    const all = buildPatientSessions({ id: REPO_ID, name: 'x' }, [], ctx);
    expect(all[0].num).toBe(all.length); // newest carries the highest number
    const withoutNewest = buildPatientSessions({ id: REPO_ID, name: 'x' }, [REPO_ID + '#' + all.length], ctx);
    expect(withoutNewest).toHaveLength(all.length - 1);
    expect(buildPatientSessions({ id: REPO_ID, name: 'x' }, [], ctx, { limit: 2 })).toHaveLength(2);
  });

  it('a risk-free session shows no chip, while a flagged one does', () => {
    const outside = buildPatientSessions({ id: OUTSIDE_ID, name: 'x', sessions: 1 }, [], ctx);
    expect(outside.every((s) => s.riskChips.length === 0)).toBe(true); // no seeded risk claims
    const repo = buildPatientSessions({ id: REPO_ID, name: 'x' }, [], ctx);
    expect(repo.some((s) => s.riskChips.length === 1)).toBe(true);
  });

  it('durations come from the dataset for repository patients, and are derived otherwise', () => {
    expect(buildPatientSessions({ id: REPO_ID, name: 'x' }, [], ctx)[0].duration).toMatch(/^\d+ דק׳$/);
    expect(buildPatientSessions({ id: OUTSIDE_ID, name: 'x', sessions: 1 }, [], ctx)[0].duration).toBe('לא צוין');
  });

  it('the delete handler stops propagation and opens the confirm dialog with a labeled key', () => {
    let patch: any = null;
    let stopped = false;
    const rows = buildPatientSessions({ id: REPO_ID, name: 'סימבה' }, [], { navigate: () => {}, set: (p) => { patch = p; } });
    rows[0].onDelete({ stopPropagation: () => { stopped = true; } });
    expect(stopped).toBe(true);
    expect(patch.dialog).toBe('delSession');
    expect(patch.dialogSessionKey).toBe(rows[0].key);
    expect(patch.dialogSessionLabel).toContain('סימבה');
    rows[0].onDelete(); // no event → must not throw
  });

  it('enrichPatientSessions flags only sessions that actually have a stored note', () => {
    const rows = buildPatientSessions({ id: REPO_ID, name: 'x' }, [], ctx, { limit: 2 });
    const S = { sessionNotes: { [REPO_ID + '_' + rows[0].num]: 'הערה' } };
    const enriched = enrichPatientSessions(rows, S, REPO_ID);
    expect(enriched[0].hasNote).toBe(true);
    expect(enriched[1].hasNote).toBe(false);
  });
});

describe('session-detail content — repository values vs the neutral fallback', () => {
  it('topics: the dataset\'s own list for a repository patient, the shared set otherwise', () => {
    expect(sessionMainTopics({ id: OUTSIDE_ID }, 0)).toEqual(SESSION_MAIN_TOPICS);
    expect(sessionMainTopics(undefined, 0)).toEqual(SESSION_MAIN_TOPICS);
    expect(sessionMainTopics({ id: REPO_ID }, 0).length).toBeGreaterThan(0);
  });

  it('risk flags: the generic pair outside the repository; dataset label (+ attention) inside it', () => {
    expect(sessionRiskFlags({ id: OUTSIDE_ID }, 0)).toEqual(SESSION_RISK_FLAGS);
    expect(sessionRiskFlags(undefined, 0)).toEqual(SESSION_RISK_FLAGS);
    const flags = sessionRiskFlags({ id: REPO_ID }, 0);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => typeof f.level === 'string' && f.color.startsWith('var('))).toBe(true);
  });

  it('insight and title: source-backed for repository patients, empty otherwise', () => {
    expect(sessionInsight({ id: REPO_ID }, 0)).toBeTruthy();
    expect(sessionInsight({ id: OUTSIDE_ID }, 0)).toBe('');
    expect(sessionTitle({ id: OUTSIDE_ID }, 0)).toBe('');
    expect(typeof sessionTitle({ id: REPO_ID }, 0)).toBe('string');
  });

  it('the legacy v3 metadata is absent for repository + unknown patients (the screen hides it)', () => {
    expect(sessionMeta({ id: OUTSIDE_ID }, 0)).toBeNull();
    expect(sessionMeta({ id: REPO_ID }, 0)).toBeNull();
    expect(beliefTrajectory({ id: OUTSIDE_ID })).toBeNull();
    expect(beliefTrajectory({ id: REPO_ID })).toBeNull();
  });

  it('sessionIndexForNum maps a session number onto the newest-first list index', () => {
    expect(sessionIndexForNum(5, 5)).toBe(0); // newest
    expect(sessionIndexForNum(1, 5)).toBe(4); // oldest
  });
});
