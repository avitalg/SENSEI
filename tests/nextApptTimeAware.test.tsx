// Bug fix — the Patients table's "next appointment" is time-aware: an
// appointment earlier TODAY is not shown as the patient's next one (matching
// the dashboard who's-next + patient-detail upcoming list).
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const rowFor = (name: string) => [...document.querySelectorAll('.pat-row')].find((r) => (r.querySelector('.pat-col-identity')?.textContent || '').includes(name)) as HTMLElement;

describe('patients — next appointment is time-aware', () => {
  it('an appointment earlier today is not shown as "next"; a later-today one is', async () => {
    mount({ view: 'app', route: 'patients', scheduledAppts: [
      { id: 'past', pid: 'aladdin', date: todayKey(), time: '00:01', dur: 50 },   // earlier today
      { id: 'future', pid: 'bruce_wayne', date: todayKey(), time: '23:59', dur: 50 },  // later today
    ] });
    await settle();
    await waitFor(() => expect(document.querySelector('.pat-row')).toBeTruthy());
    // p1 (past) shows the empty next-date state; p2 (future) shows its time
    expect(rowFor('אלאדין')?.querySelector('.pat-col-nextdate')?.textContent).toContain('אין פגישה מתוכננת');
    expect(rowFor('ברוס וויין')?.querySelector('.pat-col-time')?.textContent).toContain('23:59');
  });
});
