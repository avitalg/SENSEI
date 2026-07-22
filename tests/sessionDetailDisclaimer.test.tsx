// The session-detail screen surfaces the full AI-generated summary (insights,
// summary, topics, risk flags), so it must carry the shared clinical AI-aid
// disclaimer — same trust signal the prep report already shows — making the
// AI-generated nature and retained professional responsibility explicit.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { CLINICAL_DISCLAIMER } from '../src/components/shared/AiDisclaimer';

const PKEY = 'sensei_session_react_v1';
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('session detail — clinical AI disclaimer (trust signal)', () => {
  it('shows the shared AI-aid disclaimer on the full-summary session screen', async () => {
    window.location.hash = '#/session/p5/5';
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'session', patientId: 'p5', sessionNum: 5 }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    await waitFor(() => {
      const main = document.querySelector('#main-content');
      expect(main?.textContent).toContain(CLINICAL_DISCLAIMER);
    });
  });

  it('a bespoke session shows its own focus, not the generic sample topics (less cognitive load)', async () => {
    // Simba (p5) has session-specific מוקד/interventions, so the generic
    // "נושאים מרכזיים" list (which would be thematically mismatched) is suppressed.
    window.location.hash = '#/session/p5/5';
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'session', patientId: 'p5', sessionNum: 5 }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    await waitFor(() => {
      const main = document.querySelector('#main-content');
      expect(main?.textContent).toContain('מוקד:'); // real per-session focus is shown
      expect(main?.textContent).not.toContain('נושאים מרכזיים'); // generic block suppressed
    });
  });
});
