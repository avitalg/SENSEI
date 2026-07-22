// Mobile prep-report and patient profile — the bespoke
// mobile screens rendered by MobileApp for the report / patient routes. Same
// matchMedia mobile gating as mobileDayView.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';
import { CLINICAL_DISCLAIMER } from '../src/components/shared/AiDisclaimer';

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

describe('mobile prep report', () => {
  it('renders the prep sections and toggles a goal', async () => {
    const { container } = mount({ route: 'report', patientId: 'p3' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('סיכום הפגישה הקודמת');
    expect(container.textContent).toContain('נקודות למעקב');
    expect(container.textContent).toContain('מטרות לפגישה הקרובה');

    const goal = container.querySelector('.mob-goal') as HTMLElement;
    expect(goal.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(goal);
    await waitFor(() => expect(goal.getAttribute('aria-pressed')).toBe('true'));
    expect(container.querySelector('.mob-check.is-done')).toBeTruthy();
  });

  it('carries the clinical AI disclaimer (trust parity with the desktop report) under an h1 heading', async () => {
    const { container } = mount({ route: 'report', patientId: 'p3' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    // the mobile report shows AI-generated clinical guidance, so it must carry
    // the same "not a diagnosis · judgment stays with you" disclaimer as desktop
    expect(container.textContent).toContain(CLINICAL_DISCLAIMER);
    expect(container.querySelector('[role="note"]')).toBeTruthy();
    // page heading is a real <h1> (screen-reader landmark parity)
    expect(container.querySelector('h1')?.textContent).toContain('דוח הכנה');
  });

  it('offers upload (not direct recording) from the prep report, and no record control remains', async () => {
    const { container } = mount({ route: 'report', patientId: 'p3' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    // direct recording removed — the footer CTA is now the upload flow
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'התחל הקלטה'), 'no direct-record CTA').toBe(false);
    const upload = [...container.querySelectorAll('button')].find((b) => b.textContent === 'העלאת הקלטה') as HTMLElement;
    expect(upload, 'upload CTA present').toBeTruthy();
    fireEvent.click(upload);
    await waitFor(() => expect(window.location.hash).toBe('#/upload'));
  });
});

describe('mobile patient profile', () => {
  it('renders the patient header, next meeting, and recent sessions', async () => {
    const { container } = mount({ route: 'patient', patientId: 'p1' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('תיק מטופל');
    expect(container.textContent).toContain('הפגישה הבאה');
    expect(container.textContent).toContain('פגישות אחרונות');
    expect(container.querySelectorAll('.mob-sess-row').length).toBeGreaterThan(0);
  });

  it('uses the patient\'s own per-session dates, not the shared SESSION_DATES', async () => {
    // p5 (Simba) has a bespoke dates arc; the mobile shell must render it too
    // (regression guard for MobilePatient going through sessionDates()).
    const { container } = mount({ route: 'patient', patientId: 'p5' });
    await waitFor(() => expect(container.querySelector('.mob-sess-row')).toBeTruthy());
    const dates = [...container.querySelectorAll('.mob-sess-row [dir="ltr"]')].map((e) => e.textContent);
    expect(dates[0]).toBe('14/07/26'); // Simba's latest bespoke date
    expect(dates).not.toContain('22/06/26'); // the shared SESSION_DATES head
  });

  it('offers an appointment-specific prep playback control (not a generic recap)', async () => {
    // TTS is feature-gated; stub it so the prep control renders under jsdom.
    (window as any).speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
    (window as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} } as any;
    // p1 has an upcoming appointment → the prep-TTS button ties playback to it.
    const { container } = mount({ route: 'patient', patientId: 'p1' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    const prep = container.querySelector('[aria-label="השמעת סיכום ההכנה לפגישה הקרובה"]');
    expect(prep, 'per-appointment prep playback control renders').toBeTruthy();
    delete (window as any).speechSynthesis;
    delete (window as any).SpeechSynthesisUtterance;
  });
});

describe('mobile back navigation (nested flows)', () => {
  it('a shared (non-tab) screen shows a Back bar that returns to the patient file', async () => {
    const { container } = mount({ route: 'summary', patientId: 'p1' });
    await act(() => new Promise((r) => setTimeout(r, 120)));
    const back = await waitFor(() => {
      const b = container.querySelector('.mob-content [aria-label="חזרה לתיק המטופל"]') as HTMLElement;
      expect(b).toBeTruthy();
      return b;
    });
    fireEvent.click(back);
    // in-app navigation to the patient file (not raw browser history)
    await waitFor(() => expect(window.location.hash).toBe('#/patient/p1'));
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
