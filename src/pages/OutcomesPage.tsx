// Outcome measures (PROMs) — KPI stats + standard-treatment data table.
// Ported from 'Sensei demo.dc.html' template lines 2245–2280 + renderVals (~3507–3630).
// The prototype embeds the shared DataGrid; per the porting guide (§12) it is ported here as the
// standard-treatment data table: title, search input, measure filter, sortable scope="col"
// headers, rows, empty state. Sorting/filtering reuse the shared tableSort engine + SortableTh.
import { useState } from 'react'
import { useApp } from '../store/AppStore'
import { getPatient } from '../utils'
import './outcomes.css'
import { CARD_SHADOW, tdStyle } from '../utils/styles'
import SortableTh from '../components/shared/SortableTh'
import { sortRows, nextSort, type SortState } from '../utils/tableSort'
import { onKeyActivate } from '../utils/a11y'


const MEASURE_META: Record<string, { bg: string; color: string }> = {
  'PHQ-9': { bg: 'var(--primary-surface)', color: 'var(--primary)' },
  'GAD-7': { bg: 'var(--secondary-tint)', color: 'var(--secondary-strong)' },
  'PCL-5': { bg: 'var(--primary-surface)', color: 'var(--primary)' },
  'Y-BOCS': { bg: 'var(--secondary-tint)', color: 'var(--secondary-strong)' },
  'EDE-Q': { bg: 'var(--surface-2)', color: 'var(--text-secondary)' },
}
const SEV_COLOR: Record<string, string> = { low: 'var(--success)', mid: 'var(--warning-strong)', high: 'var(--error)' }
const SEV_RANK: Record<string, number> = { low: 0, mid: 1, high: 2 }

const OUTCOMES = [
  { pid: 'p1', measure: 'GAD-7', score: '8', delta: -4, band: 'חרדה קלה', sev: 'low', date: '28.06.2026' },
  { pid: 'p3', measure: 'PCL-5', score: '42', delta: -6, band: 'סימפטומים בינוניים-גבוהים', sev: 'high', date: '27.06.2026' },
  { pid: 'p2', measure: 'PHQ-9', score: '6', delta: -3, band: 'דיכאון מינימלי', sev: 'low', date: '25.06.2026' },
  { pid: 'p5', measure: 'EDE-Q', score: '3.1', delta: -1, band: 'רמה בינונית', sev: 'mid', date: '24.06.2026' },
  { pid: 'p8', measure: 'Y-BOCS', score: '14', delta: -5, band: 'OCD קל-בינוני', sev: 'mid', date: '22.06.2026' },
  { pid: 'p4', measure: 'PHQ-9', score: '11', delta: 2, band: 'דיכאון בינוני', sev: 'mid', date: '20.06.2026' },
]

const OUTCOME_STATS = [
  { value: '−31%', label: 'שיפור ממוצע בציונים', color: 'var(--success)' },
  { value: '84%', label: 'שיעור מענה לשאלונים', color: 'var(--primary)' },
  { value: '23', label: 'שאלונים נשלחו החודש', color: 'var(--secondary)' },
]

// Distinct measures present, in first-seen order → the filter chip set.
const MEASURES = Array.from(new Set(OUTCOMES.map((o) => o.measure)))

const outVal = (r: any, k: string) => (k === 'band' ? SEV_RANK[r.sev] : k === 'trend' ? r.delta : r[k])
const outType = (k: string): 'text' | 'number' | 'date' =>
  k === 'score' || k === 'trend' || k === 'band' ? 'number' : k === 'date' ? 'date' : 'text'


