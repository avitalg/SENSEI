// Settings · Profile tab — identity, avatar, professional details, form of
// address, account summary and quick links. Ported from the prototype.
import React, { useRef } from 'react'
import { useApp } from '../../store/AppStore'
import { AVATAR_PALETTE, EMAIL_RE, hg } from '../../utils'
import { initials, keyAct } from './shared'
import { labelStyle } from '../../utils/styles'

// Avatar identity colors come from the design system's avatar scale only.
// The previous picker offered green/amber/red/purple — green/amber/red collide
// with the semantic status colors (an avatar in --error red reads as an alert)
// and purple is outside the system palette entirely. A previously-saved
// off-scale choice still renders (avatarColors handles any raw hex); it simply
// no longer appears as a selectable swatch.
const AV_COLORS = AVATAR_PALETTE.slice(0, 6)
const AV_COLOR_NAMES: Record<string, string> = {
  [AVATAR_PALETTE[0]]: 'כחול',
  [AVATAR_PALETTE[1]]: 'תכלת',
  [AVATAR_PALETTE[2]]: 'נייבי',
  [AVATAR_PALETTE[3]]: 'כחול בהיר',
  [AVATAR_PALETTE[4]]: 'כחול עמוק',
  [AVATAR_PALETTE[5]]: 'תכלת עמוקה',
}

function normGender(g: any): string {
  const HG = (window as any).HG
  if (HG && HG.norm) return HG.norm(g)
  return g === 'm' || g === 'f' ? g : 'u'
}

// Read an image file, cover-crop + downscale to a small square, hand back a
// compact data URL (port of the prototype's _readAvatarFile).
function readAvatarFile(file: File, cb: (url: string) => void, fail: (msg: string) => void) {
  try {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        try {
          const size = 220
          const c = document.createElement('canvas'); c.width = size; c.height = size
          const ctx = c.getContext('2d')!
          const scale = Math.max(size / img.width, size / img.height)
          const w = img.width * scale, h = img.height * scale
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
          cb(c.toDataURL('image/jpeg', 0.85))
        } catch { fail('עיבוד התמונה נכשל') }
      }
      img.onerror = () => fail('לא ניתן לטעון את התמונה')
      img.src = reader.result as string
    }
    reader.onerror = () => fail('קריאת הקובץ נכשלה')
    reader.readAsDataURL(file)
  } catch { fail('העלאת התמונה נכשלה') }
}

const inputStyle: React.CSSProperties = { width: '100%', height: 44, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, outline: 'none' }
const ltrInputStyle: React.CSSProperties = { ...inputStyle, textAlign: 'start' }

