// Appbar notifications bell + quick-peek popover. Ported from the prototype's
// notifications view model (NOTIFS seed, read/archive state lives in the store).
import { useApp } from '../../store/AppStore'
import { NOTIFS } from '../../data/catalogs'
import { onKeyActivate } from '../../utils/a11y'

// Canonical demo notifications seed — identical to the prototype's NOTIFS list.

export const nMeta = (k: string) =>
  k === 'risk' ? { color: 'var(--error)', bg: 'var(--error-bg)', label: 'דגל סיכון', icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' }
  : k === 'reminder' ? { color: 'var(--primary)', bg: 'var(--primary-tint)', label: 'תזכורת', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z' }
  : k === 'system' ? { color: 'var(--info)', bg: 'var(--info-bg)', label: 'מערכת', icon: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z' }
  : { color: 'var(--secondary-strong)', bg: 'var(--secondary-bg)', label: 'סיכום AI', icon: 'M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z' }

const routeFor = (k: string) => k === 'system' ? 'settings' : k === 'reminder' ? 'calendar' : k === 'risk' ? 'patient' : 'summary'

export default function NotificationsPopover() {
  const { S, set, navigate } = useApp()

  const isRead = (id: string) => S.notifRead.includes(id)
  const isArch = (id: string) => S.notifArchived.includes(id)
  const markRead = (id: string) => set((s: any) => ({ notifRead: s.notifRead.includes(id) ? s.notifRead : [...s.notifRead, id] }))

  const unreadCount = NOTIFS.filter((n) => !isArch(n.id) && !isRead(n.id)).length
  // dropdown quick-peek: newest non-archived, cap 5
  const notifList = NOTIFS.filter((n) => !isArch(n.id)).slice(0, 5).map((n) => {
    const m = nMeta(n.kind); const read = isRead(n.id)
    return {
      id: n.id, title: n.title, text: n.text, time: n.time, icon: m.icon, iconColor: m.color, iconBg: m.bg,
      dotShow: !read, rowBg: read ? 'var(--paper)' : 'var(--primary-surface)',
      onClick: () => { markRead(n.id); set({ notifOpen: false }); navigate(routeFor(n.kind), n.pid ? { patientId: n.pid } : {}) },
    }
  })

  const toggleNotif = () => set((s: any) => ({ notifOpen: !s.notifOpen }))
  const markAllRead = () => set({ notifRead: NOTIFS.filter((n) => !isArch(n.id)).map((n) => n.id) })
  const goNotifCenter = () => { set({ notifOpen: false }); navigate('notifications') }

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={toggleNotif} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNotif() } }} role="button" tabIndex={0} aria-label="התראות" aria-haspopup="true" className="shell-iconbtn" style={{ position: 'relative', cursor: 'pointer', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="23" height="23" fill="var(--text-secondary)"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 1, insetInlineStart: 1, minWidth: 16, height: 16, padding: '0 4px', background: 'var(--error)', color: 'var(--paper)', borderRadius: 10, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{String(unreadCount)}</span>
        )}
      </div>
      {S.notifOpen && (
        <>
          <div onClick={() => set({ notifOpen: false })} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div role="menu" aria-label="התראות" className="appbar-popover-panel" style={{ position: 'absolute', top: 48, insetInlineEnd: 0, width: 360, maxWidth: '88vw', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 14, boxShadow: '0 18px 50px rgba(8,30,60,.22)', zIndex: 95, overflow: 'hidden', animation: 'pop .18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
              <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>התראות</h2>
              <a onClick={markAllRead} role="button" tabIndex={0} onKeyDown={onKeyActivate(markAllRead)} style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>סמנו הכל כנקרא</a>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto', overflowX: 'hidden' }}>
              {notifList.map((nf) => (
                <div key={nf.id} onClick={nf.onClick} className="shell-row-hover" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: nf.rowBg }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: nf.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill={nf.iconColor}><path d={nf.icon} /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{nf.title}</span>
                      {nf.dotShow && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{nf.text}</p>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{nf.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <a onClick={goNotifCenter} role="button" tabIndex={0} onKeyDown={onKeyActivate(goNotifCenter)} className="shell-row-hover" style={{ display: 'block', textAlign: 'center', padding: 12, fontSize: 13, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', borderTop: '1px solid var(--line)' }}>צפייה בכל ההתראות</a>
          </div>
        </>
      )}
    </div>
  )
}
