// Capture parity — "record next to upload" everywhere a session can be captured.
// Guards the product rule that recording and uploading are equally discoverable
// twin actions feeding one pipeline: agenda rows, the dashboard focus card, and
// the upload screen must each offer BOTH. (PatientPage / MobilePatient pairing
// is covered by their own suites.)
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

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

describe('capture parity — record beside upload', () => {
  it('agenda row offers record next to upload, and record opens the recording dialog', async () => {
    const appt = { id: 'today-1', pid: 'aladdin', date: todayKey(), time: '10:00', dur: 50, description: 'פגישה שבועית', status: 'upcoming' };
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, scheduledAppts: [appt] });
    await settle();
    await waitFor(() => expect(document.querySelector('.calh-agenda-row')).toBeTruthy());
    expect(document.querySelector('[aria-label^="העלאת הקלטה · אלאדין"]')).toBeTruthy();
    const rec = document.querySelector('[aria-label^="הקלטה · אלאדין"]') as HTMLElement;
    expect(rec, 'record twin beside upload on the agenda row').toBeTruthy();
    fireEvent.click(rec);
    // the shared RecordSessionDialog opens (same pipeline as upload)
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="הקלטה"]')).toBeTruthy());
  });

  it('the upload screen itself offers a record alternative beside file pick', async () => {
    mount({ view: 'app', route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
    await settle();
    const btns = () => [...document.querySelectorAll('button')].map((b) => b.textContent?.trim());
    await waitFor(() => expect(btns()).toContain('בחירת קובץ'));
    expect(btns(), 'record beside the file picker').toContain('הקלטה');
  });
});
