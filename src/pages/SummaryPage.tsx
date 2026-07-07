// Summary — ported from 'Sensei demo.dc.html'
// (template lines 984–1076 · logic: renderVals isSummary slice ~3336, ~3987–4015).
import { useApp } from '../store/AppStore'
import { CARD_SHADOW } from '../utils/styles'
import DraftRecoveryBanner from '../components/shared/DraftRecoveryBanner'
import { getPatient, hg } from '../utils'
import './summary.css'
import { onKeyActivate } from '../utils/a11y'

export default function SummaryPage() {
  const { S, set, navigate, toast } = useApp()

  const cp = getPatient(S.patients, S.patientId)

  const goPatientFromSub = () => navigate('patient', { patientId: S.patientId })
  const goTranscriptFromSub = () => navigate('transcript', { patientId: S.patientId })
  const goLetter = () => navigate('letter', { patientId: S.patientId })

  // ---- human-in-the-loop review status ----
  const sumApprovedOn = S.summaryApproved[cp.id]
  const summaryApproved = !!sumApprovedOn
  const summaryUnreviewed = !sumApprovedOn
  const summaryApprovedDate = sumApprovedOn || ''
  const approveSummary = () => { set({ summaryApproved: { ...S.summaryApproved, [cp.id]: '30.06.2026' } }); toast('הסיכום אושר ונחתם על ידיכם') }
  const revokeSummary = () => { const m = { ...S.summaryApproved }; delete m[cp.id]; set({ summaryApproved: m }); toast('אישור הסיכום בוטל') }

  const aiSummary = 'הפגישה התמקדה בהתמודדות עם חרדת ביצוע סביב אירוע משמעותי בעבודה. ' + cp.name.split(' ')[0] + hg(' [[תיאר|תיארה]] קושי בשינה בימים שקדמו לאירוע, לצד מחשבות קטסטרופליות לגבי כישלון אפשרי. במהלך הפגישה זוהתה התקדמות חשובה: שימוש עצמאי ומוצלח בטכניקת הנשימה הסרעפתית שנלמדה, שהוביל לתחושת מסוגלות וגאווה. עם זאת, עלה חשש מצבי עתידי. הומלץ על המשך חיזוק חוויות ההצלחה והרחבת החשיפה ההדרגתית.', cp.gender)
  const sumEdited = S.summaryEdits[cp.id]
  const summaryText = sumEdited != null ? sumEdited : aiSummary
  const summaryEdited = sumEdited != null
  const editingSummary = S.editingSummary
  const notEditingSummary = !S.editingSummary
  const summaryEditedByLabel = hg('נערך על ידי [[המטפל|המטפלת]]', S.profile.gender)

  // Work recovery: an in-progress edit is auto-captured per patient
  // (S.summaryDrafts[id], persisted), so an interruption mid-edit — a
  // notification, the command palette, any nav — never silently loses the
  // therapist's clinical wording. The draft lives until the edit is saved,
  // cancelled, or explicitly discarded from the recovery banner.
  const clearDraft = (extra: Record<string, any> = {}) => {
    const d = { ...S.summaryDrafts }; delete d[cp.id]
    set({ summaryDrafts: d, ...extra })
  }
  const onSummaryDraft = (e: any) => set({ summaryDraft: e.target.value, summaryDrafts: { ...S.summaryDrafts, [cp.id]: e.target.value } })
  const startEditSummary = () => set({ editingSummary: true, summaryDraft: summaryText })
  const cancelEditSummary = () => clearDraft({ editingSummary: false })
  const saveSummary = () => {
    const txt = (S.summaryDraft || '').trim(); if (!txt) return
    const wasApproved = !!S.summaryApproved[cp.id]
    const appr = { ...S.summaryApproved }; delete appr[cp.id]
    const d = { ...S.summaryDrafts }; delete d[cp.id]
    set({ summaryEdits: { ...S.summaryEdits, [cp.id]: txt }, editingSummary: false, summaryApproved: appr, summaryDrafts: d })
    toast(wasApproved ? 'הסיכום עודכן · נדרש אישור מחדש' : 'הסיכום עודכן ונשמר')
  }
  const restoreAISummary = () => {
    const m = { ...S.summaryEdits }; delete m[cp.id]
    const d = { ...S.summaryDrafts }; delete d[cp.id]
    set({ summaryEdits: m, editingSummary: false, summaryDrafts: d }); toast('שוחזרה גרסת ה-AI המקורית')
  }
  // A recoverable draft exists only when it differs from the saved text and we
  // are not already editing (i.e. it was left behind by an interruption).
  const recoveredDraft = S.summaryDrafts[cp.id]
  const hasRecoverableDraft = notEditingSummary && recoveredDraft != null && recoveredDraft.trim() !== '' && recoveredDraft !== summaryText
  const resumeDraft = () => set({ editingSummary: true, summaryDraft: recoveredDraft })
  const discardDraft = () => { clearDraft(); toast('הטיוטה נמחקה', 'info') }

  const mainTopics = ['חרדת ביצוע במצבים חברתיים-מקצועיים', 'הפרעות שינה סביב אירועים מלחיצים', 'שימוש מוצלח בכלי ויסות עצמי', 'תחושת מסוגלות וגאווה לאחר התמודדות']
  const patterns = ['מחשבות קטסטרופליות לפני אירועים מאתגרים', 'ספירלת חרדה גופנית-מחשבתית מתעצמת', 'נטייה לצפות מראש לכישלון למרות הצלחות']
  const riskFlags = cp.risk === 'high'
    ? [{ level: 'גבוה', color: 'var(--error)', bg: 'var(--error-bg)', text: 'ביטויים של מצוקה רגשית עמוקה והימנעות גוברת. מומלץ מעקב צמוד.' }, { level: 'בינוני', color: 'var(--warning)', bg: 'var(--warning-bg)', text: 'הפרעות שינה מתמשכות המשפיעות על התפקוד היומיומי.' }]
    : [{ level: 'נמוך', color: 'var(--success)', bg: 'var(--success-bg)', text: 'לחץ נקודתי סביב אירוע ספציפי, ללא סימני מצוקה כללית. מגמה חיובית.' }, { level: 'לתשומת לב', color: 'var(--warning)', bg: 'var(--warning-bg)', text: 'חשש מצבי עתידי שעשוי להזין דפוסי הימנעות. כדאי להמשיך לעקוב.' }]

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <a onClick={goPatientFromSub} role="button" tabIndex={0} onKeyDown={onKeyActivate(goPatientFromSub)} className="sum-crumb" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>{cp.name}</a>
        <span>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>סיכום AI</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,var(--primary),var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--paper)"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>
            </div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-.5px' }}>סיכום פגישה</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>{cp.name} · 22.06.2026 · נוצר אוטומטית לאחר ניקוי PII</p>
        </div>
        <button onClick={goTranscriptFromSub} className="sum-outline-btn" style={{ height: 42, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>צפייה בתמלול</button>
        <button onClick={goLetter} className="sum-outline-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" /></svg>מכתב קליני
        </button>
      </div>

      {S.loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 26 }}>
          <div className="skeleton" style={{ width: '40%', height: 16, borderRadius: 6, background: 'linear-gradient(90deg,var(--skeleton-1) 25%,var(--skeleton-2) 37%,var(--skeleton-1) 63%)', backgroundSize: '760px 100%', animation: 'shimmer 1.4s infinite linear', marginBottom: 16 }}></div>
          <div className="skeleton" style={{ width: '100%', height: 12, borderRadius: 6, background: 'linear-gradient(90deg,var(--skeleton-1) 25%,var(--skeleton-2) 37%,var(--skeleton-1) 63%)', backgroundSize: '760px 100%', animation: 'shimmer 1.4s infinite linear', marginBottom: 9 }}></div>
          <div className="skeleton" style={{ width: '85%', height: 12, borderRadius: 6, background: 'linear-gradient(90deg,var(--skeleton-1) 25%,var(--skeleton-2) 37%,var(--skeleton-1) 63%)', backgroundSize: '760px 100%', animation: 'shimmer 1.4s infinite linear' }}></div>
        </div>
      )}

      {!S.loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* review status (human-in-the-loop) */}
          {summaryUnreviewed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '14px 18px', flexWrap: 'wrap' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--warning-strong)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>סיכום זה נוצר על ידי AI וטרם נבדק</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--warning-strong)', background: 'var(--warning-bg)', borderRadius: 5, padding: '2px 7px' }}>אזהרה</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>בחרו כיצד להמשיך: אישור התוכן כפי שהוא, או עריכה לפני האישור.</div>
              </div>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <button onClick={startEditSummary} className="sum-outline-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 15px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>עריכה לפני אישור
                </button>
                <button onClick={approveSummary} className="sum-approve-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', border: '1px solid var(--success)', borderRadius: 10, background: 'transparent', color: 'var(--success)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>אישור כפי שהוא
                </button>
              </div>
            </div>
          )}
          {summaryApproved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '14px 18px', flexWrap: 'wrap' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--success)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>הסיכום אושר על ידי ד״ר רותם שגב</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--success)', background: 'var(--success-bg)', borderRadius: 5, padding: '2px 7px' }}>הצלחה</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>נבדק ואומת בתאריך <span dir="ltr">{summaryApprovedDate}</span>.</div>
              </div>
              <a onClick={revokeSummary} onKeyDown={onKeyActivate(revokeSummary)} role="button" tabIndex={0} className="sum-revoke" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>ביטול אישור</a>
            </div>
          )}

          {/* summary (editable — human-in-the-loop correction) */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2z" /></svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>תקציר</h2>
              {summaryEdited && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--secondary-bg)', color: 'var(--secondary-strong)' }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>{summaryEditedByLabel}
                </span>
              )}
              {notEditingSummary && (
                <button onClick={startEditSummary} className="sum-outline-btn" style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>עריכה
                </button>
              )}
            </div>
            {hasRecoverableDraft && (
              <DraftRecoveryBanner onResume={resumeDraft} onDiscard={discardDraft} />
            )}
            {notEditingSummary && (
              <>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: 'var(--text)' }}>{summaryText}</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }}><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>מבוסס אך ורק על התמלול של פגישה זו. כלי עזר לתיעוד. אינו מהווה אבחון או המלצה קלינית, והאחריות המקצועית נותרת בידיכם.</span>
                </div>
                {summaryEdited && (
                  <a onClick={restoreAISummary} onKeyDown={onKeyActivate(restoreAISummary)} role="button" tabIndex={0} className="sum-restore" style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>↺ שחזור לגרסת ה-AI המקורית</a>
                )}
              </>
            )}
            {editingSummary && (
              <div>
                <textarea value={S.summaryDraft} onChange={onSummaryDraft} aria-label="עריכת תקציר הסיכום" style={{ width: '100%', minHeight: 150, border: '1.5px solid var(--primary)', borderRadius: 10, padding: '12px 14px', fontSize: 15, lineHeight: 1.75, color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}></textarea>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <button onClick={saveSummary} className="sum-primary-btn" style={{ height: 40, padding: '0 20px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>שמירת השינויים</button>
                  <button onClick={cancelEditSummary} style={{ height: 40, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>עריכת התוכן תדרוש אישור מחדש של הסיכום</span>
                </div>
              </div>
            )}
          </div>

          <div className="sum-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* topics */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--secondary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--secondary-strong)"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>נושאים מרכזיים</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {mainTopics.map((t) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: 'var(--text)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--secondary-strong)', flexShrink: 0 }}></span>{t}
                  </div>
                ))}
              </div>
            </div>
            {/* patterns */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--info)"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" /></svg>
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>דפוסים חוזרים</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {patterns.map((p) => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: 'var(--text)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--info)', flexShrink: 0 }}></span>{p}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* risk flags */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '18px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--divider)' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--error)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>דגלי סיכון</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginInlineStart: 4 }}>(אינדיקטור בלבד. אינו מהווה אבחנה רפואית)</span>
            </div>
            <div style={{ padding: '8px 24px 18px' }}>
              {riskFlags.map((rf, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--divider)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: rf.bg, color: rf.color, whiteSpace: 'nowrap', marginTop: 2 }}>{rf.level}</span>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--text)' }}>{rf.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
