// "הוספת מפגש" — the unified capture dialog (spec: one action button opens a
// modal with two tabs — הקלטה / העלאת קובץ), shared by desktop and mobile
// shells. The record tab captures via useSessionRecorder and hands the finished
// file to the existing upload pipeline (recordingHandoff → UploadPage), so a
// recorded session is validated, patient-wired, and processed exactly like an
// uploaded one; the upload tab hands off to the upload screen with the same
// patient context. Opened via S.recordOpen (+ optional S.recordPid preselecting
// the patient).
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../store/AppStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useSessionRecorder } from '../../hooks/useSessionRecorder';
import { stashRecording } from '../../services/recordingHandoff';
import { btnCancel, OVERLAY_RADIUS, OVERLAY_SHADOW } from '../../utils/styles';

const CLOSE_X = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

export default function RecordSessionDialog() {
  const { S, set, navigate, toast } = useApp();
  const open = !!S.recordOpen;
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const rec = useSessionRecorder();
  const submittingRef = useRef(false);
  const [pid, setPid] = useState('');
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  // In-progress flag for the window listeners (which capture render scope): true
  // while recording, paused, or holding an un-submitted reviewed clip — so a
  // stray Escape / backdrop tap can never silently discard unsaved audio.
  const recordingRef = useRef(false);
  recordingRef.current = rec.state === 'recording' || rec.state === 'paused' || rec.state === 'review';

  // Re-sync the preselected patient (and the leading tab) every time the dialog opens.
  useEffect(() => {
    if (open) {
      submittingRef.current = false; // fresh open → allow a new submit
      setMode('record');
      const wanted = S.recordPid || S.patientId;
      const active = S.patients.some((p: any) => p.id === wanted) ? wanted : (S.patients[0] && S.patients[0].id) || '';
      setPid(active);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    // Escape closes when idle; while recording it's ignored so a stray keypress
    // can't silently discard an in-progress recording (use ביטול/סיום explicitly).
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !recordingRef.current) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const close = () => {
    rec.cancel();
    set({ recordOpen: false, recordPid: null });
  };
  // Backdrop tap: never discards a recording in progress (accidental-loss guard).
  const onBackdrop = () => { if (!recordingRef.current) close(); };

  // Stop → enter review (playback before submit). Empty capture drops to idle.
  const finish = () => { rec.stop(); };

  // Submit the reviewed clip into the existing upload/processing pipeline.
  const submit = () => {
    if (!rec.file) { toast('לא נקלט שמע · נסו להקליט שוב', 'error'); return; }
    if (submittingRef.current) return; // guard a fast double-tap (double toast + double navigate)
    submittingRef.current = true;
    stashRecording(rec.file);
    toast('ההקלטה נשמרה · ממשיכים לעיבוד');
    navigate('upload', {
      recordOpen: false, recordPid: null, uploadPatientId: pid,
      upload: { state: 'idle', progress: 0, fileName: '', error: '' },
    });
  };

  // The upload tab hands off to the upload screen with the same patient context.
  const goUpload = () => {
    rec.cancel();
    navigate('upload', {
      recordOpen: false, recordPid: null, uploadPatientId: pid,
      upload: { state: 'idle', progress: 0, fileName: '', error: '' },
    });
  };

  const recording = rec.state === 'recording';
  const paused = rec.state === 'paused';
  const active = recording || paused;
  const review = rec.state === 'review';
  const patientName = (S.patients.find((p: any) => p.id === pid) || {}).name || '';
  // While unsaved audio exists, leaving the record tab would discard it — the
  // tab switch is disabled and the ביטול/שליחה actions decide the clip's fate.
  const tabsLocked = recordingRef.current;

  const tabStyle = (selected: boolean): React.CSSProperties => ({
    flex: 1, height: 38, border: 'none', borderBottom: '2px solid ' + (selected ? 'var(--primary)' : 'transparent'),
    background: 'transparent', color: selected ? 'var(--primary)' : 'var(--text-muted)',
    fontSize: 14, fontWeight: 700, cursor: tabsLocked ? 'default' : 'pointer', fontFamily: 'inherit',
    opacity: tabsLocked && !selected ? 0.5 : 1,
  });

  return (
    <div onClick={onBackdrop} style={{ position: 'fixed', inset: 0, background: 'rgba(15,28,46,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 210, padding: 20, animation: 'pop .2s ease' }}>
      <div ref={trapRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="הוספת מפגש" style={{ background: 'var(--paper)', borderRadius: OVERLAY_RADIUS, width: '100%', maxWidth: 460, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', boxShadow: OVERLAY_SHADOW, animation: 'pop .25s ease' }}>
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>הוספת מפגש</h2>
            <svg onClick={close} className="shell-close-x" role="button" tabIndex={0} aria-label="סגירה" viewBox="0 0 24 24" width="22" height="22" fill="var(--text-muted)" style={{ cursor: 'pointer' }}><path d={CLOSE_X} /></svg>
          </div>
          {/* Spec: one capture action → a modal with two tabs (record / upload). */}
          <div role="tablist" aria-label="אופן הוספת המפגש" style={{ display: 'flex', gap: 4, marginBlockStart: 12 }}>
            <button type="button" role="tab" aria-selected={mode === 'record'} onClick={() => { if (!tabsLocked) setMode('record'); }} style={tabStyle(mode === 'record')}>הקלטה</button>
            <button type="button" role="tab" aria-selected={mode === 'upload'} onClick={() => { if (!tabsLocked) setMode('upload'); }} style={tabStyle(mode === 'upload')}>העלאת קובץ</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>מטופל</label>
            {/* Spec (patient file): when the dialog is opened FROM a patient
                context (recordPid), the patient is fixed — no selection field;
                only the shell-level entry points offer the picker. */}
            {S.recordPid ? (
              <div aria-label={'מפגש עבור ' + patientName} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', padding: '8px 2px' }}>{patientName}</div>
            ) : (
              <select aria-label="בחירת מטופל למפגש" value={pid} onChange={(e) => setPid(e.target.value)} disabled={rec.state !== 'idle'} className="app-select" style={{ width: '100%' }}>
                {S.patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {mode === 'upload' ? (
            <>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                העלו קובץ שמע קיים של המפגש (MP3, WAV או M4A עד 25MB) · הקובץ יתומלל וינותח אוטומטית, בדיוק כמו הקלטה ישירה.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={goUpload} aria-label="מעבר לבחירת קובץ להעלאה" style={{ flex: 1, height: 44, minWidth: 150, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--on-accent)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
                  בחירת קובץ להעלאה
                </button>
                <button type="button" onClick={close} style={btnCancel}>ביטול</button>
              </div>
            </>
          ) : !rec.supported ? (
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              הקלטה ישירה אינה נתמכת בדפדפן זה. אפשר להעלות קובץ הקלטה קיים בלשונית ״העלאת קובץ״.
            </p>
          ) : (
            <>
              {review ? (
                <audio
                  controls
                  src={rec.fileUrl || undefined}
                  aria-label="תצוגה מקדימה של ההקלטה"
                  style={{ width: '100%' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '18px 0', background: 'var(--surface-2)', borderRadius: 12 }}>
                  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: '50%', background: recording ? 'var(--error)' : paused ? 'var(--warning, var(--text-muted))' : 'var(--text-disabled)', animation: recording ? 'pulse 1.4s ease-in-out infinite' : 'none' }} />
                  <span dir="ltr" className="num" role="timer" aria-label="משך ההקלטה" style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: active ? 'var(--text)' : 'var(--text-muted)' }}>{rec.elapsedLabel}</span>
                  {paused && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>מושהה</span>}
                </div>
              )}

              {rec.error && <p role="alert" style={{ margin: 0, fontSize: 13.5, color: 'var(--error)', lineHeight: 1.5 }}>{rec.error}</p>}

              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {review
                  ? `האזינו להקלטה לפני השליחה · עבור ${patientName || 'המטופל שנבחר'}. אפשר לשלוח לעיבוד או להקליט מחדש.`
                  : `ההקלטה נשמרת במכשיר בלבד ומועברת לעיבוד כמו קובץ שהועלה · עבור ${patientName || 'המטופל שנבחר'}.`}
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {review ? (
                  <>
                    <button type="button" onClick={submit} aria-label="שליחת ההקלטה לעיבוד" style={{ flex: 1, height: 44, minWidth: 150, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--on-accent)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      שליחה לעיבוד
                    </button>
                    <button type="button" onClick={rec.discard} aria-label="הקלטה מחדש" style={btnCancel}>הקלטה מחדש</button>
                  </>
                ) : !active ? (
                  <button type="button" onClick={rec.start} aria-label="התחלת הקלטה" style={{ flex: 1, height: 44, minWidth: 150, border: 'none', borderRadius: 10, background: 'var(--error)', color: 'var(--on-accent)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 0 0-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-3v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" /></svg>
                    התחלת הקלטה
                  </button>
                ) : (
                  <>
                    {recording ? (
                      <button type="button" onClick={rec.pause} aria-label="השהיית ההקלטה" style={{ flex: 1, height: 44, minWidth: 120, border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--paper)', color: 'var(--primary)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                        השהיה
                      </button>
                    ) : (
                      <button type="button" onClick={rec.resume} aria-label="המשך ההקלטה" style={{ flex: 1, height: 44, minWidth: 120, border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--paper)', color: 'var(--primary)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                        המשך
                      </button>
                    )}
                    <button type="button" onClick={finish} aria-label="סיום ההקלטה ומעבר לבדיקה" style={{ flex: 1, height: 44, minWidth: 120, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--on-accent)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z" /></svg>
                      סיום
                    </button>
                  </>
                )}
                <button type="button" onClick={close} style={btnCancel}>ביטול</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
