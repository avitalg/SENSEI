// Home workload/attention math — the single source the summary strip and focus
// zone both read, so their numbers can never disagree.
import { describe, expect, it } from 'vitest';
import { dashboardStats, dashboardStatsFromEvents, openDraftPids } from '../src/utils/dashboardStats';

const pad = (n: number) => String(n).padStart(2, '0');
const key = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const shift = (from: Date, days: number) => { const d = new Date(from); d.setDate(d.getDate() + days); return d; };

describe('dashboardStats', () => {
  // A Wednesday, so the Sun–Sat week straddles both sides of "now".
  const now = new Date(2026, 6, 15, 10, 0); // 2026-07-15 10:00
  const appt = (pid: string, date: Date, time: string) => ({ id: pid + time, pid, date: key(date), time, dur: 50 });
  const patients = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];

  it('counts today, this week, and finds the next upcoming session', () => {
    const appts = [
      appt('p1', now, '14:00'),            // today, later → upcoming
      appt('p1', now, '08:00'),            // today, already past
      appt('p2', shift(now, 1), '09:00'),  // tomorrow (same week)
      appt('p3', shift(now, 9), '11:00'),  // next week
    ];
    const s = dashboardStats(appts, patients, now);
    expect(s.today).toBe(2);
    expect(s.week).toBe(3);                // Sun–Sat: both today + tomorrow, not next week
    expect(s.next?.pid).toBe('p1');        // 14:00 today is the earliest future
    expect(s.next?.time).toBe('14:00');
    expect(s.upcoming.map((a) => a.id)).toEqual(['p114:00', 'p209:00', 'p311:00']);
  });

  it('lists active patients with no upcoming appointment as awaiting scheduling', () => {
    const s = dashboardStats([appt('p1', shift(now, 2), '10:00')], patients, now);
    expect(s.awaitingPids).toEqual(['p2', 'p3']);
  });

  it('handles empty input safely', () => {
    const s = dashboardStats(undefined, undefined, now);
    expect(s).toMatchObject({ today: 0, week: 0, next: null, upcoming: [], awaitingPids: [] });
  });
});

describe('dashboardStatsFromEvents', () => {
  const now = new Date(2026, 6, 15, 10, 0);
  const patients = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
  const ev = (id: string, pid: string, start: Date, end?: Date) => ({
    id,
    patientId: pid,
    start,
    end: end || new Date(start.getTime() + 50 * 60_000),
  });

  it('picks the earliest patient-linked upcoming meeting and awaiting roster', () => {
    const events = [
      ev('a', 'p1', new Date(2026, 6, 15, 14, 0)),
      ev('b', 'p2', new Date(2026, 6, 16, 9, 0)),
      { id: 'orphan', patientId: null, start: new Date(2026, 6, 15, 11, 0), end: new Date(2026, 6, 15, 12, 0) },
      ev('past', 'p3', new Date(2026, 6, 15, 8, 0), new Date(2026, 6, 15, 8, 50)),
    ];
    const s = dashboardStatsFromEvents(events, patients, now);
    expect(s.next?.pid).toBe('p1');
    expect(s.next?.time).toBe('14:00');
    expect(s.awaitingPids).toEqual(['p3']);
  });

  it('treats in-progress meetings (end > now) as upcoming', () => {
    const s = dashboardStatsFromEvents(
      [ev('now', 'p2', new Date(2026, 6, 15, 9, 30), new Date(2026, 6, 15, 10, 30))],
      patients,
      now,
    );
    expect(s.next?.pid).toBe('p2');
    expect(s.awaitingPids).toEqual(['p1', 'p3']);
  });
});

describe('openDraftPids', () => {
  it('returns patients with a non-empty notes or summary draft, de-duplicated', () => {
    expect(openDraftPids({ p1: 'x', p2: '   ' }, { p2: 'y', p3: '' }).sort()).toEqual(['p1', 'p2']);
  });
  it('is empty when there are no drafts', () => {
    expect(openDraftPids(undefined, undefined)).toEqual([]);
  });
});
