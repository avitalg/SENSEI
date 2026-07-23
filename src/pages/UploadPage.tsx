// Upload session audio — file pick or drag & drop. Offline uploads are queued in
// IndexedDB and synced when connectivity returns.
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppStore';
import { validateFile } from '../utils';
import { fmtDate } from '../utils/dates';
import { submitUpload, type TranscriptMode } from '../services/upload';
import { countPendingUploads } from '../services/uploadQueue';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { dbEventApiId, dayKey, fetchDbCalendarEvents, type CalendarUiEvent } from '../services/calendar';
import { isApiConfigured } from '../services/apiClient';
import { deleteMeetingTranscript, fetchMeetingTranscript } from '../services/meetingTranscript';
import { takeRecording } from '../services/recordingHandoff';
import { sessionDates } from '../data/sessions';
import PrivacyNotice from '../components/shared/PrivacyNotice';
import Breadcrumb from '../components/shared/Breadcrumb';
import './upload.css';
import { CARD_SHADOW } from '../utils/styles';

const BAD_FORMAT = 'סוג הקובץ אינו נתמך. אנא העלו קובץ שמע (MP3, WAV, M4A, WEBM או OGG).';
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB — matches the stated limit + the server's 413 guard.
const TOO_LARGE = 'הקובץ גדול מדי · הגודל המרבי הוא 25MB';


// Meeting Date is a DATE-ONLY field (DD/MM/YY) — no time component anywhere in
// the upload flow. The picker lists the patient's meetings by calendar date;
// fmtDate reads local Y/M/D directly, so the selected date never shifts across
// time zones or locales.
function formatMeetingDateOption(e: CalendarUiEvent): string {
  return fmtDate(e.start);
}

function isPastOrStartedMeeting(e: CalendarUiEvent, now = new Date()): boolean {
  return e.start.getTime() <= now.getTime();
}

