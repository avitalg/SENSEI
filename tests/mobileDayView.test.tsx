// Mobile experience — below 768px the app renders the dedicated mobile shell
// (MobileApp) with the touch-first day view instead of the desktop AppShell.
// matchMedia is mocked to activate the mobile branch (useIsMobile). The day view
// reads the same client-only fixture as the calendar; Monday of the current week
// always has fixture events, so selection + expand actions are deterministic.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const PKEY = 'sensei_session_react_v1';

function setMobile(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

function mount() {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard' }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => setMobile(true));
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
  vi.restoreAllMocks();
});

/** Select Monday (strip index 1 — Sunday is 0) which always carries fixture events. */
async function selectMondayWithAppts(container: HTMLElement) {
  await waitFor(() => expect(container.querySelectorAll('.mob-day-btn').length).toBe(7));
  const monday = container.querySelectorAll('.mob-day-btn')[1] as HTMLElement;
  act(() => { fireEvent.click(monday); });
  await waitFor(() => expect(container.querySelectorAll('.mob-appt').length).toBeGreaterThan(0), { timeout: 3000 });
}

describe('mobile day view', () => {
  it('renders the mobile shell + day view (not the desktop AppShell)', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());
    expect(container.querySelector('.mob-daystrip')).toBeTruthy();
    // the desktop main region is not used on mobile shell (it has its own)
    expect(container.querySelector('.mob-content')).toBeTruthy();
  });

  it('the menu button opens the sidebar drawer', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-iconbtn')).toBeTruthy());
    expect(container.querySelector('.app-sidebar')?.classList.contains('open')).toBe(false);
    fireEvent.click(container.querySelector('.mob-iconbtn') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.app-sidebar')?.classList.contains('open')).toBe(true));
  });

  it('expands an appointment to reveal desktop-parity calEvent actions', async () => {
    const { container } = mount();
    await selectMondayWithAppts(container);
    expect(container.querySelector('.mob-actions')).toBeFalsy();
    fireEvent.click(container.querySelector('.mob-plus') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.mob-actions')).toBeTruthy());
    const labels = [...container.querySelectorAll('.mob-actions .mob-action-btn')].map((b) => b.getAttribute('aria-label') || '');
    expect(labels.some((l) => /מעבר לתיק המטופל/.test(l))).toBe(true);
    expect(labels.some((l) => /העלאת הקלטה/.test(l))).toBe(true);
    expect(labels.some((l) => /דוח הכנה/.test(l))).toBe(true);
    expect(labels.some((l) => /מחיקת הפגישה/.test(l))).toBe(true);
    expect(labels.some((l) => /תובנה מהירה|צירוף קובץ/.test(l)), 'legacy insight/attach actions are gone').toBe(false);
    // One compact icon row (not stacked labeled buttons).
    expect(container.querySelectorAll('.mob-actions .mob-action-btn').length).toBeGreaterThanOrEqual(4);
  });

  it('upload action from the expand navigates to the upload flow', async () => {
    const { container } = mount();
    await selectMondayWithAppts(container);
    fireEvent.click(container.querySelector('.mob-plus') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.mob-actions')).toBeTruthy());
    fireEvent.click([...container.querySelectorAll('.mob-actions .mob-action-btn')].find((b) => /העלאת הקלטה/.test(b.getAttribute('aria-label') || '')) as HTMLElement);
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/upload/));
  });

  it('day-strip shows a meeting dot only on days with scheduled appointments', async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = new Date();
    const todayNum = today.getDate();
    const k = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'dashboard',
      // Explicit list (no reconcile extras): only today has a meeting.
      scheduledAppts: [{ id: 'd1', pid: 'p1', date: k(0), time: '11:00', dur: 50 }],
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.querySelectorAll('.mob-day-btn').length).toBeGreaterThan(0));
    const todayBtn = [...container.querySelectorAll('.mob-day-btn')].find((b) => {
      const num = b.querySelector('.mob-day-num')?.textContent;
      return num === String(todayNum) && b.querySelector('.mob-day-dot.has');
    });
    expect(todayBtn, 'today (with an appt) carries a dot').toBeTruthy();
    expect(todayBtn?.textContent, 'screen-reader affordance').toContain('יש פגישות');
    // days without appointments have the placeholder dot but not the filled state
    const without = [...container.querySelectorAll('.mob-day-btn')].find((b) => !b.querySelector('.mob-day-dot.has'));
    expect(without?.querySelector('.mob-day-dot'), 'placeholder keeps alignment').toBeTruthy();
  });

  it('shows the workload line and a resume-draft chip that opens the patient file', async () => {
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'dashboard',
      notesDrafts: { p2: 'טיוטה שהתחלתי בדרך' },
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.textContent).toContain('פגישות השבוע'));
    const chip = container.querySelector('[aria-label^="המשך עריכה · יוסי מזרחי"]') as HTMLElement;
    expect(chip, 'the unsaved draft is recoverable from the phone home').toBeTruthy();
    fireEvent.click(chip);
    await waitFor(() => expect(window.location.hash).toBe('#/patient/p2'));
  });

  it('shows the desktop-parity "הפגישה הבאה" focus card with prep + open actions', async () => {
    // Seed a future appt per patient so the next upcoming session is well-defined
    // (p1 = דנה לוי, the earliest) — same source as desktop DashboardFocus.
    const future = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'dashboard',
      scheduledAppts: ['p1', 'p2', 'p3', 'p4', 'p5'].map((pid, i) => ({ id: 'f' + i, pid, date: future(200 + i), time: '09:00', dur: 50 })),
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.querySelector('.mob-next-meeting')).toBeTruthy());
    expect(container.textContent).toContain('הפגישה הבאה');
    expect(container.textContent).toContain('דנה לוי'); // p1, earliest upcoming
    fireEvent.click([...container.querySelectorAll('.mob-next-meeting button')].find((b) => b.textContent === 'הצגת דוח ההכנה') as HTMLElement);
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/report\/p1/));
  });

  it('an empty day points at the next-meeting card above the strip', async () => {
    // Saturday (strip index 6) never carries fixture events (offsets 0–4 only).
    const future = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'dashboard',
      scheduledAppts: [{ id: 'f0', pid: 'p1', date: future(200), time: '09:00', dur: 50 }],
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.querySelectorAll('.mob-day-btn').length).toBe(7));
    fireEvent.click(container.querySelectorAll('.mob-day-btn')[6] as HTMLElement);
    await waitFor(() => expect(container.querySelector('.mob-empty')).toBeTruthy());
    expect(container.textContent).toContain('הפגישה הבאה מופיעה למעלה');
    expect(container.querySelector('.mob-next-meeting')).toBeTruthy();
  });

  it('delete action opens the shared delete-meeting confirm dialog', async () => {
    const { container } = mount();
    await selectMondayWithAppts(container);
    fireEvent.click(container.querySelector('.mob-plus') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.mob-actions')).toBeTruthy());
    fireEvent.click([...container.querySelectorAll('.mob-actions .mob-action-btn')].find((b) => /מחיקת הפגישה/.test(b.getAttribute('aria-label') || '')) as HTMLElement);
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());
    expect(document.body.textContent).toContain('מחיקת פגישה מתוכננת');
  });

  it('hides daily recap when speechSynthesis is unavailable', async () => {
    delete (window as any).speechSynthesis;
    delete (window as any).SpeechSynthesisUtterance;
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-dayview')).toBeTruthy());
    expect(container.querySelector('.mob-daily-recap')).toBeFalsy();
  });

  it('daily recap speaks a פתיחת יום script and stops on second press', async () => {
    const spoken: string[] = [];
    (window as any).speechSynthesis = { speak: vi.fn((u: any) => spoken.push(u.text)), cancel: vi.fn() };
    (window as any).SpeechSynthesisUtterance = class {
      lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(public text: string) {}
    };
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-daily-recap')).toBeTruthy());
    const btn = container.querySelector('.mob-daily-recap') as HTMLElement;
    expect(btn.textContent).toContain('סיכום יומי');
    act(() => { fireEvent.click(btn); });
    await waitFor(() => expect(spoken.length).toBe(1));
    expect(spoken[0]).toMatch(/סיכום פתיחת יום/);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    act(() => { fireEvent.click(btn); });
    await waitFor(() => expect((window as any).speechSynthesis.cancel).toHaveBeenCalled());
  });
});
