// Mobile Home is the canonical, touch-friendly calendar workspace. These tests
// protect view parity, planning actions, and the retained contextual Home modules.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const PKEY = 'sensei_session_react_v1';

function setMobile() {
  window.matchMedia = ((q: string) => ({
    matches: q === MOBILE_QUERY, media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

function mount(extra: Record<string, unknown> = {}) {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  localStorage.setItem(PKEY, JSON.stringify({
    __savedAt: Date.now(), view: 'app', route: 'dashboard',
    scheduledAppts: [{ id: 'mobile-test', pid: 'aladdin', date, time: '10:00', dur: 50 }],
    ...extra,
  }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

const button = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as HTMLElement;
const viewButton = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('.calh-seg-btn')].find((b) => b.textContent?.trim() === label) as HTMLElement;

beforeEach(() => {
  setMobile();
  (window as any).speechSynthesis = { speak: () => {}, cancel: () => {}, getVoices: () => [] };
  (window as any).SpeechSynthesisUtterance = function (this: any, text: string) { this.text = text; };
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('mobile Home calendar', () => {
  it('renders the mobile shell with the calendar as its primary experience', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.calh-toolbar')).toBeTruthy());
    expect(container.querySelector('.mob-shell')).toBeTruthy();
    expect(container.textContent).toContain('לוח השנה שלי');
    expect(container.querySelector('.mob-content')).toBeTruthy();
  });

  it('the menu button opens the sidebar drawer', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-iconbtn')).toBeTruthy());
    fireEvent.click(container.querySelector('.mob-iconbtn') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.app-sidebar')?.classList.contains('open')).toBe(true));
  });

  it('switches between Month, Week, Day, and Agenda on a phone', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.calh-toolbar')).toBeTruthy());
    fireEvent.click(viewButton(container, 'חודש'));
    await waitFor(() => expect(container.querySelector('.calh-month')).toBeTruthy());
    fireEvent.click(viewButton(container, 'סדר יום'));
    await waitFor(() => expect(container.querySelector('.calh-agenda-view')).toBeTruthy());
    fireEvent.click(viewButton(container, 'יום'));
    await waitFor(() => expect(container.querySelectorAll('.calh-col-add').length).toBe(1));
    fireEvent.click(viewButton(container, 'שבוע'));
    await waitFor(() => expect(container.querySelectorAll('.calh-col-add').length).toBe(7));
  });

  it('offers Today and touch-friendly event creation', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.calh-today-btn')).toBeTruthy());
    expect(button(container, 'היום')).toBeTruthy();
    fireEvent.click(button(container, 'פגישה חדשה'));
    await waitFor(() => expect(document.body.textContent).toContain('קביעת פגישה חדשה'));
  });

  it('shows scheduled events and undated repository tasks in Agenda', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.calh-toolbar')).toBeTruthy());
    fireEvent.click(button(container, 'סדר יום'));
    await waitFor(() => expect(container.querySelector('.calh-agenda-view')).toBeTruthy());
    expect(container.textContent).toContain('אלאדין');
    expect(container.textContent).toContain('משימות ללא מועד');
  });

  it('retains Home workload, opening-day and next-meeting workflows below the calendar', async () => {
    const { container } = mount({ notesDrafts: { bruce_wayne: 'טיוטה בדרך' } });
    await waitFor(() => expect(container.querySelector('.calh-toolbar')).toBeTruthy());
    expect(container.textContent).toContain('פגישות השבוע');
    expect(button(container, 'פתיחת יום')).toBeTruthy();
    expect(container.textContent).toContain('הפגישה הבאה');
    expect(container.querySelector('[aria-label^="המשך עריכה · ברוס וויין"]')).toBeTruthy();
  });
});
