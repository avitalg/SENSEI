// Phase 3d: recurring weekly meetings, add-patient-with-a-first-meeting, and the
// Google-Calendar connect button (demo — an honest toast, no real OAuth).
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); });
const btn = (label: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLElement;

describe('schedule — recurring meetings', () => {
  it('creating a weekly recurrence schedules multiple meetings', async () => {
    mount({ view: 'app', route: 'calendar' });
    // Wait for the lazy calendar workspace to mount its "new meeting" button
    // rather than assuming a fixed settle() is enough (races under full-suite load).
    const newBtn = await waitFor(() => {
      const b = document.querySelector('.calh-new-btn') as HTMLElement | null;
      if (!b) throw new Error('calendar new-meeting button not ready');
      return b;
    });
    fireEvent.click(newBtn);
    await waitFor(() => expect(document.querySelector('[aria-label="חזרה על הפגישה"]')).toBeTruthy());
    fireEvent.change(document.querySelector('[aria-label="חזרה על הפגישה"]') as HTMLElement, { target: { value: 'weekly4' } });
    // Scope to the action dialog — the dashboard also has "קביעת פגישה" CTAs
    // (e.g. patients without an upcoming meeting) that would steal a global query.
    const dialog = document.querySelector('[role="dialog"][aria-label="קביעת פגישה חדשה"]') as HTMLElement;
    const submit = [...dialog.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'קביעת פגישה') as HTMLElement;
    fireEvent.click(submit);
    // Generous timeout: under full-suite CPU load the toast can take >1s to
    // flush (and it auto-dismisses after ~2.8s), so the default 1s window races.
    await waitFor(() => expect(document.body.textContent).toContain('נקבעו 4 פגישות שבועיות'), { timeout: 2500 });
  });
});

describe('schedule — contextual patient action', () => {
  it('opens a preselected schedule dialog from the patient row menu', async () => {
    mount({ view: 'app', route: 'patients' });
    await settle();
    const trigger = document.querySelector('button[aria-label="פעולות · אלאדין"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    const schedule = await waitFor(() => {
      const item = document.querySelector('[role="menuitem"][aria-label="קביעת פגישה"]') as HTMLElement | null;
      if (!item) throw new Error('patient schedule action not rendered');
      return item;
    });
    fireEvent.click(schedule);
    const dialog = await waitFor(() => document.querySelector('[role="dialog"][aria-label="קביעת פגישה חדשה"]') as HTMLElement);
    expect(dialog).toBeTruthy();
    expect((dialog.querySelector('[aria-label="בחירת מטופל"]') as HTMLSelectElement)?.value).toBe('aladdin');
  });
});

describe('add patient — with a first meeting', () => {
  it('opens the schedule dialog after creating when opted in', async () => {
    mount({ view: 'app', route: 'patients' });
    await settle();
    fireEvent.click(document.querySelector('.pat-new-btn') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[aria-label="שם מלא"]')).toBeTruthy());
    fireEvent.input(document.querySelector('[aria-label="שם מלא"]') as HTMLElement, { target: { value: 'טסט טסטי' } });
    fireEvent.input(document.querySelector('[aria-label="טלפון"]') as HTMLElement, { target: { value: '050-1112223' } });
    fireEvent.click(document.querySelector('[aria-label="קביעת פגישה ראשונה לאחר היצירה"]') as HTMLElement);
    fireEvent.click(btn('יצירת מטופל'));
    await waitFor(() => expect(document.body.textContent).toContain('קביעת פגישה חדשה'));
  });
});

describe('schedule — appointment location', () => {
  it('a location entered on the form persists onto the created appointment', async () => {
    mount({ view: 'app', route: 'calendar' });
    await settle();
    fireEvent.click(document.querySelector('.calh-new-btn') as HTMLElement);
    const loc = await waitFor(() => {
      const el = document.querySelector('[aria-label="מיקום הפגישה"]') as HTMLInputElement | null;
      if (!el) throw new Error('location field not rendered');
      return el;
    });
    fireEvent.change(document.querySelector('[aria-label="תאריך הפגישה"]') as HTMLElement, { target: { value: '2026-08-03' } });
    fireEvent.change(document.querySelector('[aria-label="שעת הפגישה"]') as HTMLElement, { target: { value: '10:00' } });
    fireEvent.input(loc, { target: { value: 'קליניקה · חדר 4' } });
    const dialog = document.querySelector('[role="dialog"][aria-label="קביעת פגישה חדשה"]') as HTMLElement;
    const submit = [...dialog.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'קביעת פגישה') as HTMLElement;
    fireEvent.click(submit);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PKEY) || '{}');
      const created = (stored.scheduledAppts || []).find((a: any) => a.date === '2026-08-03' && a.time === '10:00');
      expect(created?.location).toBe('קליניקה · חדר 4');
    });
  });
});

describe('calendar synchronization status', () => {
  it('communicates unavailable Google sync without presenting a false action', async () => {
    mount({ view: 'app', route: 'calendar' });
    await settle();
    await waitFor(() => expect(document.querySelector('button[aria-label="אפשרויות נוספות"]')).toBeTruthy());
    fireEvent.click(document.querySelector('button[aria-label="אפשרויות נוספות"]') as HTMLElement);
    const status = await waitFor(() => {
      const el = document.querySelector('[aria-label="סטטוס סנכרון היומן"]') as HTMLElement | null;
      if (!el) throw new Error('calendar synchronization status not rendered');
      return el;
    });
    expect(status.textContent).toContain('היומן מנוהל בסנסיי');
    expect(status.textContent).toContain('סנכרון עם יומן גוגל עדיין אינו זמין');
    expect(status.tagName).not.toBe('BUTTON');
    expect(btn('חיבור ליומן גוגל · בקרוב')).toBeUndefined();
  });
});
