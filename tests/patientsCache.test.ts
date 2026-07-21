import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPatientsCache,
  PATIENTS_STALE_MS,
  readPatientsCache,
  writePatientsCache,
} from '../src/query/patientsCache';
import type { Patient } from '../src/services/patients';

const sample: Patient[] = [{
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Jane',
  phone: '050',
  email: null,
  created_at: '2026-01-01T00:00:00Z',
  archived: false,
}];

afterEach(() => { clearPatientsCache(); });

describe('patientsCache', () => {
  it('round-trips data + updatedAt', () => {
    expect(readPatientsCache()).toBeNull();
    writePatientsCache(sample);
    const snap = readPatientsCache();
    expect(snap?.data).toEqual(sample);
    expect(typeof snap?.updatedAt).toBe('number');
    expect(Date.now() - (snap?.updatedAt || 0)).toBeLessThan(2000);
  });

  it('clearPatientsCache removes the snapshot', () => {
    writePatientsCache(sample);
    clearPatientsCache();
    expect(readPatientsCache()).toBeNull();
  });

  it('exposes a 5-minute stale window', () => {
    expect(PATIENTS_STALE_MS).toBe(5 * 60_000);
  });
});
