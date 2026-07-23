// Mobile experience — below 768px the app renders the dedicated mobile shell
// (MobileApp) with the touch-first day view instead of the desktop AppShell.
// matchMedia is mocked to activate the mobile branch (useIsMobile). The day view
// reads the same client-only fixture as the calendar; Monday of the current week
// always has fixture events, so selection + expand + sheets are deterministic.
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
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard', scheduledAppts: [{ id: 'mobile-test', pid: 'aladdin', date, time: '23:00', dur: 50 }] }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => setMobile(true));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

async function selectDayWithAppts(container: HTMLElement) {
  await waitFor(() => expect(container.querySelectorAll('.mob-day-btn').length).toBe(14));
  const day = [...container.querySelectorAll('.mob-day-btn')].find((b) => b.querySelector('.mob-day-dot.has')) as HTMLElement;
  expect(day).toBeTruthy();
  act(() => { fireEvent.click(day); });
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

  it('expands an appointment to reveal quick actions', async () => {
    const { container } = mount();
    await selectDayWithAppts(container);
    expect(container.querySelector('.mob-actions')).toBeFalsy();
    fireEvent.click(container.querySelector('.mob-plus') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.mob-actions')).toBeTruthy());
    // three actions: record (capture parity with the desktop agenda), quick-insight, attach
    const actions = [...container.querySelectorAll('.mob-actions .mob-action-btn')];
    expect(actions.length).toBe(3);
    const labels = actions.map((b) => b.getAttribute('aria-label') || '');
    // record leads and preselects the row's patient
    expect(labels[0]).toMatch(/^הקלטה · /);
    expect(labels.some((l) => /^תובנה מהירה/.test(l))).toBe(true);
    expect(labels.some((l) => /^צירוף קובץ/.test(l))).toBe(true);
  });

  it('the row record action opens the shared record dialog', async () => {
    const { container } = mount();
    await selectDayWithAppts(container);
    fireEvent.click(container.querySelector('.mob-plus') as HTMLElement);
    const rec = await waitFor(() => {
      const b = container.querySelector('.mob-actions [aria-label^="הקלטה · "]') as HTMLElement;
      if (!b) throw new Error('record action not shown');
      return b;
    });
    fireEvent.click(rec);
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]')).toBeTruthy());
  });

  it('day-strip shows a meeting dot only on days with scheduled appointments', async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const k = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'dashboard',
      scheduledAppts: [{ id: 'd1', pid: 'aladdin', date: k(0), time: '23:00', dur: 50 }],
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.querySelectorAll('.mob-day-btn').length).toBeGreaterThan(0));
    // Assert TODAY's day-button specifically carries the filled dot (fixture demo
    // events give other days dots too, so don't assume the first dotted day is today).
    const todayNum = String(new Date().getDate());
    const todayBtn = [...container.querySelectorAll('.mob-day-btn')].find((b) => (b.textContent || '').includes(todayNum));
    expect(todayBtn, 'today appears in the day strip').toBeTruthy();
    expect(todayBtn?.querySelector('.mob-day-dot.has'), 'today (with an appt) carries a filled dot').toBeTruthy();
    expect(todayBtn?.textContent, 'screen-reader affordance').toContain('יש פגישות');
    // days without appointments have the placeholder dot but not the filled state
    const without = [...container.querySelectorAll('.mob-day-btn')].find((b) => !b.querySelector('.mob-day-dot.has'));
    expect(without?.querySelector('.mob-day-dot'), 'placeholder keeps alignment').toBeTruthy();
  });

  it('shows the workload line and a resume-draft chip that opens the patient file', async () => {
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'dashboard',
      notesDrafts: { bruce_wayne: 'טיוטה שהתחלתי בדרך' },
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.textContent).toContain('פגישות השבוע'));
    const chip = container.querySelector('[aria-label^="המשך עריכה · ברוס וויין"]') as HTMLElement;
    expect(chip, 'the unsaved draft is recoverable from the phone home').toBeTruthy();
    fireEvent.click(chip);
    await waitFor(() => expect(window.location.hash).toBe('#/patient/bruce_wayne'));
  });

  it('the standing next-meeting hero offers prep report, open-file and record (spec, mobile home)', async () => {
    // Saturday (strip index 6) never carries fixture events (offsets 0–4 only), so
    // it's a deterministic empty day. Seed a future appt per patient so the next
    // upcoming session is well-defined (אלאדין = the earliest; every repo patient
    // already has an appt so the reconcile pass adds no earlier ones).
    const future = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'dashboard',
      scheduledAppts: ['aladdin', 'bruce_wayne', 'dumbo', 'elsa', 'forrest_gump', 'harry_potter', 'marlin', 'moana', 'mulan', 'rapunzel', 'simba'].map((pid, i) => ({ id: 'f' + i, pid, date: future(200 + i), time: '09:00', dur: 50 })),
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.querySelectorAll('.mob-day-btn').length).toBe(14));
    fireEvent.click(container.querySelectorAll('.mob-day-btn')[6] as HTMLElement); // Saturday — empty
    await waitFor(() => expect(container.querySelector('.mob-empty')).toBeTruthy());
    // The next-meeting hero is STANDING (not only on empty days) and carries the
    // quick review + the prep-report action (spec, mobile home priority 1).
    expect(container.textContent).toContain('הפגישה הבאה');
    expect(container.textContent).toContain('אלאדין'); // earliest upcoming
    expect(container.textContent).toContain('סקירה מהירה');
    const prepBtn = [...container.querySelectorAll('button')].find((b) => b.textContent === 'דוח הכנה לפגישה') as HTMLElement;
    expect(prepBtn).toBeTruthy();
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'הוספת מפגש')).toBe(true);
    fireEvent.click([...container.querySelectorAll('button')].find((b) => b.textContent === 'פתיחת התיק') as HTMLElement);
    await waitFor(() => expect(window.location.hash).toBe('#/patient/aladdin'));
  });

  it('opens the insight sheet and confirms a save via a toast', async () => {
    const { container } = mount();
    await selectDayWithAppts(container);
    fireEvent.click(container.querySelector('.mob-plus') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.mob-actions')).toBeTruthy());
    const insightBtn = [...container.querySelectorAll('.mob-action-btn')]
      .find((b) => /תובנה מהירה/.test(b.getAttribute('aria-label') || '')) as HTMLElement;
    fireEvent.click(insightBtn);
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());
    const ta = document.querySelector('.mob-sheet-textarea') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'שיפור ניכר בשינה' } });
    fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent === 'שמירת תובנה') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeFalsy());
    await waitFor(() => expect(document.body.textContent).toContain('התובנה נשמרה'));
  });
});
