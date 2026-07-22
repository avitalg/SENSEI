// Israeli phone validation — forgiving on separators, strict on digit count.
// Previously any input ≥3 chars passed ("5" was accepted); now real formats only.
import { describe, expect, it } from 'vitest';
import { isValidPhone } from '../src/utils';

describe('isValidPhone', () => {
  it('accepts real Israeli formats', () => {
    for (const ok of ['050-1234567', '0501234567', '03-1234567', '031234567', '054 987 6543', '+972-50-1234567', '+972501234567']) {
      expect(isValidPhone(ok), ok).toBe(true);
    }
  });
  it('accepts international form that keeps the redundant trunk 0 (+972-050-…)', () => {
    // Commonly typed even though the 0 is dropped in strict E.164; must match the
    // local 0501234567 / stripped +972501234567 forms it is equivalent to.
    for (const ok of ['+972-050-1234567', '+9720501234567', '+972-02-1234567', '+972 054 987 6543']) {
      expect(isValidPhone(ok), ok).toBe(true);
    }
  });
  it('rejects too-short / non-numeric / malformed input', () => {
    for (const bad of ['', '   ', '5', '12', 'abc', '12345', '00-1234567', '123456789012345', '+1-555-1234567', '501234567']) {
      expect(isValidPhone(bad), bad).toBe(false);
    }
  });
});
