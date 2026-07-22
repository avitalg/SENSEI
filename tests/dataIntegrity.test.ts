// Data-integrity guards for the offline demo lifecycle: seed reconciliation must
// not resurrect archived/deleted records, the appointment merge key must keep
// different-day slots distinct, and dashboard aggregates must ignore
// appointments whose patient is no longer in the active roster (an archived
// patient's retained appts must never count or render under another name).
import { describe, expect, it } from 'vitest';
import { buildMockScheduledAppts, MOCK_PATIENTS, reconcileMockAppts, reconcileMockPatients } from '../src/data/mockPatients';
import { mergeAppointments } from '../src/utils';
import { dashboardStats } from '../src/utils/dashboardStats';

const localDayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('reconcileMockPatients — no resurrection of archived/deleted seed patients', () => {
  const victim = MOCK_PATIENTS[2].id;
  const withoutVictim = MOCK_PATIENTS.filter((p) => p.id !== victim).map((p) => ({ ...p }));

  it('re-seeds a genuinely missing seed patient when nothing marks it absent', () => {
    const out = reconcileMockPatients(withoutVictim);
    expect(out.map((p: any) => p.id)).toContain(victim); // baseline: backfill still works for NEW seeds
  });

  it('does NOT re-add a seed patient listed as known-absent (archived / permanently deleted)', () => {
    const out = reconcileMockPatients(withoutVictim, [victim]);
    expect(out.map((p: any) => p.id)).not.toContain(victim);
    expect(out.length).toBe(withoutVictim.length); // no duplicate, no resurrection
  });

  it('never resurrects on an empty roster when the id is tombstoned', () => {
    const out = reconcileMockPatients([], [victim]);
    expect(out.map((p: any) => p.id)).not.toContain(victim);
  });
});

describe('reconcileMockAppts — deleted meetings do not resurrect', () => {
  const now = new Date('2026-07-21T09:00:00');
  const fresh = buildMockScheduledAppts(now);
  const pid = fresh[0].pid;
  const withoutPid = fresh.filter((a) => a.pid !== pid); // user deleted all of pid's meetings

  it('baseline: an empty pid gets re-seeded when nothing marks it dismissed', () => {
    const out = reconcileMockAppts(withoutPid, {}, now);
    expect(out.some((a) => a.pid === pid)).toBe(true);
  });

  it('does not re-add appts for a permanently-deleted patient (removedPids)', () => {
    const out = reconcileMockAppts(withoutPid, { removedPids: [pid] }, now);
    expect(out.some((a) => a.pid === pid)).toBe(false);
  });

  it('does not re-add a specific deleted meeting id (hiddenMeetingIds)', () => {
    const hidden = fresh.filter((a) => a.pid === pid).map((a) => a.id);
    const out = reconcileMockAppts(withoutPid, { apptIds: hidden }, now);
    expect(out.some((a) => a.pid === pid)).toBe(false);
  });
});

describe('mergeAppointments — different-day slots stay distinct', () => {
  it('keeps same patient + same time on different dates as two rows', () => {
    const merged = mergeAppointments([], [
      { pid: 'p1', time: '09:00', date: '2026-07-21' },
      { pid: 'p1', time: '09:00', date: '2026-07-28' },
    ]);
    expect(merged.length).toBe(2);
    expect(new Set(merged.map((m) => m.id)).size).toBe(2); // unique React keys
  });
});

describe('dashboardStats — ignores appts of non-active patients', () => {
  it('excludes an orphaned appt (pid not in the active roster) from today/week counts', () => {
    const now = new Date('2026-07-21T08:00:00');
    const dk = localDayKey(now);
    const stats = dashboardStats(
      [
        { id: 'a1', pid: 'p1', date: dk, time: '10:00', dur: 50 },
        { id: 'a2', pid: 'ghost', date: dk, time: '11:00', dur: 50 }, // archived/deleted patient
      ],
      [{ id: 'p1', name: 'פעיל' }],
      now,
    );
    expect(stats.today).toBe(1); // only the active patient's appt is counted
    expect(stats.next?.pid).toBe('p1');
    expect(stats.upcoming.every((a: any) => a.pid === 'p1')).toBe(true);
  });
});
