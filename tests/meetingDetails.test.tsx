// Clicking a meeting on the calendar workspace must open the meeting-DETAILS dialog
// (with a recap + per-meeting actions), not jump straight to the Patients tab.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('home — meeting details on click', () => {
  it('opens the meeting-details dialog with recap + record/upload actions', async () => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    mount({ view: 'app', route: 'calendar', scheduledAppts: [{ id: 'user-details-test', pid: 'aladdin', date, time: '23:00', dur: 50 }] });
    await settle();
    const event = await waitFor(() => {
      const el = document.querySelector('.calh-event') as HTMLElement;
      expect(el).toBeTruthy();
      return el;
    });
    fireEvent.click(event);
    // a modal dialog (not a navigation to the patient file)
    const dialog = await waitFor(() => {
      const d = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(d).toBeTruthy();
      return d;
    });
    const txt = dialog.textContent || '';
    expect(txt).toContain('סקירה מהירה'); // recap (prep content lives here now)
    expect(txt).toContain('הוספת מפגש');  // unified capture-for-this-meeting action (spec)
    expect(txt).toContain('מעבר לתיק המטופל');  // still can open the file
  });
});
