// Today's agenda — the Home page's "הפגישות שלך היום" rendered with the SAME
// enterprise data-table system as the Patients roster (patients.css: .pat-table-
// card / .pat-thead / .pat-row / .pat-icon-btn), adapted to appointment data:
// patient · start · end · type · location · status · actions. Row actions: open
// the appointment, open the file, record, upload a recording, and hear the
// previous-session recap — plus the day's read-aloud recap. Same store/services
// source and the same event-detail dialog as the calendar grid — no parallel state.
import { useEffect, useState } from 'react';
import { useApp } from '../../store/AppStore';
import { useTts } from '../../hooks/useTts';
import { eventGuestName, toCalEventDetail, type CalendarUiEvent } from '../../services/calendar';
import { sessionSummaries } from '../../data/sessions';
import { eventPatientId, eventRecap } from '../../utils/agenda';
import { fmtTime } from '../../utils/dates';
import { avatarColors, heCount } from '../../utils';
import { patientInitials, patientAvatarColor } from '../../services/patients';
import { SESSION_CATEGORIES, categoryOf } from '../../data/sessionCategories';
import { CARD_SHADOW } from '../../utils/styles';
import IconButton from '../shared/IconButton';
import '../../pages/patients.css';
import './TodayAgenda.css';

const fmtDur = (start: Date, end: Date) => Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

