// Calendar drag-and-drop: dragging a locally-scheduled appointment onto a day
// column reschedules it in place (updates date/time), without creating a duplicate.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import * as calendar from '../src/services/calendar';
import * as mockPatients from '../src/data/mockPatients';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

describe('calendar drag-and-drop', () => {
  it('reschedules a scheduled appointment on drop (in place, no duplicate)', async () => {
    // Isolate from weekday-varying fixture events + the mock-appt backfill so the
    // only rendered event is the appointment under test (date-independent).
    vi.spyOn(calendar, 'loadCalendarEvents').mockResolvedValue([]);
    vi.spyOn(mockPatients, 'reconcileMockAppts').mockImplementation((appts: any[]) => appts || []);
    const appt = { id: 'drag-1', pid: 'aladdin', date: todayKey(), time: '10:00', dur: 50, description: 'פגישה שבועית', status: 'upcoming' };
    mount({ view: 'app', route: 'calendar', onboardTipDismissed: true, scheduledAppts: [appt] });
    await settle();
    // Target the locally-scheduled appointment specifically (it's the draggable one);
    // fixture demo events also render as .calh-event but vary by weekday and aren't
    // draggable, so don't rely on DOM order.
    const ev = await waitFor(() => {
      const el = [...document.querySelectorAll<HTMLElement>('.calh-event')].find((e) => e.getAttribute('draggable') === 'true');
      expect(el, 'the local appointment renders as a draggable event').toBeTruthy();
      return el!;
    });
    expect(ev.getAttribute('draggable')).toBe('true'); // local appt is draggable
    const column = ev.parentElement as HTMLElement; // the day column is the drop target

    fireEvent.dragStart(ev);
    fireEvent.dragOver(column, { clientY: 5 });
    fireEvent.drop(column, { clientY: 5 }); // near the top → first slot (jsdom rect is 0)

    // jsdom getBoundingClientRect is 0 → the drop snaps to the day's first slot (08:00);
    // the point is the existing appointment moved and wasn't duplicated.
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PKEY) || '{}');
      const appts = stored.scheduledAppts || [];
      expect(appts.filter((a: any) => a.id === 'drag-1').length).toBe(1);
      expect(appts.find((a: any) => a.id === 'drag-1')?.time).toBe('08:00');
    }, { timeout: 2000 });
  });

  it('resizes a local appointment in 15-minute increments without duplicating it', async () => {
    vi.spyOn(calendar, 'loadCalendarEvents').mockResolvedValue([]);
    vi.spyOn(mockPatients, 'reconcileMockAppts').mockImplementation((appts: any[]) => appts || []);
    const appt = { id: 'resize-1', pid: 'aladdin', date: todayKey(), time: '10:00', dur: 60, description: 'פגישה שבועית', status: 'upcoming' };
    mount({ view: 'app', route: 'calendar', onboardTipDismissed: true, scheduledAppts: [appt] });
    await settle();
    const handle = await waitFor(() => {
      const el = document.querySelector('.calh-resize-handle') as HTMLElement;
      expect(el).toBeTruthy();
      return el;
    });
    const pointer = (target: Node | Window, type: string, clientY: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'clientY', { value: clientY });
      fireEvent(target, event);
    };
    pointer(handle, 'pointerdown', 100);
    pointer(window, 'pointermove', 127); // half an hour at 54px/hour
    pointer(window, 'pointerup', 127);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PKEY) || '{}');
      const resized = (stored.scheduledAppts || []).find((a: any) => a.id === 'resize-1');
      expect(resized?.dur).toBe(90);
      expect((stored.scheduledAppts || []).filter((a: any) => a.id === 'resize-1')).toHaveLength(1);
    });
  });
});
