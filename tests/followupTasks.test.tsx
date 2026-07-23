// Follow-up tasks surface — the repository's own "לתשומת לב" / "לפעם הבאה"
// notes reach the dashboard as open tasks (latest session per patient only),
// and each one deep-links to its originating session.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { openRepoTasks, repoTasks, repoPatients } from '../src/data/mockPatientsRepo';

describe('openRepoTasks — derived open follow-ups', () => {
  it('keeps only each patient\'s latest-session tasks, with no duplicates', () => {
    const open = openRepoTasks();
    expect(open.length).toBeGreaterThan(0);
    const latestByPatient = new Map(repoPatients().filter((p) => p.sessions.length)
      .map((p) => [p.id, p.sessions[p.sessions.length - 1].num]));
    for (const t of open) expect(t.sessionNum).toBe(latestByPatient.get(t.patientId));
    expect(new Set(open.map((t) => t.id)).size).toBe(open.length);
  });

  it('is a strict subset of repoTasks with priorities ordered high → unstated', () => {
    const all = new Set(repoTasks().map((t) => t.id));
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    let prev = -1;
    for (const t of openRepoTasks()) {
      expect(all.has(t.id)).toBe(true);
      const r = rank[t.priority ?? ''] ?? 3;
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });

  it('never invents content — every description exists verbatim in the session', () => {
    for (const t of openRepoTasks()) {
      const p = repoPatients().find((x) => x.id === t.patientId)!;
      const s = p.sessions.find((x) => x.num === t.sessionNum)!;
      expect([s.attention, s.nextFocus]).toContain(t.description);
      expect(t.dueDate).toBeNull(); // the dataset states no due dates
    }
  });
});

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('dashboard — follow-up tasks card', () => {
  it('lists open repository follow-ups and deep-links to the source session', async () => {
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('משימות להמשך טיפול'));
    const row = document.querySelector('[aria-label^="משימת המשך · "]') as HTMLElement;
    expect(row).toBeTruthy();
    const first = openRepoTasks()[0];
    fireEvent.click(row);
    await waitFor(() => expect(window.location.hash).toBe('#/session/' + first.patientId + '/' + first.sessionNum));
  });

  it('hides the card when no repository patient is active', async () => {
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, patients: [], removedPatientIds: repoPatients().map((p) => p.id) });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('הפגישה הבאה'));
    expect(document.body.textContent).not.toContain('משימות להמשך טיפול');
  });
});
