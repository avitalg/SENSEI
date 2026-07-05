// Settings screen — the largest single screen: a left tab rail plus one of
// eight preference panes (profile · account · notifications · privacy ·
// appearance · accessibility · sync · help/language links). Ported from the
// prototype template block (lines 1685–2039) and its renderVals settings
// derivations. The per-tab panes live in ./settings/*.
import { useApp } from '../store/AppStore'
import './settings.css'
import ProfileTab from './settings/ProfileTab'
import AccountTab from './settings/AccountTab'
import NotificationsTab from './settings/NotificationsTab'
import PrivacyTab from './settings/PrivacyTab'
import AppearanceTab from './settings/AppearanceTab'
import AccessibilityTab from './settings/AccessibilityTab'

// Tab rail config (port of the prototype's STABS). `help` navigates to the
// help route; `language` is a locked placeholder. (The cross-device sync pane
// is hidden from settings navigation; sync itself still runs in the store.)
const STABS = [
  { key: 'profile', label: 'פרופיל', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  { key: 'account', label: 'חשבון', icon: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z' },
  { key: 'notifications', label: 'התראות', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z' },
  { key: 'privacy', label: 'פרטיות ואבטחה', icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-9H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z' },
  { key: 'appearance', label: 'מראה', icon: 'M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67 0 1.38-1.12 2.5-2.5 2.5zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5a.54.54 0 0 0-.14-.35c-.41-.46-.63-1.05-.63-1.65 0-1.38 1.12-2.5 2.5-2.5H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7z' },
  { key: 'accessibility', label: 'נגישות', icon: 'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z' },
  { key: 'help', label: 'עזרה ותמיכה', icon: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z' },
  { key: 'language', label: 'שפה (עברית)', icon: 'M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z' },
]

export default function SettingsPage() {
  const { S, set, navigate, toast } = useApp()
  // Fall back to the profile pane if a stale/hidden tab (e.g. the removed 'sync')
  // is still persisted, so the pane area never renders empty.
  const active = STABS.some((t) => t.key === S.settingsTab) ? S.settingsTab : 'profile'

  const tabs = STABS.map((t) => {
    const dis = t.key === 'language'
    const on = active === t.key && !dis
    const onClick = dis
      ? () => toast('הגדרת שפה תתווסף בגרסה הקרובה')
      : t.key === 'help'
        ? () => navigate('help')
        : () => set({ settingsTab: t.key })
    return {
      key: t.key, label: t.label, icon: t.icon, disabled: dis, onClick,
      color: on ? 'var(--primary)' : (dis ? 'var(--text-disabled)' : 'var(--text-2)'),
      bg: on ? 'var(--primary-tint)' : 'transparent', weight: on ? 700 : 500,
      cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.7 : 1,
    }
  })

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>הגדרות</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 15 }}>ניהול הפרופיל, החשבון וההעדפות שלכם</p>
      <div className="rx-side" style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 20 }}>
        {/* left tab rail */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)', padding: 8, height: 'fit-content' }}>
          {tabs.map((t) => (
            <a key={t.key} onClick={t.onClick} className="set-tab" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 10, cursor: t.cursor, fontSize: 14.5, fontWeight: t.weight, color: t.color, background: t.bg, opacity: t.opacity }}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d={t.icon} /></svg>
              {t.label}
              {t.disabled && (
                <span style={{ marginInlineStart: 'auto', fontSize: 10.5, background: 'var(--bg)', color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 10 }}>נעול</span>
              )}
            </a>
          ))}
        </div>

        {/* active pane */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)', padding: 26 }}>
          {active === 'profile' && <ProfileTab />}
          {active === 'notifications' && <NotificationsTab />}
          {active === 'account' && <AccountTab />}
          {active === 'privacy' && <PrivacyTab />}
          {active === 'appearance' && <AppearanceTab />}
          {active === 'accessibility' && <AccessibilityTab />}
        </div>
      </div>
    </div>
  )
}