export default function UploadPage() {
  const { S, set, navigate, toast } = useApp();
  const abortRef = useRef<AbortController | null>(null);
  const apiMode = isApiConfigured();
  const [patientMeetings, setPatientMeetings] = useState<CalendarUiEvent[]>([]);
  const [uploadMeetingId, setUploadMeetingId] = useState('');
  // Whether the meeting list for the selected patient has finished resolving.
  // In API mode it loads async, so a handed-off recording must WAIT for this
  // before processing — otherwise it hits the empty-id guard and is dropped.
  const [meetingsResolved, setMeetingsResolved] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const conflictTrapRef = useFocusTrap<HTMLDivElement>(conflictOpen);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const u = S.upload;
  const uploadDrop = u.state === 'idle' || u.state === 'dragging';
  const uploadBusy = u.state === 'uploading';
  const uploadQueued = u.state === 'queued';
  const uploadDone = u.state === 'success';
  const uploadFailed = u.state === 'error';
  const uploadProgress = u.progress;
  const uploadFileName = u.fileName || 'recording.mp3';
  const isOffline = S.online === false;

  const dropBorder = u.state === 'dragging' ? 'var(--primary)' : 'var(--border-input)';
  const dropBg = u.state === 'dragging' ? 'var(--primary-tint)' : 'var(--surface)';
  const uploadPid = S.uploadPatientId || S.patientId || (S.patients[0] && S.patients[0].id) || '';
  const uploadPatientFixed = !!S.uploadPatientFixed;

  useEffect(() => {
    if (!uploadPid) {
      setPatientMeetings([]);
      setUploadMeetingId('');
      setMeetingsResolved(true);
      return undefined;
    }

    if (!apiMode) {
      // Demo seed: past session dates for the selected patient (no calendar API).
      const patient = (S.patients || []).find((p: any) => p.id === uploadPid);
      // Per-patient dates for bespoke patients (Simba/Forrest/Harry…), shared
      // SESSION_DATES otherwise — same helper every session surface uses. Cap the
      // count at the available dates so a bespoke arc's session numbering
      // (id = count - i) matches its real history length.
      const dates = sessionDates(patient);
      const count = Math.min(dates.length, patient ? Math.max(3, Number(patient.sessions) || 6) : 6);
      const demo: CalendarUiEvent[] = dates.slice(0, count).map((dateLabel, i) => {
        const [dd, mm, yy] = dateLabel.split('/').map(Number);
        const start = new Date(2000 + yy, mm - 1, dd, 9, 0, 0, 0);
        const end = new Date(start.getTime() + 50 * 60_000);
        return {
          id: 'demo-' + uploadPid + '-' + (count - i),
          title: patient?.name || 'פגישה',
          description: '',
          location: '',
          htmlLink: '',
          meetLink: '',
          allDay: false,
          start,
          end,
          status: 'confirmed',
          attendees: [],
          source: 'fixture' as const,
          patientId: uploadPid,
        };
      }).filter((e) => isPastOrStartedMeeting(e));
      setPatientMeetings(demo);
      setUploadMeetingId(demo[0]?.id || '');
      setMeetingsResolved(true);
      return undefined;
    }

    setMeetingsResolved(false); // API: pending until the fetch settles
    const ac = new AbortController();
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    fetchDbCalendarEvents(from, ac.signal, undefined, to)
      .then((events) => {
        const past = events
          .filter((e) => e.patientId === uploadPid)
          .filter((e) => isPastOrStartedMeeting(e))
          .sort((a, b) => +b.start - +a.start);
        setPatientMeetings(past);
        setUploadMeetingId((prev) => {
          if (prev && past.some((e) => dbEventApiId(e.id) === prev)) return prev;
          const preferred = S.meetingId ? String(S.meetingId) : '';
          if (preferred && past.some((e) => dbEventApiId(e.id) === preferred)) return preferred;
          return past[0] ? dbEventApiId(past[0].id) : '';
        });
        setMeetingsResolved(true);
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setPatientMeetings([]);
          setUploadMeetingId('');
          setMeetingsResolved(true);
        }
      });
    return () => ac.abort();
  }, [apiMode, uploadPid, S.patients, S.meetingId]);

  const selectedMeeting = patientMeetings.find((e) => {
    const id = apiMode ? dbEventApiId(e.id) : e.id;
    return id === uploadMeetingId;
  });

  const _up = u.progress;
  const _activeStage = u.state === 'success' ? 5 : _up < 20 ? 1 : _up < 55 ? 2 : _up < 100 ? 3 : 4;
  const uploadStages = ['העלאת הקובץ', 'תמלול בעברית', 'ניתוח AI', 'סיכום מוכן'].map((label, i) => {
    const n = i + 1;
    const status = n < _activeStage ? 'done' : n === _activeStage ? 'active' : 'pending';
    return {
      label, num: String(n), done: status === 'done', active: status === 'active', pending: status === 'pending',
      circleBg: status === 'done' ? 'var(--primary)' : status === 'active' ? 'var(--primary-tint)' : 'var(--surface-2)',
      labelColor: status === 'pending' ? 'var(--text-muted)' : 'var(--text-2)', labelWeight: status === 'active' ? 700 : 600,
      lineBg: n < _activeStage ? 'var(--primary)' : 'var(--divider)', showLine: n < 4,
    };
  });
  const uploadStageCaption = _activeStage === 1 ? 'מעלה את הקובץ…' : _activeStage === 2 ? 'מתמלל בעברית (Whisper)…' : 'מנתח עם AI…';

  const refreshPendingCount = () => {
    countPendingUploads().then((n) => set({ pendingUploadCount: n }));
  };

  // Session linkage is mandatory in BOTH modes: session audio (recorded or
  // uploaded) must always belong to one patient + one specific session, so an
  // empty selection is blocked rather than creating an orphaned recording. The
  // message adapts when the patient simply has no session to attach to yet.
  const missingSessionError = () => (patientMeetings.length === 0
    ? 'למטופל זה אין פגישה לשייך אליה את ההקלטה · קבעו פגישה ביומן ונסו שוב'
    : 'נא לבחור פגישה לפני ההעלאה');

  const storedTranscriptForPatient = S.transcriptsByPatient?.[uploadPid] || null;
  const meetingIdForCompare = apiMode && uploadMeetingId
    ? dbEventApiId(uploadMeetingId)
    : uploadMeetingId;

  const localMeetingHasTranscript = !!(
    storedTranscriptForPatient
    && meetingIdForCompare
    && String(storedTranscriptForPatient.meetingId) === String(meetingIdForCompare)
    && String(storedTranscriptForPatient.text || '').trim()
  );

  const probeMeetingTranscript = async (): Promise<boolean> => {
    if (!uploadMeetingId) return false;
    if (!apiMode) return localMeetingHasTranscript;
    const found = await fetchMeetingTranscript(meetingIdForCompare);
    return found !== null;
  };

  const runUpload = async (file: File, transcriptMode: TranscriptMode = 'create') => {
    if (!uploadMeetingId) {
      set({ upload: { state: 'error', progress: 0, fileName: file.name, error: missingSessionError() } });
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    set({ upload: { state: 'uploading', progress: 0, fileName: file.name, error: '' } });
    try {
      // Server enforces 1 transcript per meeting — clear before a replace upload.
      if (apiMode && transcriptMode === 'replace' && uploadMeetingId) {
        await deleteMeetingTranscript(uploadMeetingId, ac.signal);
      }
      const result = await submitUpload(file, {
        patientId: uploadPid,
        meetingId: uploadMeetingId || undefined,
        transcriptMode,
        existingTranscriptText: transcriptMode === 'append'
          ? (storedTranscriptForPatient?.text || '')
          : undefined,
        sessionDate: selectedMeeting ? dayKey(selectedMeeting.start) : undefined,
        online: S.online !== false,
        onProgress: (p) => set((s: any) => ({ upload: { ...s.upload, progress: p } })),
        signal: ac.signal,
      });
      if (result.status === 'queued') {
        refreshPendingCount();
        set({ upload: { state: 'queued', progress: 0, fileName: file.name, error: '' } });
        toast('ההקלטה נשמרה מקומית · תועלה עם חזרת החיבור', 'info');
        return;
      }
      const t = result.transcript;
      const pid = uploadPid || S.patientId || S.activeTranscriptPatientId || '';
      if (t && typeof t.text === 'string' && pid) {
        const text = t.text.trim() || 'לא זוהה דיבור בהקלטה.';
        set((s: any) => ({
          transcriptsByPatient: {
            ...(s.transcriptsByPatient || {}),
            [pid]: {
              audioId: result.audioId || '',
              text,
              language: t.language || 'he',
              createdAt: new Date().toISOString(),
              meetingId: t.meetingId || uploadMeetingId,
              transcriptId: t.transcriptId,
            },
          },
          activeTranscriptPatientId: pid,
          patientId: pid,
          uploadPatientId: pid,
          upload: { state: 'success', progress: 100, fileName: file.name, error: '' },
          hasUploaded: true,
        }));
        navigate('transcript', { patientId: pid });
        toast('התמלול מוכן', 'success');
        return;
      }
      set({ upload: { state: 'success', progress: 100, fileName: file.name, error: '' }, hasUploaded: true });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      set({ upload: { state: 'error', progress: 0, fileName: file.name, error: e?.message || 'ההעלאה נכשלה. נסו שוב.' } });
    }
  };

  const onUploadFile = async (file: File | undefined) => {
    if (!file) return;
    if (!validateFile(file.name)) {
      set({ upload: { state: 'error', progress: 0, fileName: file.name, error: BAD_FORMAT } });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      set({ upload: { state: 'error', progress: 0, fileName: file.name, error: TOO_LARGE } });
      return;
    }
    if (!uploadMeetingId) {
      set({ upload: { state: 'error', progress: 0, fileName: file.name, error: missingSessionError() } });
      return;
    }
    setCheckingConflict(true);
    try {
      const hasTranscript = await probeMeetingTranscript();
      if (hasTranscript) {
        setPendingFile(file);
        setConflictOpen(true);
        return;
      }
      await runUpload(file, 'create');
    } catch (e: any) {
      set({ upload: { state: 'error', progress: 0, fileName: file.name, error: e?.message || 'לא ניתן לבדוק תמלול קיים' } });
    } finally {
      setCheckingConflict(false);
    }
  };

  // A session just recorded in RecordSessionDialog hands its file off here.
  // Consume it into state on mount, then process it once the patient's meeting
  // list has resolved — deferring past this commit and re-running as
  // uploadMeetingId settles, so onUploadFile sees the populated meeting instead
  // of a stale empty id (which, in API mode, would reject a recording as a
  // dead-end). Same validation + pipeline as a picked file.
  useEffect(() => {
    const recorded = takeRecording();
    if (recorded) setRecordedFile(recorded);
  }, []);
  useEffect(() => {
    if (!recordedFile) return undefined;
    // Hold the recording until the meeting list has resolved: process once a
    // meeting is selected (attach), or once resolution is done with none (the
    // no-session error is then the correct, non-silent outcome). Without this,
    // in API mode the 0ms tick fired before the async fetch, dropping the file.
    if (!uploadMeetingId && !meetingsResolved) return undefined;
    const t = setTimeout(() => { onUploadFile(recordedFile); setRecordedFile(null); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedFile, uploadMeetingId, meetingsResolved]);

  const closeConflict = () => {
    setConflictOpen(false);
    setPendingFile(null);
  };

  const confirmConflict = async (mode: TranscriptMode) => {
    const file = pendingFile;
    closeConflict();
    if (!file) return;
    await runUpload(file, mode);
  };

  const onDragOver = (e: any) => { e.preventDefault(); set({ upload: { ...S.upload, state: 'dragging' } }); };
  const onDragLeave = (e: any) => { e.preventDefault(); set({ upload: { ...S.upload, state: 'idle' } }); };
  // Offline demo only: fabricate a sample recording so the journey is explorable
  // without a real audio file. When the API is connected (even via "מצב הדגמה"),
  // always use the native picker — fake bytes must never hit the server.
  const useDemoSample = S.demoMode && !apiMode;
  const onDrop = (e: any) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { void onUploadFile(f); return; }
    // No real file (e.g. text/link dropped from another app).
    if (useDemoSample) void onUploadFile(new File(['x'], 'פגישה_22-06.mp3', { type: 'audio/mpeg' }));
    else { set({ upload: { ...S.upload, state: 'idle' } }); }
  };
  const pickFile = () => {
    if (useDemoSample) { void onUploadFile(new File(['x'], 'פגישה_22-06.mp3', { type: 'audio/mpeg' })); return; }
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.mp3,.wav,.m4a,.webm,.ogg,audio/*';
    inp.onchange = (e: any) => { void onUploadFile(e.target.files[0]); };
    inp.click();
  };
  const simulateBad = () => set({ upload: { state: 'error', progress: 0, fileName: 'video.mp4', error: BAD_FORMAT } });
  const resetUpload = () => {
    abortRef.current?.abort();
    set({ upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
  };
  const cancelUpload = () => {
    abortRef.current?.abort();
    resetUpload();
    toast('ההעלאה בוטלה', 'info');
  };

  const goSummaryFromUpload = () => navigate('summary', { patientId: S.uploadPatientId || S.patientId });
  const goTranscriptFromUpload = () => navigate('transcript', { patientId: S.uploadPatientId || S.patientId || S.activeTranscriptPatientId });
  const openHelp = () => navigate('help');

  // When Upload is entered from a patient context, offer a Back trail to that
  // patient (the only patient-entry page previously without one) so the in-flow
  // context isn't lost. Uses the real entry id, not the patients[0] fallback.
  const crumbPid = S.uploadPatientId || S.patientId;
  const crumbPatient = crumbPid ? S.patients.find((p: any) => p.id === crumbPid) : null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {crumbPatient && (
        <Breadcrumb items={[
          { label: crumbPatient.name, onClick: () => navigate('patient', { patientId: crumbPid }) },
          { label: 'העלאת הקלטה' },
        ]} />
      )}
      <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>העלאת הקלטה</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 15 }}>
        העלו קובץ הקלטה של הפגישה · הוא יתומלל וינותח אוטומטית.
        {isOffline && ' · אין חיבור · הקובץ יישמר מקומית עד לסנכרון.'}
      </p>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>מטופל</label>
            {uploadPatientFixed ? (
              <div aria-label="המטופל שנבחר להעלאה" className="app-select" style={{ width: '100%', display: 'flex', alignItems: 'center', background: 'var(--surface-2)', color: 'var(--text)' }}>
                {(S.patients.find((p: any) => p.id === uploadPid) || {}).name || uploadPid}
              </div>
            ) : (
              <select aria-label="בחירת מטופל להעלאה" value={uploadPid} onChange={(e) => set({ uploadPatientId: e.target.value })} disabled={uploadBusy} className="app-select" style={{ width: '100%' }}>
                {S.patients.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            )}
          </div>
          <div style={{ flex: 1.4, minWidth: 220 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>תאריך הפגישה</label>
            <select
              aria-label="בחירת תאריך פגישה"
              value={uploadMeetingId}
              onChange={(e) => setUploadMeetingId(e.target.value)}
              disabled={uploadBusy}
              dir="ltr"
              className="app-select"
              style={{ width: '100%', textAlign: 'start' }}
            >
              {patientMeetings.length === 0 && (
                <option value="">אין פגישות קודמות למטופל זה</option>
              )}
              {patientMeetings.map((e) => {
                const value = apiMode ? dbEventApiId(e.id) : e.id;
                return (
                  <option key={e.id} value={value}>{formatMeetingDateOption(e)}</option>
                );
              })}
            </select>
          </div>
        </div>

        {/* file upload */}
        {uploadDrop && (<>
          <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} style={{ border: '2px dashed ' + dropBorder, borderRadius: 10, background: dropBg, padding: '46px 20px', textAlign: 'center', transition: 'all .15s' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" width="34" height="34" fill="var(--primary)"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>גררו קובץ לכאן או בחרו מהמחשב</h2>
            <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 14 }}>פורמטים נתמכים: MP3, WAV, M4A, WEBM, OGG · עד 25MB</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={pickFile} disabled={checkingConflict} style={{ height: 44, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: checkingConflict ? 'default' : 'pointer', opacity: checkingConflict ? 0.6 : 1 }}>{checkingConflict ? 'בודקים…' : 'בחירת קובץ'}</button>
              {/* Capture parity: no file yet? record the session right here — same
                  pipeline (RecordSessionDialog feeds this upload flow), patient
                  preselected from the picker above. */}
              <button onClick={() => set({ recordOpen: true, recordPid: uploadPid })} disabled={checkingConflict} style={{ height: 44, padding: '0 22px', display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--paper)', color: 'var(--primary)', fontSize: 14.5, fontWeight: 700, cursor: checkingConflict ? 'default' : 'pointer', opacity: checkingConflict ? 0.6 : 1 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A.998.998 0 0 0 5.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z" /></svg>הקלטה
              </button>
            </div>
            {/* Demo UI only — local error-state showcase; safe with API connected (no upload). */}
            {S.demoMode && <div style={{ marginTop: 14 }}><button type="button" onClick={simulateBad} className="upl-demo-link" style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>הדגמת שגיאת פורמט</button></div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16, fontSize: 12.5, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>מה קורה אחרי ההעלאה:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }}></span>תמלול אוטומטי</span>
            <span style={{ color: 'var(--text-disabled)' }}>›</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }}></span>ניתוח AI</span>
            <span style={{ color: 'var(--text-disabled)' }}>›</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }}></span>סיכום מוכן לבדיקה</span>
            <span style={{ color: 'var(--text-muted)' }}>· כ-2 דק׳</span>
          </div>
        </>)}

        {/* uploading */}
        {uploadBusy && (
          <div style={{ border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--primary-surface)', padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--primary)"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div dir="ltr" style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{uploadFileName}</div>
                <div aria-live="polite" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{uploadStageCaption} · {uploadProgress}%</div>
              </div>
              <div aria-hidden="true" style={{ width: 22, height: 22, border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .8s linear infinite' }}></div>
              <button onClick={cancelUpload} aria-label="ביטול ההעלאה" style={{ height: 36, padding: '0 14px', border: '1px solid var(--border-input)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}>ביטול</button>
            </div>
            <div role="progressbar" aria-label="התקדמות העיבוד" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} style={{ height: 8, borderRadius: 6, background: 'var(--primary-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 6, width: uploadProgress + '%', transition: 'width .2s' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 20, flexWrap: 'wrap', gap: '8px 0' }}>
              {uploadStages.map((st) => (
                <div key={st.num} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: st.circleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {st.done && (<svg viewBox="0 0 24 24" width="15" height="15" fill="var(--on-accent)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>)}
                      {st.active && (<div style={{ width: 13, height: 13, border: '2px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .8s linear infinite' }}></div>)}
                      {st.pending && (<span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)' }}>{st.num}</span>)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: st.labelWeight, color: st.labelColor, whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>
                  {st.showLine && (<div style={{ width: 22, height: 2, background: st.lineBg, margin: '0 9px', flexShrink: 0 }}></div>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* queued offline */}
        {uploadQueued && (
          <div role="status" style={{ border: '1px solid var(--warning-strong)', borderRadius: 10, background: 'var(--warning-bg)', padding: '34px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" width="34" height="34" fill="var(--warning-strong)"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>נשמרה להעלאה מאוחרת</h2>
            <p style={{ margin: '0 0 8px', color: 'var(--text-secondary)', fontSize: 14.5 }}>
              <span dir="ltr">{uploadFileName}</span> · ההקלטה נשמרה במכשיר
            </p>
            <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              {S.pendingUploadCount > 1
                ? `${S.pendingUploadCount} הקלטות ממתינות לסנכרון`
                : 'תועלה ותעובד אוטומטית עם חזרת החיבור'}
            </p>
            <button onClick={resetUpload} style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>הקלטה נוספת</button>
          </div>
        )}

        {/* success */}
        {uploadDone && (
          <div role="status" style={{ border: '1px solid var(--divider)', borderRadius: 10, background: 'var(--paper)', padding: '34px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pop .3s ease' }}>
              <svg viewBox="0 0 24 24" width="36" height="36" fill="var(--success)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>ההקלטה עובדה בהצלחה</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14.5 }}>התמלול מוכן לצפייה.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={goTranscriptFromUpload} style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>צפייה בתמלול</button>
              <button onClick={goSummaryFromUpload} style={{ height: 44, padding: '0 20px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>סיכום</button>
              <button onClick={resetUpload} style={{ height: 44, padding: '0 20px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>העלאה נוספת</button>
            </div>
          </div>
        )}

        {/* error */}
        {uploadFailed && (
          <div role="alert" style={{ border: '1px solid var(--divider)', borderRadius: 10, background: 'var(--paper)', padding: '34px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" width="34" height="34" fill="var(--error)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>ההעלאה נכשלה</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14.5 }}>{u.error}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={resetUpload} style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>נסו שוב</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <PrivacyNotice />
          <button type="button" onClick={openHelp} className="upl-policy-link tap44" style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}>מדיניות הפרטיות המלאה ›</button>
        </div>
      </div>

      {conflictOpen && (
        <div
          role="presentation"
          onClick={closeConflict}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,28,46,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 160, padding: 20 }}
        >
          <div
            ref={conflictTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upl-conflict-title"
            aria-describedby="upl-conflict-desc"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeConflict(); } }}
            style={{ background: 'var(--paper)', borderRadius: 15, width: '100%', maxWidth: 520, boxShadow: '0 24px 70px rgba(8,20,40,.35)', padding: 28, animation: 'pop .2s ease' }}
          >
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--warning-strong)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
              </div>
              <div>
                <h2 id="upl-conflict-title" style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>לפגישה זו כבר יש תמלול</h2>
                <p id="upl-conflict-desc" style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>
                  ניתן להוסיף את האודיו החדש לתמלול הקיים, להחליף אותו לחלוטין, או לבטל את ההעלאה.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { void confirmConflict('append'); }}
                style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}
              >
                הוספה לתמלול
              </button>
              <button
                type="button"
                onClick={() => { void confirmConflict('replace'); }}
                style={{ height: 44, padding: '0 20px', border: '1px solid var(--error)', borderRadius: 10, background: 'transparent', color: 'var(--error-dark)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}
              >
                החלפת התמלול
              </button>
              <button
                type="button"
                onClick={closeConflict}
                style={{ height: 44, padding: '0 20px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