export default function ProfileTab() {
  const { S, set, toast } = useApp()
  const PS = S.profile, PD = S.profileDraft
  const setPD = (patch: any) => set((s: any) => ({ profileDraft: { ...s.profileDraft, ...patch } }))
  const fileRef = useRef<HTMLInputElement>(null)

  // validation (surfaced only after a save attempt, cleared live as fixed)
  const nameErr = !String(PD.name || '').trim() ? 'יש להזין שם מלא' : ''
  const emailErr = !String(PD.email || '').trim() ? 'יש להזין כתובת דוא״ל' : (!EMAIL_RE.test(String(PD.email).trim()) ? 'כתובת דוא״ל לא תקינה' : '')
  const valid = !nameErr && !emailErr
  const dirty = JSON.stringify(PD) !== JSON.stringify(PS)
  const showName = S.profileSaveTried && !!nameErr
  const showEmail = S.profileSaveTried && !!emailErr

  const saveProfile = () => {
    if (!valid) { set({ profileSaveTried: true }); toast('יש לתקן את השדות המסומנים', 'error'); return }
    if (!dirty) return
    const clean = { ...PD, name: String(PD.name).trim(), email: String(PD.email).trim(), title: String(PD.title).trim(), org: String(PD.org).trim() }
    set({ profile: clean, profileDraft: clean, profileSaveTried: false })
    toast('הפרופיל עודכן ונשמר')
  }
  const discardProfile = () => {
    if (!dirty) return
    set({ profileDraft: { ...PS }, profileSaveTried: false })
    toast('השינויים בוטלו', 'info')
  }

  // avatar controls
  const openAvatarPicker = () => { try { fileRef.current?.click() } catch { /* noop */ } }
  const onAvatarPick = (e: any) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    if (!/^image\//.test(f.type)) { toast('יש לבחור קובץ תמונה', 'error'); e.target.value = ''; return }
    if (f.size > 6 * 1024 * 1024) { toast('התמונה גדולה מדי · עד 6MB', 'error'); e.target.value = ''; return }
    readAvatarFile(f, (url) => { setPD({ avatar: url }); toast('התמונה נטענה · לחצו על שמירה כדי להחיל', 'info') }, (m) => toast(m, 'error'))
    e.target.value = ''
  }
  const removeAvatar = () => setPD({ avatar: '' })

  const dHasPhoto = !!PD.avatar
  const dAvatarBg = PD.avatarColor || 'var(--primary)'

  // form of address (grammatical gender) — drives gender-aware Hebrew microcopy
  const addrOpts = [
    { key: 'f', label: 'לשון נקבה' },
    { key: 'm', label: 'לשון זכר' },
    { key: 'u', label: 'ניטרלי' },
  ].map((o) => {
    const on = normGender(PD.gender) === o.key
    return {
      key: o.key, label: o.label, on,
      bg: on ? 'var(--primary)' : 'var(--paper)', color: on ? 'var(--paper)' : 'var(--text-2)',
      border: on ? 'var(--primary)' : 'var(--border-input)', weight: on ? 700 : 600,
      onClick: () => setPD({ gender: o.key }),
    }
  })

  const avatarSwatches = AV_COLORS.map((c) => {
    const on = (PD.avatarColor || AVATAR_PALETTE[0]) === c
    const select = () => setPD({ avatarColor: c })
    return { color: c, on, ring: on ? 'var(--text)' : 'transparent', check: on ? '1' : '0', select, onKey: keyAct(select), label: 'צבע רקע לאווטאר: ' + (AV_COLOR_NAMES[c] || c) }
  })

  // read-only account summary + cross-links to the other preference surfaces
  const accountSummary = [
    { label: 'סוג חשבון', value: 'מנוי מקצועי · Pro', dir: 'rtl' },
    { label: hg('[[חבר מאז|חברה מאז|במערכת מאז]]', S.profile.gender), value: 'ינואר 2025', dir: 'rtl' },
    { label: 'מזהה חשבון', value: 'SNS-27104882', dir: 'ltr' },
  ]
  const qlNav = (tab: string) => () => set({ settingsTab: tab })
  const profileQuickLinks = [
    { label: 'אבטחה וסיסמה', desc: 'סיסמה, אימות דו-שלבי והתחברויות', icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', go: qlNav('account') },
    { label: 'התראות', desc: 'ערוצי מסירה, קטגוריות ושעות שקט', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z', go: qlNav('notifications') },
    { label: 'פרטיות ואבטחת מידע', desc: 'שמירת אודיו, יומן פעילות ומחיקת מידע', icon: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z', go: qlNav('privacy') },
    { label: 'נגישות', desc: 'גודל טקסט, ניגודיות, תנועה וקריאה', icon: 'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z', go: qlNav('accessibility') },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 700 }}>פרופיל</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5 }}>פרטי הזהות והמידע המקצועי שמופיעים במערכת ובדוחות</p>
        </div>
        {dirty && (
          <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--warning-strong)', background: 'var(--warning-bg)', padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warning-strong)' }}></span>
            שינויים לא שמורים
          </span>
        )}
      </div>

      {/* identity header: avatar + upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 74, height: 74, borderRadius: '50%', background: dAvatarBg, color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 25, flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 8px rgba(16,40,80,.18)' }}>
          {dHasPhoto
            ? <img src={PD.avatar} alt="תצוגת תמונת הפרופיל" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>{initials(PD.name)}</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 9 }}>
            <input ref={fileRef} type="file" id="profile-avatar-input" accept="image/*" onChange={onAvatarPick} style={{ display: 'none' }} />
            <button onClick={openAvatarPicker} className="set-hov-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 15px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" /></svg>
              העלאת תמונה
            </button>
            {dHasPhoto && (
              <button onClick={removeAvatar} className="set-hov-danger" style={{ height: 38, padding: '0 14px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'inherit' }}>הסרה</button>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>JPG או PNG · עד 6MB. ללא תמונה. יוצגו ראשי התיבות בצבע שתבחרו.</div>
        </div>
      </div>

      {/* avatar color (when no photo) */}
      {!dHasPhoto && (
        <div style={{ marginBottom: 26 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 9 }}>צבע רקע לאווטאר</label>
          <div role="radiogroup" aria-label="צבע רקע לאווטאר" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {avatarSwatches.map((sw) => (
              <div key={sw.color} onClick={sw.select} onKeyDown={sw.onKey} role="radio" tabIndex={0} aria-checked={sw.on} aria-label={sw.label} style={{ width: 34, height: 34, borderRadius: '50%', background: sw.color, cursor: 'pointer', boxShadow: `0 0 0 2px var(--paper),0 0 0 4px ${sw.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--on-accent)" style={{ opacity: sw.check as any }}><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* personal + professional details */}
      <div className="rx-2to1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 16px', marginBottom: 18 }}>
        <div>
          <label style={labelStyle}>שם מלא</label>
          <input value={PD.name} onChange={(e) => setPD({ name: e.target.value })} aria-label="שם מלא" autoComplete="name" className="set-input" style={{ ...inputStyle, border: `1px solid ${showName ? 'var(--error)' : 'var(--border-input)'}` }} />
          {showName && <div role="alert" style={{ marginTop: 6, fontSize: 12.5, color: 'var(--error)', fontWeight: 600 }}>{nameErr}</div>}
        </div>
        <div>
          <label style={labelStyle}>התמחות / תפקיד</label>
          <input value={PD.title} onChange={(e) => setPD({ title: e.target.value })} aria-label="התמחות או תפקיד" autoComplete="organization-title" className="set-input" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>דוא״ל</label>
          <input value={PD.email} onChange={(e) => setPD({ email: e.target.value })} aria-label="דוא״ל" autoComplete="email" dir="ltr" className="set-input" style={{ ...ltrInputStyle, border: `1px solid ${showEmail ? 'var(--error)' : 'var(--border-input)'}` }} />
          {showEmail && <div role="alert" style={{ marginTop: 6, fontSize: 12.5, color: 'var(--error)', fontWeight: 600 }}>{emailErr}</div>}
        </div>
        <div>
          <label style={labelStyle}>טלפון</label>
          <input value={PD.phone} onChange={(e) => setPD({ phone: e.target.value })} aria-label="טלפון" autoComplete="tel" dir="ltr" className="set-input" style={ltrInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>מספר רישיון</label>
          <input value={PD.license} onChange={(e) => setPD({ license: e.target.value })} aria-label="מספר רישיון" dir="ltr" className="set-input" style={ltrInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>מרפאה / ארגון</label>
          <input value={PD.org} onChange={(e) => setPD({ org: e.target.value })} aria-label="מרפאה או ארגון" autoComplete="organization" className="set-input" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>אודות (מופיע בפרופיל המקצועי)</label>
        <textarea value={PD.bio} onChange={(e) => setPD({ bio: e.target.value })} aria-label="אודות" rows={3} placeholder="תיאור קצר על הרקע וההתמחות שלכם" className="set-input" style={{ width: '100%', border: '1px solid var(--border-input)', borderRadius: 10, padding: '11px 12px', fontSize: 14.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }}></textarea>
      </div>

      <div style={{ marginBottom: 22, maxWidth: 460 }}>
        <label style={labelStyle}>צורת פנייה</label>
        <div role="radiogroup" aria-label="צורת פנייה" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {addrOpts.map((o) => (
            <button key={o.key} onClick={o.onClick} role="radio" aria-checked={o.on} className="set-hov-border" style={{ minWidth: 104, height: 42, padding: '0 16px', border: `1px solid ${o.border}`, borderRadius: 10, background: o.bg, color: o.color, fontSize: 13.5, fontWeight: o.weight, cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
          ))}
        </div>
        <div style={{ marginTop: 7, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>קובעת כיצד המערכת פונה אליכם בכל הטקסטים: כפתורים, הודעות, דוחות וסיכומי AI.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
        <button onClick={saveProfile} style={{ height: 44, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: dirty && valid ? 'pointer' : 'not-allowed', opacity: dirty && valid ? '1' : '.55', fontFamily: 'inherit' }}>שמירת שינויים</button>
        <button onClick={discardProfile} className="set-hov-border-sec" style={{ height: 44, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? '1' : '.45', fontFamily: 'inherit' }}>ביטול שינויים</button>
      </div>

      {/* account summary + cross-links */}
      <h3 style={{ margin: '34px 0 12px', fontSize: 14.5, fontWeight: 700, color: 'var(--text-2)' }}>פרטי חשבון</h3>
      <div style={{ border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden', marginBottom: 26 }}>
        {accountSummary.map((a) => (
          <div key={a.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{a.label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }} dir={a.dir}>{a.value}</span>
          </div>
        ))}
      </div>

      <h3 style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 700, color: 'var(--text-2)' }}>ניהול והעדפות</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="rx-2to1">
        {profileQuickLinks.map((q) => (
          <div key={q.label} onClick={q.go} onKeyDown={keyAct(q.go)} role="button" tabIndex={0} aria-label={q.label} className="set-quick" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', border: '1px solid var(--divider)', borderRadius: 12, cursor: 'pointer', background: 'var(--paper)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d={q.icon} /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{q.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{q.desc}</div>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ flexShrink: 0, transform: 'scaleX(-1)' }}><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
          </div>
        ))}
      </div>
    </div>
  )
}
