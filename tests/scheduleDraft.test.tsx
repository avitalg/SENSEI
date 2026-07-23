// Schedule-dialog draft recovery — an accidental Escape/close on a NEW meeting
// form with a typed description must not discard it: the form is kept as a
// persisted draft (apptDraft) and offered for restore on the next open.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

const dialog = () => document.querySelector('[role="dialog"][aria-label="קביעת פגישה חדשה"]') as HTMLElement | null;
const openNewMeeting = async () => {
  const newBtn = await waitFor(() => {
    const b = document.querySelector('.calh-new-btn') as HTMLElement | null;
    if (!b) throw new Error('calendar new-meeting button not ready');
    return b;
  });
  fireEvent.click(newBtn);
  await waitFor(() => expect(dialog()).toBeTruthy());
};

describe('schedule dialog — draft recovery', () => {
  it('Escape keeps the typed description as a draft; reopening offers restore', async () => {
    mount({ view: 'app', route: 'calendar' });
    await openNewMeeting();
    fireEvent.input(document.querySelector('[aria-label="תיאור הפגישה"]') as HTMLElement, { target: { value: 'המשך עבודה על חשיפה' } });
    // accidental Escape (global cascade closes the dialog)
    await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }); });
    await waitFor(() => expect(dialog()).toBeFalsy());
    // reopen → recovery bar appears; restore brings the description back
    await openNewMeeting();
    await waitFor(() => expect(dialog()!.textContent).toContain('נמצאה טיוטת פגישה שלא נשמרה'));
    const restore = [...dialog()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'שחזור הטיוטה') as HTMLElement;
    fireEvent.click(restore);
    await waitFor(() => {
      const ta = document.querySelector('[aria-label="תיאור הפגישה"]') as HTMLTextAreaElement;
      expect(ta.value).toBe('המשך עבודה על חשיפה');
    });
    // the recovery bar is gone once restored
    expect(dialog()!.textContent).not.toContain('נמצאה טיוטת פגישה שלא נשמרה');
  });

  it('discard removes the draft; an untouched close leaves no draft', async () => {
    mount({ view: 'app', route: 'calendar' });
    await openNewMeeting();
    fireEvent.input(document.querySelector('[aria-label="תיאור הפגישה"]') as HTMLElement, { target: { value: 'טיוטה למחיקה' } });
    await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }); });
    await openNewMeeting();
    const discard = await waitFor(() => {
      const b = [...dialog()!.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'מחיקה') as HTMLElement;
      if (!b) throw new Error('discard not shown');
      return b;
    });
    fireEvent.click(discard);
    await waitFor(() => expect(dialog()!.textContent).not.toContain('נמצאה טיוטת פגישה שלא נשמרה'));
    // close with no typed description → no draft on the next open
    await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }); });
    await openNewMeeting();
    expect(dialog()!.textContent).not.toContain('נמצאה טיוטת פגישה שלא נשמרה');
  });
});
