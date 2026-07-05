// Timeline — a single patient's session history as a vertical timeline.
// Ported from 'Sensei demo.dc.html' template lines 1077–1112 + renderVals (v.isTimeline).
import { useApp } from '../store/AppStore'
import { getPatient, riskMeta } from '../utils'
import './timeline.css'
import { SESSION_DATES, SESSION_TOPICS, sessionSummaries, sessionRisk } from '../data/sessions'
import { CARD_SHADOW } from '../utils/styles'


// ---- buildSessions(p) — ported verbatim from the prototype logic class ----
function buildSessions(p: any, S: any, ctx: { navigate: any }) {
  const dates = SESSION_DATES
  const topicPool = SESSION_TOPICS
  const summaries = sessionSummaries(p)
  const riskByIndex = sessionRisk(p)
  const n = Math.min(p.sessions, 8)
  const deleted = S.deletedSessions || []
  const out: any[] = []
  for (let i = 0; i < n; i++) {
    const num = p.sessions - i
    const key = p.id + '#' + num
    if (deleted.indexOf(key) !== -1) continue
    const rk = riskByIndex[i]
    const rm = riskMeta(rk)
    out.push({
      num,
      date: dates[i],
      topics: topicPool[i % topicPool.length],
      summary: summaries[i % summaries.length],
      riskChips: rk === 'none' ? [] : [{ label: rm.label, color: rm.color, bg: rm.bg }],
      onSummary: () => ctx.navigate('summary', { patientId: p.id }),
    })
  }
  return out
}

export default function TimelinePage() {
  const { S, navigate } = useApp()

  const cp = getPatient(S.patients, S.patientId)
  const patientOptions: string[] = S.patients.map((p: any) => p.name)
  const onTimelinePatient = (e: any) => {
    const p = S.patients.find((x: any) => x.name === e.target.value)
    if (p) navigate(S.route, { patientId: p.id })
  }
  const cpSessions = buildSessions(cp, S, { navigate })
  const skeletonRows = [1, 2, 3, 4]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>ציר זמן</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>היסטוריית פגישות · {cp.name}</p>
        </div>
        <select
          onChange={onTimelinePatient}
          value={cp.name}
          aria-label="בחירת מטופל"
          className="tl-patient-select"
          style={{ height: 44, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 14px', fontSize: 14, background: 'var(--paper)', color: 'var(--text-2)', outline: 'none', cursor: 'pointer' }}
        >
          {patientOptions.map((po) => <option key={po}>{po}</option>)}
        </select>
      </div>

      {S.loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {skeletonRows.map((k) => (
            <div key={k} style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20 }}>
              <div className="skeleton" style={{ width: '30%', height: 14, borderRadius: 6, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '90%', height: 11, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      )}

      {!S.loading && (
        <div style={{ position: 'relative', paddingInlineStart: 30 }}>
          <div style={{ position: 'absolute', insetInlineStart: 9, top: 8, bottom: 8, width: 2, background: 'var(--primary-border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {cpSessions.map((s: any) => (
              <div key={s.num} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', insetInlineStart: -27, top: 18, width: 14, height: 14, borderRadius: '50%', background: 'var(--primary)', border: '3px solid var(--paper)', boxShadow: '0 0 0 2px var(--primary-border)' }} />
                <div
                  onClick={s.onSummary}
                  role="button"
                  tabIndex={0}
                  className="tl-card"
                  style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '18px 22px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>פגישה {s.num}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }} dir="ltr">{s.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.riskChips.map((rc: any) => (
                        <span key={rc.label} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: rc.bg, color: rc.color }}>{rc.label}</span>
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: '0 0 11px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>{s.summary}</p>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {s.topics.map((t: string) => (
                      <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, background: 'var(--surface-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
