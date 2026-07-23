// Home workload/attention math — the single source the summary strip and focus
// zone both read, so their numbers can never disagree.
import { describe, expect, it } from 'vitest';
import { dashboardStats, openDraftPids } from '../src/utils/dashboardStats';

const pad = (n: number) => String(n).padStart(2, '0');
const key = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const shift = (from: Date, days: number) => { const d = new Date(from); d.setDate(d.getDate() + days); return d; };

describe('dashboardStats', () => {
  // A Wednesday, so the Sun–Sat week straddles both sides of "now".
  const now = new Date(2026, 6, 15, 10, 0); // 2026-07-15 10:00
  const appt = (pid: string, date: Date, time: string) => ({ id: pid + time, pid, date: key(date), time, dur: 50 });
  const patients = [{ id: 'aladdin' }, { id: 'bruce_wayne' }, { id: 'dumbo' }];

  it('counts today, this week, and finds the next upcoming session', () => {
    const appts = [
      appt('aladdin', now, '14:00'),            // today, later → upcoming
      appt('aladdin', now, '08:00'),            // today, already past
      appt('bruce_wayne', shift(now, 1), '09:00'),  // tomorrow (same week)
      appt('dumbo', shift(now, 9), '11:00'),  // next week
    ];
    const s = dashboardStats(appts, patients, now);
    expect(s.today).toBe(2);
    expect(s.week).toBe(3);                // Sun–Sat: both today + tomorrow, not next week
    expect(s.next?.pid).toBe('aladdin');        // 14:00 today is the earliest future
    expect(s.next?.time).toBe('14:00');
    expect(s.upcoming.map((a) => a.id)).toEqual(['aladdin14:00', 'bruce_wayne09:00', 'dumbo11:00']);
  });

  it('lists active patients with no upcoming appointment as awaiting scheduling', () => {
    const s = dashboardStats([appt('aladdin', shift(now, 2), '10:00')], patients, now);
    expect(s.awaitingPids).toEqual(['bruce_wayne', 'dumbo']);
  });

  it('handles empty input safely', () => {
    const s = dashboardStats(undefined, undefined, now);
    expect(s).toMatchObject({ today: 0, week: 0, next: null, upcoming: [], awaitingPids: [] });
  });
});

describe('openDraftPids', () => {
  it('returns patients with a non-empty notes or summary draft, de-duplicated', () => {
    expect(openDraftPids({ aladdin: 'x', bruce_wayne: '   ' }, { bruce_wayne: 'y', dumbo: '' }).sort()).toEqual(['aladdin', 'bruce_wayne']);
  });
  it('is empty when there are no drafts', () => {
    expect(openDraftPids(undefined, undefined)).toEqual([]);
  });
});
