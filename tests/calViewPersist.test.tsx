// Calendar view preference — the segmented month/week/day choice persists
// across visits and reloads (S.calViewPref, a PERSIST_KEY): a therapist who
// works in month view must not have to re-select it on every calendar visit.
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

const segBtn = (label: string) => [...document.querySelectorAll('.calh-seg-btn')].find((b) => b.textContent?.trim() === label) as HTMLElement;

describe('calendar — view preference persists', () => {
  it('choosing month view sticks across a full remount (reload)', async () => {
    mount({ view: 'app', route: 'calendar' });
    await settle();
    await waitFor(() => expect(segBtn('חודש')).toBeTruthy());
    // desktop default is week; explicitly choose month
    expect(segBtn('שבוע').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(segBtn('חודש'));
    await waitFor(() => expect(segBtn('חודש').getAttribute('aria-pressed')).toBe('true'));
    // the choice lands in the persisted store snapshot
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PKEY) || '{}');
      expect(saved.calViewPref).toBe('month');
    });
    // simulate a reload: unmount, then mount fresh from localStorage
    cleanup();
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    await waitFor(() => expect(segBtn('חודש')?.getAttribute('aria-pressed')).toBe('true'));
  });
});
