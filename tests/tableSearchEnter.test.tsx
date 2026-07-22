// Efficiency — pressing Enter in a table search jumps to the TOP matching row
// (fewer taps: type a name → Enter → open the file). Guarded: Enter with no
// active query, or a query with no results, does nothing.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('table search — Enter opens the top match', () => {
  it('typing a patient name + Enter navigates to that patient file', async () => {
    mount({ view: 'app', route: 'patients' });
    await settle();
    const input = await waitFor(() => {
      const el = document.querySelector('[aria-label="חיפוש מטופלים"]') as HTMLInputElement;
      if (!el) throw new Error('search not ready');
      return el;
    });
    fireEvent.change(input, { target: { value: 'הארי' } });
    await waitFor(() => expect(document.querySelectorAll('.pat-row').length).toBe(1));
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/patient\//));
  });

  it('Enter with an empty query does nothing (stays on the list)', async () => {
    mount({ view: 'app', route: 'patients' });
    await settle();
    const input = await waitFor(() => document.querySelector('[aria-label="חיפוש מטופלים"]') as HTMLInputElement);
    fireEvent.keyDown(input, { key: 'Enter' });
    await settle();
    expect(window.location.hash === '' || window.location.hash === '#/patients').toBe(true);
    expect(document.querySelector('[aria-label="חיפוש מטופלים"]')).toBeTruthy(); // still on the roster
  });
});
