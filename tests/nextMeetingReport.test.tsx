// דוח הכנה לפגישה (spec, priority 1) — the prep report is a nav destination
// again, deep-linkable per patient, and every clinical statement on it comes
// from the repository dataset (insight, summary, topics, stated next focus).
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { repoPatient } from '../src/data/mockPatientsRepo';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('prep report — nav destination + dataset-backed body', () => {
  it('is reachable from the sidebar and renders the selected patient’s dataset content', async () => {
    mount({ view: 'app', route: 'dashboard', patientId: 'simba' });
    await settle();
    const navLink = [...document.querySelectorAll('a')].find((a) => a.textContent?.includes('דוח הכנה לפגישה'));
    expect(navLink, 'sidebar carries the prep-report tab').toBeTruthy();
    fireEvent.click(navLink!);
    await waitFor(() => expect(document.querySelector('#main-content h1')?.textContent).toBe('דוח הכנה לפגישה'));

    const simba = repoPatient('simba')!;
    const last = simba.sessions[simba.sessions.length - 1];
    const main = document.querySelector('#main-content')!;
    // quick review = the latest session's key insight, verbatim
    expect(main.textContent).toContain(last.insight.slice(0, 40));
    // last-session summary, verbatim
    expect(main.textContent).toContain(last.summary.slice(0, 40));
    // follow-up points = the latest session's topics
    for (const t of last.topics) expect(main.textContent).toContain(t);
    // stated next focus becomes a goal for the coming session
    expect(last.nextFocus).toBeTruthy();
    expect(main.textContent).toContain(last.nextFocus!.slice(0, 30));
  });

  it('switching the patient reloads the report for that patient', async () => {
    mount({ view: 'app', route: 'nextMeetingReport', patientId: 'simba' });
    await settle();
    const select = document.querySelector('select[aria-label="בחירת מטופל"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    fireEvent.change(select, { target: { value: 'אלזה' } });
    const elsa = repoPatient('elsa')!;
    const lastElsa = elsa.sessions[elsa.sessions.length - 1];
    await waitFor(() => expect(document.querySelector('#main-content')!.textContent).toContain(lastElsa.insight.slice(0, 40)));
  });

  it('deep link #/nextMeetingReport/<id> opens the right patient', async () => {
    window.location.hash = '#/nextMeetingReport/mulan';
    mount({ view: 'app', route: 'dashboard' });
    await settle();
    await waitFor(() => {
      expect(document.querySelector('#main-content h1')?.textContent).toBe('דוח הכנה לפגישה');
      expect(document.querySelector('#main-content')!.textContent).toContain('מולאן');
    });
    window.location.hash = '';
  });

  it('exposes an accessible audio player and resets it when switching patients', async () => {
    mount({ view: 'app', route: 'nextMeetingReport', patientId: 'simba' });
    await settle();
    const play = document.querySelector('[aria-label="ניגון התקציר הקולי"]') as HTMLButtonElement;
    const progress = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(play?.getAttribute('aria-pressed')).toBe('false');
    expect(progress?.getAttribute('aria-valuemin')).toBe('0');
    expect(progress?.getAttribute('aria-valuemax')).toBe('100');

    fireEvent.click(play);
    expect(document.querySelector('[aria-label="השהיית התקציר הקולי"]')?.getAttribute('aria-pressed')).toBe('true');

    const select = document.querySelector('select[aria-label="בחירת מטופל"]') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'אלזה' } });
    await waitFor(() => {
      expect(document.querySelector('[aria-label="ניגון התקציר הקולי"]')?.getAttribute('aria-pressed')).toBe('false');
      expect(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0');
    });
  });

  it('shows provenance metadata and refreshes the report with visible progress', async () => {
    mount({ view: 'app', route: 'nextMeetingReport', patientId: 'simba' });
    await settle();
    const main = document.querySelector('#main-content') as HTMLElement;
    expect(main.textContent).toContain('נתוני הדגמה מקומיים');
    expect(main.textContent).toContain('טלפון:');

    const refresh = [...main.querySelectorAll('button')].find((b) => b.textContent === 'רענון דוח') as HTMLButtonElement;
    expect(refresh).toBeTruthy();
    fireEvent.click(refresh);
    expect(refresh.getAttribute('aria-busy')).toBe('true');
    expect(refresh.textContent).toBe('מעדכן…');
    await waitFor(() => expect(document.body.textContent).toContain('דוח ההכנה עודכן מהמידע האחרון בתיק'), { timeout: 1000 });
    expect(refresh.getAttribute('aria-busy')).toBe('false');
  });
});
