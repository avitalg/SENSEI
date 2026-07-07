// Top app bar: mobile nav toggle, global search + dropdown, demo pill, upload CTA,
// theme toggle, notifications bell, account avatar.
// Ported from the prototype shell template (appbar) + its view-model handlers.
import React from 'react'
import { useApp } from '../../store/AppStore'
import { avatarColors, riskMeta } from '../../utils'
import { buildCmdRoutes } from './CommandPalette'
import { scoreP, hlParts } from '../../utils/search'
import { profileInitials } from './Sidebar'
import NotificationsPopover from './NotificationsPopover'
import { SUN, MOON, MONITOR } from '../../utils/themeIcons'


const THEME_LABELS: Record<string, string> = {
  system: 'ערכת נושא: מערכת · לחצו למצב בהיר',
  light: 'ערכת נושא: בהיר · לחצו למצב כהה',
  dark: 'ערכת נושא: כהה · לחצו למצב מערכת',
}
const THEME_MSGS: Record<string, string> = {
  system: 'ערכת נושא: מערכת ההפעלה', light: 'מצב בהיר הופעל', dark: 'מצב כהה הופעל',
}


export default function AppBar() {
  const { S, set, navigate, applyThemePref, toast } = useApp()

  // ---- theme (system-aware three-state toggle) ----
  const themePref = S.themePref || 'system'
  const themeIcon = themePref === 'system' ? MONITOR : (themePref === 'dark' ? SUN : MOON)
  const themeToggleLabel = THEME_LABELS[themePref] || THEME_LABELS.system
  const toggleTheme = () => {
    const order: Record<string, 'system' | 'light' | 'dark'> = { system: 'light', light: 'dark', dark: 'system' }
    const next = order[themePref] || 'light'
    applyThemePref(next)
    toast(THEME_MSGS[next], 'info')
  }

  // ---- global search ----
  const gq = (S.globalSearch || '').trim()
  const globalOpen = !!gq
  const gmatched = gq ? S.patients.map((p: any) => ({ p, s: scoreP(p, gq, S.patientTags) })).filter((x: any) => x.s > 0).sort((a: any, b: any) => b.s - a.s) : []
  const CMD_ROUTES = buildCmdRoutes({ set, navigate })
  const groutes = gq ? CMD_ROUTES.filter((r) => r.label.includes(gq)) : []
  const globalHasResults = gmatched.length > 0
  const globalHasRoutes = groutes.length > 0
  const globalNoResults = !!gq && gmatched.length === 0 && groutes.length === 0
  const globalCountLabel = gmatched.length + (gmatched.length === 1 ? ' מטופל' : ' מטופלים')
  const gPat = gmatched.slice(0, 6)
  const gRt = groutes.slice(0, 4)
  // Flat list of keyboard-navigable options (patients, then quick-nav routes) in
  // render order — powers ArrowUp/Down + Enter in the search combobox (WCAG 2.1.1).
  const gOptions = [
    ...gPat.map(({ p }: any) => ({ id: 'gopt-p-' + p.id, run: () => { set({ globalSearch: '' }); navigate('patient', { patientId: p.id }) } })),
    ...gRt.map((r: any) => ({ id: 'gopt-r-' + r.label, run: () => { set({ globalSearch: '' }); r.go() } })),
  ]
  const [gActive, setGActive] = React.useState(-1)
  const activeIdx = gActive >= 0 && gActive < gOptions.length ? gActive : -1
  const clearGlobal = () => { set({ globalSearch: '' }); setGActive(-1) }
  const goAllResults = () => { set({ globalSearch: '', searchType: 'all' }); navigate('search', { searchQuery: gq }) }
  const onGlobalKey = (e: React.KeyboardEvent) => {
    if (!globalOpen) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setGActive((i) => Math.min(i + 1, gOptions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setGActive((i) => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const it = gOptions[activeIdx]; if (it) it.run(); else if (gq) goAllResults() }
    else if (e.key === 'Escape') { e.preventDefault(); clearGlobal() }
  }

  // (Cross-device sync still runs in the store; its header indicator/menu is
  // hidden from navigation.)

  // ---- account avatar ----
  const PS = S.profile || {}
  const avatarBg = PS.avatarColor || 'var(--primary)'
  const hasPhoto = !!PS.avatar
  const openAccount = () => navigate('settings', { settingsTab: 'account' })

  const openUploadScreen = () => set({ route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } })
  const toggleNav = () => set((s: any) => ({ navOpen: !s.navOpen }))
  const exitDemo = () => set({ view: 'auth', authScreen: 'login', demoMode: false, loginLoading: false, loginError: '' })

  const onKeyActivate = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }

  return (
    <header className="appbar" style={{ height: 64, background: 'var(--paper)', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', position: 'sticky', top: 0, zIndex: 20 }}>
      <button onClick={toggleNav} className="nav-toggle" aria-label="פתיחת תפריט הניווט" style={{ width: 40, height: 40, flexShrink: 0, border: '1px solid var(--divider)', borderRadius: 10, background: 'var(--surface-2)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="var(--text-secondary)"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
      </button>

      <div className="appbar-search" style={{ flex: 1, minWidth: 190, maxWidth: 420, position: 'relative' }}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 13, top: '50%', transform: 'translateY(-50%)' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
        <input value={S.globalSearch || ''} onInput={(e: any) => { set({ globalSearch: e.target.value }); setGActive(-1) }} onKeyDown={onGlobalKey} role="combobox" aria-expanded={globalOpen} aria-controls="gsearch-listbox" aria-autocomplete="list" aria-activedescendant={activeIdx >= 0 && gOptions[activeIdx] ? gOptions[activeIdx].id : undefined} aria-label="חיפוש כללי במערכת" placeholder="חיפוש מטופלים, נושאים, עמודים… (⌘K)" className="shell-search-input" style={{ width: '100%', height: 40, border: '1px solid var(--divider)', background: 'var(--surface-2)', borderRadius: 10, padding: '0 40px 0 36px', fontSize: 14, outline: 'none' }} />
        {globalOpen && (
          <>
            <svg onClick={clearGlobal} className="shell-clear-icon" role="button" tabIndex={0} aria-label="ניקוי חיפוש" viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 96 }}><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            <div onClick={clearGlobal} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
            <div className="appbar-search-panel" id="gsearch-listbox" role="listbox" aria-label="תוצאות חיפוש" style={{ position: 'absolute', top: 48, insetInlineStart: 0, minWidth: 360, maxWidth: 'calc(100vw - 40px)', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: '0 18px 50px rgba(8,30,60,.2)', zIndex: 95, overflow: 'hidden', animation: 'pop .16s ease' }}>
              {globalHasResults && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 6px' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>מטופלים</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{globalCountLabel}</span>
                  </div>
                  {gPat.map(({ p }: any, i: number) => {
                    const a = avatarColors(p.color); const rm = riskMeta(p.risk)
                    return (
                      <div key={p.id} id={'gopt-p-' + p.id} role="option" aria-selected={activeIdx === i} onClick={() => { set({ globalSearch: '' }); navigate('patient', { patientId: p.id }) }} onMouseEnter={() => setGActive(i)} className="shell-row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', background: activeIdx === i ? 'var(--primary-surface)' : undefined }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: a.bg, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{p.initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{hlParts(p.name, gq).map((np, i) => <span key={i} style={{ background: np.bg, fontWeight: np.fw, borderRadius: 3 }}>{np.t}</span>)}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{hlParts(p.focus, gq).map((fp, i) => <span key={i} style={{ background: fp.bg, fontWeight: fp.fw, borderRadius: 3 }}>{fp.t}</span>)}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: rm.bg, color: rm.color }}>{rm.label}</span>
                      </div>
                    )
                  })}
                  <a onClick={goAllResults} className="shell-row-hover" style={{ display: 'block', textAlign: 'center', padding: 11, fontSize: 13, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', borderTop: '1px solid var(--line)' }}>כל התוצאות ›</a>
                </div>
              )}
              {globalHasRoutes && (
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  <div style={{ padding: '11px 16px 6px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>ניווט מהיר</div>
                  {gRt.map((r, j) => {
                    const fi = gPat.length + j
                    return (
                    <div key={r.label} id={'gopt-r-' + r.label} role="option" aria-selected={activeIdx === fi} onClick={() => { set({ globalSearch: '' }); r.go() }} onMouseEnter={() => setGActive(fi)} className="shell-row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', background: activeIdx === fi ? 'var(--primary-surface)' : undefined }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-secondary)"><path d={r.icon} /></svg>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                    </div>
                    )
                  })}
                </div>
              )}
              {globalNoResults && (
                <div style={{ padding: '22px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text-2)', fontWeight: 600, marginBottom: 3 }}>לא נמצאו תוצאות</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>נסו שם מטופל, נושא טיפול או שם עמוד</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="appbar-spacer" style={{ flex: 1 }} />

      {S.demoMode && (
        <div className="demo-pill" role="status" aria-label="מצב הדגמה פעיל · מוצגים נתוני הדגמה בלבד" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 6px 0 12px', borderRadius: 20, background: 'var(--warning-bg)', border: '1px solid var(--warning-strong)', flexShrink: 0 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warning-strong)', flexShrink: 0, animation: 'pulse 1.8s ease-in-out infinite' }} />
          <span className="demo-pill-label" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--warning)', whiteSpace: 'nowrap' }}>מצב הדגמה · נתונים לדוגמה</span>
          <button onClick={exitDemo} aria-label="יציאה ממצב הדגמה" title="יציאה ממצב הדגמה" className="shell-demo-x" style={{ width: 24, height: 24, border: 'none', borderRadius: '50%', background: 'rgba(120,70,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="var(--warning)"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>
      )}

      <button onClick={openUploadScreen} className="appbar-cta shell-cta" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--paper)"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
        <span className="cta-label">העלאת הקלטה</span>
      </button>

      {/* Always-visible help affordance (top-bar convention). Hidden on the tight phone
          appbar (≤560px) where Help lives in the nav drawer instead — see navConfig. */}
      <button onClick={() => navigate('help')} aria-label="עזרה ותמיכה" title="עזרה ותמיכה · שאלות נפוצות, מדריכים וקיצורי מקלדת" className="shell-iconbtn appbar-hide-sm" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="var(--text-secondary)"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" /></svg>
      </button>

      <div onClick={toggleTheme} onKeyDown={onKeyActivate(toggleTheme)} role="button" tabIndex={0} aria-label={themeToggleLabel} title={themeToggleLabel} className="shell-iconbtn" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="var(--text-secondary)"><path d={themeIcon} /></svg>
      </div>

      <NotificationsPopover />

      <div style={{ width: 1, height: 28, background: 'var(--divider)' }} />

      <div onClick={openAccount} onKeyDown={onKeyActivate(openAccount)} role="button" tabIndex={0} aria-label="החשבון שלי · הגדרות" className="shell-avatar-btn" style={{ width: 38, height: 38, borderRadius: '50%', background: avatarBg, color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
        {hasPhoto ? <img src={PS.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{profileInitials(PS.name)}</span>}
      </div>
    </header>
  )
}
