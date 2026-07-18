// Dashboard home — a Google-Calendar-style week view. Replaces the former
// stat-list dashboard (design: "Sensei App" prototype, CalendarHome). Events
// come from the same source as CalendarPage — loadCalendarEvents (demo fixture
// now, senseiapi `/calendar` when configured) — merged with locally-scheduled
// appointments, so nothing is hardcoded and it lights up with a real backend.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppStore';
import {
  dayKey,
  defaultScheduleForm,
  eventGuestName,
  formatWeekRange,
  toCalEventDetail,
  type CalendarUiEvent,
} from '../services/calendar';
import { useWeekEvents } from '../hooks/useWeekEvents';
import { useTts } from '../hooks/useTts';
import { CATEGORY_ORDER, SESSION_CATEGORIES, categoryOf } from '../data/sessionCategories';
import './dashboard.css';

const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HE_DAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const DAY_START = 8, DAY_END = 19, HOUR = 54;
const bodyH = (DAY_END - DAY_START) * HOUR;
const GUTTER = 58;

const toMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
const topFor = (min: number) => ((min - DAY_START * 60) / 60) * HOUR;
const fmtTime = (d: Date) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function DashboardPage() {
  const { S, set } = useApp();
  const tts = useTts();

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [nowMin, setNowMin] = useState(() => toMin(new Date()));
  const [calView, setCalView] = useState<'week' | 'day' | 'month'>('week');

  const today = new Date();
  const { events: weekEvents, loading, weekStartDate: wkStart } = useWeekEvents(weekAnchor, S.scheduledAppts || [], S.patients);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(wkStart); d.setDate(wkStart.getDate() + i); return d; }),
    [wkStart],
  );

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
    const pid = S.patientId || S.patients[0]?.id || 'p1';
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

  // month grid (for the month view) — full dates + local appointment counts
  const mgFirst = new Date(dayDate.getFullYear(), dayDate.getMonth(), 1);
  const mgCount = new Date(dayDate.getFullYear(), dayDate.getMonth() + 1, 0).getDate();
  const monthCells: (Date | null)[] = [];
  for (let i = 0; i < mgFirst.getDay(); i++) monthCells.push(null);
  for (let dnum = 1; dnum <= mgCount; dnum++) monthCells.push(new Date(dayDate.getFullYear(), dayDate.getMonth(), dnum));
  const apptsOn = (date: Date) => (S.scheduledAppts || []).filter((a: any) => a.date === dayKey(date)).length;
  const openDayView = (date: Date) => { setWeekAnchor(date); setCalView('day'); };

  // Open the meeting-details dialog (not a jump to the Patients tab) so the
  // therapist sees the meeting, a recap, and per-meeting actions in place.
  const openEvent = (ev: CalendarUiEvent) => {
    let pid = ev.patientId ?? null;
    if (!pid) { const name = eventGuestName(ev); pid = S.patients.find((p: any) => p.name === name)?.id ?? null; }
    set({ dialog: 'calEvent', calEventDetail: toCalEventDetail(ev, pid) });
  };
  const openSchedule = () =>
    set({ dialog: 'schedule', apptForm: defaultScheduleForm(S.patientId || S.patients[0]?.id || 'p1'), errors: {} });

  // Daily "open the day" recap — read aloud (TTS) so the therapist can hear the
  // day's agenda over coffee without opening each file.
  const todaysEvents = weekEvents
    .filter((e) => !e.allDay && sameDay(new Date(e.start), today))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const dailyRecapText = todaysEvents.length
    ? 'סיכום פתיחת יום. יש לך ' + todaysEvents.length + ' פגישות היום. ' +
      todaysEvents.map((e) => eventGuestName(e) + ' בשעה ' + fmtTime(new Date(e.start))).join('. ') + '.'
    : 'סיכום פתיחת יום. אין לך פגישות מתוזמנות היום.';

  const hourLabels = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

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
      {/* ---- toolbar ---- */}
      <div className="calh-toolbar">
        <button type="button" className="calh-today-btn" onClick={() => setWeekAnchor(new Date())}>היום</button>
        {tts.supported && (
          <button
            type="button"
            className="calh-today-btn"
            onClick={() => tts.toggle(dailyRecapText)}
            aria-label={tts.speaking ? 'עצירת ההקראה' : 'הקראת סיכום פתיחת היום'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              {tts.speaking ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" /> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />}
            </svg>
            {tts.speaking ? 'עצירה' : 'סיכום יומי'}
          </button>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="calh-icon-btn" aria-label={prevLabel} onClick={() => shiftBy(-1)}>‹</button>
          <button type="button" className="calh-icon-btn" aria-label={nextLabel} onClick={() => shiftBy(1)}>›</button>
        </div>
        <h1 dir={calView === 'week' ? 'ltr' : 'rtl'} aria-label={'יומן · ' + viewTitle} style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', textAlign: 'start' }}>{viewTitle}</h1>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid var(--divider)' }} role="group" aria-label="תצוגת יומן">
          <button type="button" className="calh-seg-btn" aria-pressed={calView === 'month'} onClick={() => setCalView('month')}>חודש</button>
          <button type="button" className="calh-seg-btn" aria-pressed={calView === 'week'} onClick={() => setCalView('week')}>שבוע</button>
          <button type="button" className="calh-seg-btn" aria-pressed={calView === 'day'} onClick={() => setCalView('day')}>יום</button>
        </div>
        <button type="button" className="calh-new-btn" onClick={openSchedule}>
          <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>+</span>פגישה חדשה
        </button>
      </div>

      {/* ---- body: week grid + side panel ---- */}
      <div className="calh-body">
        <div className="calh-grid-wrap">
          {loading && (
            <div style={{ height: 3, background: 'var(--primary-tint)', overflow: 'hidden' }}>
              <div style={{ height: 3, width: '55%', background: 'var(--primary)', animation: 'loadbar 1.1s cubic-bezier(.4,0,.2,1) infinite' }} />
            </div>
          )}
          <div className="calh-grid-scroll">
            {calView === 'month' ? (
              <div style={{ minWidth: 720 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                  {HE_DAYS.map((name, i) => (
                    <div key={i} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--divider)' }}>{name}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                  {monthCells.map((cell, i) => {
                    if (!cell) return <div key={i} style={{ minHeight: 92, borderInlineStart: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }} />;
                    const isToday = sameDay(cell, today);
                    const n = apptsOn(cell);
                    return (
                      <div
                        key={i}
                        role="button"
                        tabIndex={0}
                        aria-label={cell.getDate() + ' ' + HE_MONTHS[cell.getMonth()] + (n ? ' · ' + n + ' פגישות' : '')}
                        onClick={() => { if (n) openDayView(cell); else createAt(cell); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (n) openDayView(cell); else createAt(cell); } }}
                        className="calh-month-cell"
                        style={{ minHeight: 92, padding: 6, borderInlineStart: '1px solid var(--line)', borderBottom: '1px solid var(--line)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
                      >
                        <div style={{ width: 26, height: 26, lineHeight: '26px', borderRadius: '50%', textAlign: 'center', fontSize: 13, fontWeight: 700, alignSelf: 'flex-start', background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? 'var(--on-accent)' : 'var(--text)' }}>{cell.getDate()}</div>
                        {n > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-tint)', borderRadius: 6, padding: '2px 7px', alignSelf: 'flex-start' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />{n} פגישות
                          </span>
                        )}
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
                  const dayEvents = weekEvents.filter((e) => !e.allDay && sameDay(new Date(e.start), d));
                  return (
                    <div key={i} style={{ flex: 1, position: 'relative', borderInlineStart: '1px solid var(--line)', height: bodyH }}>
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
                      {dayEvents.map((ev) => {
                        const start = new Date(ev.start), end = new Date(ev.end);
                        const startMin = toMin(start);
                        const durMin = Math.max(20, (end.getTime() - start.getTime()) / 60000);
                        const c = SESSION_CATEGORIES[categoryOf(ev.title, ev.description)];
                        const short = durMin <= 50;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            className="calh-event"
                            onClick={(e) => { e.stopPropagation(); openEvent(ev); }}
                            aria-label={eventGuestName(ev) + ' · ' + fmtTime(start)}
                            style={{ position: 'absolute', top: topFor(startMin) + 1, height: (durMin / 60) * HOUR - 3, insetInline: 3, background: c.bg, borderRadius: 7, borderInlineStart: '3px solid ' + c.bar, padding: short ? '3px 8px' : '5px 8px', cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'start', font: 'inherit', zIndex: 1 }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eventGuestName(ev)}</span>
                            <span style={{ fontSize: 11, color: c.text, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {short ? (<><span dir="ltr">{fmtTime(start)}</span>{' · ' + c.label}</>) : c.label}
                            </span>
                            {!short && <span dir="ltr" style={{ fontSize: 11, color: c.text, opacity: 0.7, textAlign: 'start' }}>{fmtTime(start) + '–' + fmtTime(end)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* ---- side panel ---- */}
        <aside className="calh-side">
          <div className="calh-card" style={{ padding: '14px 14px 16px' }}>
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
                    onClick={() => pickMiniDay(c)}
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

          <div className="calh-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>סוגי פגישות</div>
            {CATEGORY_ORDER.map((k) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px' }}>
                <span aria-hidden style={{ width: 15, height: 15, borderRadius: 4, background: SESSION_CATEGORIES[k].bar, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{SESSION_CATEGORIES[k].label}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
