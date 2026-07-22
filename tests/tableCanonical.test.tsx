// Canonical table contract — the Patients table is the single source of truth;
// Archive and the Meeting-History directory must render identity, headers, and
// empty-state recovery the same way (differing only by their data/actions).
// Locks: shared PatientIdentity in all three tables (40px avatar), a visible
// "פעולות" header in Archive, and the canonical query-empty recovery in MHD.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

const avatarOf = (rowSel: string) => {
  const row = document.querySelector(rowSel) as HTMLElement;
  const av = row?.querySelector('span[style*="border-radius: 50%"], span[style*="50%"]') as HTMLElement;
  return av?.style.width;
};

describe('canonical table — one identity implementation everywhere', () => {
  it('all three tables import the shared PatientIdentity (static)', () => {
    const root = resolve(__dirname, '..');
    for (const f of ['src/pages/PatientsPage.tsx', 'src/pages/PatientArchivePage.tsx', 'src/pages/PatientMeetingHistoryPage.tsx']) {
      const t = readFileSync(resolve(root, f), 'utf8');
      expect(t, f + ' uses the canonical identity cell').toContain("from '../components/shared/PatientIdentity'");
    }
  });

  it('Patients and Archive render the same 40px identity avatar; Archive shows the פעולות header', async () => {
    mount({ view: 'app', route: 'patients' });
    await settle();
    await waitFor(() => expect(document.querySelector('.pat-row')).toBeTruthy());
    expect(avatarOf('.pat-row')).toBe('40px');
    cleanup(); localStorage.clear();
    mount({ view: 'app', route: 'patientArchive', archivedPatients: ['p1'] });
    await settle();
    await waitFor(() => expect(document.querySelector('.pat-row.arc-grid, .pat-row')).toBeTruthy());
    expect(avatarOf('.pat-row')).toBe('40px');
    expect(document.querySelector('.pat-thead')?.textContent).toContain('פעולות');
  });

  it('meeting-history directory offers the canonical query-empty recovery', async () => {
    mount({ view: 'app', route: 'meetingHistory', patientId: null });
    await settle();
    const input = await waitFor(() => {
      const el = document.querySelector('[aria-label="חיפוש מטופלים"]') as HTMLInputElement;
      if (!el) throw new Error('search not ready');
      return el;
    });
    fireEvent.change(input, { target: { value: 'זזזזז' } });
    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו מטופלים'));
    const clear = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'ניקוי החיפוש') as HTMLElement;
    expect(clear, 'canonical clear-search recovery').toBeTruthy();
    fireEvent.click(clear);
    await waitFor(() => expect(document.querySelector('.mh-dir-row')).toBeTruthy());
  });
});

// One-tap clear (×) on the canonical table search — parity with the global
// Search page; appears only while a query is typed.
describe('canonical table — search clear affordance', () => {
  it('archive search shows ×, clearing restores the rows', async () => {
    mount({ view: 'app', route: 'patientArchive', archivedPatients: [{ id: 'ax1', name: 'ארכיון בדיקה', phone: '050-0000000', created_at: '2026-01-01', archived_at: '2026-06-01', archived: true }] });
    await settle();
    const input = await waitFor(() => {
      const el = document.querySelector('[aria-label="חיפוש בארכיון"]') as HTMLInputElement;
      if (!el) throw new Error('archive search not ready');
      return el;
    });
    expect(document.querySelector('[aria-label="ניקוי החיפוש"]'), 'no × before typing').toBeFalsy();
    fireEvent.change(input, { target: { value: 'זזז' } });
    const clear = await waitFor(() => {
      const b = document.querySelector('[aria-label="ניקוי החיפוש"]') as HTMLElement;
      if (!b) throw new Error('clear not shown');
      return b;
    });
    fireEvent.click(clear);
    await waitFor(() => expect((document.querySelector('[aria-label="חיפוש בארכיון"]') as HTMLInputElement).value).toBe(''));
    expect(document.body.textContent).toContain('ארכיון בדיקה');
  });
});