export default function TodayAgenda({ events }: { events: CalendarUiEvent[] }) {
  const { S, set, navigate } = useApp();
  const tts = useTts();
  // Per-session recap playback: hear one patient's "previously on" without opening
  // the file. playingEvId marks which row is speaking (cleared when speech ends).
  // The daily-recap toggle below shares this ONE tts instance, so starting one
  // stops the other; playingEvId===null while the daily recap speaks.
  const [playingEvId, setPlayingEvId] = useState<string | null>(null);
  useEffect(() => { if (!tts.speaking) setPlayingEvId(null); }, [tts.speaking]);

  // Read-aloud "open the day" recap — the therapist can hear the day's agenda
  // without opening each file.
  const dailyRecapText = events.length
    ? 'סיכום פתיחת יום. יש לך ' + heCount(events.length, 'פגישה אחת', 'פגישות') + ' היום. ' +
      events.map((e) => eventGuestName(e) + ' בשעה ' + fmtTime(new Date(e.start))).join('. ') + '.'
    : 'סיכום פתיחת יום. אין לך פגישות מתוזמנות היום.';
  // Toggle on OWN state, not the shared `speaking`: if a per-row recap is
  // playing, this must SWITCH to the daily recap (speak restarts), not merely
  // stop. Only a second click while the DAILY recap itself is speaking stops.
  const toggleDailyRecap = () => {
    if (tts.speaking && playingEvId === null) { tts.stop(); return; }
    setPlayingEvId(null);
    tts.speak(dailyRecapText);
  };

  const pidOf = (ev: CalendarUiEvent) => eventPatientId(ev, S.patients);
  const openEvent = (ev: CalendarUiEvent) => set({ dialog: 'calEvent', calEventDetail: toCalEventDetail(ev, pidOf(ev)) });
  const openFile = (pid: string) => navigate('patient', { patientId: pid });
  const uploadFor = (pid: string) => navigate('upload', { patientId: pid, upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
  // Record and upload are equally primary wherever a session can be captured
  // (spec parity with PatientPage / MobilePatient) — same pipeline, recordPid preselects.
  const recordFor = (pid: string) => set({ recordOpen: true, recordPid: pid });
  const playSessionRecap = (ev: CalendarUiEvent) => {
    if (playingEvId === ev.id) { tts.stop(); setPlayingEvId(null); return; }
    // Speak the FULL previous-session summary (the row recap is trimmed for display only).
    const pid = pidOf(ev);
    const full = pid ? (sessionSummaries({ id: pid })[0] || '') : '';
    if (!full) return;
    tts.speak(eventGuestName(ev) + ', בשעה ' + fmtTime(new Date(ev.start)) + '. סקירה מהירה: ' + full);
    setPlayingEvId(ev.id);
  };

  const now = new Date();

  return (
    <section aria-label="הפגישות שלך היום" className="dash-agenda">
      <div className="dta-toolbar">
        <span className="dta-title">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--primary)" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
          הפגישות שלך היום
        </span>
        {events.length > 0 && <span className="dta-count">{heCount(events.length, 'פגישה אחת', 'פגישות')}</span>}
        <div style={{ flex: 1 }} />
        {tts.supported && (
          <button
            type="button"
            className="dash-agenda-recap"
            onClick={toggleDailyRecap}
            aria-label={tts.speaking && playingEvId === null ? 'עצירת ההקראה' : 'הקראת סיכום פתיחת היום'}
            aria-pressed={tts.speaking && playingEvId === null}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 8, background: tts.speaking && playingEvId === null ? 'var(--primary-tint)' : 'var(--paper)', color: tts.speaking && playingEvId === null ? 'var(--primary)' : 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              {tts.speaking && playingEvId === null ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" /> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />}
            </svg>
            {tts.speaking && playingEvId === null ? 'עצירה' : 'פתיחת יום'}
          </button>
        )}
        {/* Full-calendar handoff — placed directly beside the daily-summary
            control so the two agenda-level actions read as one group. */}
        <button type="button" className="dash-open-cal tap44" onClick={() => navigate('calendar')} aria-label="פתיחת היומן המלא">
          פתיחת היומן המלא
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
        </button>
      </div>

      <div className="pat-table-card" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: CARD_SHADOW }}>
        {events.length === 0 ? (
          <p className="dta-empty">אין פגישות מתוזמנות היום.</p>
        ) : (
          <>
            <div className="pat-thead dta-thead dta-grid" role="presentation">
              <span className="pat-th">מטופל</span>
              {/* Time range split into dedicated Start/End columns (canonical
                  table rule: one column per structured attribute). */}
              <span className="pat-th dta-col-start">התחלה</span>
              <span className="pat-th dta-col-end">סיום</span>
              <span className="pat-th dta-col-type">סוג</span>
              <span className="pat-th dta-col-loc">מיקום</span>
              <span className="pat-th">סטטוס</span>
              <span className="pat-th pat-th-actions" aria-hidden="true" />
            </div>

            {events.map((ev) => {
              const recap = eventRecap(ev, S.patients);
              const pid = pidOf(ev);
              const start = new Date(ev.start);
              const end = new Date(ev.end);
              const isNow = start <= now && now < end;
              const isPast = end <= now;
              const statusLabel = isNow ? 'מתקיימת כעת' : isPast ? 'הסתיימה' : 'מתוכננת';
              const statusCls = isNow ? 'is-now' : isPast ? 'is-past' : 'is-next';
              const cat = SESSION_CATEGORIES[categoryOf(ev.title, ev.description)];
              const dur = fmtDur(start, end);
              const av = pid ? avatarColors(patientAvatarColor(pid)) : null;
              const name = eventGuestName(ev);
              const rowCls = 'pat-row dta-grid' + (isNow ? ' dta-row-now' : isPast ? ' dta-row-past' : '');
              return (
                <div key={ev.id} className={rowCls} onClick={() => openEvent(ev)}>
                  {/* Patient — the .calh-agenda-row button is the keyboard/SR open
                      control (opens the appointment dialog); the row is mouse-clickable. */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEvent(ev); }}
                    className="calh-agenda-row dta-col-identity"
                    aria-label={'פרטי הפגישה · ' + name + ' · ' + fmtTime(start)}
                    style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0, width: '100%', textAlign: 'start', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {av ? (
                      <span style={{ width: 42, height: 42, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14.5, flexShrink: 0 }}>{patientInitials(name)}</span>
                    ) : (
                      <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
                      </span>
                    )}
                    {/* Name only — no secondary text beneath the identifier; the
                        recap stays reachable via playback + the meeting dialog. */}
                    <span style={{ minWidth: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  </button>

                  {/* Start / End time — dedicated columns; duration in the tooltip. */}
                  <div className="pat-cell dta-col-start">
                    <span className="dta-time" dir="ltr" title={'משך ' + heCount(dur, 'דקה אחת', 'דקות')}>{fmtTime(start)}</span>
                  </div>
                  <div className="pat-cell dta-col-end">
                    <span className="dta-time" dir="ltr" title={'משך ' + heCount(dur, 'דקה אחת', 'דקות')}>{fmtTime(end)}</span>
                  </div>

                  {/* Appointment type (category). */}
                  <div className="pat-cell dta-col-type">
                    <span className="dta-type">
                      <span className="dta-type-dot" style={{ background: cat.bar }} aria-hidden="true" />
                      <span className="dta-type-label">{cat.label}</span>
                    </span>
                  </div>

                  {/* Location / room. */}
                  <div className="pat-cell dta-col-loc">
                    {ev.location
                      ? <span className="dta-loc" dir="auto" title={ev.location}>{ev.location}</span>
                      : <span className="dta-loc dta-loc-empty">—</span>}
                  </div>

                  {/* Status — time-derived (past / current / next). */}
                  <div className="pat-cell dta-col-status">
                    <span className={'dta-status ' + statusCls}>
                      <span className="dta-status-dot" aria-hidden="true" />
                      {statusLabel}
                    </span>
                  </div>

                  {/* Row actions — open file, upload, prep report, hear recap. */}
                  <div className="dta-actions dta-col-actions" onClick={(e) => e.stopPropagation()}>
                    {pid ? (
                      <>
                        <IconButton onClick={() => openFile(pid)} ariaLabel={'תיק המטופל · ' + name} title="תיק מטופל" className="calh-agenda-act pat-icon-btn tap44">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
                        </IconButton>
                        <IconButton onClick={() => recordFor(pid)} ariaLabel={'הקלטה · ' + name} title="הקלטה" className="calh-agenda-act pat-icon-btn tap44">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A.998.998 0 0 0 5.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z" /></svg>
                        </IconButton>
                        <IconButton onClick={() => uploadFor(pid)} ariaLabel={'העלאת הקלטה · ' + name} title="העלאת הקלטה" className="calh-agenda-act pat-icon-btn tap44">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
                        </IconButton>
                        {/* Spec (priority 1): the prep report is reachable from every today-agenda row. */}
                        <IconButton onClick={() => navigate('nextMeetingReport', { patientId: pid })} ariaLabel={'דוח הכנה לפגישה · ' + name} title="דוח הכנה לפגישה" className="calh-agenda-act pat-icon-btn tap44">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                        </IconButton>
                        {tts.supported && recap && (
                          <IconButton
                            onClick={() => playSessionRecap(ev)}
                            ariaLabel={(playingEvId === ev.id ? 'עצירת ההשמעה · ' : 'השמעת תקציר למפגש · ') + name}
                            ariaPressed={playingEvId === ev.id}
                            title={playingEvId === ev.id ? 'עצירת ההשמעה' : 'השמעת תקציר למפגש'}
                            className="calh-agenda-act pat-icon-btn tap44"
                            style={playingEvId === ev.id ? { border: '1px solid var(--primary)', background: 'var(--primary-tint)', color: 'var(--primary)' } : undefined}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                              {playingEvId === ev.id ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" /> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />}
                            </svg>
                          </IconButton>
                        )}
                      </>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--text-disabled)" aria-hidden="true" className="pat-row-chevron"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
