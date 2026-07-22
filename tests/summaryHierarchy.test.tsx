// Clinical summary section order — "what requires attention" must lead the
// detail sections. דגלי סיכון (risk flags) render directly after the summary,
// BEFORE נושאים מרכזיים (main topics) and המשך ומעקב (follow-ups), so a
// therapist scanning the page sees risk indicators first rather than last.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any> = {}) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'summary', patientId: 'p1', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = (ms = 120) => act(() => new Promise((r) => setTimeout(r, ms)));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('summary section hierarchy', () => {
  it('renders דגלי סיכון before נושאים מרכזיים', async () => {
    mount();
    await settle();
    let risk: HTMLElement | undefined, topics: HTMLElement | undefined;
    await waitFor(() => {
      const h2 = [...document.querySelectorAll('h2')];
      risk = h2.find((h) => h.textContent?.trim() === 'דגלי סיכון') as HTMLElement;
      topics = h2.find((h) => h.textContent?.trim() === 'נושאים מרכזיים') as HTMLElement;
      expect(risk && topics).toBeTruthy();
    }, { timeout: 3000 });
    // DOCUMENT_POSITION_FOLLOWING (4) means `topics` comes after `risk`.
    expect(risk!.compareDocumentPosition(topics!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