// Date ranges are split into dedicated Start/End columns (one column per
// structured attribute) — the archive's combined "תקופת טיפול" is gone.
describe('canonical table — archive date-range split', () => {
  it('archive shows sortable תחילת/סיום טיפול columns in DD/MM/YY', async () => {
    mount({ view: 'app', route: 'patientArchive', archivedPatients: [{ id: 'ax2', name: 'רות ארכיון', phone: '050-1111111', created_at: '2024-01-15T10:00:00Z', archived_at: '2026-06-02T10:00:00Z', archived: true }] });
    await settle();
    await waitFor(() => expect(document.querySelector('.pat-row')).toBeTruthy());
    const head = document.querySelector('.pat-thead') as HTMLElement;
    expect(head.textContent).toContain('תחילת טיפול');
    expect(head.textContent).toContain('סיום טיפול');
    expect(head.textContent).not.toContain('תקופת טיפול');
    expect(document.querySelector('[aria-label^="מיון לפי תאריך תחילת הטיפול"]')).toBeTruthy();
    expect(document.querySelector('[aria-label^="מיון לפי תאריך סיום הטיפול"]')).toBeTruthy();
    // canonical DD/MM/YY values in dedicated cells
    expect(document.querySelector('.pat-row .arc-col-start')?.textContent).toContain('15/01/24');
    expect(document.querySelector('.pat-row .arc-col-end')?.textContent).toContain('02/06/26');
  });
});

// Sort defaults are semantic: a FUTURE-date column (next appointment) leads with
// the soonest ("who's next?"), while past dates lead newest-first.
describe('canonical table — future-date sort default', () => {
  it('first click on תאריך הפגישה הבאה sorts soonest-first', async () => {
    const d = (days: number) => { const x = new Date(); x.setDate(x.getDate() + days); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    mount({ view: 'app', route: 'patients', scheduledAppts: [
      { id: 'n1', pid: 'p1', date: d(30), time: '09:00', dur: 50 },
      { id: 'n2', pid: 'p2', date: d(2), time: '09:00', dur: 50 },
    ] });
    await settle();
    await waitFor(() => expect(document.querySelector('.pat-row')).toBeTruthy());
    fireEvent.click(document.querySelector('[aria-label^="מיון לפי תאריך הפגישה הבאה"]') as HTMLElement);
    // the FIRST row must carry the soonest date (2 days out), not the farthest
    const fmt = (days: number) => { const x = new Date(); x.setDate(x.getDate() + days); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + String(x.getFullYear() % 100).padStart(2, '0'); };
    await waitFor(() => {
      const first = document.querySelector('.pat-row .pat-col-nextdate') as HTMLElement;
      expect(first?.textContent).toContain(fmt(2));
    });
  });
});

// Time ranges are split into dedicated Start/End columns on the agenda table.
describe('canonical table — agenda time-range split', () => {
  it('agenda shows התחלה and סיום columns with separate HH:MM cells', async () => {
    const today = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true, scheduledAppts: [{ id: 't1', pid: 'p1', date: today, time: '10:00', dur: 50 }] });
    await settle();
    await waitFor(() => expect(document.querySelector('.calh-agenda-row, .pat-row.dta-grid')).toBeTruthy());
    const head = document.querySelector('.dta-thead') as HTMLElement;
    expect(head.textContent).toContain('התחלה');
    expect(head.textContent).toContain('סיום');
    const start = document.querySelector('.pat-row .dta-col-start') as HTMLElement;
    const end = document.querySelector('.pat-row .dta-col-end') as HTMLElement;
    expect(start?.textContent).toContain('10:00');
    expect(end?.textContent).toContain('10:50');
  });
});

// Session counts use the SAME badge presentation in every table (roster + MHD),
// and missing values use the canonical — placeholder stated once per row.
describe('canonical table — session-count badge parity', () => {
  it('MHD directory renders the roster-style count badge and a single empty placeholder', async () => {
    mount({ view: 'app', route: 'meetingHistory', patientId: null });
    await settle();
    await waitFor(() => expect(document.querySelector('.mh-dir-row')).toBeTruthy());
    // a patient WITH sessions shows the numeric badge (tabular pill, tooltip spells the count)
    const badge = document.querySelector('.mh-dir-row .mhd-count span[title]') as HTMLElement;
    expect(badge, 'roster-style badge in MHD').toBeTruthy();
    expect(badge.textContent).toMatch(/^\d+$/);
    expect(badge.getAttribute('title')).toMatch(/פגיש/);
    // header uses the same label as the roster
    expect((document.querySelector('.pat-thead.mhd-grid') as HTMLElement).textContent).toContain('מספר פגישות');
    // no row repeats "אין פגישות עדיין" twice
    for (const row of document.querySelectorAll('.mh-dir-row')) {
      const t = row.textContent || '';
      expect((t.match(/אין פגישות עדיין/g) || []).length).toBeLessThanOrEqual(1);
    }
  });
});
