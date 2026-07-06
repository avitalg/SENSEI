// Tasks — ported from the prototype (template 1307–1353 + renderVals task view-model).
import React, { useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import { getPatient } from '../utils'
import './tasks.css'

// keyboard activation for non-button interactive roles (checkbox rows)
const kb = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); fn() }
}

export default function TasksPage() {
  const { S, set, navigate, toast } = useApp()
  // inline rename (page-local, transient): tap the pencil, edit in place,
  // Enter/blur saves, Escape cancels — no delete-and-recreate friction
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const composerRef = useRef<HTMLInputElement>(null)

  const prMeta = (p: string) =>
    p === 'high' ? { label: 'דחוף', color: 'var(--error)', bg: 'var(--error-bg)' }
      : p === 'medium' ? { label: 'בינוני', color: 'var(--warning)', bg: 'var(--warning-bg)' }
        : { label: 'נמוך', color: 'var(--text-secondary)', bg: 'var(--surface-2)' }

  // status filter
  let tlist: any[] = S.tasks
  if (S.taskFilter === 'open') tlist = tlist.filter((t: any) => !t.done)
  else if (S.taskFilter === 'today') tlist = tlist.filter((t: any) => !t.done && t.due === 'היום')
  else if (S.taskFilter === 'overdue') tlist = tlist.filter((t: any) => !t.done && t.overdue)
  else if (S.taskFilter === 'done') tlist = tlist.filter((t: any) => t.done)

  // logical order: open before done; within open — overdue, then today, then upcoming; higher priority first
  const prRank: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const dueRank = (t: any) => (t.overdue ? 0 : t.due === 'היום' ? 1 : t.due === 'מחר' ? 2 : 3)
  const sortedTasks = tlist
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      if (a.t.done !== b.t.done) return a.t.done ? 1 : -1
      return (dueRank(a.t) - dueRank(b.t)) || ((prRank[a.t.priority] ?? 1) - (prRank[b.t.priority] ?? 1)) || (a.i - b.i)
    })
    .map((x) => x.t)

  const taskList = sortedTasks.map((t: any) => {
    const pm = prMeta(t.priority)
    const isOverdue = t.overdue && !t.done
    return {
      id: t.id, text: t.text, patient: t.patient, hasPatient: !!t.patientId, due: t.due, done: t.done, showCheck: t.done,
      prLabel: pm.label, prColor: pm.color, prBg: pm.bg,
      dueColor: isOverdue ? 'var(--error)' : 'var(--text-muted)', dueWeight: isOverdue ? 700 : 600,
      boxBg: t.done ? 'var(--primary)' : 'transparent', boxBorder: t.done ? 'var(--primary)' : 'var(--border-input)',
      textColor: t.done ? 'var(--text-muted)' : 'var(--text)', textDecor: t.done ? 'line-through' : 'none',
      toggleAria: (t.done ? 'סימון כלא הושלמה: ' : 'סימון כהושלמה: ') + t.text,
      patientAria: t.patientId ? ('פתיחת תיק ' + t.patient) : '',
      openPatient: t.patientId
        ? (e?: React.SyntheticEvent) => { if (e) e.stopPropagation(); navigate('patient', { patientId: t.patientId }) }
        : () => { /* no linked patient */ },
      onToggle: () => set((s: any) => ({ tasks: s.tasks.map((x: any) => (x.id === t.id ? { ...x, done: !x.done } : x)) })),
      editing: editingId === t.id,
      onEditStart: () => { setEditingId(t.id); setEditDraft(t.text) },
      onEditSave: () => {
        const tx = editDraft.trim()
        if (tx && tx !== t.text) set((s: any) => ({ tasks: s.tasks.map((x: any) => (x.id === t.id ? { ...x, text: tx } : x)) }))
        setEditingId(null)
      },
      onEditCancel: () => setEditingId(null),
      onDelete: () => {
        const prev = S.tasks
        set({ tasks: prev.filter((x: any) => x.id !== t.id) })
        toast('המשימה נמחקה', 'success', { label: 'ביטול', onClick: () => set({ tasks: prev }) })
      },
    }
  })
  const taskEmpty = sortedTasks.length === 0

  const taskCounts = {
    all: S.tasks.length,
    open: S.tasks.filter((t: any) => !t.done).length,
    today: S.tasks.filter((t: any) => !t.done && t.due === 'היום').length,
    overdue: S.tasks.filter((t: any) => !t.done && t.overdue).length,
    done: S.tasks.filter((t: any) => t.done).length,
  }
  const taskFilters = [
    { key: 'all', label: 'הכל · ' + taskCounts.all }, { key: 'open', label: 'פתוחות · ' + taskCounts.open },
    { key: 'today', label: 'להיום · ' + taskCounts.today }, { key: 'overdue', label: 'באיחור · ' + taskCounts.overdue },
    { key: 'done', label: 'הושלמו · ' + taskCounts.done },
  ].map((f) => ({
    key: f.key, label: f.label,
    bg: S.taskFilter === f.key ? 'var(--primary)' : 'var(--paper)',
    color: S.taskFilter === f.key ? 'var(--paper)' : 'var(--text-2)',
    border: S.taskFilter === f.key ? 'var(--primary)' : 'var(--divider)',
    onClick: () => set({ taskFilter: f.key }),
  }))

  // composer: task text · priority · optional patient link (all owned by this therapist)
  const taskPatientOptions = [{ value: '', label: 'ללא שיוך למטופל' }].concat(
    S.patients.map((p: any) => ({ value: p.id, label: p.name })),
  )
  const addTask = () => {
    const tx = S.taskInput.trim()
    if (!tx) { toast('הזינו תיאור משימה כדי להוסיף', 'info'); composerRef.current?.focus(); return }
    const pid = S.newTaskPatientId
    const pat = pid ? (getPatient(S.patients, pid).name || '') : ''
    set((s: any) => ({
      tasks: [{ id: 't' + Date.now(), text: tx, patient: pat, patientId: pid, due: 'היום', overdue: false, priority: s.newTaskPriority || 'medium', done: false }, ...s.tasks],
      taskInput: '',
    }))
    toast('המשימה נוספה לרשימה שלכם')
  }
  const onTaskKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addTask() } }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div data-screen-label="משימות" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>משימות</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>המשימות שלכם בלבד, מקושרות למטופלים שבטיפולכם ומסודרות לפי דחיפות ומועד</p>
      </div>

      <div style={{ display: 'flex', gap: 9, marginBottom: 18, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '10px 12px', flexWrap: 'wrap' }}>
        <input ref={composerRef} className="tasks-input" value={S.taskInput} onChange={(e) => set({ taskInput: e.target.value })} onKeyDown={onTaskKey} aria-label="תיאור משימה חדשה" placeholder="הוספת משימה חדשה…" style={{ flex: 1, minWidth: 180, height: 42, border: '1px solid var(--divider)', background: 'var(--surface-2)', borderRadius: 10, padding: '0 14px', fontSize: 14.5, outline: 'none' }} />
        <select className="tasks-select" value={S.newTaskPriority} onChange={(e) => set({ newTaskPriority: e.target.value })} aria-label="עדיפות המשימה" style={{ height: 42, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 12px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)', background: 'var(--surface-2)', cursor: 'pointer' }}>
          <option value="high">עדיפות: דחוף</option>
          <option value="medium">עדיפות: בינוני</option>
          <option value="low">עדיפות: נמוך</option>
        </select>
        <select className="tasks-select" value={S.newTaskPatientId} onChange={(e) => set({ newTaskPatientId: e.target.value })} aria-label="שיוך המשימה למטופל" style={{ height: 42, maxWidth: 190, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 12px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)', background: 'var(--surface-2)', cursor: 'pointer' }}>
          {taskPatientOptions.map((o) => <option key={o.value || 'none'} value={o.value}>{o.label}</option>)}
        </select>
        <button className="tasks-add-btn" onClick={addTask} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--on-accent)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>הוספה
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {taskFilters.map((f) => (
          <a key={f.key} onClick={f.onClick} onKeyDown={kb(f.onClick)} role="button" tabIndex={0} aria-pressed={S.taskFilter === f.key} style={{ fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 20, cursor: 'pointer', border: '1px solid ' + f.border, background: f.bg, color: f.color }}>{f.label}</a>
        ))}
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)' }}>
        {taskList.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: '1px solid var(--line)' }}>
            <div onClick={t.onToggle} onKeyDown={kb(t.onToggle)} role="checkbox" aria-checked={t.done} aria-label={t.toggleAria} tabIndex={0} style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid ' + t.boxBorder, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.boxBg }}>
              {t.showCheck && <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--on-accent)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.editing ? (
                <input
                  autoFocus value={editDraft} aria-label="עריכת תיאור המשימה"
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={t.onEditSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); t.onEditSave() }
                    if (e.key === 'Escape') { e.stopPropagation(); t.onEditCancel() }
                  }}
                  style={{ width: '100%', height: 34, border: '1px solid var(--primary-border)', borderRadius: 8, padding: '0 10px', fontSize: 14.5, fontWeight: 600, outline: 'none', background: 'var(--paper)', color: 'var(--text)' }}
                />
              ) : (
                <div style={{ fontSize: 14.5, fontWeight: 600, color: t.textColor, textDecoration: t.textDecor }}>{t.text}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6, flexWrap: 'wrap' }}>
                {t.hasPatient && (
                  <a className="tasks-patient-chip" onClick={t.openPatient} role="button" tabIndex={0} aria-label={t.patientAria} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-tint)', padding: '2px 9px 2px 7px', borderRadius: 20, cursor: 'pointer' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--primary)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>{t.patient}
                  </a>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: t.dueWeight, color: t.dueColor }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill={t.dueColor}><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" /></svg>{t.due}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: t.prBg, color: t.prColor, whiteSpace: 'nowrap' }}>{t.prLabel}</span>
            {!t.done && (
              <button className="tasks-del-btn" onClick={t.onEditStart} aria-label={'עריכת משימה: ' + t.text} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--text-muted)"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
              </button>
            )}
            <button className="tasks-del-btn" onClick={t.onDelete} aria-label="מחיקת משימה" style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--text-muted)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
            </button>
          </div>
        ))}
        {taskEmpty && (
          <div style={{ padding: '50px 20px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="var(--success)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>
            {/* the message matches the filter: praise only where praise is true,
                and always point at the way forward */}
            {taskCounts.all === 0 ? (<>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>זו ההתחלה</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>הוסיפו את המשימה הראשונה שלכם בשורה שלמעלה.</p>
            </>) : S.taskFilter === 'done' ? (<>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>עוד אין משימות שהושלמו</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>משימות שתסמנו כהושלמו יופיעו כאן.</p>
            </>) : (<>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>הכול נקי כאן</h2>
              <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 14 }}>אין משימות פתוחות בסינון הזה · כל הכבוד.</p>
              <button onClick={() => set({ taskFilter: 'all' })} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>הצגת כל המשימות</button>
            </>)}
          </div>
        )}
      </div>
    </div>
  )
}
