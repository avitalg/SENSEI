import { describe, expect, it } from 'vitest';
import { buildLocalDailyRecapText } from '../src/data/dailyRecap';
import type { CalendarUiEvent } from '../src/services/calendar';

function ev(partial: Partial<CalendarUiEvent> & { start: Date }): CalendarUiEvent {
  return {
    id: 'e1',
    title: 'פגישה',
    description: '',
    location: '',
    htmlLink: '',
    meetLink: '',
    allDay: false,
    end: new Date(+partial.start + 50 * 60_000),
    status: 'confirmed',
    attendees: [{ name: 'דנה לוי', email: '', self: false, response: 'accepted' }],
    source: 'fixture',
    ...partial,
  };
}

describe('buildLocalDailyRecapText', () => {
  it('returns the empty-day script when there are no meetings', () => {
    expect(buildLocalDailyRecapText([])).toBe('סיכום פתיחת יום. אין לך פגישות מתוזמנות היום.');
  });

  it('lists patient names and times for today\'s meetings', () => {
    const start = new Date(2026, 6, 21, 10, 30, 0);
    const text = buildLocalDailyRecapText([ev({ id: 'a', start })]);
    expect(text).toContain('סיכום פתיחת יום');
    expect(text).toContain('פגישה אחת');
    expect(text).toContain('דנה לוי');
    expect(text).toMatch(/10:30/);
  });
});
