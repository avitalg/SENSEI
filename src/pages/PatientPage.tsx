// Patient detail — profile, tags, progress trend, clinical notes, goals, sessions.
// Ported from 'Sensei demo.dc.html' template lines 651–815 + renderVals (v.isPatient).
import { useApp } from '../store/AppStore'
import { getPatient, avatarColors, riskMeta, hg } from '../utils'
import './patient.css'
import { buildSessions } from '../data/sessions'
import { CARD_SHADOW } from '../utils/styles'
import DraftRecoveryBanner from '../components/shared/DraftRecoveryBanner'



const tagMeta = (tag: string) => ({ label: tag, color: 'var(--primary)', bg: 'var(--primary-tint)', border: 'var(--primary-border)' })
const defaultGoals = () => [
  { id: 'g1', text: 'הפחתת תדירות התקפי החרדה', pct: 65 },
  { id: 'g2', text: 'שימוש עצמאי בכלי ויסות', pct: 80 },
  { id: 'g3', text: 'שיפור איכות השינה', pct: 40 },
]

// today's baseline appointments (for the "next appointment" chip) — ported.
const APPTS = [
  { time: '09:00', pid: 'p1', type: 'פגישה שבועית', dur: 50, status: 'done' },
  { time: '10:30', pid: 'p3', type: 'פגישת מעקב', dur: 50, status: 'now' },
  { time: '13:00', pid: 'p2', type: 'פגישה שבועית', dur: 50, status: 'upcoming' },
  { time: '16:00', pid: 'p5', type: 'פגישת מעקב', dur: 50, status: 'upcoming' },
]
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

