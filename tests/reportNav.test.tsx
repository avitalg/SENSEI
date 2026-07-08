// Prep report links to full meeting history for the patient.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('prep report — onward navigation to meeting history', () => {
  it('offers a full-history link that navigates to the patient meeting history page', async () => {
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(document.querySelector('.rep-history-link')).toBeTruthy());
    fireEvent.click(document.querySelector('.rep-history-link')!);
    await waitFor(() => expect(document.querySelector('#main-content h1')?.textContent).toContain('היסטוריית פגישות'));
  });
});
