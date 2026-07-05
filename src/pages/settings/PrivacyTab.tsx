// Settings · Privacy tab — RBAC/PII note, audio-retention toggle, the audit
// log (ported as a standard-treatment data table per porting rule 12 — the
// full DataGrid engine is out of scope) and the danger zone (wipe dialog).
import { useState } from 'react'
import { useApp } from '../../store/AppStore'
import { keyAct, Toggle } from './shared'

// Action → chip colours (port of the prototype's auMeta).
const auMeta = (a: string) =>
  a === 'מחיקה' ? { c: 'var(--error)', b: 'var(--error-bg)' }
    : a === 'העלאה' ? { c: 'var(--primary)', b: 'var(--primary-tint)' }
      : a === 'עריכה' ? { c: 'var(--secondary-strong)', b: 'var(--secondary-bg)' }
        : { c: 'var(--info)', b: 'var(--info-bg)' }

const AUDIT_SRC = [
  { action: 'צפייה', target: 'תיק מטופל · דנה לוי', time: '30.06.2026 · 14:22' },
  { action: 'העלאה', target: 'הקלטה · פגישה חדשה · מיכל כהן', time: '30.06.2026 · 11:05' },
  { action: 'צפייה', target: 'סיכום AI · נועה שפירא', time: '30.06.2026 · 09:48' },
  { action: 'מחיקה', target: 'תמלול · פגישה #4 · אבי פרץ', time: '29.06.2026 · 17:40' },
  { action: 'עריכה', target: 'פרטי מטופל · יוסי מזרחי', time: '29.06.2026 · 09:12' },
  { action: 'צפייה', target: 'תמלול · פגישה אחרונה · דנה לוי', time: '28.06.2026 · 16:30' },
]
const AUDIT = AUDIT_SRC.map((a, i) => { const m = auMeta(a.action); return { id: 'au' + i, ...a, color: m.c, bg: m.b } })

const AUDIT_COLS = [
  { key: 'action', label: 'פעולה', min: 120 },
  { key: 'target', label: 'פריט', min: 240 },
  { key: 'time', label: 'מועד', min: 150 },
]

export default function PrivacyTab() {
  const { S, set } = useApp()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const rows = q
    ? AUDIT.filter((r) => (r.action + ' ' + r.target).toLowerCase().includes(q))
    : AUDIT

  const openWipe = () => set({ dialog: 'wipe' })

  return (
    <div>
      <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>פרטיות ואבטחת מידע</h2>
      <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>המערכת פועלת לפי הרשאות גישה (RBAC). כל מטפל רואה אך ורק את המטופלים המשויכים אליו. תכני הפגישות עוברים ניקוי פרטים מזהים (PII) לפני ניתוח ה-AI.</p>

      {/* audio retention */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--line)' }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>שמירת קבצי אודיו לאחר תמלול</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>כבוי כברירת מחדל. האודיו נמחק מיד לאחר התמלול</div>
        </div>
        <Toggle checked={!!S.retainAudio} onToggle={() => set({ retainAudio: !S.retainAudio })} ariaLabel="שמירת קבצי אודיו לאחר תמלול" />
      </div>

      {/* audit log — standard-treatment data table */}
      <h3 style={{ margin: '22px 0 12px', fontSize: 14.5, fontWeight: 700, color: 'var(--text-2)' }}>יומן פעילות (Audit Log)</h3>
      <div style={{ border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>יומן פעילות</span>
          <div style={{ position: 'relative', flex: '0 1 260px' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--text-muted)" style={{ position: 'absolute', top: '50%', insetInlineStart: 11, transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש ביומן" placeholder="חיפוש ביומן…" className="set-input" style={{ width: '100%', height: 36, border: '1px solid var(--border-input)', borderRadius: 9, padding: '0 12px 0 34px', fontSize: 13.5, outline: 'none' }} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 520 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 150px', alignItems: 'center', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
              {AUDIT_COLS.map((c) => (
                <div key={c.key} style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {c.label}
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--text-muted)" style={{ opacity: 0.55 }}><path d="M7 10l5 5 5-5z" /></svg>
                </div>
              ))}
            </div>
            {rows.length === 0 ? (
              <div style={{ padding: '34px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>לא נמצאו רשומות התואמות לחיפוש</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 150px', alignItems: 'center', borderTop: '1px solid var(--line)' }}>
                  <div style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: r.bg, color: r.color }}>{r.action}</span>
                  </div>
                  <div style={{ padding: '12px 14px', fontSize: 13.5, color: 'var(--text)' }}>{r.target}</div>
                  <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }} dir="ltr">{r.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* danger zone */}
      <div style={{ marginTop: 24, border: '1px solid var(--divider)', borderRadius: 10, background: 'var(--paper)', padding: '18px 20px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>אזור מסוכן</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>מחיקה מלאה ולצמיתות של כל המטופלים, הפגישות, התמלולים וניתוחי ה-AI שבחשבון. לא ניתן לשחזר.</p>
        <button onClick={openWipe} onKeyDown={keyAct(openWipe)} className="set-wipe" style={{ height: 42, padding: '0 20px', border: '1px solid var(--error)', borderRadius: 10, background: 'var(--paper)', color: 'var(--error)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>מחיקת כל המידע בחשבון</button>
      </div>
    </div>
  )
}
