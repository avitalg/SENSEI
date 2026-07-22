// Store logic — the pure `resolveTheme` helper (explicit prefs pass through;
// `system` and unknown values resolve to a concrete theme).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resolveTheme } from '../src/store/AppStore';

afterEach(() => { cleanup(); localStorage.clear(); });

describe('store — resolveTheme (pure)', () => {
  it('maps explicit prefs and resolves system to a concrete theme', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
    expect(['light', 'dark']).toContain(resolveTheme('system'));
    expect(['light', 'dark']).toContain(resolveTheme('anything-unknown'));
  });
});
