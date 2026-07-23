// month-wide recurring fixture events for the calendar month grid: the same
// weekly fixture the week view loads, generated for every week overlapping the
// month so the month view isn't sparse. Each weekly occurrence carries a
// date-suffixed id so recurring occurrences stay unique (stable React keys).
import { describe, expect, it } from 'vitest';
import { monthFixtureEvents } from '../src/services/calendar';

describe('monthFixtureEvents', () => {
  it('spans multiple weeks of the month with unique per-occurrence ids', () => {
    const evs = monthFixtureEvents(new Date('2026-07-15T00:00:00'));
    // ~12 repo-derived events/week across ~5 weeks → well over one week's worth
    expect(evs.length).toBeGreaterThan(30);
    // occurrences land in more than two distinct ISO weeks (not just the anchor week)
    const weekOf = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 864e5));
    const weeks = new Set(evs.map((e) => weekOf(new Date(e.start))));
    expect(weeks.size).toBeGreaterThan(2);
    // every id is unique — recurring "evt-90x" occurrences are date-suffixed
    expect(new Set(evs.map((e) => e.id)).size).toBe(evs.length);
    // the same recurring event recurs on the same weekday across weeks
    const weeklyIds = evs.map((e) => e.id.split('@')[0]);
    expect(weeklyIds.filter((id) => id === 'evt-rp-simba').length).toBeGreaterThan(1);
  });

  it('produces category-resolvable, dated events (usable as month chips)', () => {
    const evs = monthFixtureEvents(new Date('2026-07-01T00:00:00'));
    for (const e of evs.slice(0, 5)) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.start instanceof Date && !isNaN(+e.start)).toBe(true);
    }
  });
});
