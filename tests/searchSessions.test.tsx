// Regression: unified search must return SESSION matches, not just patients.
// Before the fix, SearchPage's local buildSessions() hardcoded `n = 0`, so the
// loop never ran and the "פגישות" category was always empty — session search
// silently returned nothing despite the advertised "חיפוש מטופלים ופגישות".
// SearchPage now reuses the canonical buildPatientSessions() (single source of
// truth), so a query matching a session summary surfaces real results.
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
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('unified search — session results', () => {
  it('surfaces session-summary matches (not only patients)', async () => {
    // searchQuery isn't persisted, so drive it through the real input.
    mount({ view: 'app', route: 'search' });
    await settle();
    const input = document.querySelector('.search-main-input') as HTMLInputElement;
    // "האקונה" appears only inside Simba's session summaries (dataset content),
    // never in a patient name/phone — finding it proves the sessions pipeline
    // actually produced results from the repository data.
    fireEvent.change(input, { target: { value: 'האקונה' } });
    await waitFor(() => expect(document.body.textContent).toContain('האקונה'));
  });

  it('matches therapist-recording content and deep-links to the matched session', async () => {
    mount({ view: 'app', route: 'search' });
    await settle();
    const input = document.querySelector('.search-main-input') as HTMLInputElement;
    // "סוחר" exists ONLY in aladdin's recorded_sessions.md (session 3 recording
    // + note) — never in a summary — so a hit proves the therapist-doc fields
    // are searchable.
    fireEvent.change(input, { target: { value: 'סוחר' } });
    await waitFor(() => expect(document.body.textContent).toContain('פגישה 3 · אלאדין'));
    const row = [...document.querySelectorAll('.search-result-row')].find((r) => r.textContent?.includes('פגישה 3')) as HTMLElement;
    fireEvent.click(row);
    await waitFor(() => expect(window.location.hash).toBe('#/session/aladdin/3'));
  });

  it('surfaces open follow-up tasks as a search category with a source-session link', async () => {
    const { openRepoTasks } = await import('../src/data/mockPatientsRepo');
    const task = openRepoTasks()[0];
    // Probe with a distinctive chunk of the task's own description.
    const probe = task.description.split(' ').slice(0, 3).join(' ');
    mount({ view: 'app', route: 'search' });
    await settle();
    const input = document.querySelector('.search-main-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: probe } });
    await waitFor(() => expect(document.body.textContent).toContain('משימות'));
    const row = [...document.querySelectorAll('.search-result-row')].find((r) => r.textContent?.includes(task.title)) as HTMLElement;
    expect(row).toBeTruthy();
    fireEvent.click(row);
    await waitFor(() => expect(window.location.hash).toBe('#/session/' + task.patientId + '/' + task.sessionNum));
  });
});
