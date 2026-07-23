// Mobile day view — the phone home screen (design: "Sensei Mobile Day View").
// A horizontal date strip over a per-day appointment list; each appointment
// expands to quick actions (record / quick-insight / attach). Data is
// the same store/services source as the desktop week view (useWeekEvents), so
// the two shells stay in sync. Insight/attach are bottom-sheets; toasts reuse
// the store's Snackbar via useApp().toast.
import { useEffect, useState } from 'react';
import { useApp } from '../../store/AppStore';
import { heGreeting, getPatient, relativeWhen, heCount } from '../../utils';
import { HE_DAYS_SHORT, HE_MONTHS, fmtTime, sameDay } from '../../utils/dates';
import { dashboardStats, openDraftPids } from '../../utils/dashboardStats';
import { dayKey, eventGuestName, weekStart, type CalendarUiEvent } from '../../services/calendar';
import { SESSION_CATEGORIES, categoryOf } from '../../data/sessionCategories';
import { useWeekEvents } from '../../hooks/useWeekEvents';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useTts } from '../../hooks/useTts';
import { sessionSummaries } from '../../data/sessions';
import { PATIENT_SESSION_CONTENT } from '../../data/patientSessionContent';
import { patientOverviewBase } from '../../data/patientOverview';
import { isApiConfigured } from '../../services/apiClient';
import CalendarErrorBanner from '../shared/CalendarErrorBanner';
import { InsightIcon, AttachIcon, PlusIcon, CloseIcon, SunIcon, CameraIcon, ImageIcon, FolderIcon } from './icons';

type Sheet = { type: 'insight' | 'attach'; pid: string; name: string } | null;

export function meetingDayKeys(events: Array<Pick<CalendarUiEvent, 'start' | 'allDay'>>, scheduledAppts: Array<{ date: string }> = []) {
  return new Set([
    ...scheduledAppts.map((a) => a.date),
    ...events.filter((e) => !e.allDay).map((e) => dayKey(new Date(e.start))),
  ]);
}

