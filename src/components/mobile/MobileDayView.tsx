// Mobile day view — the phone home screen (design: "Sensei Mobile Day View").
// A horizontal date strip over a per-day appointment list; each appointment
// expands to the same actions as the desktop calEvent dialog (patient file /
// upload / prep / edit / delete). Data is the same store/services source as
// the desktop week view (useWeekEvents).
import { useState } from 'react';
import { useApp } from '../../store/AppStore';
import { heGreeting, getPatient, relativeWhen, heCount, avatarColors } from '../../utils';
import { HE_DAYS_SHORT, HE_MONTHS, fmtTime, sameDay } from '../../utils/dates';
import { openDraftPids } from '../../utils/dashboardStats';
import { dayKey, eventGuestName, weekStart, dbEventApiId, type CalendarUiEvent } from '../../services/calendar';
import { patientInitials, patientAvatarColor } from '../../services/patients';
import { SESSION_CATEGORIES, categoryOf } from '../../data/sessionCategories';
import { buildLocalDailyRecapText } from '../../data/dailyRecap';
import { useWeekEvents } from '../../hooks/useWeekEvents';
import { useDashboardFocusStats } from '../../hooks/useDashboardFocusStats';
import { usePreviousSessionRecap } from '../../hooks/usePreviousSessionRecap';
import { useDailyMeetingReport } from '../../hooks/useDailyMeetingReport';
import { PlusIcon, CloseIcon, SunIcon, PatientFileIcon, UploadIcon, ReportIcon, EditIcon, TrashIcon } from './icons';

