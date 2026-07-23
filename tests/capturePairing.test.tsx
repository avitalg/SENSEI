// Unified capture (spec) — everywhere a session can be captured there is ONE
// "הוספת מפגש" action that opens the shared tabbed dialog (הקלטה / העלאת קובץ),
// feeding one pipeline. Guards the agenda row, the dialog's tab pair, and the
// upload screen's record alternative. (PatientPage / MobilePatient coverage
// lives in their own suites.)
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

describe('unified capture — one action, tabbed dialog', () => {
  it('the agenda row offers one capture action that opens the tabbed dialog', async () => {
    const appt = { id: 'today-1', pid: 'aladdin', date: todayKey(), time: '10:00', dur: 50, description: 'פגישה שבועית', status: 'upcoming' };
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, scheduledAppts: [appt] });
    await settle();
    await waitFor(() => expect(document.querySelector('.calh-agenda-row')).toBeTruthy());
    // spec: the twin upload icon is gone — one unified action per row
    expect(document.querySelector('[aria-label^="העלאת הקלטה · אלאדין"]')).toBeFalsy();
    const capture = document.querySelector('[aria-label^="הוספת מפגש · אלאדין"]') as HTMLElement;
    expect(capture, 'the unified capture action on the agenda row').toBeTruthy();
    fireEvent.click(capture);
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]')).toBeTruthy());
    const tabs = [...document.querySelectorAll('[role="dialog"] [role="tab"]')].map((t) => t.textContent);
    expect(tabs, 'the dialog carries the two spec tabs').toEqual(['הקלטה', 'העלאת קובץ']);
  });

  it('the upload tab hands off to the upload screen with the same patient', async () => {
    const appt = { id: 'today-1', pid: 'aladdin', date: todayKey(), time: '10:00', dur: 50, description: 'פגישה שבועית', status: 'upcoming' };
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, scheduledAppts: [appt] });
    await settle();
    await waitFor(() => expect(document.querySelector('.calh-agenda-row')).toBeTruthy());
    fireEvent.click(document.querySelector('[aria-label^="הוספת מפגש · אלאדין"]') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]')).toBeTruthy());
    fireEvent.click([...document.querySelectorAll('[role="dialog"] [role="tab"]')].find((t) => t.textContent === 'העלאת קובץ') as HTMLElement);
    fireEvent.click([...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent?.includes('בחירת קובץ להעלאה')) as HTMLElement);
    await waitFor(() => expect(window.location.hash).toBe('#/upload'));
    // the upload screen keeps the row's patient context
    await waitFor(() => expect(document.querySelector('[aria-label="המטופל שנבחר להעלאה"]')).toBeTruthy());
    expect(document.querySelector('[aria-label="בחירת מטופל להעלאה"]')).toBeFalsy();
    expect(document.querySelector('[aria-label="המטופל שנבחר להעלאה"]')?.textContent).toContain('אלאדין');
  });

  it('the upload screen itself offers a record alternative beside file pick', async () => {
    mount({ view: 'app', route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
    await settle();
    const btns = () => [...document.querySelectorAll('button')].map((b) => b.textContent?.trim());
    await waitFor(() => expect(btns()).toContain('בחירת קובץ'));
    expect(btns(), 'record beside the file picker').toContain('הקלטה');
  });
});