export default function MobileDayView() {
  const { S, set, navigate, toast } = useApp();
  const useApi = isApiConfigured();

  const now = new Date();
  const greetWord = heGreeting(now);
  const therapistName = (S.profile && S.profile.name) || '';
  const startCoreFlow = () => navigate('upload', { uploadPatientFixed: false, upload: { state: 'idle', progress: 0, fileName: '', error: '' } });

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [insightText, setInsightText] = useState('');
  const sheetRef = useFocusTrap<HTMLDivElement>(!!sheet);

  const { events, error: weekError, reload: reloadWeek } = useWeekEvents(selectedDate, S.scheduledAppts || [], S.patients);
  // The greeting header always reports the REAL today / this-week — independent
  // of the browsed day. Deriving its counts from the browsed week's `events`
  // made them flip to the visited week's numbers when the user swiped the strip
  // to another week. A separate current-week source keeps the header truthful.
  const { events: currentWeekEvents } = useWeekEvents(now, S.scheduledAppts || [], S.patients);

  // close the bottom sheet on Escape
  useEffect(() => {
    if (!sheet) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const resolvePid = (ev: CalendarUiEvent): string | null =>
    ev.patientId ?? S.patients.find((p: any) => p.name === eventGuestName(ev))?.id ?? null;

  // 14-day strip anchored to the selected date's week, so the strip and the
  // month picker always agree on which day is selected (and the selected day
  // stays visible + highlighted after a month-picker jump).
  const stripStart = weekStart(selectedDate);
  const strip = Array.from({ length: 14 }, (_, i) => { const d = new Date(stripStart); d.setDate(stripStart.getDate() + i); return d; });
  // Meeting-dot indicators must use the same merged source as the visible day
  // list (synced calendar events + locally scheduled appointments). Otherwise a
  // day could visibly contain a meeting after selection while showing no dot in
  // the strip.
  const apptDays = meetingDayKeys(events, S.scheduledAppts || []);

  const dayEvents = events
    .filter((e) => !e.allDay && sameDay(new Date(e.start), selectedDate))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  const appts = dayEvents.map((ev) => {
    const pid = resolvePid(ev);
    const generalSummary = pid ? patientOverviewBase(pid, useApi).summary : '';
    const quickOverview = pid
      ? (PATIENT_SESSION_CONTENT[pid]?.insights?.[0] || sessionSummaries({ id: pid })[0] || '')
      : '';
    return {
      key: ev.id,
      pid,
      time: fmtTime(new Date(ev.start)),
      name: eventGuestName(ev),
      kind: SESSION_CATEGORIES[categoryOf(ev.title, ev.description)].label,
      generalSummary: generalSummary.length > 150 ? generalSummary.slice(0, 150).trim() + '…' : generalSummary,
      quickOverview: quickOverview.length > 130 ? quickOverview.slice(0, 130).trim() + '…' : quickOverview,
    };
  });

  // month picker cells
  const mFirst = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const mDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const monthCells: (number | null)[] = [];
  for (let i = 0; i < mFirst.getDay(); i++) monthCells.push(null);
  for (let d = 1; d <= mDays; d++) monthCells.push(d);

  const openPatient = (pid: string | null) => { if (pid) navigate('patient', { patientId: pid }); else navigate('calendar'); };

  // When the selected day is clear, surface the therapist's next upcoming session
  // (across days) so the phone home is never a dead end — parity with the desktop
  // home's "next session" focus. Shares the same dashboardStats source.
  const stats = dashboardStats(S.scheduledAppts, S.patients, now);
  const nextAppt = stats.next;
  // Greeting counts derive from the CURRENT-week calendar (fixtures + scheduled),
  // matching the desktop home — independent of the browsed day, so today/week
  // never disagree across the app or drift when navigating the strip.
  const todaySessions = currentWeekEvents.filter((e) => !e.allDay && sameDay(new Date(e.start), now)).length;
  const weekSessions = currentWeekEvents.filter((e) => !e.allDay).length;
  const nextPatient = nextAppt ? getPatient(S.patients, nextAppt.pid, S.archivedPatients || []) : null;

  // Compact workload line + resume-draft chip — parity with the desktop summary
  // strip / "resume work" card, sized for a phone. An unsaved note must be just
  // as recoverable from the phone as from the desktop.
  const draftPids = openDraftPids(S.notesDrafts, S.summaryDrafts);
  const firstDraftPatient = draftPids.length ? getPatient(S.patients, draftPids[0], S.archivedPatients || []) : null;

  // Quick review (סקירה מהירה) for the next meeting — same repo-derived source
  // as the desktop focus card (latest key insight, else latest summary).
  const nextRecap = nextAppt
    ? (PATIENT_SESSION_CONTENT[nextAppt.pid]?.insights?.[0] || sessionSummaries({ id: nextAppt.pid })[0] || '')
    : '';
  const nextRecapShort = nextRecap.length > 120 ? nextRecap.slice(0, 120).trim() + '…' : nextRecap;

  // "פתיחת יום" — read-aloud day opening for all of today's patients (spec,
  // mobile home). Same recap wording as the desktop agenda toolbar control.
  const tts = useTts();
  const todayList = currentWeekEvents
    .filter((e) => !e.allDay && sameDay(new Date(e.start), now))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const dailyRecapText = todayList.length
    ? 'סיכום פתיחת יום. יש לך ' + heCount(todayList.length, 'פגישה אחת', 'פגישות') + ' היום. ' +
      todayList.map((e) => eventGuestName(e) + ' בשעה ' + fmtTime(new Date(e.start))).join('. ') + '.'
    : 'סיכום פתיחת יום. אין לך פגישות מתוזמנות היום.';
  const toggleDayOpen = () => { if (tts.speaking) tts.stop(); else tts.speak(dailyRecapText); };

  const saveInsight = () => {
    const name = sheet?.name || '';
    const has = insightText.trim().length > 0;
    setSheet(null);
    setInsightText('');
    if (has) toast('התובנה נשמרה בתיק של ' + name, 'success');
    else toast('לא הוזנה תובנה', 'info');
  };
  const pickAttach = (label: string) => { const name = sheet?.name || ''; setSheet(null); toast(label + ' · צורף לתיק של ' + name, 'success'); };

  const monthTitle = HE_MONTHS[selectedDate.getMonth()] + ' ' + selectedDate.getFullYear();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* personalized greeting */}
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-.3px' }}>{greetWord}{therapistName ? ', ' + therapistName : ''}</h1>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
          {todaySessions ? heCount(todaySessions, 'פגישה אחת היום', 'פגישות היום') : 'אין פגישות היום'}
          {' · '}
          {heCount(weekSessions, 'פגישה אחת השבוע', 'פגישות השבוע')}
        </p>
        {firstDraftPatient && (
          <button
            type="button"
            className="tap44"
            onClick={() => openPatient(draftPids[0])}
            aria-label={'המשך עריכה · ' + firstDraftPatient.name}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBlockStart: 8, height: 32, padding: '0 12px', border: '1px solid var(--primary-border)', borderRadius: 16, background: 'var(--primary-surface)', color: 'var(--primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
            {heCount(draftPids.length, 'טיוטה שלא נשמרה', 'טיוטות שלא נשמרו')} · {firstDraftPatient.name}
          </button>
        )}
      </div>

      {/* "פתיחת יום" · before the meeting list (spec, mobile home) */}
      {tts.supported && (
        <div style={{ padding: '10px 16px 0' }}>
          <button
            type="button"
            className="tap44"
            onClick={toggleDayOpen}
            aria-label={tts.speaking ? 'עצירת ההקראה' : 'הקראת סיכום פתיחת היום'}
            aria-pressed={tts.speaking}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 14px', border: '1px solid var(--primary-border)', borderRadius: 10, background: tts.speaking ? 'var(--primary-tint)' : 'var(--paper)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              {tts.speaking ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" /> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />}
            </svg>
            {tts.speaking ? 'עצירה' : 'פתיחת יום'}
          </button>
        </div>
      )}

      {/* Next meeting — standing hero with quick review + prep report (spec,
          mobile home: the prep report for the single nearest meeting, with the
          full action set — desktop-focus-card parity). */}
      {nextAppt && nextPatient && (
        <div style={{ padding: '12px 16px 0' }}>
          <div className="mob-card" style={{ margin: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.02em', marginBlockEnd: 6 }}>הפגישה הבאה</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextPatient.name}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBlockStart: 2 }}>{relativeWhen(nextAppt.when, now)}</div>
            {nextRecapShort && (
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>סקירה מהירה: </span>{nextRecapShort}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, marginBlockStart: 12, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => navigate('nextMeetingReport', { patientId: nextAppt.pid })} style={{ flex: '1 1 auto', height: 40, border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--on-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>דוח הכנה לפגישה</button>
              <button type="button" onClick={() => openPatient(nextAppt.pid)} style={{ flex: '1 1 auto', height: 40, border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>פתיחת התיק</button>
              <button type="button" onClick={() => set({ recordOpen: true, recordPid: nextAppt.pid })} style={{ flex: '1 1 auto', height: 40, border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>הוספת מפגש</button>
            </div>
          </div>
        </div>
      )}

      {/* month title + strip */}
      <div style={{ padding: '10px 16px 0' }}>
        <button type="button" className="mob-monthbtn" onClick={() => setMonthOpen((v) => !v)} aria-expanded={monthOpen} aria-label={'בחירת חודש · ' + monthTitle}>
          <span className="mob-month-title">{monthTitle}</span>
          <span aria-hidden style={{ fontSize: 13 }}>▾</span>
        </button>

        {monthOpen && (
          <div className="mob-card" style={{ padding: '12px 14px', margin: '4px 0 10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
              {HE_DAYS_SHORT.map((d, i) => <div key={i} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {monthCells.map((c, i) => {
                if (c === null) return <div key={i} />;
                const cellDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), c);
                const isSel = sameDay(cellDate, selectedDate);
                return (
                  <button
                    key={i}
                    type="button"
                    className="tap44"
                    onClick={() => { setSelectedDate(cellDate); setMonthOpen(false); setExpandedId(null); }}
                    aria-label={c + ' ' + HE_MONTHS[selectedDate.getMonth()]}
                    style={{ height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: isSel ? 800 : 500, background: isSel ? 'var(--primary)' : 'transparent', color: isSel ? 'var(--on-accent)' : 'var(--primary)' }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mob-daystrip" role="group" aria-label="בחירת יום">
        {strip.map((d, i) => {
          const isSel = sameDay(d, selectedDate);
          const hasMeetings = apptDays.has(dayKey(d));
          const dateLabel = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
          return (
            <button
              key={i}
              type="button"
              aria-current={isSel ? 'date' : undefined}
              aria-label={dateLabel + (hasMeetings ? ' · יש פגישות' : ' · אין פגישות')}
              className={'mob-day-btn' + (isSel ? ' is-selected' : '')}
              onClick={() => { setSelectedDate(d); setExpandedId(null); }}
            >
              <span className="mob-day-dow">{HE_DAYS_SHORT[d.getDay()]}</span>
              <span className="mob-day-num">{d.getDate()}</span>
              <span className={'mob-day-dot' + (hasMeetings ? ' has' : '')} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, background: 'var(--divider)', margin: '0 16px' }} />

      {/* appointment list */}
      <div className="mob-list">
        {weekError && <CalendarErrorBanner onRetry={reloadWeek} compact style={{ margin: '10px 0' }} />}
        {appts.length === 0 ? (
          <div className="mob-empty">
            <SunIcon size={34} />
            <div className="mob-empty-title">אין פגישות ביום זה</div>
            {/* The standing "הפגישה הבאה" hero above already covers the
                cross-day next session; offer the core flow when there is none. */}
            {!nextAppt && (
              <button type="button" onClick={startCoreFlow} style={{ marginBlockStart: 16, minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>העלאת הקלטה של מפגש</button>
            )}
          </div>
        ) : appts.map((a) => {
          const open = expandedId === a.key;
          const detailsId = `mob-appt-details-${a.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          return (
            <div key={a.key} className="mob-appt">
              <div className="mob-appt-head">
                <span className="mob-appt-time" dir="ltr">{a.time}</span>
                {/* Name only — no secondary text beneath the patient identifier. */}
                <button type="button" className="mob-appt-open" onClick={() => openPatient(a.pid)}>
                  <span className="mob-appt-name">{a.name}</span>
                </button>
                <button
                  type="button"
                  className={'mob-plus' + (open ? ' is-open' : '')}
                  aria-label={open ? 'סגירת פעולות' : 'פעולות נוספות · ' + a.name}
                  aria-expanded={open}
                  aria-controls={detailsId}
                  onClick={() => setExpandedId(open ? null : a.key)}
                >
                  {open ? <CloseIcon size={18} /> : <PlusIcon size={18} />}
                </button>
              </div>

              {open && (
                <div id={detailsId}>
                  <div className="mob-appt-context" style={{ padding: '10px 12px 2px', display: 'grid', gap: 8 }}>
                    {a.generalSummary && (
                      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>סיכום כללי: </span>{a.generalSummary}
                      </p>
                    )}
                    {a.quickOverview && (
                      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>סקירה מהירה: </span>{a.quickOverview}
                      </p>
                    )}
                    {a.pid && (
                      <button type="button" onClick={() => navigate('nextMeetingReport', { patientId: a.pid })} style={{ justifySelf: 'start', height: 36, padding: '0 12px', border: '1px solid var(--primary-border)', borderRadius: 9, background: 'var(--primary-surface)', color: 'var(--primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        דוח הכנה לפגישה
                      </button>
                    )}
                  </div>
                  <div className="mob-actions">
                  {/* Record this appointment's session inline — capture parity with
                      the desktop agenda row (opens the shared record dialog with the
                      patient preselected), so a therapist doesn't have to open the
                      file first just to record. */}
                  <button type="button" className="mob-action-btn" aria-label={'הקלטה · ' + a.name} onClick={() => set({ recordOpen: true, recordPid: a.pid || null })}>
                    <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A.998.998 0 0 0 5.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z" /></svg>
                  </button>
                  <button type="button" className="mob-action-btn" aria-label={'תובנה מהירה · ' + a.name} onClick={() => { setInsightText(''); setSheet({ type: 'insight', pid: a.pid || '', name: a.name }); }}>
                    <InsightIcon />
                  </button>
                  <button type="button" className="mob-action-btn" aria-label={'צירוף קובץ · ' + a.name} onClick={() => setSheet({ type: 'attach', pid: a.pid || '', name: a.name })}>
                    <AttachIcon />
                  </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- insight sheet ---- */}
      {sheet?.type === 'insight' && (
        <div className="mob-sheet-scrim" onClick={() => setSheet(null)}>
          <div ref={sheetRef} className="mob-sheet" role="dialog" aria-modal="true" aria-label={'תובנה מהירה · ' + sheet.name} onClick={(e) => e.stopPropagation()}>
            <div className="mob-sheet-grip" />
            <div className="mob-sheet-title">תובנה מהירה · {sheet.name}</div>
            <div className="mob-sheet-sub">תתווסף לתיק המטופל ותשוקלל בדוח ההכנה הבא</div>
            <textarea
              className="mob-sheet-textarea"
              placeholder="מה שמתם לב אליו?"
              value={insightText}
              onChange={(e) => setInsightText(e.target.value)}
              aria-label="טקסט התובנה"
              autoFocus
            />
            <button type="button" className="mob-primary-btn" onClick={saveInsight}>שמירת תובנה</button>
          </div>
        </div>
      )}

      {/* ---- attach sheet ---- */}
      {sheet?.type === 'attach' && (
        <div className="mob-sheet-scrim" onClick={() => setSheet(null)}>
          <div ref={sheetRef} className="mob-sheet" role="dialog" aria-modal="true" aria-label={'צירוף קובץ · ' + sheet.name} onClick={(e) => e.stopPropagation()}>
            <div className="mob-sheet-grip" />
            <div className="mob-sheet-title">צירוף קובץ · {sheet.name}</div>
            <button type="button" className="mob-attach-opt" onClick={() => pickAttach('המסמך צולם')}><CameraIcon />צילום מסמך</button>
            <button type="button" className="mob-attach-opt" onClick={() => pickAttach('התמונה נבחרה')}><ImageIcon />בחירה מהתמונות</button>
            <button type="button" className="mob-attach-opt" onClick={() => pickAttach('הקובץ נבחר')}><FolderIcon />עיון בקבצים</button>
          </div>
        </div>
      )}
    </div>
  );
}
