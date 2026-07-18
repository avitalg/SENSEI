// Offline demo roster — used only when VITE_API_BASE_URL is unset.
import type { Patient } from '../services/patients';
import { dayKey } from '../services/calendar';

export interface MockScheduledAppt {
  id: string
  pid: string
  date: string
  time: string
  dur: number
  description: string
}

export const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', name: 'דנה לוי', phone: '054-1234567', email: 'dana.l@mail.com', created_at: '2025-01-15T10:00:00Z' },
  { id: 'p2', name: 'יוסי מזרחי', phone: '052-7654321', email: 'yossi.m@mail.com', created_at: '2024-09-01T10:00:00Z' },
  { id: 'p3', name: 'מיכל כהן', phone: '053-9988776', email: 'michal.c@mail.com', created_at: '2026-02-01T10:00:00Z' },
  { id: 'p4', name: 'אבי פרץ', phone: '054-3322110', email: 'avi.p@mail.com', created_at: '2024-06-01T10:00:00Z' },
  { id: 'p5', name: 'סימבה', phone: '054-9876543', email: 'simba@mail.com', created_at: '2025-11-01T10:00:00Z' },
  { id: 'p6', name: 'פורסט', phone: '054-6677889', email: 'forrest@mail.com', created_at: '2025-10-01T10:00:00Z' },
  { id: 'p7', name: 'הארי', phone: '053-2211334', email: 'harry@mail.com', created_at: '2025-09-15T10:00:00Z' },
];

type MockApptSlot =
  | { pid: string; dayOffset: number; time: string; description: string }
  | { pid: string; fixedDate: string; time: string; description: string };

/** Upcoming local appointments for the offline demo roster (p1–p7). */
export function buildMockScheduledAppts(now = new Date()): MockScheduledAppt[] {
  const slots: MockApptSlot[] = [
    { pid: 'p1', dayOffset: 1, time: '09:00', description: 'פגישה שבועית' },
    { pid: 'p1', dayOffset: 8, time: '13:00', description: 'פגישת מעקב' },
    { pid: 'p2', dayOffset: 2, time: '10:00', description: 'פגישה שבועית' },
    { pid: 'p2', dayOffset: 9, time: '15:00', description: 'פגישת מעקב' },
    { pid: 'p3', dayOffset: 3, time: '11:00', description: 'פגישה שבועית' },
    { pid: 'p3', dayOffset: 10, time: '09:30', description: 'פגישת וידאו' },
    { pid: 'p4', dayOffset: 4, time: '12:00', description: 'פגישת מעקב' },
    { pid: 'p4', dayOffset: 11, time: '16:00', description: 'פגישה שבועית' },
    { pid: 'p5', fixedDate: '2026-07-21', time: '10:00', description: 'פגישת המשך' },
    { pid: 'p6', dayOffset: 5, time: '10:30', description: 'פגישה שבועית' },
    { pid: 'p6', dayOffset: 12, time: '11:30', description: 'פגישת מעקב' },
    { pid: 'p7', dayOffset: 6, time: '14:00', description: 'פגישה שבועית' },
    { pid: 'p7', dayOffset: 13, time: '09:00', description: 'פגישת מעקב' },
  ];
  return slots.map((slot, index) => {
    const date = 'fixedDate' in slot
      ? slot.fixedDate
      : (() => {
        const d = new Date(now);
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() + slot.dayOffset);
        return dayKey(d);
      })();
    return {
      id: 'mock-appt-' + (index + 1),
      pid: slot.pid,
      date,
      time: slot.time,
      dur: 50,
      description: slot.description,
    };
  });
}

/** Merge newly added demo patients into a cached offline roster. */
export function reconcileMockPatients(current: Patient[]): Patient[] {
  if (!current.length) return MOCK_PATIENTS.map((p) => ({ ...p }));
  const byId = new Map(current.map((p) => [p.id, p]));
  let changed = false;
  for (const mock of MOCK_PATIENTS) {
    if (!byId.has(mock.id)) {
      byId.set(mock.id, { ...mock });
      changed = true;
    }
  }
  return changed ? Array.from(byId.values()) : current;
}

/** Merge newly added demo appointments into a cached offline schedule. */
export function reconcileMockAppts(current: MockScheduledAppt[], now = new Date()): MockScheduledAppt[] {
  const fresh = buildMockScheduledAppts(now);
  if (!current.length) return fresh;
  const ids = new Set(current.map((a) => a.id));
  const pidsWithAppts = new Set(current.map((a) => a.pid));
  const added = fresh.filter((a) => !ids.has(a.id) && !pidsWithAppts.has(a.pid));
  return added.length ? [...current, ...added] : current;
}
