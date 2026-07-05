// Ported from 'Sensei demo.dc.html' — dedup screen (template lines 1200–1244,
// logic: v.isDedup block + buildDupClusters()).
import { useApp } from '../store/AppStore'
import { avatarColors, riskMeta, hg } from '../utils'
import './dedup.css'
import { buildDupClusters } from '../utils/dedup'

const SHADOW = '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)'

// Name/phone/email-similarity clustering — ported verbatim from the prototype.

export default function DedupPage() {
  const { S, set, navigate } = useApp()
  const clusters = buildDupClusters(S.patients)
  const goPatients = () => navigate('patients')

  const memCard = (m: any, canonical: boolean) => {
    const a = avatarColors(m.color); const rm = riskMeta(m.risk)
    return {
      id: m.id, name: m.name, initials: m.initials, avBg: a.bg, avColor: a.color,
      riskLabel: rm.label, riskColor: rm.color, riskBg: rm.bg,
      focus: m.focus, sessions: m.sessions, phone: m.phone, email: m.email, since: m.since, age: m.age,
      ageLabel: hg('[[בן|בת]] ', m.gender) + m.age,
      canonical, cardBorder: canonical ? 'var(--success-border)' : 'var(--divider)',
    }
  }

  const dupClusters = clusters.map((c, idx) => {
    const conf = c.confidence // canonical: derived once in the engine
    const signals = [...new Set(Object.values(c.meta).flatMap((x) => x.signals))]
    const riskLevel = conf >= 85 ? 'גבוה' : conf >= 70 ? 'בינוני' : 'נמוך'
    const canonId = c.canonicalId // canonical: proposed surviving record from the engine
    return {
      cid: 'C' + (idx + 1), conf, riskLevel,
      riskColor: conf >= 85 ? 'var(--error)' : conf >= 70 ? 'var(--warning)' : 'var(--text-secondary)',
      riskBg: conf >= 85 ? 'var(--error-bg)' : conf >= 70 ? 'var(--warning-bg)' : 'var(--surface-2)',
      signals, members: c.members.map((m) => memCard(m, m.id === canonId)),
      onMerge: () => set({ dialog: 'merge', mergeClusterIdx: idx, mergeCanonicalId: canonId }),
    }
  })
  const noDuplicates = clusters.length === 0

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <a onClick={goPatients} className="ddp-crumb" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>מטופלים</a><span>›</span><span style={{ color: 'var(--text-2)', fontWeight: 600 }}>איתור כפילויות</span>
      </div>
      <div style={{ marginBottom: 8 }}><h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>איתור ומיזוג כפילויות</h1><p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>שמירה על רשומה אחת לכל מטופל. מקור אמת יחיד</p></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '10px 14px', marginBottom: 22, fontSize: 13, color: 'var(--text-secondary)' }}><svg viewBox="0 0 24 24" width="17" height="17" fill="var(--info)"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>איתור אוטומטי בלבד. לא מתבצע שינוי ללא אישור מפורש שלכם. המיזוג ניתן לסקירה לפני ביצוע.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {dupClusters.map((c) => (
          <div key={c.cid} style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: SHADOW, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>התאמה {c.cid}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: c.riskBg, color: c.riskColor }}>ודאות {c.conf}% · סיכון {c.riskLevel}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.signals.map((sg) => (<span key={sg} style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--text-secondary)', fontWeight: 600 }}>{sg}</span>))}
              </div>
              <button onClick={c.onMerge} className="ddp-merge" style={{ marginInlineStart: 'auto', height: 38, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>סקירת מיזוג</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '18px 20px' }}>
              {c.members.map((m) => (
                <div key={m.id} style={{ border: '1.5px solid ' + m.cardBorder, borderRadius: 10, padding: 16, position: 'relative' }}>
                  {m.canonical && (<span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--success-bg)', color: 'var(--success)' }}>רשומה ראשית מוצעת</span>)}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}><div style={{ width: 44, height: 44, borderRadius: '50%', background: m.avBg, color: m.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{m.initials}</div><div><div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div><div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{m.ageLabel} · {m.focus}</div></div></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>טלפון</span><span dir="ltr" style={{ fontWeight: 600 }}>{m.phone}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>דוא״ל</span><span dir="ltr" style={{ fontWeight: 600 }}>{m.email}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>פגישות</span><span style={{ fontWeight: 600 }}>{m.sessions}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>מטופל מאז</span><span dir="ltr" style={{ fontWeight: 600 }}>{m.since}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {noDuplicates && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: SHADOW, padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><svg viewBox="0 0 24 24" width="32" height="32" fill="var(--success)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg></div>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>לא נמצאו כפילויות</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>כל רשומות המטופלים ייחודיות. מקור האמת שלכם נקי.</p>
        </div>
      )}
    </div>
  )
}