export default function MobileDayView() {
  const { S, set, navigate } = useApp();
  const daily = useDailyMeetingReport();

  const now = new Date();
  const greetWord = heGreeting(now);
  const therapistName = (S.profile && S.profile.name) || '';
  const startCoreFlow = () => navigate('upload', { upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
  const dismissTip = () => set({ onboardTipDismissed: true });

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);

  const { events, error: weekError, reload: reloadWeek } = useWeekEvents(selectedDate, S.scheduledAppts || [], S.patients);

  const resolvePid = (ev: CalendarUiEvent): string | null =>
    ev.patientId ?? S.patients.find((p: any) => p.name === eventGuestName(ev))?.id ?? null;

  // 7-day strip (Sun–Sat week) anchored to the selected date, so the strip and
  // the month picker always agree on which day is selected.
  const stripStart = weekStart(selectedDate);
  const strip = Array.from({ length: 7 }, (_, i) => { const d = new Date(stripStart); d.setDate(stripStart.getDate() + i); return d; });
  // Meeting-dot indicators for the strip — from the locally-scheduled
  // appointments (the patient-tied truth), so the therapist sees at a glance
  // which days hold meetings instead of tapping day-by-day.
  const apptDays = new Set((S.scheduledAppts || []).map((a: any) => a.date));

  const dayEvents = events
    .filter((e) => !e.allDay && sameDay(new Date(e.start), selectedDate))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  const appts = dayEvents.map((ev) => {
    const pid = resolvePid(ev);
    const start = new Date(ev.start);
    return {
      key: ev.id,
      pid,
      title: ev.title,
      time: fmtTime(start),
      name: eventGuestName(ev),
      kind: SESSION_CATEGORIES[categoryOf(ev.title, ev.description)].label,
      dateLabel: new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(start),
      editableAppt: (S.scheduledAppts || []).find((a: any) => a.id === ev.id) || null,
    };
  });

  // month picker cells
  const mFirst = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const mDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const monthCells: (number | null)[] = [];
  for (let i = 0; i < mFirst.getDay(); i++) monthCells.push(null);
  for (let d = 1; d <= mDays; d++) monthCells.push(d);

  const openPatient = (pid: string | null) => { if (pid) navigate('patient', { patientId: pid }); else navigate('calendar'); };
  const openPrep = (pid: string | null, meetingId?: string) => {
    if (pid) {
      navigate('report', {
        patientId: pid,
        reportMeetingId: meetingId ? dbEventApiId(meetingId) : null,
      });
    } else {
      navigate('calendar');
    }
  };
  const openUpload = (pid: string | null) => {
    if (!pid) return;
    navigate('upload', { patientId: pid, upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
  };
  const openEdit = (appt: (typeof appts)[number]) => {
    if (!appt.editableAppt) return;
    const e = appt.editableAppt;
    set({
      dialog: 'schedule',
      apptForm: { pid: e.pid, date: e.date, time: e.time, dur: String(e.dur), description: e.description || '', editId: e.id },
      errors: {},
    });
  };
  const openDelete = (appt: (typeof appts)[number]) => {
    set({
      dialog: 'delMeeting',
      dialogMeetingId: appt.key,
      dialogMeetingLabel: appt.title + (appt.dateLabel ? ' · ' + appt.dateLabel : ''),
    });
  };

  // Same next-meeting source as desktop DashboardFocus (live `/calendar` when
  // configured; scheduledAppts offline) — shown as a persistent "הפגישה הבאה"
  // card above the day strip, not only on empty days.
  const focus = useDashboardFocusStats(S.patients, S.scheduledAppts);
  const nextAppt = focus.next;
  const nextPatient = nextAppt ? getPatient(S.patients, nextAppt.pid, S.archivedPatients || []) : null;
  const nextRecap = usePreviousSessionRecap(nextAppt?.pid, nextPatient?.name || '', !!nextAppt);
  const nextRecapShort = nextRecap.length > 110 ? nextRecap.slice(0, 110).trim() + '…' : nextRecap;
  const nextAv = nextAppt ? avatarColors(patientAvatarColor(nextAppt.pid)) : null;
  // Greeting counts derive from the complete calendar (events = seed fixtures +
  // scheduled), matching the desktop home + the calendar rather than the
  // scheduledAppts-only stats — so today/week never disagree across the app.
  const todaysEvents = events
    .filter((e) => !e.allDay && sameDay(new Date(e.start), now))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const todaySessions = todaysEvents.length;
  const weekSessions = events.filter((e) => !e.allDay).length;

  // Daily "open the day" recap — server audio when live; local agenda script
  // via browser TTS otherwise. Always covers *today*, not the strip selection.
  const dailyRecapText = buildLocalDailyRecapText(todaysEvents);
  const dailyBusy = daily.playing;
  const toggleDailyRecap = () => daily.toggle(dailyRecapText);

  // Compact workload line + resume-draft chip — parity with the desktop summary
  // strip / "resume work" card, sized for a phone. An unsaved note must be just
  // as recoverable from the phone as from the desktop.
  const draftPids = openDraftPids(S.notesDrafts, S.summaryDrafts);
  const firstDraftPatient = draftPids.length ? getPatient(S.patients, draftPids[0], S.archivedPatients || []) : null;

  const monthTitle = HE_MONTHS[selectedDate.getMonth()] + ' ' + selectedDate.getFullYear();

  return (
    <div className="mob-dayview">
      {/* personalized greeting */}
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-.3px' }}>{greetWord}{therapistName ? ', ' + therapistName : ''}</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            {todaySessions ? heCount(todaySessions, 'פגישה אחת היום', 'פגישות היום') : 'אין פגישות היום'}
            {' · '}
            {heCount(weekSessions, 'פגישה אחת השבוע', 'פגישות השבוע')}
          </p>
          {daily.available && (
            <button
              type="button"
              className="tap44 mob-daily-recap"
              onClick={toggleDailyRecap}
              aria-label={dailyBusy ? 'עצירת ההקראה' : 'הקראת סיכום פתיחת היום'}
              aria-pressed={dailyBusy}
              aria-busy={daily.loading && !daily.live}
              title={daily.loading && !daily.live ? 'מכינים סיכום…' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
                border: '1px solid var(--primary-border)', borderRadius: 16, background: 'var(--primary-surface)',
                color: 'var(--primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                {dailyBusy
                  ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" />
                  : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />}
              </svg>
              {dailyBusy ? 'עצירה' : 'סיכום יומי'}
            </button>
          )}
        </div>
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

      {/* first-run tip → the core flow (parity with the desktop home) */}
      {!S.onboardTipDismissed && (
        <div role="note" style={{ margin: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--primary-surface)', border: '1px solid var(--primary-border)', borderRadius: 12, padding: '11px 13px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>ברוכים הבאים לסנסיי</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginTop: 2 }}>העלו הקלטה של מפגש כדי לקבל סיכום AI ודוח הכנה לפגישה הבאה.</div>
          </div>
          <button type="button" className="tap44" onClick={startCoreFlow} style={{ height: 34, padding: '0 13px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>העלאה</button>
          <button type="button" className="tap44" onClick={dismissTip} aria-label="סגירת ההודעה" style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Next session — same focus card as desktop DashboardFocus ("הפגישה הבאה"). */}
      <section aria-label="הפגישה הבאה" className="mob-next-meeting" style={{ margin: '12px 16px 0', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, padding: 14 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.02em' }}>הפגישה הבאה</h2>
        {focus.loading ? (
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>טוען פגישות…</p>
        ) : nextAppt && nextPatient && nextAv ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: nextRecapShort ? 8 : 10 }}>
              <span style={{ width: 42, height: 42, borderRadius: '50%', background: nextAv.bg, color: nextAv.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{patientInitials(nextPatient.name)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextPatient.name}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', marginTop: 2 }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                  {relativeWhen(nextAppt.when, now)}
                </div>
              </div>
            </div>
            {nextRecapShort ? (
              <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>מהפגישה הקודמת: </span>{nextRecapShort}
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => openPrep(nextAppt.pid, nextAppt.id)} style={{ flex: 1, height: 40, border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>הצגת דוח ההכנה</button>
              <button type="button" onClick={() => openPatient(nextAppt.pid)} style={{ flex: 1, height: 40, border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>פתיחת התיק</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              אין פגישות מתוכננות. זה הזמן לתכנן את הימים הקרובים.
            </p>
            <button
              type="button"
              onClick={() => set({ dialog: 'schedule', apptForm: { pid: S.patients[0]?.id || 'p1', date: '', time: '', dur: '50', description: '' }, errors: {} })}
              style={{ height: 40, padding: '0 16px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              קביעת פגישה
            </button>
          </div>
        )}
      </section>

      {/* month title + strip */}
      <div style={{ padding: '10px 16px 0' }}>
        <button type="button" className="mob-monthbtn" onClick={() => setMonthOpen((v) => !v)} aria-expanded={monthOpen} aria-label={'בחירת חודש · ' + monthTitle}>
          <svg className="mob-month-cal" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
          <span className="mob-month-title">{monthTitle}</span>
          <span className={'mob-month-chev' + (monthOpen ? ' is-open' : '')} aria-hidden="true">▾</span>
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
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className={'mob-month-day' + (isSel ? ' is-selected' : '')}
                      onClick={() => { setSelectedDate(cellDate); setMonthOpen(false); setExpandedId(null); }}
                      aria-label={c + ' ' + HE_MONTHS[selectedDate.getMonth()]}
                      aria-current={isSel ? 'date' : undefined}
                    >
                      {c}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mob-daystrip" role="tablist" aria-label="בחירת יום">
        {strip.map((d, i) => {
          const isSel = sameDay(d, selectedDate);
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={isSel}
              className={'mob-day-btn' + (isSel ? ' is-selected' : '')}
              onClick={() => { setSelectedDate(d); setExpandedId(null); }}
            >
              <span className="mob-day-dow">{HE_DAYS_SHORT[d.getDay()]}</span>
              <span className="mob-day-num">{d.getDate()}</span>
              <span className={'mob-day-dot' + (apptDays.has(dayKey(d)) ? ' has' : '')} aria-hidden="true" />
              {apptDays.has(dayKey(d)) && <span className="sr-only">· יש פגישות</span>}
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, background: 'var(--divider)', margin: '0 16px' }} />

      {/* appointment list */}
      <div className="mob-list">
        {weekError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '10px 0', padding: '10px 12px', background: 'var(--error-bg-soft)', border: '1px solid var(--error-line)', borderRadius: 10 }}>
            <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, fontWeight: 600, color: 'var(--error-dark)' }}>טעינת היומן נכשלה.</span>
            <button type="button" onClick={reloadWeek} style={{ height: 30, padding: '0 12px', border: '1px solid var(--error-border)', borderRadius: 8, background: 'var(--paper)', color: 'var(--error-dark)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>ניסיון חוזר</button>
          </div>
        )}
        {appts.length === 0 ? (
          <div className="mob-empty">
            <SunIcon size={34} />
            <div className="mob-empty-title">אין פגישות ביום זה</div>
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {nextAppt ? 'הפגישה הבאה מופיעה למעלה · או בחרו יום אחר ברצועה.' : 'בחרו יום אחר, או קבעו פגישה חדשה.'}
            </p>
            {!nextAppt && (
              <button type="button" onClick={startCoreFlow} style={{ marginBlockStart: 16, height: 40, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>העלאת הקלטה של מפגש</button>
            )}
          </div>
        ) : appts.map((a) => {
          const open = expandedId === a.key;
          return (
            <div key={a.key} className="mob-appt">
              <div className="mob-appt-head">
                <span className="mob-appt-time" dir="ltr">{a.time}</span>
                <button type="button" className="mob-appt-open" onClick={() => openPatient(a.pid)}>
                  <span className="mob-appt-name">{a.name}</span>
                  <span className="mob-appt-kind">{a.kind}</span>
                </button>
                <button
                  type="button"
                  className={'mob-plus' + (open ? ' is-open' : '')}
                  aria-label={open ? 'סגירת פעולות' : 'פעולות נוספות · ' + a.name}
                  aria-expanded={open}
                  onClick={() => setExpandedId(open ? null : a.key)}
                >
                  {open ? <CloseIcon size={18} /> : <PlusIcon size={18} />}
                </button>
              </div>

              {open && (
                <div className="mob-actions" role="group" aria-label={'פעולות · ' + a.name}>
                  {a.pid && (
                    <button type="button" className="mob-action-btn" aria-label={'מעבר לתיק המטופל · ' + a.name} onClick={() => openPatient(a.pid)}>
                      <PatientFileIcon size={20} />
                    </button>
                  )}
                  {a.pid && (
                    <button type="button" className="mob-action-btn" aria-label={'העלאת הקלטה · ' + a.name} onClick={() => openUpload(a.pid)}>
                      <UploadIcon size={20} />
                    </button>
                  )}
                  {a.pid && (
                    <button type="button" className="mob-action-btn" aria-label={'דוח הכנה · ' + a.name} onClick={() => openPrep(a.pid, a.key)}>
                      <ReportIcon size={20} />
                    </button>
                  )}
                  {a.editableAppt && (
                    <button type="button" className="mob-action-btn" aria-label={'עריכת הפגישה · ' + a.name} onClick={() => openEdit(a)}>
                      <EditIcon size={20} />
                    </button>
                  )}
                  <button type="button" className="mob-action-btn mob-action-btn--danger" aria-label={'מחיקת הפגישה · ' + a.name} onClick={() => openDelete(a)}>
                    <TrashIcon size={20} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