export default function PatientPage() {
  const { S, set, navigate, toast } = useApp()

  const cp = getPatient(S.patients, S.patientId)
  const cpa = avatarColors(cp.color)
  const cprm = riskMeta(cp.risk)

  // ---- next appointment (patient context) ----
  const allAppts = [...APPTS, ...S.scheduledAppts].sort((a: any, b: any) => toMin(a.time) - toMin(b.time))
  const cpNext = allAppts.filter((a: any) => a.pid === cp.id && a.status !== 'done').sort((a: any, b: any) => toMin(a.time) - toMin(b.time))[0]
  const cpNextLabel = cpNext ? ('הפגישה הבאה · היום ' + cpNext.time + ' · ' + cpNext.type) : ''

  // ---- clinical notes ----
  const defaultNotes = (pp: any) => hg('[[מטופל|מטופלת]] בטיפול מאז ' + pp.since + '. [[מציג|מציגה]] מוטיבציה גבוהה ושיתוף פעולה. נדרשת תשומת לב לנושא ' + pp.focus + '. הומלץ על המשך מעקב שבועי ועבודה על כלי ויסות.', pp.gender)
  const cpNotes = S.notesOverrides[cp.id] !== undefined ? S.notesOverrides[cp.id] : defaultNotes(cp)

  // ---- tags ----
  const allTagsList = [...new Set(Object.values(S.patientTags as Record<string, string[]>).flat())].sort()
  const getPatientTags = (id: string) => (S.patientTags[id] || []).map((t: string) => tagMeta(t))
  const removeTag = (t: string) => () => set({ patientTags: { ...S.patientTags, [cp.id]: (S.patientTags[cp.id] || []).filter((x: string) => x !== t) } })
  const cpTagsRemovable = getPatientTags(cp.id).map((tm: any) => ({ ...tm, onRemove: removeTag(tm.label) }))
  const availableTags = allTagsList
    .filter((t) => !(S.patientTags[cp.id] || []).includes(t))
    .map((t) => ({ ...tagMeta(t as string), onAdd: () => { const cur = S.patientTags[cp.id] || []; set({ patientTags: { ...S.patientTags, [cp.id]: [...cur, t] } }) } }))

  // ---- goals ----
  const getGoals = (pid: string) => S.goals[pid] || defaultGoals()
  const adjustGoal = (pid: string, gid: string, delta: number) => {
    const before = getGoals(pid).find((g: any) => g.id === gid)
    const cur = getGoals(pid).map((g: any) => g.id === gid ? { ...g, pct: Math.max(0, Math.min(100, g.pct + delta)) } : g)
    set({ goals: { ...S.goals, [pid]: cur } })
    const after = cur.find((g: any) => g.id === gid)
    // Reaching a treatment goal is a real clinical milestone — acknowledge it
    // once, on the crossing, with a calm professional note (no points, no
    // pressure, no childish celebration). Purely positive feedback on real data.
    if (before && after && before.pct < 100 && after.pct >= 100) {
      toast('מטרת טיפול הושלמה · צעד משמעותי בתהליך הטיפולי')
    }
  }
  const cpGoals = getGoals(cp.id).map((g: any) => {
    const color = g.pct >= 70 ? 'var(--success)' : g.pct >= 40 ? 'var(--primary)' : 'var(--warning)'
    return {
      id: g.id, text: g.text, pct: g.pct, color, pctW: g.pct + '%', done: g.pct >= 100,
      onInc: () => adjustGoal(cp.id, g.id, 10), onDec: () => adjustGoal(cp.id, g.id, -10),
      onDelete: () => {
        const prev = getGoals(cp.id); const gs = prev.filter((x: any) => x.id !== g.id)
        set({ goals: { ...S.goals, [cp.id]: gs } })
        toast('המטרה נמחקה', 'success', { label: 'ביטול', onClick: () => set((s: any) => ({ goals: { ...s.goals, [cp.id]: prev } })) })
      },
    }
  })
  const openAddGoal = () => set({ dialog: 'goal', goalForm: { text: '', pct: 50 } })

  // ---- info card ----
  const cpInfo = [
    { k: 'גיל', v: cp.age, dir: 'auto' as const }, { k: 'נושא טיפול', v: cp.focus, dir: 'auto' as const },
    { k: hg('[[מטופל|מטופלת]] מאז', cp.gender), v: cp.since, dir: 'ltr' as const }, { k: 'סך פגישות', v: cp.sessions, dir: 'auto' as const },
    { k: 'טלפון', v: cp.phone, dir: 'ltr' as const }, { k: 'דוא״ל', v: cp.email, dir: 'ltr' as const },
  ]
  const cpIndicators = cp.risk === 'high'
    ? [{ color: 'var(--error)', text: 'עלייה בביטויי מצוקה רגשית בפגישה האחרונה' }, { color: 'var(--warning-strong)', text: 'דיווח על הפרעות שינה מתמשכות' }, { color: 'var(--warning-strong)', text: 'הימנעות חברתית גוברת' }]
    : cp.risk === 'medium'
      ? [{ color: 'var(--warning)', text: 'תנודתיות במצב הרוח לאורך התקופה' }, { color: 'var(--success)', text: 'שיתוף פעולה טוב עם משימות הטיפול' }]
      : [{ color: 'var(--success)', text: 'מגמת שיפור יציבה' }, { color: 'var(--success)', text: 'שימוש עצמאי בכלים שנלמדו' }]

  // ---- sessions (with session-note + expand state) ----
  const baseSessions = buildSessions(cp, S, { navigate, set })
  const cpSessions = baseSessions.map((s: any, idx: number) => {
    const key = cp.id + '_' + s.num
    const note = S.sessionNotes[key] || ''
    const editing = S.editingSessionNote === key
    const eKey = cp.id + '-' + s.num
    const exp = S.expandedSess[eKey]
    const expanded = exp === undefined ? idx === 0 : exp
    return {
      ...s, sessionNote: note, hasNote: !!note, editingNote: editing,
      noteDraft: S.sessionNoteDraft,
      expanded, chevTransform: expanded ? 'rotate(180deg)' : 'none',
      onToggle: () => set({ expandedSess: { ...S.expandedSess, [eKey]: !expanded } }),
      onEditNote: (e?: any) => { if (e) e.stopPropagation(); set({ editingSessionNote: key, sessionNoteDraft: note }) },
      onNoteDraft: (e: any) => set({ sessionNoteDraft: e.target.value }),
      onSaveNote: (e?: any) => { if (e) e.stopPropagation(); set({ sessionNotes: { ...S.sessionNotes, [key]: S.sessionNoteDraft }, editingSessionNote: null }); toast('ההערה נשמרה') },
      onCancelNote: (e?: any) => { if (e) e.stopPropagation(); set({ editingSessionNote: null }) },
    }
  })

  // ---- progress trend bars ----
  const riskScore = (lvl: string) => lvl === 'high' ? 95 : lvl === 'medium' ? 60 : lvl === 'none' ? 18 : 32
  const trendSrc = baseSessions.slice().reverse()
  const progressBars = trendSrc.map((s: any) => {
    const lvl = s.riskChips.length ? (s.topRiskLabel === 'סיכון גבוה' ? 'high' : s.topRiskLabel === 'סיכון בינוני' ? 'medium' : 'low') : 'none'
    const sc = riskScore(lvl)
    return { h: sc + '%', color: s.riskChips.length ? s.topRiskColor : 'var(--success)', num: s.num }
  })
  const progressTrendLabel = cp.risk === 'high' ? 'נדרשת תשומת לב. רמת הסיכון עלתה לאחרונה' : cp.risk === 'medium' ? 'מגמה יציבה עם תנודתיות מתונה' : 'מגמת שיפור עקבית לאורך זמן'
  const progressTrendColor = cp.risk === 'high' ? 'var(--error)' : cp.risk === 'medium' ? 'var(--warning)' : 'var(--success)'

  // ---- notes editing handlers ----
  // Work recovery: in-progress clinical-notes edits are auto-captured per patient
  // (S.notesDrafts[id], persisted), so an interruption mid-edit — a notification,
  // the command palette, any navigation — never silently loses clinical text.
  // Mirrors the summary-editor recovery; the draft lives until save/cancel/discard.
  const clearNotesDraft = (extra: Record<string, any> = {}) => {
    const d = { ...S.notesDrafts }; delete d[cp.id]
    set({ notesDrafts: d, ...extra })
  }
  const startEditNotes = () => set({ editingNotes: true, notesDraft: cpNotes })
  const onNotesDraft = (e: any) => set({ notesDraft: e.target.value, notesDrafts: { ...S.notesDrafts, [cp.id]: e.target.value } })
  const saveNotes = () => { const d = { ...S.notesDrafts }; delete d[cp.id]; set({ notesOverrides: { ...S.notesOverrides, [cp.id]: S.notesDraft }, editingNotes: false, notesDrafts: d }); toast('ההערות הקליניות נשמרו') }
  const cancelNotes = () => clearNotesDraft({ editingNotes: false })
  // A recoverable draft exists only when it differs from the saved notes and we
  // are not already editing (i.e. it was left behind by an interruption).
  const recoveredNotes = S.notesDrafts[cp.id]
  const hasRecoverableNotes = !S.editingNotes && recoveredNotes != null && recoveredNotes.trim() !== '' && recoveredNotes !== cpNotes
  const resumeNotesDraft = () => set({ editingNotes: true, notesDraft: recoveredNotes })
  const discardNotesDraft = () => { clearNotesDraft(); toast('הטיוטה נמחקה', 'info') }

  // ---- quick actions ----
  const openUploadScreen = () => set({ route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } })
  const scheduleForPatient = () => set({ dialog: 'schedule', apptForm: { pid: cp.id, time: '11:00', dur: '50', type: 'פגישה שבועית' }, errors: {} })
  const goReportFromPatient = () => navigate('report', { patientId: cp.id })
  const goCalendarFromPatient = () => navigate('calendar')
  const goTimeline = () => navigate('timeline', { patientId: S.patientId })
  const goPatients = () => navigate('patients')

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
          {/* header card */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '24px 26px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 74, height: 74, borderRadius: '50%', background: cpa.bg, color: cpa.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26 }}>{cp.initials}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{cp.name}</h1>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: cprm.bg, color: cprm.color }}>{cprm.label}</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>{hg('[[בן|בת]] ', cp.gender) + cp.age} · {cp.focus}</p>
              <div style={{ marginTop: 9 }}>
                {cpNext ? (
                  <a onClick={goCalendarFromPatient} role="button" tabIndex={0} className="pd-next" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: 'var(--primary-surface)', border: '1px solid var(--primary-border)', color: 'var(--primary)', cursor: 'pointer' }}>
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={openUploadScreen} className="pd-primary-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--paper)"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>העלאת הקלטה
              </button>
              <button onClick={scheduleForPatient} className="pd-ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7zm4-7h2v2h-2z" /></svg>קביעת פגישה
              </button>
              <button onClick={goReportFromPatient} className="pd-ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>דוח הכנה</button>
            </div>
          </div>

          <div className="rx-side" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
            {/* left: info + notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* patient info + tags */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>פרטי מטופל</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {cpInfo.map((i) => (
                    <div key={i.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{i.k}</span>
                      <span dir={i.dir} style={{ fontWeight: 600, color: 'var(--text)' }}>{i.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)' }}>תגיות</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {cpTagsRemovable.map((tg: any) => (
                      <span key={tg.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: tg.bg, color: tg.color, border: '1px solid ' + tg.border }}>
                        {tg.label}
                        <svg onClick={tg.onRemove} role="button" tabIndex={0} aria-label={'הסרת תגית ' + tg.label} viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style={{ cursor: 'pointer', opacity: 0.7 }}><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                      </span>
                    ))}
                    {availableTags.map((at: any) => (
                      <span key={at.label} onClick={at.onAdd} role="button" tabIndex={0} className="pd-tag-add" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px dashed var(--divider)', cursor: 'pointer' }}>+ {at.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* progress trend */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>מגמת התקדמות</h2>
                <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-muted)' }}>רמת סיכון מוערכת לאורך הפגישות האחרונות</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 96, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
                  {progressBars.map((b: any, i: number) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 5 }}>
                      <div title={'פגישה ' + b.num} style={{ width: '100%', maxWidth: 22, height: b.h, minHeight: 6, borderRadius: '5px 5px 0 0', background: b.color }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--text-muted)' }}>
                  <span>מוקדם</span><span>אחרון</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 13, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: progressTrendColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{progressTrendLabel}</span>
                </div>
              </div>

              {/* clinical indicators */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--error)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>אינדיקטורים קליניים</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {cpIndicators.map((ind, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--text-2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ind.color, flexShrink: 0 }} />{ind.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* clinical notes */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>הערות קליניות</h2>
                  {S.editingNotes ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveNotes} style={{ height: 30, padding: '0 12px', border: 'none', borderRadius: 7, background: 'var(--primary)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>שמירה</button>
                      <button onClick={cancelNotes} style={{ height: 30, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 7, background: 'var(--paper)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
                    </div>
                  ) : (
                    <svg onClick={startEditNotes} viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)" style={{ cursor: 'pointer' }} role="button" tabIndex={0} aria-label="עריכת הערות קליניות"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
                  )}
                </div>
                {hasRecoverableNotes && (
                  <DraftRecoveryBanner onResume={resumeNotesDraft} onDiscard={discardNotesDraft} />
                )}
                {S.editingNotes ? (
                  <textarea onChange={onNotesDraft} value={S.notesDraft} aria-label="הערות קליניות" className="pd-notes-ta" style={{ width: '100%', minHeight: 110, border: '1.5px solid var(--primary-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.7, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text)' }} />
                ) : (
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>{cpNotes}</p>
                )}
              </div>

              {/* treatment goals */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>מטרות טיפול</h2>
                  <button onClick={openAddGoal} aria-label="הוספת מטרה" className="pd-goal-add" style={{ width: 28, height: 28, border: 'none', borderRadius: 7, background: 'var(--primary-tint)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="var(--primary)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cpGoals.map((g: any) => (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.text}</span>
                          {g.done && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--success)', background: 'var(--success-bg)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                              הושלמה
                            </span>
                          )}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <button onClick={g.onDec} aria-label="הפחתה" style={{ width: 24, height: 24, border: '1px solid var(--divider)', borderRadius: 5, background: 'var(--paper)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>−</button>
                          <span style={{ fontSize: 13, fontWeight: 700, color: g.color, minWidth: 34, textAlign: 'center' }}>{g.pct}%</span>
                          <button onClick={g.onInc} aria-label="הגדלה" style={{ width: 24, height: 24, border: '1px solid var(--divider)', borderRadius: 5, background: 'var(--paper)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>+</button>
                          <button onClick={g.onDelete} aria-label="מחיקת מטרה" className="pd-goal-del" style={{ width: 24, height: 24, border: 'none', borderRadius: 5, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="var(--text-muted)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ height: 7, borderRadius: 5, background: 'var(--surface-2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 5, background: g.color, width: g.pctW, transition: 'width .3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* right: sessions */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--bg)' }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>פגישות</h2>
                <a onClick={goTimeline} role="button" tabIndex={0} style={{ fontSize: 13.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>ציר הזמן ›</a>
              </div>
              {cpSessions.map((s: any) => (
                <div key={s.num} style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)' }}>
                  <div onClick={s.onToggle} role="button" tabIndex={0} aria-expanded={s.expanded} className="pd-sess-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.num}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14.5 }}>פגישה {s.num}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}><span dir="ltr">{s.date}</span> · {s.duration}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.riskChips.map((rc: any) => (
                        <span key={rc.label} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: rc.bg, color: rc.color }}>{rc.label}</span>
                      ))}
                      {s.hasNote && (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--text-muted)" aria-label="קיימת הערה" style={{ flexShrink: 0 }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
                      )}
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ flexShrink: 0, transition: 'transform .2s', transform: s.chevTransform }}><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg>
                    </div>
                  </div>

                  {s.expanded && (
                    <div style={{ marginTop: 11 }}>
                      <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{s.summary}</p>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                        {s.topics.map((t: string) => (
                          <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, background: 'var(--surface-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={s.onTranscript} className="pd-sess-act" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>תמלול</button>
                        <button onClick={s.onSummary} className="pd-sess-act" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>סיכום AI</button>
                        <button onClick={s.onEditNote} aria-label="הוספת הערה לפגישה" className="pd-sess-act" style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 11px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>הערה
                        </button>
                        <button onClick={s.onDelete} aria-label="מחיקת פגישה" className="pd-sess-del" style={{ width: 34, height: 34, border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginInlineStart: 'auto' }}>
                          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="var(--error)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                        </button>
                      </div>

                      {s.editingNote && (
                        <div style={{ marginTop: 10 }}>
                          <textarea onChange={s.onNoteDraft} value={s.noteDraft} aria-label="הערת פגישה" placeholder="הוסיפו הערה על פגישה זו…" className="pd-note-ta" style={{ width: '100%', minHeight: 70, border: '1.5px solid var(--primary-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text)' }} />
                          <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
                            <button onClick={s.onSaveNote} style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 8, background: 'var(--primary)', color: 'var(--paper)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>שמירה</button>
                            <button onClick={s.onCancelNote} style={{ height: 32, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
                          </div>
                        </div>
                      )}

                      {s.hasNote && !s.editingNote && (
                        <div onClick={s.onEditNote} className="pd-note-view" style={{ marginTop: 9, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--text-muted)" style={{ flexShrink: 0, marginTop: 3 }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
                          <span style={{ flex: 1, lineHeight: 1.55 }}>{s.sessionNote}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
