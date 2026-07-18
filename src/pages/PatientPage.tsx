// Patient detail — profile, clinical notes, upcoming meetings, meeting history preview.
import { useEffect, useState } from 'react';
import { useApp } from '../store/AppStore';
import { useTts } from '../hooks/useTts';
import { sessionSummaries } from '../data/sessions';
import { avatarColors } from '../utils';
import { deriveNotes, addNote, removeNote, type NoteEntry } from '../utils/therapistNotes';
import { buildPatientSessions, enrichPatientSessions } from '../utils/patientSessions';
import PatientSessionList from '../components/patient/PatientSessionList';
import PatientDocuments from '../components/patient/PatientDocuments';
import UpcomingMeetingList, { formatMeetingWhen } from '../components/patient/UpcomingMeetingList';
import { usePatientUpcomingMeetings } from '../components/patient/usePatientUpcomingMeetings';
import { patientInitials, patientAvatarColor, formatPatientSince, formatTreatmentSpan, displayPatientEmail } from '../services/patients';
import { patientOverviewDefault, OVERVIEW_FIELDS, type PatientOverview } from '../data/patientOverview';
import { defaultScheduleForm, toCalEventDetail, type CalendarUiEvent } from '../services/calendar';
import './patient.css';
import { CARD_SHADOW } from '../utils/styles';

const HISTORY_PREVIEW = 5;
const UPCOMING_PREVIEW = 5;

