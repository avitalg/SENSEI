import { describe, expect, it } from 'vitest';
import { monthFixtureEvents } from '../src/services/calendar';

describe('monthFixtureEvents', () => {
  it('does not project historical repository sessions into future months', () => {
    expect(monthFixtureEvents(new Date('2026-07-15T00:00:00'))).toEqual([]);
  });

  it('is stable for any requested month', () => {
    expect(monthFixtureEvents(new Date('2027-01-01T00:00:00'))).toEqual([]);
  });
});
