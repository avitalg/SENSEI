// Content hierarchy — on the session summary, risk flags ("what requires
// attention") render directly after the summary, BEFORE topics/follow-ups;
// they must never sit at the bottom of the page.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('summary page — risk flags lead the detail sections', () => {
  it('דגלי סיכון appears before נושאים מרכזיים', async () => {
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'summary', patientId: 'dumbo' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await act(() => new Promise((r) => setTimeout(r, 150)));
    await waitFor(() => expect(document.body.textContent).toContain('דגלי סיכון'));
    const h2s = [...document.querySelectorAll('#main-content h2, .mob-content h2')].map((h) => h.textContent || '');
    const risk = h2s.findIndex((t) => t.includes('דגלי סיכון'));
    const topics = h2s.findIndex((t) => t.includes('נושאים מרכזיים'));
    expect(risk).toBeGreaterThanOrEqual(0);
    expect(topics).toBeGreaterThanOrEqual(0);
    expect(risk).toBeLessThan(topics);
  });
});