export default function PatientPage() {
  const { S, set, navigate, toast } = useApp();
  const { cp, meetingPatientId, upcomingMeetings, loading: meetingsLoading } = usePatientUpcomingMeetings();
  const cpa = avatarColors(patientAvatarColor(cp.id));
  const cpInitials = patientInitials(cp.name);
  const upcomingPreview = upcomingMeetings.slice(0, UPCOMING_PREVIEW);
  const hasMoreUpcoming = upcomingMeetings.length > UPCOMING_PREVIEW;

  const cpNext = upcomingMeetings[0] ?? null;
  const cpNextLabel = cpNext ? ('הפגישה הבאה · ' + formatMeetingWhen(new Date(cpNext.start))) : '';

  // TTS Patient Recap (spec 3.3) — hear this patient's previous-session summary
  // ahead of the upcoming meeting, without opening its file. Browser-native
  // useTts (no backend); mirrors the home agenda's per-session playback.
  const tts = useTts();
  const patientRecap = sessionSummaries({ id: cp.id })[0] || '';
  const [playingRecap, setPlayingRecap] = useState(false);
  useEffect(() => { if (!tts.speaking) setPlayingRecap(false); }, [tts.speaking]);
  const playPatientRecap = () => {
    if (playingRecap) { tts.stop(); setPlayingRecap(false); return; }
    if (!patientRecap) return;
    tts.speak(cp.name + '. מהפגישה הקודמת: ' + patientRecap);
    setPlayingRecap(true);
  };
  const openMeetingDetail = (event: CalendarUiEvent) =>
    set({ dialog: 'calEvent', calEventDetail: toCalEventDetail(event, meetingPatientId) });
  const deleteMeeting = (event: CalendarUiEvent) =>
    set({
      dialog: 'delMeeting',
      dialogMeetingId: event.id,
      dialogMeetingLabel: event.title + ' · ' + formatMeetingWhen(new Date(event.start)),
    });

  // Between-session therapist notes — a dated timeline (spec 3.6). deriveNotes
  // migrates any legacy single-blob note into the list non-destructively.
  const noteEntries: NoteEntry[] = deriveNotes(S.therapistNotes, S.notesOverrides, cp.id);
  const formatNoteAt = (at: string | null) =>
    at ? new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(at)) : '';

  // ---- structured Patient Overview (summary / goals / challenges / prep) ----
  const overview: PatientOverview = { ...patientOverviewDefault(cp.id), ...((S.overviewOverrides || {})[cp.id] || {}) };
  const overviewDraft: PatientOverview = S.overviewDraft || overview;
  const startEditOverview = () => set({ editingOverview: true, overviewDraft: overview });
  const onOverviewField = (key: keyof PatientOverview) => (e: any) => set({ overviewDraft: { ...overviewDraft, [key]: e.target.value } });
  const saveOverview = () => { set({ overviewOverrides: { ...(S.overviewOverrides || {}), [cp.id]: overviewDraft }, editingOverview: false, overviewDraft: null }); toast('סקירת המטופל נשמרה'); };
  const cancelOverview = () => set({ editingOverview: false, overviewDraft: null });

  const allHistory = buildPatientSessions(cp, S.deletedSessions || [], { navigate, set });
  const historyPreview = enrichPatientSessions(allHistory.slice(0, HISTORY_PREVIEW), S, cp.id);
  const hasMoreHistory = allHistory.length > HISTORY_PREVIEW;

  const clearNotesDraft = (extra: Record<string, any> = {}) => {
    const d = { ...S.notesDrafts }; delete d[cp.id];
    set({ notesDrafts: d, ...extra });
  };
  const startAddNote = () => set({ editingNotes: true, notesDraft: '' });
  const onNotesDraft = (e: any) => set({ notesDraft: e.target.value, notesDrafts: { ...S.notesDrafts, [cp.id]: e.target.value } });
  // Save appends a new dated entry to the timeline (never overwrites), preserving
  // any migrated legacy entry, and clears the recoverable draft.
  const saveNotes = () => {
    const text = (S.notesDraft || '').trim();
    if (!text) { clearNotesDraft({ editingNotes: false, notesDraft: '' }); return; }
    const id = 'note-' + new Date().toISOString() + '-' + Math.random().toString(36).slice(2, 6);
    const next = addNote(noteEntries, text, new Date().toISOString(), id);
    const d = { ...S.notesDrafts }; delete d[cp.id];
    set({ therapistNotes: { ...(S.therapistNotes || {}), [cp.id]: next }, editingNotes: false, notesDraft: '', notesDrafts: d });
    toast('ההערה נוספה');
  };
  const cancelNotes = () => clearNotesDraft({ editingNotes: false });
  const deleteNote = (id: string) =>
    set({ therapistNotes: { ...(S.therapistNotes || {}), [cp.id]: removeNote(noteEntries, id) } });
  const recoveredNotes = S.notesDrafts[cp.id];
  const hasRecoverableNotes = !S.editingNotes && recoveredNotes != null && recoveredNotes.trim() !== '';
  const resumeNotesDraft = () => set({ editingNotes: true, notesDraft: recoveredNotes });
  const discardNotesDraft = () => { clearNotesDraft(); toast('הטיוטה נמחקה', 'info'); };

  const openUploadScreen = () => navigate('upload', { upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
  const scheduleForPatient = () => set({ dialog: 'schedule', apptForm: defaultScheduleForm(meetingPatientId), errors: {} });
  const goReportFromPatient = () => navigate('report', { patientId: cp.id });
  const goMeetingHistory = () => navigate('meetingHistory', { patientId: S.patientId });
  const goUpcomingMeetings = () => navigate('upcomingMeetings', { patientId: S.patientId });
  const goPatients = () => navigate('patients');
  const deletePatientPermanent = () => set({ dialog: 'deletePatientPermanent', dialogPatientId: cp.id });
  const archiveThisPatient = () => set({ dialog: 'delete', dialogPatientId: cp.id });
  const editDetails = () => set({ dialog: 'edit', dialogPatientId: cp.id, form: { name: cp.name, phone: cp.phone, email: cp.email || '', address: cp.address || '' }, errors: {} });
  const restoreThisPatient = () => {
    set((s: any) => ({
      patients: [{ ...cp, archived: false, archived_at: null }, ...s.patients.filter((p: any) => p.id !== cp.id)],
      archivedPatients: (s.archivedPatients || []).filter((p: any) => p.id !== cp.id),
    }));
    toast('התיק שוחזר לרשימת המטופלים הפעילים');
  };
  // Archived files show the last session instead of an upcoming meeting.
  const lastSession = allHistory[0] ?? null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <a onClick={goPatients} role="button" tabIndex={0} className="pd-crumb" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>מטופלים</a>
        <span>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{cp.name}</span>
      </div>

      {S.loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 26, marginBottom: 20, display: 'flex', gap: 18, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 74, height: 74, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 180, height: 18, borderRadius: 6, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 280, height: 13, borderRadius: 6 }} />
          </div>
        </div>
      )}

      {!S.loading && (
        <div>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '24px 26px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 74, height: 74, borderRadius: '50%', background: cpa.bg, color: cpa.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26 }}>{cpInitials}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{cp.name}</h1>
                <button type="button" onClick={editDetails} aria-label="עריכת פרטי המטופל" title="עריכת פרטים" className="pd-edit-btn" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-input)', borderRadius: 8, background: 'var(--paper)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                </button>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>
                <span dir="ltr">{cp.phone}</span> · <span dir="ltr">{displayPatientEmail(cp.email)}</span>
                {cp.address ? <> · {cp.address}</> : null}
                {' · '}
                {cp.archived ? 'טיפול: ' + formatTreatmentSpan(cp.created_at, cp.archived_at) : 'מאז ' + formatPatientSince(cp.created_at)}
              </p>
              <div style={{ marginTop: 9 }}>
                {cp.archived ? (
                  <span dir="auto" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" /></svg>
                    {lastSession ? <>פגישה אחרונה · <span dir="ltr">{lastSession.date}</span></> : 'אין היסטוריית פגישות'}
                  </span>
                ) : meetingsLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" /></svg>
                    טוען פגישות…
                  </span>
                ) : cpNext ? (
                  <a onClick={() => openMeetingDetail(cpNext)} role="button" tabIndex={0} className="pd-next" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: 'var(--primary-surface)', border: '1px solid var(--primary-border)', color: 'var(--primary)', cursor: 'pointer' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
                    {cpNextLabel}
                  </a>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" /></svg>
                    אין פגישה מתוכננת
                  </span>
                )}
              </div>
            </div>
            {!cp.archived && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={openUploadScreen} className="pd-primary-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--paper)"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>העלאת הקלטה
                </button>
                <button onClick={scheduleForPatient} className="pd-ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7zm4-7h2v2h-2z" /></svg>קביעת פגישה
                </button>
                <button onClick={goReportFromPatient} className="pd-ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>דוח הכנה</button>
                {tts.supported && patientRecap && (
                  <button
                    onClick={playPatientRecap}
                    aria-pressed={playingRecap}
                    aria-label={playingRecap ? 'עצירת ההשמעה' : 'השמעת תקציר הפגישה הקודמת'}
                    className="pd-ghost-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', borderRadius: 10, border: '1px solid ' + (playingRecap ? 'var(--primary)' : 'var(--border-input)'), background: playingRecap ? 'var(--primary-tint)' : 'var(--paper)', color: playingRecap ? 'var(--primary)' : 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      {playingRecap ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" /> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />}
                    </svg>
                    {playingRecap ? 'עצירה' : 'השמעת תקציר'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rx-side" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>סקירת מטופל</h2>
                  {S.editingOverview ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveOverview} style={{ height: 30, padding: '0 12px', border: 'none', borderRadius: 7, background: 'var(--primary)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>שמירה</button>
                      <button onClick={cancelOverview} style={{ height: 30, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 7, background: 'var(--paper)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
                    </div>
                  ) : (
                    <svg onClick={startEditOverview} viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)" style={{ cursor: 'pointer' }} role="button" tabIndex={0} aria-label="עריכת סקירת המטופל"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {OVERVIEW_FIELDS.map((f) => (
                    <div key={f.key}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>{f.label}</div>
                      {S.editingOverview ? (
                        <textarea value={overviewDraft[f.key]} onChange={onOverviewField(f.key)} aria-label={f.label} style={{ width: '100%', minHeight: 54, border: '1.5px solid var(--primary-border)', borderRadius: 8, padding: '8px 10px', fontSize: 13.5, lineHeight: 1.55, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text)' }} />
                      ) : (
                        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{overview[f.key]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>הערות המטפל</h2>
                  {S.editingNotes ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveNotes} style={{ height: 30, padding: '0 12px', border: 'none', borderRadius: 7, background: 'var(--primary)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>שמירה</button>
                      <button onClick={cancelNotes} style={{ height: 30, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 7, background: 'var(--paper)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
                    </div>
                  ) : (
                    <button onClick={startAddNote} aria-label="הוספת הערה" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 7, background: 'var(--paper)', color: 'var(--primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>הוספת הערה
                    </button>
                  )}
                </div>
                {hasRecoverableNotes && (
                  <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--primary-surface)', border: '1px solid var(--primary-border)', borderRadius: 9, padding: '10px 12px', marginBottom: 12 }}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--primary)" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z" /></svg>
                    <span style={{ flex: 1, minWidth: 130, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>יש טיוטה שלא נשמרה מעריכה קודמת. להמשיך?</span>
                    <button onClick={resumeNotesDraft} style={{ height: 30, padding: '0 12px', border: 'none', borderRadius: 7, background: 'var(--primary)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>המשך עריכה</button>
                    <button onClick={discardNotesDraft} style={{ height: 30, padding: '0 10px', border: '1px solid var(--border-input)', borderRadius: 7, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>מחיקת הטיוטה</button>
                  </div>
                )}
                {S.editingNotes && (
                  <div style={{ marginBottom: noteEntries.length ? 14 : 0 }}>
                    <textarea onChange={onNotesDraft} value={S.notesDraft} aria-label="הערות המטפל" placeholder="הערה חדשה בין המפגשים…" className="pd-notes-ta" style={{ width: '100%', minHeight: 96, border: '1.5px solid var(--primary-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.7, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text)' }} />
                  </div>
                )}
                {noteEntries.length > 0 ? (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {noteEntries.map((n) => (
                      <li key={n.id} style={{ border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{formatNoteAt(n.at) || 'הערה שמורה'}</span>
                          <button onClick={() => deleteNote(n.id)} aria-label="מחיקת הערה" title="מחיקת הערה" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                          </button>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{n.text}</p>
                      </li>
                    ))}
                  </ul>
                ) : (!S.editingNotes && (
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-muted)' }}>אין עדיין הערות. הוסיפו הערות בין המפגשים כדי לתעד התפתחות ותובנות לאורך הטיפול.</p>
                ))}
              </div>

              <PatientDocuments patientId={cp.id} />

              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
                {cp.archived ? (
                  <button
                    type="button"
                    onClick={restoreThisPatient}
                    aria-label="שחזור מטופל לרשימת הפעילים"
                    className="pd-ghost-btn"
                    style={{
                      width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--primary-surface)',
                      color: 'var(--primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3z" /></svg>
                    שחזור לרשימת הפעילים
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={archiveThisPatient}
                    aria-label="העברת מטופל לארכיון"
                    className="pd-ghost-btn"
                    style={{
                      width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)',
                      color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.54 5.23 19.15 3.5A1.45 1.45 0 0 0 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23A2 2 0 0 0 3 6.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5c0-.5-.17-.96-.46-1.27zM12 17.5 6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" /></svg>
                    העברה לארכיון
                  </button>
                )}
                {/* Permanent deletion is reserved for archived files; active
                    patients are archived (reversible), never hard-deleted. */}
                {cp.archived ? (
                  <>
                    <button
                      type="button"
                      onClick={deletePatientPermanent}
                      aria-label="מחיקת מטופל לצמיתות"
                      className="pd-danger-btn"
                      style={{
                        width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        border: '1px solid var(--error-border, var(--error))', borderRadius: 10, background: 'var(--paper)',
                        color: 'var(--error)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                      מחיקת מטופל לצמיתות
                    </button>
                    <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center' }}>כל הנתונים יימחקו · לא ניתן לשחזר</p>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center' }}>העברה לארכיון הפיכה · ניתן לשחזר מטופל מהארכיון בכל עת.</p>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--bg)' }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>פגישות</h2>
              </div>
              <div style={{ padding: '0 22px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--text-secondary)' }}>פגישות קרובות</h3>
                  {hasMoreUpcoming && (
                    <a onClick={goUpcomingMeetings} role="button" tabIndex={0} className="pd-upcoming-link" style={{ fontSize: 13.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>כל הפגישות הקרובות ›</a>
                  )}
                </div>
                {meetingsLoading ? (
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>טוען פגישות…</div>
                ) : (
                  <UpcomingMeetingList meetings={upcomingPreview} onSelect={openMeetingDetail} onDelete={deleteMeeting} />
                )}
              </div>

              <div style={{ padding: '12px 22px 18px', borderTop: '1px solid var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--text-secondary)' }}>היסטוריית פגישות</h3>
                  {hasMoreHistory && (
                    <a onClick={goMeetingHistory} role="button" tabIndex={0} className="pd-history-link" style={{ fontSize: 13.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>כל ההיסטוריה ›</a>
                  )}
                </div>
                <PatientSessionList sessions={historyPreview} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
