// Settings · Notifications tab — delivery channels, channel×category matrix,
// frequency + digest time, quiet hours. Ported from the prototype.
import React from 'react'
import { useApp } from '../../store/AppStore'
import { keyAct, Toggle } from './shared'

const NPD = {
  channels: { inapp: true, email: true, sms: false, push: true },
  cats: { summary: {}, risk: {}, appt: {}, message: {}, weekly: {}, product: {} },
  frequency: 'instant', digestTime: '18:00', quiet: true, quietFrom: '21:00', quietTo: '07:00',
}

const CHMETA = [
  { key: 'inapp', label: 'אפליקציה', short: 'אפ׳', desc: 'התראות בתוך המערכת ובפעמון', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z' },
  { key: 'email', label: 'דוא״ל', short: 'דוא״ל', desc: 'לכתובת rotem@clinic.co.il', icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z' },
  { key: 'sms', label: 'SMS', short: 'SMS', desc: 'הודעת טקסט למספר שמסתיים ב־4471', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
  { key: 'push', label: 'דחיפה לנייד', short: 'דחיפה', desc: 'התראות דחיפה באפליקציית המובייל', icon: 'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z' },
]

const CATMETA = [
  { key: 'summary', title: 'סיכום AI מוכן', desc: 'עיבוד פגישה הסתיים', critical: false },
  { key: 'risk', title: 'דגלי סיכון', desc: 'זוהו סימני אזהרה בפגישה', critical: true },
  { key: 'appt', title: 'תזכורות פגישות', desc: 'לפני פגישה מתוכננת', critical: false },
  { key: 'message', title: 'הודעות ממטופלים', desc: 'הודעה חדשה בתיבת ההודעות', critical: false },
  { key: 'weekly', title: 'סיכום שבועי', desc: 'דוח פעילות שבועי בדוא״ל', critical: false },
  { key: 'product', title: 'עדכוני מוצר', desc: 'פיצ׳רים וחדשות', critical: false },
]

const FREQ = [
  { key: 'instant', label: 'מיידי', desc: 'ברגע שמשהו קורה' },
  { key: 'hourly', label: 'סיכום שעתי', desc: 'איגוד התראות כל שעה' },
  { key: 'daily', label: 'סיכום יומי', desc: 'עדכון מרוכז פעם ביום' },
]

const timeInputStyle: React.CSSProperties = { height: 40, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14, background: 'var(--paper)', color: 'var(--text)', outline: 'none' }

export default function NotificationsTab() {
  const { S, set, toast } = useApp()
  const NP = S.notifPrefs || NPD
  const setNP = (mut: (n: any) => void) => {
    const next = JSON.parse(JSON.stringify(S.notifPrefs || NPD))
    mut(next)
    set({ notifPrefs: next })
  }

  const digestShow = (NP.frequency || 'instant') !== 'instant'
  const toggleQuiet = () => setNP((n) => { n.quiet = !n.quiet })
  // Moment for Me — re-enabling also clears a previous dismissal so the card returns
  const toggleMoment = () => {
    const next = !S.momentEnabled
    set(next ? { momentEnabled: true, momentDismissed: false } : { momentEnabled: false })
    toast(next ? 'רגע בשבילי הופעל · ההצעה תופיע בדף הבית' : 'רגע בשבילי כובה')
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>התראות</h2>
      <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 14 }}>בחרו אילו התראות לקבל, באילו ערוצים ובאיזו תדירות.</p>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.04em', marginBottom: 10 }}>רגע בשבילי</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '13px 0', borderBottom: '1px solid var(--line)', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>הצעות להפסקה קצרה בין פגישות</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>נשימה, קרקוע, הרהור או מתיחה · תמיד אופציונלי, לעולם לא באמצע עבודה</div>
        </div>
        <Toggle checked={!!S.momentEnabled} onToggle={toggleMoment} ariaLabel="הצעות רגע בשבילי" />
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.04em', marginBottom: 10 }}>ערוצי מסירה</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
        {CHMETA.map((c) => {
          const on = !!NP.channels[c.key]
          const tog = () => setNP((n) => { n.channels[c.key] = !n.channels[c.key] })
          return (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d={c.icon} /></svg>
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.desc}</div>
                </div>
              </div>
              <Toggle checked={on} onToggle={tog} ariaLabel={c.label} />
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.04em', marginBottom: 10 }}>התראות לפי קטגוריה</div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-muted)' }}>סמנו באילו ערוצים לקבל כל סוג התראה. ערוץ שכבוי למעלה מושבת כאן.</p>
      <div style={{ border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px 56px', alignItems: 'center', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ padding: '11px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>קטגוריה</div>
          {CHMETA.map((c) => (
            <div key={c.key} style={{ padding: '11px 0', fontSize: 11.5, fontWeight: 700, color: NP.channels[c.key] ? 'var(--text-secondary)' : 'var(--text-disabled)', textAlign: 'center' }}>{c.short}</div>
          ))}
        </div>
        {CATMETA.map((cat) => {
          const row = (NP.cats && NP.cats[cat.key]) || {}
          return (
            <div key={cat.key} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px 56px', alignItems: 'center', borderTop: '1px solid var(--line)' }}>
              <div style={{ padding: '13px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.title}</span>
                  {cat.critical && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'var(--error-bg-soft)', color: 'var(--error)' }}>קריטי</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{cat.desc}</div>
              </div>
              {CHMETA.map((c) => {
                const chOn = !!NP.channels[c.key]
                const on = chOn && !!row[c.key]
                const disabled = !chOn
                const click = () => {
                  if (disabled) return
                  setNP((n) => { n.cats[cat.key] = n.cats[cat.key] || {}; n.cats[cat.key][c.key] = !n.cats[cat.key][c.key] })
                }
                return (
                  <div key={c.key} style={{ display: 'flex', justifyContent: 'center' }}>
                    <div onClick={click} onKeyDown={keyAct(click)} role="checkbox" aria-checked={on} aria-label={cat.title + ' · ' + c.label} tabIndex={disabled ? -1 : 0} style={{ width: 24, height: 24, borderRadius: 7, border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border-input)'}`, background: on ? 'var(--primary)' : 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? '.4' : '1', transition: 'border-color .15s,background .15s' }}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill={on ? 'var(--on-accent)' : 'transparent'}><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.04em', marginBottom: 12 }}>תדירות</div>
      <div role="radiogroup" aria-label="תדירות התראות" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {FREQ.map((f) => {
          const on = (NP.frequency || 'instant') === f.key
          const sel = () => setNP((n) => { n.frequency = f.key })
          return (
            <div key={f.key} onClick={sel} onKeyDown={keyAct(sel)} role="radio" tabIndex={0} aria-checked={on} aria-label={f.label} className="set-hov-border" style={{ border: `1.5px solid ${on ? 'var(--primary)' : 'var(--divider)'}`, background: on ? 'var(--primary-surface)' : 'var(--paper)', borderRadius: 11, padding: '13px 14px', cursor: 'pointer' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{f.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          )
        })}
      </div>
      {digestShow ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, fontSize: 13.5, color: 'var(--text-2)' }}>
          <span>שעת שליחת הסיכום</span>
          <input type="time" value={NP.digestTime || '18:00'} onChange={(e) => { const val = e.target.value; setNP((n) => { n.digestTime = val }) }} aria-label="שעת שליחת סיכום" dir="ltr" className="set-input" style={timeInputStyle} />
        </div>
      ) : (
        <div style={{ height: 28 }}></div>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.04em', marginBottom: 12 }}>שעות שקט</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>השתקת התראות בשעות מסוימות</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>התראות קריטיות (דגלי סיכון) יימסרו תמיד</div>
          </div>
        </div>
        <Toggle checked={!!NP.quiet} onToggle={toggleQuiet} ariaLabel="שעות שקט" />
      </div>
      {!!NP.quiet && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 0 2px', fontSize: 13.5, color: 'var(--text-2)' }}>
          <span>מ־</span>
          <input type="time" value={NP.quietFrom || '21:00'} onChange={(e) => { const val = e.target.value; setNP((n) => { n.quietFrom = val }) }} aria-label="תחילת שעות שקט" dir="ltr" className="set-input" style={timeInputStyle} />
          <span>עד</span>
          <input type="time" value={NP.quietTo || '07:00'} onChange={(e) => { const val = e.target.value; setNP((n) => { n.quietTo = val }) }} aria-label="סיום שעות שקט" dir="ltr" className="set-input" style={timeInputStyle} />
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <button onClick={() => toast('ההגדרות נשמרו')} style={{ height: 44, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>שמירת שינויים</button>
      </div>
    </div>
  )
}
