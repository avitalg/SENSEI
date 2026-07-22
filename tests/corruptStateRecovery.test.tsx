// Resilience — a corrupt persisted blob must not crash boot, and must be
// preserved to a backup key (it may hold unrecoverable therapist content that
// the next debounced persist would otherwise silently overwrite).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
afterEach(() => { cleanup(); localStorage.clear(); });

describe('store — corrupt persisted state', () => {
  it('boots to defaults and preserves the corrupt blob for manual recovery', async () => {
    localStorage.setItem(PKEY, '{definitely not json');
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(document.querySelector('#root *, body *')).toBeTruthy());
    expect(localStorage.getItem(PKEY + '_corrupt_backup')).toBe('{definitely not json');
  });

  it('does NOT create a backup when the blob parses cleanly (backup is parse-scoped)', async () => {
    // A valid, restorable session. The backup path must fire ONLY on a parse
    // failure — never for a good blob, even if a later apply step were to throw.
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: 1, view: 'app', route: 'summary', patientId: 'p1' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(document.querySelector('#root *, body *')).toBeTruthy());
    expect(localStorage.getItem(PKEY + '_corrupt_backup')).toBeNull();
  });
});
