// Mobile spec parity (אפיון מסכים, mobile section) — the phone home carries
// "פתיחת יום" and no global capture FAB (per-appointment actions instead), and
// the mobile patient file carries the desktop workspace tabs + recap playback.
// Also: the shared record dialog fixes the patient (no picker) when opened from
// a patient context (recordPid).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
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

function mockTts() {
  (window as any).speechSynthesis = { speak: () => {}, cancel: () => {}, getVoices: () => [] };
  (window as any).SpeechSynthesisUtterance = function (this: any, text: string) { this.text = text; };
}

function mount(route = 'dashboard', extra: Record<string, unknown> = {}) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route, ...extra }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => { setMobile(true); mockTts(); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('mobile home (spec parity)', () => {
  it('carries a "פתיחת יום" control and NO global capture FAB', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-daystrip')).toBeTruthy());
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'פתיחת יום')).toBe(true);
    expect(container.querySelector('.mob-fab')).toBeFalsy();
  });

  it('removes the global capture FAB and exposes patient-context capture instead', async () => {
    const { container } = mount('patients');
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());
    expect(container.querySelector('.mob-fab')).toBeFalsy();
    await waitFor(() => expect(container.querySelector('[aria-label="הוספת מפגש · סימבה"]')).toBeTruthy());
    const patientCapture = container.querySelector('[aria-label="הוספת מפגש · סימבה"]') as HTMLElement;
    fireEvent.click(patientCapture);
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]')).toBeTruthy());
    expect(document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]')?.textContent).toContain('סימבה');
  });
});

describe('mobile patient file (spec parity)', () => {
  it('shows prep-report and recording actions for the single next meeting', async () => {
    const date = new Date(Date.now() + 86_400_000);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const scheduledAppts = [{ id: 'next-simba', pid: 'simba', date: dateKey, time: '10:00', dur: 50, description: 'פגישת מעקב', status: 'upcoming' }];
    const { container } = mount('patient', { patientId: 'simba', scheduledAppts });
    await waitFor(() => expect(container.querySelector('[aria-label="דוח הכנה לפגישה · סימבה"]')).toBeTruthy());
    expect(container.querySelector('[aria-label="הקלטה לפגישה · סימבה"]')).toBeTruthy();
    expect(container.textContent).toContain('הפגישה הבאה');
  });

  it('renders the desktop workspace tabs and switches between them', async () => {
    const { container } = mount('patient', { patientId: 'simba' });
    await waitFor(() => expect(container.querySelector('.pw-tabs')).toBeTruthy());
    const tabLabels = [...container.querySelectorAll('.pw-tab')].map((t) => t.textContent || '');
    expect(tabLabels.some((l) => l.startsWith('פגישות'))).toBe(true);
    expect(tabLabels.some((l) => l.startsWith('סקירה'))).toBe(true);
    expect(tabLabels.some((l) => l.startsWith('הערות'))).toBe(true);
    expect(tabLabels.some((l) => l.startsWith('מסמכים'))).toBe(true);
    // Switch to the overview tab: the canonical overview fields render with
    // repo-derived content (רקע קליני intro), not placeholders.
    fireEvent.click([...container.querySelectorAll('.pw-tab')].find((t) => (t.textContent || '').startsWith('סקירה')) as HTMLElement);
    await waitFor(() => expect(container.textContent).toContain('סיכום הטיפול הנוכחי'));
  });

  it('offers השמעת תקציר (recap playback) in the file header', async () => {
    const { container } = mount('patient', { patientId: 'simba' });
    await waitFor(() => expect(container.querySelector('.pw-tabs')).toBeTruthy());
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'השמעת תקציר')).toBe(true);
  });
});

describe('record dialog patient context (spec parity)', () => {
  it('shows the fixed patient name, not a picker, when opened from a patient context', async () => {
    // jsdom lacks MediaRecorder — stub the support probe so the dialog renders
    // its full (supported) body including the patient line.
    (window as any).MediaRecorder = function () {};
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new Error('jsdom')) } });
    const { container } = mount('patient', { patientId: 'simba' });
    await waitFor(() => expect(container.querySelector('.pw-tabs')).toBeTruthy());
    fireEvent.click([...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'הוספת מפגש') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]')).toBeTruthy());
    const dialog = document.querySelector('[role="dialog"][aria-label="הוספת מפגש"]') as HTMLElement;
    expect(dialog.querySelector('select')).toBeFalsy();
    expect(dialog.textContent).toContain('סימבה');
  });
});
