// Mobile patient profile and navigation — the bespoke mobile screens rendered
// by MobileApp. Same matchMedia mobile gating as mobileDayView.test.tsx.
// (The bespoke mobile prep-report screen was removed along with its route.)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const PKEY = 'sensei_session_react_v1';

function setMobile() {
  window.matchMedia = ((q: string) => ({
    matches: q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => setMobile());
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('mobile patient profile', () => {
  it('renders the patient header, next meeting, and recent sessions', async () => {
    const { container } = mount({ route: 'patient', patientId: 'aladdin' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('תיק מטופל');
    expect(container.textContent).toContain('הפגישה הבאה');
    expect(container.textContent).toContain('פגישות אחרונות');
    expect(container.querySelectorAll('.mob-sess-row').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.mob-sess-row .mob-sess-summary').length)
      .toBe(container.querySelectorAll('.mob-sess-row').length);
  });

  it('uses the patient\'s own per-session dates, not the shared SESSION_DATES', async () => {
    // p5 (Simba) has a bespoke dates arc; the mobile shell must render it too
    // (regression guard for MobilePatient going through sessionDates()).
    const { container } = mount({ route: 'patient', patientId: 'simba' });
    await waitFor(() => expect(container.querySelector('.mob-sess-row')).toBeTruthy());
    const dates = [...container.querySelectorAll('.mob-sess-row [dir="ltr"]')].map((e) => e.textContent);
    expect(dates[0]).toBe('19/07/26'); // Simba's latest bespoke date
    expect(dates).not.toContain('22/06/26'); // the shared SESSION_DATES head
  });

  it('offers the unified capture action from the patient file (spec: one button, tabbed dialog)', async () => {
    const { container } = mount({ route: 'patient', patientId: 'aladdin' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    const capture = container.querySelector('[aria-label="הוספת מפגש"]') as HTMLElement;
    expect(capture, 'unified capture action renders').toBeTruthy();
    fireEvent.click(capture);
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]')).toBeTruthy());
    // the dialog carries the two spec tabs — record leads, upload beside it
    const tabs = [...document.querySelectorAll('[role="dialog"] [role="tab"]')].map((t) => t.textContent);
    expect(tabs).toEqual(['הקלטה', 'העלאת קובץ']);
  });

  it('adds and persists a therapist note directly from the mobile patient file', async () => {
    const { container } = mount({ route: 'patient', patientId: 'aladdin' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    const notesTab = [...container.querySelectorAll('button.pw-tab')]
      .find((button) => button.textContent?.startsWith('הערות')) as HTMLButtonElement;
    fireEvent.click(notesTab);
    fireEvent.click(container.querySelector('[aria-label="הוספת הערה"]') as HTMLButtonElement);
    const editor = container.querySelector('textarea[aria-label="הערות המטפל"]') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'הערה שנוספה מהמובייל' } });
    fireEvent.click([...container.querySelectorAll('.mob-notes-editor-actions button')]
      .find((button) => button.textContent === 'שמירה') as HTMLButtonElement);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PKEY) || '{}');
      expect(saved.therapistNotes?.aladdin?.[0]?.text).toBe('הערה שנוספה מהמובייל');
    });
    expect(container.textContent).toContain('הערה שנוספה מהמובייל');
  });
});

describe('mobile back navigation (nested flows)', () => {
  it('a shared (non-tab) screen shows a Back bar that returns to the patient file', async () => {
    const { container } = mount({ route: 'summary', patientId: 'aladdin' });
    await act(() => new Promise((r) => setTimeout(r, 120)));
    const back = await waitFor(() => {
      const b = container.querySelector('.mob-content [aria-label="חזרה לתיק המטופל"]') as HTMLElement;
      expect(b).toBeTruthy();
      return b;
    });
    fireEvent.click(back);
    // in-app navigation to the patient file (not raw browser history)
    await waitFor(() => expect(window.location.hash).toBe('#/patient/aladdin'));
  });
});

describe('mobile navigation — single system (hamburger drawer only, no bottom tab bar)', () => {
  it('renders no bottom tab bar; the hamburger is the sole nav entry point', async () => {
    const { container } = mount({ route: 'dashboard' });
    await act(() => new Promise((r) => setTimeout(r, 150)));
    // the bottom tab bar is gone
    expect(container.querySelector('.mob-tabbar'), 'no bottom tab bar').toBeFalsy();
    expect(document.querySelector('[aria-label="ניווט ראשי"]'), 'no tab-bar nav landmark').toBeFalsy();
    // the hamburger opens the drawer, which carries the primary destinations
    const menu = document.querySelector('[aria-label="פתיחת התפריט"]') as HTMLButtonElement;
    expect(menu, 'hamburger present').toBeTruthy();
    fireEvent.click(menu);
    await act(() => new Promise((r) => setTimeout(r, 100)));
    const sidebar = document.querySelector('.app-sidebar') as HTMLElement;
    expect(sidebar, 'drawer opens').toBeTruthy();
    const labels = [...sidebar.querySelectorAll('a,button')].map((el) => (el.textContent || '').trim());
    for (const dest of ['דף הבית', 'מטופלים', 'יומן']) {
      expect(labels.some((l) => l.includes(dest)), 'drawer includes ' + dest).toBe(true);
    }
  });
});

describe('mobile drawer — focus restore (WCAG focus management)', () => {
  it('closing the drawer returns focus to the menu button', async () => {
    localStorage.setItem('sensei_session_react_v1', JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await act(() => new Promise((r) => setTimeout(r, 150)));
    const menu = document.querySelector('[aria-label="פתיחת התפריט"]') as HTMLButtonElement;
    expect(menu).toBeTruthy();
    fireEvent.click(menu);
    await act(() => new Promise((r) => setTimeout(r, 100)));
    // close via the scrim
    fireEvent.click(document.querySelector('.nav-scrim') as HTMLElement);
    await waitFor(() => expect(document.activeElement).toBe(menu));
  });
});

describe('mobile main landmark — route announcement (parity with desktop)', () => {
  it('labels #main-content with the current route title, so focusing it on navigation announces the page', async () => {
    // On navigation the store moves focus to #main-content; the screen reader then
    // reads its aria-label. Desktop announces "תוכן ראשי · <page>"; mobile must too
    // (previously it was a static "תוכן ראשי", so mobile users were not told which
    // page they landed on).
    const { container } = mount({ route: 'settings' });
    await waitFor(() => expect(container.querySelector('#main-content')).toBeTruthy());
    const label = container.querySelector('#main-content')?.getAttribute('aria-label') || '';
    expect(label).toContain('תוכן ראשי');
    expect(label).toContain('הגדרות'); // ROUTE_TITLES.settings
  });
});

// No dead end on mobile: the patient screen caps recent sessions, so it must
// link to the full meeting history (desktop parity).
describe('mobile patient — full history link', () => {
  it('offers "כל הפגישות" and it opens the patient meeting history', async () => {
    const { container } = mount({ view: 'app', route: 'patient', patientId: 'simba' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    const link = await waitFor(() => {
      const b = [...container.querySelectorAll('button')].find((x) => (x.textContent || '').includes('כל הפגישות')) as HTMLElement;
      if (!b) throw new Error('history link not shown');
      return b;
    });
    expect(link.textContent).toContain('(5)'); // Simba's bespoke 5-session arc
    fireEvent.click(link);
    await waitFor(() => expect(window.location.hash).toMatch(/meeting-history|meetingHistory|history/i));
  });
});
