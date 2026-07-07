// Settings · Account tab — password change, 2FA, session timeout, active
// sessions. Ported from the prototype.
import React from 'react'
import { useApp } from '../../store/AppStore'
import { Toggle } from './shared'
import { labelStyle } from '../../utils/styles'

const ACTIVE_SESSIONS = [
  { device: 'Chrome · macOS', loc: 'תל אביב, ישראל', when: 'הפעלה נוכחית', current: true },
  { device: 'Safari · iPhone', loc: 'תל אביב, ישראל', when: 'לפני 2 שעות', current: false },
]

const passInputStyle: React.CSSProperties = { width: '100%', height: 44, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none', textAlign: 'start' }

export default function AccountTab() {
  const { S, set, toast } = useApp()

  const toggle2FA = () => {
    const next = !S.twoFA
    set({ twoFA: next })
    toast(next ? 'אימות דו-שלבי הופעל' : 'אימות דו-שלבי כובה')
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 700 }}>חשבון ואבטחה</h2>
      <h3 style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 700, color: 'var(--text-2)' }}>שינוי סיסמה</h3>
      <div className="rx-2to1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
        <div style={{ gridColumn: '1/3' }}>
          <label style={labelStyle}>סיסמה נוכחית</label>
          <input aria-label="סיסמה נוכחית" type="password" autoComplete="current-password" dir="ltr" placeholder="••••••••" className="set-input" style={passInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>סיסמה חדשה</label>
          <input aria-label="סיסמה חדשה" type="password" autoComplete="new-password" dir="ltr" placeholder="לפחות 8 תווים" className="set-input" style={passInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>אימות סיסמה</label>
          <input aria-label="אימות סיסמה" type="password" autoComplete="new-password" dir="ltr" placeholder="הקלידו שוב" className="set-input" style={passInputStyle} />
        </div>
      </div>
      <button onClick={() => toast('הסיסמה עודכנה')} style={{ height: 42, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>עדכון סיסמה</button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid var(--line)', marginTop: 22 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>אימות דו-שלבי (2FA)</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>שכבת הגנה נוספת בכניסה למערכת · {S.twoFA ? 'מופעל' : 'כבוי'}</div>
        </div>
        <Toggle checked={!!S.twoFA} onToggle={toggle2FA} />
      </div>

      <div style={{ padding: '16px 0', borderTop: '1px solid var(--line)' }}>
        <label style={{ display: 'block', fontSize: 14.5, fontWeight: 600, marginBottom: 8 }}>ניתוק אוטומטי לאחר חוסר פעילות</label>
        <select value={S.sessionTimeout} onChange={(e) => set({ sessionTimeout: e.target.value })} aria-label="זמן ניתוק אוטומטי" style={{ height: 42, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14, background: 'var(--paper)', outline: 'none', cursor: 'pointer', minWidth: 180 }}>
          <option value="15">15 דקות</option>
          <option value="30">30 דקות</option>
          <option value="60">שעה</option>
          <option value="120">שעתיים</option>
        </select>
      </div>

      <h3 style={{ margin: '18px 0 10px', fontSize: 14.5, fontWeight: 700, color: 'var(--text-2)' }}>התחברויות פעילות</h3>
      <div style={{ border: '1px solid var(--divider)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        {ACTIVE_SESSIONS.map((se) => (
          <div key={se.device} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--text-secondary)"><path d="M4 6h16v10H4zm0 12h16v2H4zm9-9h5v2h-5z" /></svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{se.device}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{se.loc} · {se.when}</div>
            </div>
            {se.current && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--success-bg)', color: 'var(--success)' }}>נוכחי</span>}
          </div>
        ))}
      </div>
      <button onClick={() => toast('כל ההתחברויות האחרות נותקו')} className="set-hov-danger" style={{ height: 40, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>ניתוק כל ההתחברויות האחרות</button>
    </div>
  )
}
