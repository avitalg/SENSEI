// Pure workload/attention math for the home dashboard. Kept in one place so the
// summary strip and the focus zone report the same numbers (no parallel logic),
// and so the counting is unit-testable without mounting the app.
//
// Offline/demo: patient-tied truth comes from locally-scheduled appointments —
// deliberately NOT the generic calendar fixture (decorative week-view demo).
// Live API: callers pass upcoming calendar events via dashboardStatsFromEvents.
// Takes plain arguments only (no store/data imports) for leaf-module layering.

export interface UpcomingAppt {
  id: string
  pid: string
  date: string
  time?: string
  description?: string
  when: Date
}

export interface DashboardStats {
  /** appointments whose date is today (past + future today) */
  today: number
  /** appointments falling inside the current Sun–Sat week */
  week: number
  /** future appointments, ascending by time */
  upcoming: UpcomingAppt[]
  /** the earliest future appointment, or null */
  next: UpcomingAppt | null
  /** ids of active patients with no upcoming appointment (follow-ups to schedule) */
  awaitingPids: string[]
}

/** Minimal event shape for live-calendar focus math (no calendar.ts import). */
export interface FocusCalendarEvent {
  id: string
  patientId?: string | null
  start: Date
  /** When set, an event is upcoming while end > now (in-progress counts). */
  end?: Date
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDayKey = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const localTime = (d: Date) => pad(d.getHours()) + ':' + pad(d.getMinutes());

// Sunday-based week start (the app's calendar begins on ראשון), normalized to 00:00.
function weekStart(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function awaitingFromUpcoming(upcoming: UpcomingAppt[], patients: any[] | undefined): string[] {
  const withUpcoming = new Set(upcoming.map((a) => a.pid));
  return (patients || []).filter((p: any) => !withUpcoming.has(p.id)).map((p: any) => p.id);
}

function isUpcomingFocusEvent(e: FocusCalendarEvent, now: Date): boolean {
  if (e.end) return e.end.getTime() > now.getTime();
  return e.start.getTime() >= now.getTime();
}

/** Next meeting + awaiting list from live `/calendar` events (patient-linked only). */
export function dashboardStatsFromEvents(
  events: FocusCalendarEvent[] | undefined,
  patients: any[] | undefined,
  now: Date,
): Pick<DashboardStats, 'upcoming' | 'next' | 'awaitingPids'> {
  const upcoming: UpcomingAppt[] = (events || [])
    .filter((e) => e.patientId && isUpcomingFocusEvent(e, now))
    .map((e) => ({
      id: e.id,
      pid: String(e.patientId),
      date: localDayKey(e.start),
      time: localTime(e.start),
      when: new Date(e.start),
    }))
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  return {
    upcoming,
    next: upcoming[0] || null,
    awaitingPids: awaitingFromUpcoming(upcoming, patients),
  };
}

export function dashboardStats(scheduledAppts: any[] | undefined, patients: any[] | undefined, now: Date): DashboardStats {
  const appts: UpcomingAppt[] = (scheduledAppts || []).map((a: any) => ({
    ...a,
    when: new Date(a.date + 'T' + (a.time || '00:00')),
  }));

  const ws = weekStart(now);
  const we = new Date(ws);
  we.setDate(ws.getDate() + 7);
  const todayKey = localDayKey(now);

  const today = appts.filter((a) => a.date === todayKey).length;
  const week = appts.filter((a) => a.when >= ws && a.when < we).length;

  const upcoming = appts
    .filter((a) => a.when.getTime() >= now.getTime())
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  return { today, week, upcoming, next: upcoming[0] || null, awaitingPids: awaitingFromUpcoming(upcoming, patients) };
}

// The patients with a non-empty unsaved notes/summary draft (work to resume).
export function openDraftPids(notesDrafts: Record<string, any> | undefined, summaryDrafts: Record<string, any> | undefined): string[] {
  return Array.from(new Set([
    ...Object.keys(notesDrafts || {}),
    ...Object.keys(summaryDrafts || {}),
  ])).filter((pid) => (notesDrafts?.[pid]?.trim?.()) || (summaryDrafts?.[pid]?.trim?.()));
}
