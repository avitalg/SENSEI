// The full calendar workspace — a Google-Calendar-style week/day/month view.
// Events come from loadCalendarEvents (demo fixture now, senseiapi `/calendar`
// when configured) merged with locally-scheduled appointments, so nothing is
// hardcoded and it lights up with a real backend. Quick date-nav and the
// roadmap/legend live in toolbar popovers (progressive disclosure) rather than a
// permanent side panel; today's agenda lives on the dashboard home.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store/AppStore';
import {
  dayKey,
  defaultScheduleForm,
  eventGuestName,
  formatWeekRange,
  monthFixtureEvents,
  scheduledApptToUiEvent,
  toCalEventDetail,
  type CalendarUiEvent,
} from '../../services/calendar';
import { isApiConfigured } from '../../services/apiClient';
import { useWeekEvents } from '../../hooks/useWeekEvents';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import CalendarErrorBanner from '../shared/CalendarErrorBanner';
import { OVERLAY_SHADOW } from '../../utils/styles';
import { getPatient, heCount } from '../../utils';
import { eventPatientId } from '../../utils/agenda';
import { HE_DAYS, HE_DAYS_SHORT, HE_MONTHS, fmtTime, sameDay } from '../../utils/dates';
import { CATEGORY_ORDER, SESSION_CATEGORIES, categoryOf } from '../../data/sessionCategories';
import '../../pages/dashboard.css';

const DAY_START = 8, DAY_END = 19, HOUR = 54;
const bodyH = (DAY_END - DAY_START) * HOUR;
const GUTTER = 58;

const toMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
const topFor = (min: number) => ((min - DAY_START * 60) / 60) * HOUR;

