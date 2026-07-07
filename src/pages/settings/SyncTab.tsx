// Settings · Sync tab — cross-device continuity status, connected-device
// list, and a demo-reset link. Ported from the prototype's `setSync` block.
// The store already persists session state (debounced) and tracks S.syncing /
// S.lastSync; "sync now" nudges that flow, "reset demo" clears the persisted
// session and reloads.
import { useApp } from '../../store/AppStore'
import { keyAct } from './shared'
import { relTime } from '../../utils/format'


const LAPTOP = 'M20 18c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 5h16v11H4V5z'
const PHONE = 'M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z'
const TABLET = 'M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2 14H5V6h14v12z'

const ACT_MAP: Record<string, string> = { dashboard: 'דף הבית', patients: 'מטופלים', patient: 'תיק מטופל', sessions: 'פגישות', calendar: 'יומן', analytics: 'תובנות', tasks: 'משימות', billing: 'חיובים', documents: 'מסמכים', notifications: 'מרכז ההתראות', settings: 'הגדרות', upload: 'העלאת הקלטה', summary: 'סיכום AI', transcript: 'תמלול' }

// Same persistence key the store writes to (src/store/AppStore.tsx).
const PKEY = 'sensei_session_react_v1'

export default function SyncTab() {
  const { S, set, toast } = useApp()

  const statusText = S.syncing
    ? 'מסנכרן שינויים בין המכשירים שלכם…'
    : 'כל השינויים נשמרו · עודכן ' + relTime(S.lastSync)
  const activityLabel = 'צפייה כעת: ' + (ACT_MAP[S.route] || 'העבודה שלכם')

  const devices = [
    { name: 'MacBook Pro', meta: 'המכשיר הזה · פעיל כעת', icon: LAPTOP, dot: 'var(--success)', nameColor: 'var(--text)' },
    { name: 'iPhone 15', meta: 'סונכרן ' + relTime((S.lastSync || Date.now()) - 7200000), icon: PHONE, dot: 'var(--text-disabled)', nameColor: 'var(--text-2)' },
    { name: 'iPad Air', meta: 'סונכרן אתמול, 21:40', icon: TABLET, dot: 'var(--text-disabled)', nameColor: 'var(--text-2)' },
  ]

  // Nudge the store's debounced persistence and confirm. The session-persist
  // effect keys off state changes, so flipping `syncing` triggers a save.
  const syncNow = () => {
    if (S.syncing) return
    set({ syncing: true })
    setTimeout(() => toast('כל הנתונים סונכרנו בין המכשירים', 'success'), 650)
  }
  const resetDemo = () => {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(PKEY) } catch { /* storage unavailable */ }
    if (typeof location !== 'undefined') location.reload()
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>סנכרון בין מכשירים</h2>
        <button onClick={syncNow} disabled={!!S.syncing} aria-label="סנכרן עכשיו" className="set-syncnow" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--primary-surface)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: S.syncing ? '.5' : '1' }}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" /></svg>
          סנכרן עכשיו
        </button>
      </div>
      <p aria-live="polite" style={{ margin: '0 0 6px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{statusText}</p>
      <p style={{ margin: '0 0 22px', fontSize: 12.5, color: 'var(--text-muted)' }}>{activityLabel}</p>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.04em', marginBottom: 10 }}>המכשירים המחוברים</div>
      <div style={{ border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden' }}>
        {devices.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: '1px solid var(--line)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--text-secondary)"><path d={d.icon} /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: d.nameColor }}>{d.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{d.meta}</div>
            </div>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.dot, flexShrink: 0 }}></span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--text-muted)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" /></svg>
          מוצפן ונשמר אוטומטית
        </span>
        <a onClick={resetDemo} onKeyDown={keyAct(resetDemo)} role="button" tabIndex={0} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--error)', cursor: 'pointer', whiteSpace: 'nowrap' }}>איפוס דמו</a>
      </div>
    </div>
  )
}
