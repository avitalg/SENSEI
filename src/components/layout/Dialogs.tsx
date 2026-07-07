// Global overlays: keyboard-shortcuts reference + all action dialogs
// (patient create/edit, delete patient, delete session, wipe data, merge
// duplicates, add goal, schedule appointment). Ported from the prototype
// overlays template + its dialog view-model handlers. Enter-to-submit is
// wired here (the store's Escape cascade closes overlays globally).
import React, { useEffect, useRef } from 'react'
import { useApp } from '../../store/AppStore'
import { AVATAR_PALETTE, avatarColors, riskMeta, getPatient, hg } from '../../utils'
import { buildDupClusters } from '../../utils/dedup'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { labelStyle, scrimStyle } from '../../utils/styles'
import { SHORTCUTS } from '../../data/shortcuts'
import { onKeyActivate } from '../../utils/a11y'


// ---- deterministic duplicate detection (ported from buildDupClusters) ----

const CLOSE_X = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
const btnCancel: React.CSSProperties = { height: 44, padding: '0 20px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { height: 44, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { height: 44, padding: '0 22px', border: '1px solid var(--error)', borderRadius: 10, background: 'transparent', color: 'var(--error-dark)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }

// -------- keyboard shortcuts dialog --------
function ShortcutsDialog() {
  const { S, set } = useApp()
  const trapRef = useFocusTrap<HTMLDivElement>(S.shortcutsOpen)
  if (!S.shortcutsOpen) return null
  const close = () => set({ shortcutsOpen: false })
  return (
    <>
      <div onClick={close} style={{ ...scrimStyle, zIndex: 180 }} />
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="קיצורי מקלדת" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, maxWidth: 'calc(100vw - 32px)', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 16, boxShadow: '0 24px 70px rgba(8,20,50,.32)', zIndex: 181, overflow: 'hidden', animation: 'pop .16s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 24 24" width="21" height="21" fill="var(--primary)"><path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" /></svg>
            <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700 }}>קיצורי מקלדת</h3>
          </div>
          <svg onClick={close} className="shell-close-x" role="button" tabIndex={0} aria-label="סגירה" viewBox="0 0 24 24" width="20" height="20" fill="var(--text-muted)" style={{ cursor: 'pointer' }}><path d={CLOSE_X} /></svg>
        </div>
        <div style={{ padding: '10px 22px 20px', display: 'flex', flexDirection: 'column' }}>
          {SHORTCUTS.map((s) => (
            <div key={s.d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{s.d}</span>
              <kbd dir="ltr" style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, background: 'var(--surface-2)', border: '1px solid var(--divider)', borderBottomWidth: 2, borderRadius: 7, padding: '4px 9px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{s.k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// -------- action dialogs (S.dialog) --------
function ActionDialog() {
  const { S, set, navigate, toast } = useApp()
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>(!!S.dialog)

  const isForm = S.dialog === 'create' || S.dialog === 'edit'
  const isDelete = S.dialog === 'delete'
  const isDelSession = S.dialog === 'delSession'
  const isWipe = S.dialog === 'wipe'
  const isMerge = S.dialog === 'merge'
  const isGoal = S.dialog === 'goal'
  const isSchedule = S.dialog === 'schedule'

  useEffect(() => {
    if (S.dialog && firstFieldRef.current) firstFieldRef.current.focus()
  }, [S.dialog])

  if (!S.dialog) return null

  const closeDialog = () => set({ dialog: null, errors: {}, dupWarnId: null })
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  // ---- Enter-to-submit (mirrors the prototype's global keydown for open dialogs) ----
  const onDialogKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    const tag = (e.target as any)?.tagName
    if (tag === 'TEXTAREA' || tag === 'SELECT') return
    if (isForm) { e.preventDefault(); submitPatient() }
    else if (isSchedule) { e.preventDefault(); submitAppt() }
    else if (isGoal) { e.preventDefault(); submitGoal() }
  }

  // ===== patient create/edit form =====
  const form = S.form || {}
  const errors = S.errors || {}
  const dialogTitle = S.dialog === 'edit' ? 'עריכת מטופל' : 'מטופל חדש'
  const dialogSubmitLabel = S.dialog === 'edit' ? 'שמירת שינויים' : (S.dupWarnId ? 'צרו בכל זאת' : 'יצירת מטופל')
  const nameBorder = errors.name ? 'var(--error)' : 'var(--border-input)'
  const ageBorder = errors.age ? 'var(--error)' : 'var(--border-input)'
  const genderOpts = ['נקבה', 'זכר', 'אחר'].map((g) => ({
    label: g, on: form.gender === g,
    bg: form.gender === g ? 'var(--primary)' : 'var(--paper)', color: form.gender === g ? 'var(--paper)' : 'var(--text-2)',
    weight: form.gender === g ? 700 : 600, onClick: () => set({ form: { ...S.form, gender: g } }),
  }))
  const focusSuggestions = ['חרדה', 'דיכאון', 'PTSD', 'יחסים', 'אבל ואובדן', 'הפרעת אכילה', 'התמכרות', 'OCD'].map((t) => ({
    label: t, on: form.focus === t,
    bg: form.focus === t ? 'var(--primary-tint)' : 'var(--surface-2)', color: form.focus === t ? 'var(--primary)' : 'var(--text-secondary)',
    border: form.focus === t ? 'var(--primary-border)' : 'var(--divider)', onClick: () => set({ form: { ...S.form, focus: t } }),
  }))
  const notesOpen = S.notesExpanded || !!(form.notes && form.notes.trim())

  const submitPatient = () => {
    const errs: any = {}
    if (!(form.name || '').trim()) errs.name = 'יש להזין שם מלא'
    if (!(form.age || '').trim()) errs.age = 'יש להזין גיל'
    else if (isNaN(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 120) errs.age = 'יש להזין גיל בין 1 ל-120'
    if (Object.keys(errs).length) {
      set({ errors: errs, dupWarnId: null })
      setTimeout(() => { const f = errs.name ? 'name' : 'age'; const el = document.querySelector<HTMLElement>('[data-field="' + f + '"]'); if (el) el.focus() }, 0)
      return
    }
    if (S.dialog === 'edit') {
      const pts = S.patients.map((p: any) => p.id === S.dialogPatientId ? { ...p, name: form.name, age: Number(form.age), gender: form.gender === 'נקבה' ? 'נ' : 'ז', focus: form.focus || p.focus } : p)
      set({ patients: pts, dialog: null, errors: {}, dupWarnId: null }); toast('הפרטים עודכנו')
    } else {
      const normName = (s: string) => (s || '').trim().replace(/\s+/g, ' ')
      const dupe = S.patients.find((p: any) => normName(p.name) === normName(form.name))
      if (dupe && S.dupWarnId !== dupe.id) { set({ errors: {}, dupWarnId: dupe.id }); return }
      const colors = AVATAR_PALETTE
      const nm = form.name.trim()
      const init = nm.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
      const np = { id: 'p' + Date.now(), name: nm, age: Number(form.age), gender: form.gender === 'נקבה' ? 'נ' : 'ז', focus: form.focus || 'הערכה ראשונית', risk: 'none', sessions: 0, lastSession: '—', phone: '—', email: '—', since: '06.2026', initials: init, color: colors[S.patients.length % colors.length] }
      set({ patients: [np, ...S.patients], dialog: null, errors: {}, dupWarnId: null, demoEmpty: false })
      toast(hg('[[המטופל נוצר|המטופלת נוצרה|הרשומה נוצרה]] בהצלחה', form.gender === 'נקבה' ? 'f' : form.gender === 'זכר' ? 'm' : 'u'))
    }
  }
  const dupP = S.dupWarnId ? getPatient(S.patients, S.dupWarnId) : null
  const dupName = dupP ? dupP.name : ''
  const dupMeta = dupP ? ((dupP.gender === 'נ' ? 'נקבה' : 'זכר') + ' · גיל ' + dupP.age + ' · ' + dupP.focus) : ''
  const dupTitle = hg('כבר [[קיים|קיימת]] [[מטופל|מטופלת]] בשם זה', dupP ? dupP.gender : 'u')
  const openDupPatient = () => { const id = S.dupWarnId; set({ dialog: null, dupWarnId: null, errors: {} }); navigate('patient', { patientId: id }) }

  // ===== delete patient =====
  const dp = S.dialogPatientId ? getPatient(S.patients, S.dialogPatientId) : null
  const deleteName = dp ? dp.name : ''
  const confirmDelete = () => {
    const removed = S.patients.find((p: any) => p.id === S.dialogPatientId)
    const idx = S.patients.findIndex((p: any) => p.id === S.dialogPatientId)
    set({ patients: S.patients.filter((p: any) => p.id !== S.dialogPatientId), dialog: null })
    toast('התיק הועבר לארכיון · ניתן לבטל', 'success', removed ? { label: 'ביטול', onClick: () => {
      set((s: any) => { const arr = s.patients.slice(); arr.splice(Math.max(0, idx), 0, removed); return { patients: arr } }); toast('התיק שוחזר בהצלחה')
    } } : null)
  }

  // ===== delete session =====
  const delSessionLabel = S.dialogSessionLabel || ''
  const confirmDelSession = () => {
    const key = S.dialogSessionKey
    set((s: any) => ({ dialog: null, deletedSessions: key ? [...(s.deletedSessions || []), key] : (s.deletedSessions || []) }))
    toast('הפגישה הועברה לסל המיחזור · ניתן לבטל', 'success', key ? { label: 'ביטול', onClick: () => {
      set((s: any) => ({ deletedSessions: (s.deletedSessions || []).filter((k: any) => k !== key) })); toast('הפגישה שוחזרה')
    } } : null)
  }

  // ===== wipe data =====
  const confirmWipe = () => { set({ dialog: null }); toast('בקשת מחיקת כל המידע נשלחה לעיבוד', 'error') }

  // ===== add goal =====
  const goalForm = S.goalForm || { text: '', pct: 50 }
  const submitGoal = () => {
    if (!(goalForm.text || '').trim()) return
    const cp = getPatient(S.patients, S.patientId)
    const defaultGoals = () => [
      { id: 'g1', text: 'הפחתת תדירות התקפי החרדה', pct: 65 },
      { id: 'g2', text: 'שימוש עצמאי בכלי ויסות', pct: 80 },
      { id: 'g3', text: 'שיפור איכות השינה', pct: 40 },
    ]
    const cur = S.goals[cp.id] || defaultGoals()
    const gs = [...cur, { id: 'g' + Date.now(), text: goalForm.text.trim(), pct: goalForm.pct }]
    set({ goals: { ...S.goals, [cp.id]: gs }, dialog: null })
    toast('המטרה נוספה')
  }

  // ===== schedule appointment =====
  const apptForm = S.apptForm || {}
  const apptTimeBorder = errors.apptTime ? 'var(--error)' : 'var(--border-input)'
  const apptPatientOpts = S.patients.map((p: any) => ({ value: p.id, label: p.name }))
  const apptTypeOpts = ['פגישה שבועית', 'פגישת מעקב', 'פגישת אינטייק', 'פגישה דחופה'].map((t) => ({ value: t, label: t }))
  const apptDurOpts = ['30', '45', '50', '60', '90'].map((d) => ({ value: d, label: d + ' דקות' }))
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const addMin = (t: string, m: number) => { const [h, mm] = t.split(':').map(Number); const tot = h * 60 + mm + m; return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0') }
  const BASE_APPTS = [
    { time: '09:00', pid: 'p1', dur: 50 }, { time: '10:30', pid: 'p3', dur: 50 },
    { time: '13:00', pid: 'p2', dur: 50 }, { time: '16:00', pid: 'p5', dur: 50 },
  ]
  const allAppts = [...BASE_APPTS, ...(S.scheduledAppts || [])]
  let apptConflict = false, apptNoConflict = false, apptConflictMsg = '', apptConfirmMsg = ''
  {
    const t = (apptForm.time || '').trim()
    const okFmt = /^([01]?\d|2[0-3]):[0-5]\d$/.test(t)
    if (okFmt) {
      const start = toMin(t), dur = Number(apptForm.dur || 50), end = start + dur
      const clash = allAppts.find((a: any) => { const s = toMin(a.time); return start < s + Number(a.dur || 50) && s < end })
      if (clash) {
        const cp2 = getPatient(S.patients, clash.pid)
        apptConflict = true
        apptConflictMsg = 'חופף לפגישה עם ' + (cp2 ? cp2.name : 'מטופל') + ' · ' + clash.time + '–' + addMin(clash.time, clash.dur) + ' · ניתן לקבוע בכל זאת'
      } else {
        apptNoConflict = true
        apptConfirmMsg = 'יום שלישי, 30 ביוני · השעה פנויה · הפגישה תסתיים ב-' + addMin(t, dur)
      }
    }
  }
  const submitAppt = () => {
    const f = S.apptForm
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test((f.time || '').trim())) {
      set({ errors: { apptTime: 'יש להזין שעה תקינה בפורמט HH:MM' } })
      setTimeout(() => { const el = document.querySelector<HTMLElement>('[data-field="appt-time"]'); if (el) el.focus() }, 0)
      return
    }
    const p = getPatient(S.patients, f.pid)
    set({ scheduledAppts: [...(S.scheduledAppts || []), { time: f.time.trim(), pid: f.pid, type: f.type, dur: Number(f.dur), status: 'upcoming' }], dialog: null, errors: {} })
    toast('הפגישה עם ' + p.name + ' נקבעה ל-' + f.time.trim())
  }

  // ===== merge duplicates =====
  const clusters = buildDupClusters(S.patients)
  const mc = (S.mergeClusterIdx != null && clusters[S.mergeClusterIdx]) ? clusters[S.mergeClusterIdx] : null
  const showMerge = isMerge && !!mc
  const memCard = (m: any, canonical: boolean) => {
    const a = avatarColors(m.color); const rm = riskMeta(m.risk)
    return { id: m.id, name: m.name, initials: m.initials, avBg: a.bg, avColor: a.color, riskLabel: rm.label, riskColor: rm.color, riskBg: rm.bg, focus: m.focus, sessions: m.sessions, phone: m.phone, since: m.since, canonical }
  }
  let mergeMembers: any[] = [], mergeCanonName = '', mergeTotalSessions = 0, mergeArchiveCount = 0
  if (mc) {
    const canonId = S.mergeCanonicalId || mc.canonicalId
    mergeMembers = mc.members.map((m: any) => {
      const card = memCard(m, m.id === canonId)
      return { ...card, selected: m.id === canonId, borderC: m.id === canonId ? 'var(--primary)' : 'var(--divider)', bgC: m.id === canonId ? 'var(--primary-surface)' : 'var(--paper)', onPick: () => set({ mergeCanonicalId: m.id }) }
    })
    const canon = mc.members.find((m: any) => m.id === canonId) || mc.members[0]
    mergeCanonName = canon.name
    mergeTotalSessions = mc.members.reduce((a: number, m: any) => a + m.sessions, 0)
    mergeArchiveCount = mc.members.length - 1
  }
  const confirmMerge = () => {
    const cl = clusters[S.mergeClusterIdx]; if (!cl) return
    const canonId = S.mergeCanonicalId || cl.canonicalId
    const others = cl.members.filter((m: any) => m.id !== canonId).map((m: any) => m.id)
    const total = cl.members.reduce((a: number, m: any) => a + m.sessions, 0)
    const pts = S.patients.filter((m: any) => !others.includes(m.id)).map((m: any) => m.id === canonId ? { ...m, sessions: total } : m)
    set({ patients: pts, dialog: null, mergeClusterIdx: null, mergeCanonicalId: null })
    toast('הרשומות מוזגו · ' + others.length + ' רשומה כפולה הוסרה מהרשימה')
  }

  return (
    <div onClick={closeDialog} onKeyDown={onDialogKey} style={{ ...scrimStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 160, padding: 20, animation: 'pop .2s ease' }}>
      <div ref={trapRef} onClick={stop} role="dialog" aria-modal="true" aria-label="חלון פעולה" style={{ background: 'var(--paper)', borderRadius: 15, width: '100%', maxWidth: 520, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', boxShadow: '0 24px 70px rgba(8,20,40,.35)', animation: 'pop .25s ease' }}>

        {isForm && (
          <div>
            <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{dialogTitle}</h2>
              <svg onClick={closeDialog} className="shell-close-x" role="button" tabIndex={0} aria-label="סגירת החלון" viewBox="0 0 24 24" width="22" height="22" fill="var(--text-muted)" style={{ cursor: 'pointer' }}><path d={CLOSE_X} /></svg>
            </div>
            <div style={{ padding: '24px 26px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ gridColumn: '1/3' }}>
                  <label style={labelStyle}>שם מלא <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input ref={firstFieldRef} value={form.name} onInput={(e: any) => set({ form: { ...S.form, name: e.target.value }, errors: { ...S.errors, name: undefined }, dupWarnId: null })} aria-label="שם מלא" aria-required="true" aria-invalid={!!errors.name} aria-describedby="err-name" data-field="name" placeholder="שם המטופל" className="shell-input" style={{ width: '100%', height: 44, border: '1.5px solid ' + nameBorder, borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none' }} />
                  {errors.name && <span id="err-name" role="alert" style={{ display: 'block', fontSize: 12.5, color: 'var(--error)', marginTop: 5 }}>{errors.name}</span>}
                </div>
                <div>
                  <label style={labelStyle}>גיל <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input value={form.age} onInput={(e: any) => set({ form: { ...S.form, age: e.target.value.replace(/\D/g, '').slice(0, 3) }, errors: { ...S.errors, age: undefined } })} aria-label="גיל" aria-required="true" aria-invalid={!!errors.age} aria-describedby="err-age" data-field="age" inputMode="numeric" placeholder="לדוגמה, 34" className="shell-input" style={{ width: '100%', height: 44, border: '1.5px solid ' + ageBorder, borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none' }} />
                  {errors.age && <span id="err-age" role="alert" style={{ display: 'block', fontSize: 12.5, color: 'var(--error)', marginTop: 5 }}>{errors.age}</span>}
                </div>
                <div>
                  <label style={labelStyle}>מגדר</label>
                  <div role="radiogroup" aria-label="מגדר" style={{ display: 'flex', gap: 0, border: '1.5px solid var(--border-input)', borderRadius: 10, overflow: 'hidden', height: 44 }}>
                    {genderOpts.map((g) => (
                      <button key={g.label} onClick={g.onClick} role="radio" aria-checked={g.on} style={{ flex: 1, border: 'none', borderInlineStart: '1px solid var(--border-input)', background: g.bg, color: g.color, fontSize: 13.5, fontWeight: g.weight, cursor: 'pointer' }}>{g.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1/3' }}>
                  <label style={labelStyle}>נושא טיפול</label>
                  <input value={form.focus} onInput={(e: any) => set({ form: { ...S.form, focus: e.target.value } })} aria-label="נושא טיפול" placeholder="חרדה, דיכאון, יחסים…" className="shell-input" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {focusSuggestions.map((fs) => (
                      <a key={fs.label} onClick={fs.onClick} onKeyDown={onKeyActivate(fs.onClick)} className="shell-focus-chip" role="button" tabIndex={0} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', background: fs.bg, color: fs.color, border: '1px solid ' + fs.border }}>{fs.label}</a>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1/3' }}>
                  {!notesOpen ? (
                    <button onClick={() => set({ notesExpanded: true })} className="shell-notes-add" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', border: '1px dashed var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                      הוספת הערות קליניות <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(לא חובה)</span>
                    </button>
                  ) : (
                    <>
                      <label style={labelStyle}>הערות קליניות <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(לא חובה)</span></label>
                      <textarea onInput={(e: any) => set({ form: { ...S.form, notes: e.target.value } })} value={form.notes} aria-label="הערות קליניות" placeholder="הערות ראשוניות…" autoFocus className="shell-input" style={{ width: '100%', minHeight: 80, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '10px 12px', fontSize: 14.5, outline: 'none', resize: 'vertical' }} />
                    </>
                  )}
                </div>
              </div>
            </div>
            {dupP && (
              <div style={{ margin: '0 26px 6px', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--warning-strong)" style={{ flexShrink: 0, marginTop: 1 }}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{dupTitle}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--warning-strong)', background: 'var(--warning-bg)', borderRadius: 5, padding: '2px 7px' }}>אזהרה</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{dupName} · {dupMeta}<br />כדי למנוע כפילות ברשומות, ודאו שאין מדובר באותו אדם. אפשר לפתוח את הכרטיס הקיים או ליצור רשומה נפרדת בכל זאת.</div>
                  <button onClick={openDupPatient} className="shell-dup-open" style={{ marginTop: 10, height: 36, padding: '0 14px', border: '1px solid var(--primary)', borderRadius: 9, background: 'var(--paper)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>פתחו את הכרטיס הקיים</button>
                </div>
              </div>
            )}
            <div style={{ padding: '16px 26px', borderTop: '1px solid var(--bg)', display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button onClick={submitPatient} style={btnPrimary}>{dialogSubmitLabel}</button>
              <button onClick={closeDialog} style={btnCancel}>ביטול</button>
            </div>
          </div>
        )}

        {isDelete && (
          <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--error)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
              </div>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>העברת התיק לארכיון</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>התיק של <b>{deleteName}</b> יוסר מרשימת המטופלים הפעילים, יחד עם הפגישות והתמלולים המשויכים. תוכלו לבטל את הפעולה מיד לאחר ביצועה.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button onClick={confirmDelete} className="shell-danger-btn" style={btnDanger}>העברה לארכיון</button>
              <button onClick={closeDialog} style={btnCancel}>ביטול</button>
            </div>
          </div>
        )}

        {isDelSession && (
          <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--error)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
              </div>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>מחיקת פגישה</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>ההקלטה, התמלול וניתוח ה-AI של <b>{delSessionLabel}</b> יועברו לסל המיחזור. שאר תיק המטופל יישאר כמות שהוא, ותוכלו לבטל את הפעולה מיד לאחר ביצועה.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button onClick={confirmDelSession} className="shell-danger-btn" style={btnDanger}>מחיקת הפגישה</button>
              <button onClick={closeDialog} style={btnCancel}>ביטול</button>
            </div>
          </div>
        )}

        {isWipe && (
          <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--error)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
              </div>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>מחיקת כל המידע בחשבון</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>פעולה זו תמחק לצמיתות את <b>כל</b> המטופלים, הפגישות, התמלולים וניתוחי ה-AI בחשבונכם. הפעולה אינה הפיכה.</p>
              </div>
            </div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 13, color: 'var(--text-secondary)' }}>להמשך, וודאו שגיביתם כל מידע שתרצו לשמור.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button onClick={confirmWipe} className="shell-danger-btn" style={btnDanger}>מחיקה מלאה לצמיתות</button>
              <button onClick={closeDialog} style={btnCancel}>ביטול</button>
            </div>
          </div>
        )}

        {showMerge && (
          <div>
            <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>מיזוג רשומות כפולות</h2>
              <svg onClick={closeDialog} className="shell-close-x" role="button" tabIndex={0} aria-label="סגירת החלון" viewBox="0 0 24 24" width="22" height="22" fill="var(--text-muted)" style={{ cursor: 'pointer' }}><path d={CLOSE_X} /></svg>
            </div>
            <div style={{ padding: '22px 26px' }}>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>בחרו את הרשומה הראשית שתישמר. שאר הרשומות הכפולות יוסרו מהרשימה וכל הפגישות יאוחדו לרשומה הראשית.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {mergeMembers.map((m) => (
                  <div key={m.id} onClick={m.onPick} onKeyDown={onKeyActivate(m.onPick)} role="radio" aria-checked={m.selected} tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 13, border: '1.5px solid ' + m.borderC, background: m.bgC, borderRadius: 10, padding: '13px 15px', cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid ' + m.borderC, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.selected && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: m.avBg, color: m.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{m.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{m.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}><span dir="ltr">{m.phone}</span> · {m.sessions} פגישות · מאז <span dir="ltr">{m.since}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--surface-2)', borderRadius: 10, padding: '13px 15px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)" style={{ flexShrink: 0, marginTop: 1 }}><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>
                <span>לאחר המיזוג: רשומה ראשית <b>{mergeCanonName}</b> · <b>{mergeTotalSessions}</b> פגישות מאוחדות · <b>{mergeArchiveCount}</b> רשומה כפולה תוסר מרשימת המטופלים.</span>
              </div>
            </div>
            <div style={{ padding: '16px 26px', borderTop: '1px solid var(--bg)', display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button onClick={confirmMerge} style={btnPrimary}>אישור מיזוג</button>
              <button onClick={closeDialog} style={btnCancel}>ביטול</button>
            </div>
          </div>
        )}

        {isGoal && (
          <div>
            <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>הוספת מטרת טיפול</h2>
              <svg onClick={closeDialog} className="shell-close-x" role="button" tabIndex={0} aria-label="סגירה" viewBox="0 0 24 24" width="22" height="22" fill="var(--text-muted)" style={{ cursor: 'pointer' }}><path d={CLOSE_X} /></svg>
            </div>
            <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>תיאור המטרה <span style={{ color: 'var(--error)' }}>*</span></label>
                <input ref={firstFieldRef} value={goalForm.text} onInput={(e: any) => set({ goalForm: { ...S.goalForm, text: e.target.value } })} aria-label="תיאור מטרת טיפול" aria-required="true" placeholder="לדוגמה: הפחתת תדירות התקפי חרדה" className="shell-input" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none' }} />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>התקדמות ראשונית · {goalForm.pct}%</label>
                <input type="range" value={goalForm.pct} onInput={(e: any) => set({ goalForm: { ...S.goalForm, pct: Number(e.target.value) } })} min={0} max={100} step={5} aria-label="אחוז התקדמות" style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
              </div>
            </div>
            <div style={{ padding: '16px 26px', borderTop: '1px solid var(--bg)', display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button onClick={submitGoal} style={btnPrimary}>הוספת מטרה</button>
              <button onClick={closeDialog} style={btnCancel}>ביטול</button>
            </div>
          </div>
        )}

        {isSchedule && (
          <div>
            <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>קביעת פגישה חדשה</h2>
              <svg onClick={closeDialog} className="shell-close-x" role="button" tabIndex={0} aria-label="סגירה" viewBox="0 0 24 24" width="22" height="22" fill="var(--text-muted)" style={{ cursor: 'pointer' }}><path d={CLOSE_X} /></svg>
            </div>
            <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>מטופל <span style={{ color: 'var(--error)' }}>*</span></label>
                <select value={apptForm.pid} onChange={(e: any) => set({ apptForm: { ...S.apptForm, pid: e.target.value } })} aria-label="בחירת מטופל" aria-required="true" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none', background: 'var(--paper)', cursor: 'pointer' }}>
                  {apptPatientOpts.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>שעה <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input ref={firstFieldRef} value={apptForm.time} onInput={(e: any) => set({ apptForm: { ...S.apptForm, time: e.target.value }, errors: {} })} aria-label="שעת הפגישה" aria-required="true" aria-invalid={!!errors.apptTime} aria-describedby="err-appt-time" data-field="appt-time" dir="ltr" placeholder="11:00" className="shell-input" style={{ width: '100%', height: 44, border: '1.5px solid ' + apptTimeBorder, borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none', textAlign: 'start' }} />
                  {errors.apptTime && <div id="err-appt-time" role="alert" style={{ fontSize: 12, color: 'var(--error)', marginTop: 5 }}>{errors.apptTime}</div>}
                </div>
                <div>
                  <label style={labelStyle}>משך</label>
                  <select value={apptForm.dur} onChange={(e: any) => set({ apptForm: { ...S.apptForm, dur: e.target.value } })} aria-label="משך הפגישה" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none', background: 'var(--paper)', cursor: 'pointer' }}>
                    {apptDurOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>סוג פגישה</label>
                <select value={apptForm.type} onChange={(e: any) => set({ apptForm: { ...S.apptForm, type: e.target.value } })} aria-label="סוג הפגישה" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none', background: 'var(--paper)', cursor: 'pointer' }}>
                  {apptTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {apptNoConflict && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '11px 14px' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)" style={{ flexShrink: 0 }}><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{apptConfirmMsg}</span>
                </div>
              )}
              {apptConflict && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '11px 14px' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--warning-strong)" style={{ flexShrink: 0, marginTop: 1 }}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{apptConflictMsg}</span>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 26px', borderTop: '1px solid var(--bg)', display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button onClick={submitAppt} style={btnPrimary}>קביעת פגישה</button>
              <button onClick={closeDialog} style={btnCancel}>ביטול</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dialogs() {
  return (
    <>
      <ShortcutsDialog />
      <ActionDialog />
    </>
  )
}
