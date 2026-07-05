// Upload recording — drag&drop / file-pick with a staged, simulated processing
// pipeline. Ported from 'Sensei demo.dc.html' template lines 843–943 + renderVals
// (v.isUpload). The prototype kept the whole flow in this.state.upload driven by a
// setInterval (this.uTimer); here the same machine lives in the store (S.upload)
// with the interval held in a ref so it survives re-renders and clears on unmount.
import { useEffect, useRef } from 'react'
import { useApp } from '../store/AppStore'
import { validateFile } from '../utils'
import './upload.css'
import { CARD_SHADOW } from '../utils/styles'

const BAD_FORMAT = 'סוג הקובץ אינו נתמך. אנא העלו קובץ בפורמט MP3, WAV או M4A.'

const PRIVACY_POINTS = [
  { icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', text: 'מוצפן בהעברה ובאחסון (AES-256)' },
  { icon: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z', text: 'ניקוי פרטים מזהים (PII) לפני ניתוח ה-AI' },
  { icon: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', text: 'קובץ האודיו נמחק אוטומטית לאחר התמלול' },
  { icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', text: 'גישה מבוקרת. רק אתם רואים את המטופלים שלכם' },
]

export default function UploadPage() {
  const { S, set, navigate } = useApp()
  const uTimer = useRef<any>(null)

  // clear the simulated-progress interval on unmount (prototype componentWillUnmount)
  useEffect(() => () => clearInterval(uTimer.current), [])

  const u = S.upload
  const uploadDrop = u.state === 'idle' || u.state === 'dragging'
  const uploadBusy = u.state === 'uploading'
  const uploadDone = u.state === 'success'
  const uploadFailed = u.state === 'error'
  const uploadProgress = u.progress
  const uploadFileName = u.fileName || 'recording.mp3'

  const dropBorder = u.state === 'dragging' ? 'var(--primary)' : 'var(--border-input)'
  const dropBg = u.state === 'dragging' ? 'var(--primary-tint)' : 'var(--surface)'
  // the patient this recording is being attached to (defaults to the current
  // patient); drives the "view summary" navigation below.
  const uploadPid = S.uploadPatientId || S.patientId || (S.patients[0] && S.patients[0].id) || ''

  // staged processing pipeline (advances with real progress → predictable, reduces abandonment)
  const _up = u.progress
  const _activeStage = u.state === 'success' ? 5 : _up < 20 ? 1 : _up < 55 ? 2 : _up < 100 ? 3 : 4
  const uploadStages = ['העלאת הקובץ', 'תמלול בעברית', 'ניתוח AI', 'סיכום מוכן'].map((label, i) => {
    const n = i + 1
    const status = n < _activeStage ? 'done' : n === _activeStage ? 'active' : 'pending'
    return {
      label, num: String(n), done: status === 'done', active: status === 'active', pending: status === 'pending',
      circleBg: status === 'done' ? 'var(--primary)' : status === 'active' ? 'var(--primary-tint)' : 'var(--surface-2)',
      labelColor: status === 'pending' ? 'var(--text-muted)' : 'var(--text-2)', labelWeight: status === 'active' ? 700 : 600,
      lineBg: n < _activeStage ? 'var(--primary)' : 'var(--divider)', showLine: n < 4,
    }
  })
  const uploadStageCaption = _activeStage === 1 ? 'מעלה את הקובץ…' : _activeStage === 2 ? 'מתמלל בעברית (Whisper)…' : 'מנתח עם AI…'

  // ---- upload state machine (ported verbatim from the logic class) ----
  const startUpload = (name: string) => {
    set({ upload: { state: 'uploading', progress: 0, fileName: name, error: '' } })
    clearInterval(uTimer.current)
    uTimer.current = setInterval(() => {
      set((s: any) => {
        const np = s.upload.progress + Math.random() * 14 + 6
        if (np >= 100) { clearInterval(uTimer.current); return { upload: { ...s.upload, progress: 100, state: 'success' } } }
        return { upload: { ...s.upload, progress: Math.round(np) } }
      })
    }, 380)
  }
  const onUploadFile = (file: File | undefined) => {
    if (!file) return
    if (!validateFile(file.name)) {
      set({ upload: { state: 'error', progress: 0, fileName: file.name, error: BAD_FORMAT } })
      return
    }
    startUpload(file.name)
  }

  const onDragOver = (e: any) => { e.preventDefault(); set({ upload: { ...S.upload, state: 'dragging' } }) }
  const onDragLeave = (e: any) => { e.preventDefault(); set({ upload: { ...S.upload, state: 'idle' } }) }
  const onDrop = (e: any) => {
    e.preventDefault()
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
    if (f) onUploadFile(f); else startUpload('פגישה_22-06.mp3')
  }
  const pickFile = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = '.mp3,.wav,.m4a'
    inp.onchange = (e: any) => onUploadFile(e.target.files[0])
    inp.click()
  }
  const simulateBad = () => set({ upload: { state: 'error', progress: 0, fileName: 'video.mp4', error: BAD_FORMAT } })
  const resetUpload = () => set({ upload: { state: 'idle', progress: 0, fileName: '', error: '' } })
  const goSummaryFromUpload = () => navigate('summary', { patientId: S.uploadPatientId || S.patientId })
  const goSessions = () => navigate('sessions')
  const openHelp = () => navigate('help')

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <a onClick={goSessions} className="upl-crumb" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>פגישות</a>
        <span>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>העלאת הקלטה</span>
      </div>
      <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>העלאת הקלטת פגישה</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 15 }}>ההקלטה תתומלל ותנותח אוטומטית. הקובץ יימחק לאחר עיבוד.</p>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>מטופל</label>
            <select aria-label="בחירת מטופל להעלאה" value={uploadPid} onChange={(e) => set({ uploadPatientId: e.target.value })} style={{ width: '100%', height: 44, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, background: 'var(--paper)', outline: 'none', cursor: 'pointer', color: 'var(--text)' }}>
              {S.patients.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>תאריך הפגישה</label>
            <input value="30.06.2026" readOnly aria-label="תאריך הפגישה" dir="ltr" style={{ width: '100%', height: 44, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, background: 'var(--surface-2)', color: 'var(--text-secondary)', outline: 'none', textAlign: 'start' }} />
          </div>
        </div>

        {/* dropzone idle/dragging */}
        {uploadDrop && (<>
          <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} style={{ border: '2px dashed ' + dropBorder, borderRadius: 10, background: dropBg, padding: '46px 20px', textAlign: 'center', transition: 'all .15s' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" width="34" height="34" fill="var(--primary)"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>גררו קובץ לכאן או בחרו מהמחשב</h2>
            <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 14 }}>פורמטים נתמכים: MP3, WAV, M4A · עד 200MB</p>
            <button onClick={pickFile} style={{ height: 44, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>בחירת קובץ</button>
            {S.demoMode && <div style={{ marginTop: 14 }}><a onClick={simulateBad} className="upl-demo-link" style={{ fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>הדגמת שגיאת פורמט</a></div>}
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
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--primary)"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{uploadFileName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{uploadStageCaption} · {uploadProgress}%</div>
              </div>
              <div style={{ width: 22, height: 22, border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .8s linear infinite' }}></div>
            </div>
            <div style={{ height: 8, borderRadius: 6, background: 'var(--primary-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 6, width: uploadProgress + '%', transition: 'width .2s' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 20, flexWrap: 'wrap', gap: '8px 0' }}>
              {uploadStages.map((st) => (
                <div key={st.num} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: st.circleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {st.done && (<svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>)}
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

        {/* success */}
        {uploadDone && (
          <div style={{ border: '1px solid var(--divider)', borderRadius: 10, background: 'var(--paper)', padding: '34px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pop .3s ease' }}>
              <svg viewBox="0 0 24 24" width="36" height="36" fill="var(--success)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>ההקלטה עובדה בהצלחה</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14.5 }}>התמלול והניתוח מוכנים לצפייה.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={goSummaryFromUpload} style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>צפייה בסיכום</button>
              <button onClick={resetUpload} style={{ height: 44, padding: '0 20px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>העלאה נוספת</button>
            </div>
          </div>
        )}

        {/* error */}
        {uploadFailed && (
          <div style={{ border: '1px solid var(--divider)', borderRadius: 10, background: 'var(--paper)', padding: '34px 20px', textAlign: 'center' }}>
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

        {/* privacy assurance (visible at the moment of uploading sensitive audio) */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--success)"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>ההקלטה שלכם מאובטחת</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 18px' }}>
            {PRIVACY_POINTS.map((pp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--success)" style={{ flexShrink: 0, marginTop: 1 }}><path d={pp.icon} /></svg>
                <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45 }}>{pp.text}</span>
              </div>
            ))}
          </div>
          <a onClick={openHelp} className="upl-policy-link" style={{ display: 'inline-block', marginTop: 13, fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}>מדיניות הפרטיות והאבטחה המלאה ›</a>
        </div>
      </div>
    </div>
  )
}