// The full calendar workspace (toolbar + week/day/month views + event dialogs).
// Used by the Calendar route full-page and by the mobile calendar. The dashboard
// home (DashboardHome) is a separate calm surface; this is the primary workspace.
export default function CalendarHome({ initialView = 'week' }: { initialView?: 'week' | 'day' | 'month' } = {}) {
  const { S, set, toast } = useApp();
  const connectGoogleCalendar = () => toast('חיבור ל-Google Calendar יתווסף בקרוב · בינתיים הנתונים מנוהלים מקומית', 'info');

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [nowMin, setNowMin] = useState(() => toMin(new Date()));
  // The user's explicit view choice (segmented control) persists across visits
  // and sessions (S.calViewPref, a PERSIST_KEY) — a therapist who works in
  // month view shouldn't have to re-select it on every calendar visit. Falls
  // back to the mount's platform default when no choice was ever made.
  const [calView, setCalView] = useState<'week' | 'day' | 'month'>(S.calViewPref || initialView);
  const pickView = (v: 'week' | 'day' | 'month') => { setCalView(v); set({ calViewPref: v }); };
  // Month-view day peek: tapping a day (or "+N עוד") opens a bottom sheet with
  // that day's full schedule — reuses the event-details flow, keeps month context.
  const [daySheet, setDaySheet] = useState<Date | null>(null);
  const daySheetRef = useFocusTrap<HTMLDivElement>(!!daySheet);
  useEffect(() => {
    if (!daySheet) return;
    // Move focus into the sheet (belt-and-suspenders alongside the focus trap) so
    // keyboard/SR users land inside the modal, and Escape closes it.
    const t = setTimeout(() => daySheetRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDaySheet(null); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySheet]);
  const [dragId, setDragId] = useState<string | null>(null);
  // Toolbar popovers (progressive disclosure): 'date' = quick jump-to-day mini
  // month, 'more' = roadmap Google-Calendar stub + category legend. Only one open
  // at a time; a transparent backdrop + Escape close it, focus is trapped inside.
  const [pop, setPop] = useState<null | 'date' | 'more'>(null);
  const popRef = useFocusTrap<HTMLDivElement>(!!pop);
  useEffect(() => {
    if (!pop) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pop]);

  const today = new Date();
  const { events: weekEvents, loading, error: weekError, reload: reloadWeek, weekStartDate: wkStart } = useWeekEvents(weekAnchor, S.scheduledAppts || [], S.patients);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(wkStart); d.setDate(wkStart.getDate() + i); return d; }),
    [wkStart],
  );

  // One pass over the week's timed events, bucketed by day-key and start-sorted.
  // Reused by the daily recap and every day column below, which previously each
  // re-filtered/re-sorted weekEvents inline on every render (this component
  // re-renders on any global state write).
  const timedByDay = useMemo(() => {
    const m = new Map<string, CalendarUiEvent[]>();
    for (const e of weekEvents) {
      if (e.allDay) continue;
      const k = dayKey(new Date(e.start));
      let list = m.get(k);
      if (!list) { list = []; m.set(k, list); }
      list.push(e);
    }
    for (const list of m.values()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return m;
  }, [weekEvents]);

  // live "now" line — refresh each minute
  useEffect(() => {
    const id = setInterval(() => setNowMin(toMin(new Date())), 60000);
    return () => clearInterval(id);
  }, []);

  const rangeTitle = formatWeekRange(weekAnchor);
  const shiftWeek = (delta: number) => setWeekAnchor((prev) => { const d = new Date(prev); d.setDate(d.getDate() + delta * 7); return d; });

  // ----- view mode (week / day / month) -----
  const dayDate = useMemo(() => { const d = new Date(weekAnchor); d.setHours(0, 0, 0, 0); return d; }, [weekAnchor]);
  const gridDays = calView === 'day' ? [dayDate] : days;
  const shiftBy = (delta: number) => {
    if (calView === 'week') { shiftWeek(delta); return; }
    setWeekAnchor((prev) => {
      const d = new Date(prev);
      if (calView === 'day') d.setDate(d.getDate() + delta);
      else d.setMonth(d.getMonth() + delta);
      return d;
    });
  };
  const viewTitle = calView === 'week'
    ? rangeTitle
    : calView === 'day'
      ? new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dayDate)
      : HE_MONTHS[dayDate.getMonth()] + ' ' + dayDate.getFullYear();
  const prevLabel = calView === 'week' ? 'השבוע הקודם' : calView === 'day' ? 'היום הקודם' : 'החודש הקודם';
  const nextLabel = calView === 'week' ? 'השבוע הבא' : calView === 'day' ? 'היום הבא' : 'החודש הבא';

  // Click an empty slot / day to schedule, prefilling the date (and time on the grid).
  const createAt = (date: Date, min?: number) => {
    const pid = S.patientId || S.patients[0]?.id || '';
    let time = '09:00';
    if (min != null) {
      const clamped = Math.max(DAY_START * 60, Math.min(DAY_END * 60 - 30, min));
      const snap = Math.floor(clamped / 30) * 30;
      time = String(Math.floor(snap / 60)).padStart(2, '0') + ':' + String(snap % 60).padStart(2, '0');
    }
    set({ dialog: 'schedule', apptForm: { pid, date: dayKey(date), time, dur: '50', description: '' }, errors: {} });
  };
  const onColumnClick = (d: Date) => (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    createAt(d, DAY_START * 60 + ((e.clientY - rect.top) / HOUR) * 60);
  };

  // Drag-and-drop: move a locally-scheduled appointment to a new day/time.
  // (Fixture demo events aren't in the local schedule and can't be dragged;
  // click-to-edit via the details dialog remains the keyboard-accessible path.)
  const isDraggable = (ev: CalendarUiEvent) => (S.scheduledAppts || []).some((a: any) => a.id === ev.id);
  const snapTimeFromY = (rectTop: number, clientY: number) => {
    const raw = DAY_START * 60 + ((clientY - rectTop) / HOUR) * 60;
    const min = Number.isFinite(raw) ? raw : DAY_START * 60;
    const snap = Math.floor(Math.max(DAY_START * 60, Math.min(DAY_END * 60 - 30, min)) / 30) * 30;
    return String(Math.floor(snap / 60)).padStart(2, '0') + ':' + String(snap % 60).padStart(2, '0');
  };
  const onColumnDrop = (d: Date) => (e: any) => {
    if (!dragId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const time = snapTimeFromY(rect.top, e.clientY);
    const appt = (S.scheduledAppts || []).find((a: any) => a.id === dragId);
    setDragId(null);
    if (!appt) return;
    const dk = dayKey(d);
    if (appt.date === dk && appt.time === time) return; // no-op move
    set({ scheduledAppts: (S.scheduledAppts || []).map((a: any) => a.id === dragId ? { ...a, date: dk, time } : a) });
    const p = S.patients.find((x: any) => x.id === appt.pid);
    const dLabel = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' }).format(d);
    toast('הפגישה' + (p ? ' עם ' + p.name : '') + ' הועברה ל-' + dLabel + ' · ' + time);
  };

  // month grid (for the month view) — full dates + local appointment counts
  const mgFirst = new Date(dayDate.getFullYear(), dayDate.getMonth(), 1);
  const mgCount = new Date(dayDate.getFullYear(), dayDate.getMonth() + 1, 0).getDate();
  const monthCells: (Date | null)[] = [];
  for (let i = 0; i < mgFirst.getDay(); i++) monthCells.push(null);
  for (let dnum = 1; dnum <= mgCount; dnum++) monthCells.push(new Date(dayDate.getFullYear(), dayDate.getMonth(), dnum));
  // Colored event chips per day for the month grid — same active-roster filter as
  // the week view (never render an archived/deleted patient's appt), same
  // scheduledApptToUiEvent mapping so the details dialog behaves identically.
  const monthActiveIds = useMemo(() => new Set((S.patients || []).map((p: any) => p.id)), [S.patients]);
  // Recurring fixture sessions across the whole visible month (demo mode only) so
  // every week shows events like the week view — grouped by day, memoized.
  const monthFixtureByDay = useMemo(() => {
    const map = new Map<string, CalendarUiEvent[]>();
    if (isApiConfigured()) return map;
    for (const ev of monthFixtureEvents(dayDate)) {
      const dk = dayKey(new Date(ev.start));
      const arr = map.get(dk); if (arr) arr.push(ev); else map.set(dk, [ev]);
    }
    return map;
  }, [dayDate]);
  const monthEventsFor = (date: Date): CalendarUiEvent[] => {
    const dk = dayKey(date);
    const scheduled = (S.scheduledAppts || [])
      .filter((a: any) => a.date === dk && monthActiveIds.has(a.pid))
      .map((a: any) => scheduledApptToUiEvent(a, getPatient(S.patients, a.pid).name));
    const merged = [...scheduled, ...(monthFixtureByDay.get(dk) || [])]
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
    // Dedup a slot present as both a local appt and a fixture event (same session).
    const seen = new Set<string>();
    return merged.filter((ev) => {
      const key = fmtTime(new Date(ev.start)) + '|' + eventGuestName(ev);
      if (seen.has(key)) return false; seen.add(key); return true;
    });
  };
  const openEventDetail = (ev: CalendarUiEvent) => set({ dialog: 'calEvent', calEventDetail: toCalEventDetail(ev, ev.patientId ?? null) });
  const openDayView = (date: Date) => { setWeekAnchor(date); setCalView('day'); };

  // Open the meeting-details dialog (not a jump to the Patients tab) so the
  // therapist sees the meeting, a recap, and per-meeting actions in place.
  const openEvent = (ev: CalendarUiEvent) =>
    set({ dialog: 'calEvent', calEventDetail: toCalEventDetail(ev, eventPatientId(ev, S.patients)) });
  const openSchedule = () =>
    set({ dialog: 'schedule', apptForm: defaultScheduleForm(S.patientId || S.patients[0]?.id || ''), errors: {} });


  const hourLabels = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

  // Announce calendar view/date changes to screen readers (polite), skipping the
  // initial render so it only speaks in response to a navigation the user made.
  const calViewName = calView === 'week' ? 'תצוגת שבוע' : calView === 'day' ? 'תצוגת יום' : 'תצוגת חודש';
  const [announce, setAnnounce] = useState('');
  const firstNav = useRef(true);
  useEffect(() => {
    if (firstNav.current) { firstNav.current = false; return; }
    setAnnounce(calViewName + ' · ' + viewTitle);
  }, [viewTitle, calViewName]);

  // ----- mini month (of the viewed week) -----
  const miniMonthDate = days[3]; // mid-week → the month the week mostly sits in
  const mFirst = new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth(), 1);
  const mDays = new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth() + 1, 0).getDate();
  const miniCells: (number | null)[] = [];
  for (let i = 0; i < mFirst.getDay(); i++) miniCells.push(null);
  for (let d = 1; d <= mDays; d++) miniCells.push(d);
  const pickMiniDay = (d: number) => {
    const picked = new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth(), d);
    setWeekAnchor(picked);
  };

  return (
    <div className="calh-root">
      <div aria-live="polite" className="sr-only">{announce}</div>
      {/* ---- calendar workspace ---- */}
      <h1 style={{ margin: '0 0 14px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>יומן</h1>
      {/* ---- toolbar ---- */}
      <div style={{ position: 'relative' }}>
      <div className="calh-toolbar">
        <button type="button" className="calh-today-btn" onClick={() => setWeekAnchor(new Date())}>היום</button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="calh-icon-btn" aria-label={prevLabel} onClick={() => shiftBy(-1)}>‹</button>
          <button type="button" className="calh-icon-btn" aria-label={nextLabel} onClick={() => shiftBy(1)}>›</button>
        </div>
        <button
          type="button"
          className="calh-icon-btn"
          aria-label="קפיצה לתאריך"
          aria-haspopup="dialog"
          aria-expanded={pop === 'date'}
          onClick={() => setPop(pop === 'date' ? null : 'date')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
        </button>
        <h2 dir={calView === 'week' ? 'ltr' : 'rtl'} aria-label={'יומן · ' + viewTitle} style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', textAlign: 'start' }}>{viewTitle}</h2>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid var(--divider)' }} role="group" aria-label="תצוגת יומן">
          <button type="button" className="calh-seg-btn" aria-pressed={calView === 'month'} onClick={() => pickView('month')}>חודש</button>
          <button type="button" className="calh-seg-btn" aria-pressed={calView === 'week'} onClick={() => pickView('week')}>שבוע</button>
          <button type="button" className="calh-seg-btn" aria-pressed={calView === 'day'} onClick={() => pickView('day')}>יום</button>
        </div>
        <button type="button" className="calh-new-btn" onClick={openSchedule}>
          <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>+</span>פגישה חדשה
        </button>
        <button
          type="button"
          className="calh-icon-btn"
          aria-label="אפשרויות נוספות"
          aria-haspopup="dialog"
          aria-expanded={pop === 'more'}
          onClick={() => setPop(pop === 'more' ? null : 'more')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
        </button>
      </div>

      {/* Toolbar popovers — transparent backdrop closes on outside click/Escape. */}
      {pop && (
        <>
          <div onClick={() => setPop(null)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} aria-hidden="true" />
          {pop === 'date' && (
            <div
              ref={popRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="קפיצה לתאריך"
              className="calh-card calh-pop"
              style={{ position: 'absolute', top: '100%', insetInlineStart: 0, marginTop: 6, zIndex: 61, width: 268, padding: '14px 14px 16px', boxShadow: OVERLAY_SHADOW }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10, textAlign: 'center' }}>{HE_MONTHS[miniMonthDate.getMonth()] + ' ' + miniMonthDate.getFullYear()}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                {HE_DAYS_SHORT.map((d, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                {miniCells.map((c, i) => {
                  if (c === null) return <div key={i} />;
                  const cellDate = new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth(), c);
                  const isToday = sameDay(cellDate, today);
                  const inWeek = cellDate >= days[0] && cellDate <= days[6];
                  return (
                    <button
                      key={i}
                      type="button"
                      className="calh-mini-day"
                      onClick={() => { pickMiniDay(c); setPop(null); }}
                      aria-label={c + ' ' + HE_MONTHS[miniMonthDate.getMonth()]}
                      aria-current={isToday ? 'date' : undefined}
                      style={{ fontSize: 11.5, textAlign: 'center', lineHeight: '26px', height: 26, borderRadius: '50%', fontWeight: isToday ? 700 : 500, background: isToday ? 'var(--primary)' : inWeek ? 'var(--primary-tint)' : 'transparent', color: isToday ? 'var(--on-accent)' : 'var(--text-2)' }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {pop === 'more' && (
            <div
              ref={popRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="אפשרויות נוספות"
              className="calh-card calh-pop"
              style={{ position: 'absolute', top: '100%', insetInlineEnd: 0, marginTop: 6, zIndex: 61, width: 260, padding: '12px 14px 14px', boxShadow: OVERLAY_SHADOW }}
            >
              <button
                type="button"
                onClick={() => { connectGoogleCalendar(); setPop(null); }}
                className="calh-gcal-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', height: 42, border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--primary)" aria-hidden="true"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
                חיבור ל-Google Calendar · בקרוב
              </button>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>סוגי פגישות</div>
                {CATEGORY_ORDER.map((k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px' }}>
                    <span aria-hidden style={{ width: 15, height: 15, borderRadius: 4, background: SESSION_CATEGORIES[k].bar, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{SESSION_CATEGORIES[k].label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* ---- body: week grid + side panel ---- */}
      <div className={'calh-body' + (calView === 'month' ? ' calh-body-month' : '')}>
        <div className="calh-grid-wrap">
          {loading && (
            <div style={{ height: 3, background: 'var(--primary-tint)', overflow: 'hidden' }}>
              <div style={{ height: 3, width: '55%', background: 'var(--primary)', animation: 'loadbar 1.1s cubic-bezier(.4,0,.2,1) infinite' }} />
            </div>
          )}
          {weekError && !loading && <CalendarErrorBanner onRetry={reloadWeek} attached />}
          <div className="calh-grid-scroll">
            {calView === 'month' ? (
              <div className="calh-month">
                <div className="calh-month-head">
                  {HE_DAYS.map((name, i) => (<div key={i} className="calh-month-dow">{name}</div>))}
                </div>
                <div className="calh-month-grid">
                  {monthCells.map((cell, i) => {
                    if (!cell) return <div key={i} className="calh-month-cell is-empty" />;
                    const isToday = sameDay(cell, today);
                    const isSel = sameDay(cell, dayDate) && !isToday;
                    const evs = monthEventsFor(cell);
                    const shown = evs.slice(0, 3);
                    const more = evs.length - shown.length;
                    return (
                      <div
                        key={i}
                        role="button"
                        tabIndex={0}
                        aria-current={isToday ? 'date' : undefined}
                        aria-label={cell.getDate() + ' ' + HE_MONTHS[cell.getMonth()] + (evs.length ? ' · ' + heCount(evs.length, 'פגישה אחת', 'פגישות') : ' · אין פגישות')}
                        onClick={() => { if (evs.length) setDaySheet(cell); else createAt(cell); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (evs.length) setDaySheet(cell); else createAt(cell); } }}
                        className={'calh-month-cell' + (isSel ? ' is-selected' : '')}
                      >
                        <div className={'calh-month-num' + (isToday ? ' is-today' : '')}>{cell.getDate()}</div>
                        <div className="calh-month-chips">
                          {shown.map((ev) => {
                            const c = SESSION_CATEGORIES[categoryOf(ev.title, ev.description)];
                            return (
                              <button
                                key={ev.id}
                                type="button"
                                className="calh-chip"
                                style={{ border: 'none', borderInlineStart: '3px solid ' + c.bar, background: c.bg, color: c.text }}
                                aria-label={eventGuestName(ev) + ' · ' + (ev.allDay ? 'כל היום' : fmtTime(new Date(ev.start)))}
                                onClick={(e) => { e.stopPropagation(); openEventDetail(ev); }}
                              >
                                <span className="calh-chip-txt">{eventGuestName(ev)}</span>
                              </button>
                            );
                          })}
                          {more > 0 && (
                            <button type="button" className="calh-chip-more" aria-label={'עוד ' + more + ' פגישות · ' + cell.getDate() + ' ' + HE_MONTHS[cell.getMonth()]} onClick={(e) => { e.stopPropagation(); setDaySheet(cell); }}>+{more} עוד</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
            <div style={{ minWidth: calView === 'day' ? 320 : 720, display: 'flex', flexDirection: 'column' }}>
              {/* header row */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 3 }}>
                <div style={{ width: GUTTER, flexShrink: 0 }} />
                {gridDays.map((d, i) => {
                  const isToday = sameDay(d, today);
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderInlineStart: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 4 }}>{HE_DAYS[d.getDay()]}</div>
                      <div style={{ width: 34, height: 34, lineHeight: '34px', borderRadius: '50%', margin: '0 auto', fontSize: 16, fontWeight: 700, background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? 'var(--on-accent)' : 'var(--text)' }}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
              {/* grid body */}
              <div style={{ display: 'flex', height: bodyH }}>
                {/* hour gutter */}
                <div style={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
                  {hourLabels.map((h) => (
                    <div key={h} dir="ltr" style={{ position: 'absolute', top: topFor(h * 60) - 7, insetInlineEnd: 8, fontSize: 11, color: 'var(--text-muted)' }}>{String(h).padStart(2, '0')}:00</div>
                  ))}
                </div>
                {/* day columns */}
                {gridDays.map((d, i) => {
                  const isToday = sameDay(d, today);
                  // all-day events (e.g. a fixture training day) carry no start
                  // time, so they can't be placed on the timed grid — skip them
                  const dayEvents = timedByDay.get(dayKey(d)) ?? [];
                  return (
                    <div
                      key={i}
                      onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                      onDrop={onColumnDrop(d)}
                      style={{ flex: 1, position: 'relative', borderInlineStart: '1px solid var(--line)', height: bodyH, background: dragId ? 'var(--primary-tint)' : undefined }}
                    >
                      {/* empty-slot click target (labelled, a sibling of the event
                          buttons so it never nests interactive elements) */}
                      <button
                        type="button"
                        className="calh-col-add"
                        aria-label={'קביעת פגישה · ' + HE_DAYS[d.getDay()] + ' ' + d.getDate()}
                        onClick={onColumnClick(d)}
                        style={{ position: 'absolute', inset: 0, border: 'none', background: 'transparent', padding: 0, margin: 0, cursor: 'pointer', zIndex: 0 }}
                      />
                      {hourLabels.map((h) => (
                        <div key={h} style={{ position: 'absolute', insetInline: 0, top: topFor(h * 60), borderTop: '1px solid var(--line)', pointerEvents: 'none' }} />
                      ))}
                      {isToday && nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60 && (
                        <div style={{ position: 'absolute', insetInline: 0, top: topFor(nowMin), height: 0, borderTop: '2px solid var(--now-line)', zIndex: 2, pointerEvents: 'none' }}>
                          <div style={{ position: 'absolute', insetInlineStart: -4, top: -5, width: 9, height: 9, borderRadius: '50%', background: 'var(--now-line)' }} />
                        </div>
                      )}
                      {(() => {
                        // Overlapping events share the column side-by-side instead of
                        // stacking on top of each other: greedy lane assignment over the
                        // start-sorted list, then each event takes 1/lanes of the width.
                        const sorted = dayEvents; // already start-sorted by timedByDay
                        const laneEnd: number[] = [];
                        const laneOf: Record<string, number> = {};
                        for (const ev of sorted) {
                          const s = new Date(ev.start).getTime();
                          const e = Math.max(s + 20 * 60000, new Date(ev.end).getTime());
                          let lane = laneEnd.findIndex((endT) => endT <= s);
                          if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
                          laneEnd[lane] = e;
                          laneOf[ev.id] = lane;
                        }
                        const lanes = laneEnd.length || 1;
                        return sorted.map((ev) => {
                        const start = new Date(ev.start), end = new Date(ev.end);
                        const startMin = toMin(start);
                        const durMin = Math.max(20, (end.getTime() - start.getTime()) / 60000);
                        const c = SESSION_CATEGORIES[categoryOf(ev.title, ev.description)];
                        const short = durMin <= 50;
                        const laneW = (100 - 2) / lanes;
                        // 3+ lanes → each sliver is too narrow for a second line;
                        // show the name only and carry the details in the tooltip
                        // (the aria-label already announces name + time).
                        const dense = lanes >= 3;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            className="calh-event"
                            draggable={isDraggable(ev)}
                            onDragStart={(e) => { setDragId(ev.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnd={() => setDragId(null)}
                            onClick={(e) => { e.stopPropagation(); openEvent(ev); }}
                            aria-label={eventGuestName(ev) + ' · ' + fmtTime(start)}
                            title={eventGuestName(ev) + ' · ' + fmtTime(start) + ' · ' + c.label}
                            style={{ position: 'absolute', top: topFor(startMin) + 1, height: (durMin / 60) * HOUR - 3, insetInlineStart: 'calc(' + (1 + laneOf[ev.id] * laneW) + '% + 2px)', width: 'calc(' + laneW + '% - 4px)', background: c.bg, borderRadius: 7, border: 'none', borderInlineStart: '3px solid ' + c.bar, padding: dense ? '3px 5px' : short ? '3px 8px' : '5px 8px', cursor: isDraggable(ev) ? 'grab' : 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'start', font: 'inherit', zIndex: 1, opacity: dragId === ev.id ? 0.4 : 1 }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eventGuestName(ev)}</span>
                            {!dense && (
                              <span style={{ fontSize: 11, color: c.text, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {short ? (<><span dir="ltr">{fmtTime(start)}</span>{' · ' + c.label}</>) : c.label}
                              </span>
                            )}
                            {!dense && !short && <span dir="ltr" style={{ fontSize: 11, color: c.text, opacity: 0.7, textAlign: 'start' }}>{fmtTime(start) + '–' + fmtTime(end)}</span>}
                          </button>
                        );
                        });
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </div>

      </div>

      {/* ---- day peek: bottom sheet with the tapped day's full schedule ---- */}
      {daySheet && (
        <>
          <div onClick={() => setDaySheet(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,40,.5)', zIndex: 180 }} />
          <div ref={daySheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={'פגישות · ' + new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(daySheet)} className="calh-day-sheet" style={{ position: 'fixed', insetInline: 0, bottom: 0, zIndex: 181, background: 'var(--paper)', borderTopLeftRadius: 18, borderTopRightRadius: 18, boxShadow: OVERLAY_SHADOW, maxHeight: '76vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom, 0px)', animation: 'pop .2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 18px 10px', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text)' }}>{new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(daySheet)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{heCount(monthEventsFor(daySheet).length, 'פגישה אחת', 'פגישות')}</div>
              </div>
              <button type="button" onClick={() => setDaySheet(null)} aria-label="סגירה" className="calh-icon-btn" style={{ flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 12px 12px' }}>
              {monthEventsFor(daySheet).map((ev) => {
                const c = SESSION_CATEGORIES[categoryOf(ev.title, ev.description)];
                return (
                  <button key={ev.id} type="button" onClick={() => { setDaySheet(null); openEventDetail(ev); }} aria-label={eventGuestName(ev) + ' · ' + (ev.allDay ? 'כל היום' : fmtTime(new Date(ev.start)))} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', border: 'none', borderRadius: 10, background: 'var(--paper)', padding: '11px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ width: 4, alignSelf: 'stretch', minHeight: 34, borderRadius: 3, background: c.bar, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eventGuestName(ev)}</span>
                      <span dir="ltr" style={{ display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'start', marginTop: 2 }}>{ev.allDay ? 'כל היום' : fmtTime(new Date(ev.start)) + '–' + fmtTime(new Date(ev.end))}</span>
                    </span>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-disabled)" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '10px 14px 14px', borderTop: '1px solid var(--line)' }}>
              <button type="button" onClick={() => { const d = daySheet; setDaySheet(null); openDayView(d); }} style={{ flex: 1, height: 44, border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>תצוגת יום מלאה</button>
              <button type="button" onClick={() => { const d = daySheet; setDaySheet(null); createAt(d); }} style={{ flex: 1, height: 44, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ פגישה חדשה</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