export default function OutcomesPage() {
  const { S, toast } = useApp()
  const [search, setSearch] = useState('')
  const [measure, setMeasure] = useState('all')
  const [sort, setSort] = useState<SortState>(null)

  const sendMeasure = () => toast('בחרו מטופל ושאלון לשליחה. הקישור יישלח בהודעה מאובטחת')

  const rows = OUTCOMES.map((o, i) => {
    const p = getPatient(S.patients, o.pid) || { name: '—', initials: '—', color: 'var(--primary)' }
    const mm = MEASURE_META[o.measure] || { bg: 'var(--surface-2)', color: 'var(--text-2)' }
    const improved = o.delta < 0
    return {
      id: 'out' + i, name: p.name, initials: p.initials, color: p.color,
      measure: o.measure, measureBg: mm.bg, measureColor: mm.color,
      score: o.score, delta: Math.abs(o.delta),
      trendColor: improved ? 'var(--success)' : 'var(--error)',
      trendIcon: improved ? 'M7 10l5 5 5-5z' : 'M7 14l5-5 5 5z',
      band: o.band, bandColor: SEV_COLOR[o.sev], sev: o.sev, date: o.date,
    }
  })

  const q = search.trim()
  const filtered = rows.filter((r) =>
    (measure === 'all' || r.measure === measure) &&
    (!q || r.name.includes(q) || r.measure.includes(q) || r.band.includes(q)))
  const shown = sortRows(filtered, sort, outVal, outType)
  const filtering = q.length > 0 || measure !== 'all'
  const noResults = filtering && shown.length === 0
  const onSort = (k: string) => setSort((c) => nextSort(c, k))
  const clearAll = () => { setSearch(''); setMeasure('all'); setSort(null) }

  const measureChips = ['all', ...MEASURES].map((m) => {
    const on = measure === m
    return {
      k: m, label: m === 'all' ? 'כל השאלונים' : m, ltr: m !== 'all', pressed: on,
      onClick: () => setMeasure(m),
      border: on ? 'var(--primary)' : 'var(--divider)', bg: on ? 'var(--primary)' : 'var(--paper)', color: on ? 'var(--paper)' : 'var(--text-2)',
    }
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>מדדי תוצאה</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>מעקב אחר שאלוני הערכה סטנדרטיים (PROMs) והתקדמות קלינית מדידה</p>
        </div>
        <button onClick={sendMeasure} className="out-send-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--on-accent)"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          שליחת שאלון
        </button>
      </div>

      <div className="rx-kpi3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {OUTCOME_STATS.map((s) => (
          <div key={s.label} style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: CARD_SHADOW, padding: 18 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Standard-treatment data table (DataGrid adoption, simplified per guide §12) */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '15px 18px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginInlineEnd: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>מדדי תוצאה</h2>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{rows.length} רשומות</span>
            </div>
            {filtering && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{shown.length} מתוך {rows.length} תואמים</span>}
          </div>
          {filtering && (
            <button onClick={clearAll} className="out-clear-all" style={{ height: 38, padding: '0 14px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>ניקוי הכל</button>
          )}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 11, pointerEvents: 'none' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי מטופל, שאלון או רמה…"
              aria-label="חיפוש לפי מטופל, שאלון או רמה"
              className="out-search"
              style={{ height: 38, width: 260, borderRadius: 9, padding: '0 34px', fontSize: 13.5, background: 'var(--paper)', color: 'var(--text)', outline: 'none' }}
            />
            {q !== '' && (
              <button onClick={() => setSearch('')} aria-label="ניקוי חיפוש" style={{ position: 'absolute', insetInlineEnd: 9, width: 24, height: 24, border: 'none', borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
            )}
          </div>
        </div>

        {/* measure filter chips */}
        <div role="group" aria-label="סינון לפי סוג שאלון" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 18px', borderBottom: '1px solid var(--divider)' }}>
          {measureChips.map((c) => (
            <button key={c.k} onClick={c.onClick} aria-pressed={c.pressed} style={{ height: 34, padding: '0 14px', border: '1px solid ' + c.border, borderRadius: 20, background: c.bg, color: c.color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <span dir={c.ltr ? 'ltr' : undefined} style={{ unicodeBidi: c.ltr ? 'isolate' : undefined }}>{c.label}</span>
            </button>
          ))}
        </div>

        {shown.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="טבלת מדדי תוצאה" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 720 }}>
              <thead>
                <tr>
                  <SortableTh label="מטופל" sortKey="name" sort={sort} onSort={onSort} style={{ minWidth: 180 }} />
                  <SortableTh label="שאלון" sortKey="measure" sort={sort} onSort={onSort} style={{ minWidth: 120 }} />
                  <SortableTh label="ציון נוכחי" sortKey="score" sort={sort} onSort={onSort} style={{ minWidth: 110 }} />
                  <SortableTh label="מגמה" sortKey="trend" sort={sort} onSort={onSort} style={{ minWidth: 100 }} />
                  <SortableTh label="רמה" sortKey="band" sort={sort} onSort={onSort} style={{ minWidth: 150 }} />
                  <SortableTh label="עודכן" sortKey="date" sort={sort} onSort={onSort} style={{ minWidth: 120 }} />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="out-row">
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ width: 36, height: 36, borderRadius: '50%', background: r.color, color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{r.initials}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: r.measureBg, color: r.measureColor }} dir="ltr">{r.measure}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', direction: 'ltr', display: 'inline-block' }}>{r.score}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: r.trendColor, direction: 'ltr' }}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d={r.trendIcon} /></svg>
                        {r.delta}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: r.bandColor }}>{r.band}</span>
                    </td>
                    <td style={tdStyle}>
                      <span dir="ltr" style={{ fontSize: 13.5, color: 'var(--text-2)', unicodeBidi: 'plaintext' }}>{r.date}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : noResults ? (
          <div style={{ padding: '44px 20px', textAlign: 'center' }} aria-live="polite">
            <p style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>לא נמצאו תוצאות תואמות לסינון הנוכחי</p>
            <a onClick={clearAll} onKeyDown={onKeyActivate(clearAll)} role="button" tabIndex={0} className="out-clear" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>ניקוי הכל</a>
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>אין נתונים לשאלון זה</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>שלחו שאלון הערכה כדי לאסוף מדדי תוצאה.</p>
          </div>
        )}
      </div>
    </div>
  )
}
