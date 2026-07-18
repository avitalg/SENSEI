// The clinical letter moved out of the AI summary into a per-patient "מסמכים"
// (documents) section on the patient screen.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('patient screen — documents section', () => {
  it('exposes a מסמכים section with the clinical letter', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('מסמכים'));
    const letterBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('מכתב קליני'));
    expect(letterBtn, 'clinical letter is reachable from the patient documents').toBeTruthy();
  });
});
