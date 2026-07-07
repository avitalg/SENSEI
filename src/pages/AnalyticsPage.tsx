// Analytics ("תובנות") — ported from 'Sensei demo.dc.html' (template lines 1245–1306 + renderVals analytics slice).
import { useApp } from '../store/AppStore'
import { CARD_SHADOW } from '../utils/styles'

export default function AnalyticsPage() {
  const { S, set } = useApp()

  const onAnalyticsPeriod = (e: any) => set({ analyticsPeriod: e.target.value })
  const pMult = S.analyticsPeriod === 'week' ? 0.25 : S.analyticsPeriod === 'quarter' ? 3.1 : 1
  const highRisk = S.patients.filter((p: any) => p.risk === 'high').length
  const analyticsKPIs = [
    { label: S.analyticsPeriod === 'week' ? 'פגישות השבוע' : S.analyticsPeriod === 'quarter' ? 'פגישות הרבעון' : 'פגישות החודש', value: String(Math.round(38 * pMult)), delta: S.analyticsPeriod === 'week' ? '+8%' : S.analyticsPeriod === 'quarter' ? '+18%' : '+12%', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z', bg: 'var(--primary-tint)', color: 'var(--primary)' },
    { label: 'זמן סיכום ממוצע', value: '2.1 דק׳', delta: 'במקום 15 דק׳', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z', bg: 'var(--secondary-tint)', color: 'var(--secondary-strong)' },
    { label: 'אחוז תמלול תקין', value: '94%', delta: 'יעד: 80%', icon: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', bg: 'var(--info-bg)', color: 'var(--info)' },
    { label: 'התראות סיכון פתוחות', value: String(highRisk), delta: highRisk + ' בעדיפות גבוהה', up: false, icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z', bg: 'var(--error-bg)', color: 'var(--error)' },
  ]

  const weekVals = [22, 28, 19, 31, 26, 34, 30, 38]
  const wkMax = Math.max(...weekVals)
  const sessionsChart = weekVals.map((val, i) => ({ h: Math.round((val / wkMax) * 100) + '%', val, label: 'ש׳' + (i + 1) }))
  // One coherent screen-reader summary per chart, built from the same data, so
  // assistive tech hears a sentence instead of the loose run of numbers the
  // div-bars would otherwise expose (verified via the a11y tree).
  const sessionsTrend = weekVals[weekVals.length - 1] > weekVals[0] ? 'במגמת עלייה' : weekVals[weekVals.length - 1] < weekVals[0] ? 'במגמת ירידה' : 'יציב'
  const sessionsSummary = 'מספר פגישות מעובדות לפי שבוע, ' + sessionsTrend + ': ' + weekVals.join(', ')

  const riskCounts = {
    high: highRisk,
    medium: S.patients.filter((p: any) => p.risk === 'medium').length,
    low: S.patients.filter((p: any) => p.risk === 'low').length,
  }
  const riskTot = S.patients.length || 1
  const riskDist = [
    { label: 'סיכון גבוה', n: riskCounts.high, pct: Math.round((riskCounts.high / riskTot) * 100), color: 'var(--error)' },
    { label: 'סיכון בינוני', n: riskCounts.medium, pct: Math.round((riskCounts.medium / riskTot) * 100), color: 'var(--warning)' },
    { label: 'סיכון נמוך', n: riskCounts.low, pct: Math.round((riskCounts.low / riskTot) * 100), color: 'var(--success)' },
  ]

  const riskSummary = 'התפלגות רמות סיכון: ' + riskDist.map((r: any) => r.label + ' ' + r.n + ' (' + r.pct + '%)').join(', ')

  const TOPICS = [{ t: 'חרדה ולחץ', n: 24 }, { t: 'ויסות רגשי', n: 19 }, { t: 'יחסים בין-אישיים', n: 16 }, { t: 'דימוי עצמי', n: 12 }, { t: 'שינה ושגרה', n: 9 }]
  const tMax = Math.max(...TOPICS.map((x) => x.n))
  const topTopics = TOPICS.map((x) => ({ t: x.t, n: x.n, w: Math.round((x.n / tMax) * 100) + '%' }))
  const topicsSummary = 'נושאים נפוצים בפגישות לפי מספר אזכורים: ' + TOPICS.map((x) => x.t + ' ' + x.n).join(', ')

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>תובנות</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>תמונת מצב של הקליניקה והמטופלים</p>
        </div>
        <select value={S.analyticsPeriod} onChange={onAnalyticsPeriod} aria-label="בחירת תקופה" style={{ height: 44, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 14px', fontSize: 14, background: 'var(--paper)', color: 'var(--text-2)', outline: 'none', cursor: 'pointer' }}>
          <option value="week">השבוע האחרון</option>
          <option value="month">החודש האחרון</option>
          <option value="quarter">הרבעון האחרון</option>
        </select>
      </div>

      <div className="rx-kpi4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {analyticsKPIs.map((k: any) => (
          <div key={k.label} style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{k.label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill={k.color} aria-hidden="true"><path d={k.icon} /></svg>
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.6px', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: k.color, fontWeight: 600, marginTop: 6 }}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 22 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>פגישות לאורך זמן</h2>
          <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--text-muted)' }}>מספר פגישות שעובדו בכל שבוע</p>
          <div role="img" aria-label={sessionsSummary} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 170 }}>
            {sessionsChart.map((c: any) => (
              <div key={c.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{c.val}</span>
                <div title={c.val + ' פגישות'} style={{ width: '100%', height: c.h, minHeight: 8, borderRadius: '7px 7px 0 0', background: 'var(--primary)' }}></div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 22 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>התפלגות רמות סיכון</h2>
          <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--text-muted)' }}>לפי כלל המטופלים הפעילים</p>
          <div role="img" aria-label={riskSummary} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {riskDist.map((r: any) => (
              <div key={r.label}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.color }}></span>{r.label}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{r.n} ({r.pct}%)</span>
                </div>
                <div style={{ height: 9, borderRadius: 5, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 5, background: r.color, width: r.pct + '%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>נושאים נפוצים בפגישות</h2>
        <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--text-muted)' }}>הנושאים שעלו הכי הרבה בניתוחי ה-AI</p>
        <div role="img" aria-label={topicsSummary} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {topTopics.map((t: any) => (
            <div key={t.t} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 140, flexShrink: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{t.t}</span>
              <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,var(--primary-light),var(--primary))', width: t.w }}></div>
              </div>
              <span style={{ width: 34, textAlign: 'start', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{t.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
