// Reports library — ported from 'Sensei demo.dc.html' (template 2186–2213, logic ~3453–3491).
// The prototype embeds the shared DataGrid; per the porting guide (§12) it is ported here as the
// standard-treatment data table: toolbar (title + search), scope="col" headers, rows, empty state.
import { useState } from 'react'
import { useApp } from '../store/AppStore'
import './reports.css'
import { thStyle, tdStyle } from '../utils/styles'
import SortableTh from '../components/shared/SortableTh'
import { sortRows, nextSort, type SortState } from '../utils/tableSort'
import { downloadTextFile } from '../utils/download'

const DOC_I = 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'
const VIEW_I = 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'
const DL_I = 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z'

const REP_TYPES: any = {
  progress: { l: 'התקדמות מטופל', bg: 'var(--primary-surface)', color: 'var(--primary)', iconBg: 'var(--primary-tint)', iconColor: 'var(--primary)' },
  practice: { l: 'סיכום מרפאה', bg: 'var(--secondary-tint)', color: 'var(--secondary-strong)', iconBg: 'var(--secondary-bg)', iconColor: 'var(--secondary)' },
}

const REPORTS = [
  { id: 'rep1', name: 'דוח התקדמות: דנה לוי', scope: 'רבעון 2 · 2026', type: 'progress', date: '30.06.2026' },
  { id: 'rep2', name: 'סיכום פעילות המרפאה', scope: 'יוני 2026 · 9 מטפלים', type: 'practice', date: '28.06.2026' },
  { id: 'rep4', name: 'דוח התקדמות: מיכל כהן', scope: 'חצי שנתי', type: 'progress', date: '22.06.2026' },
  { id: 'rep5', name: 'סיכום עומסי טיפול', scope: 'יוני 2026', type: 'practice', date: '15.06.2026' },
]

const REP_CHIPS = [
  { k: 'all', l: 'הכל' },
  { k: 'progress', l: 'התקדמות מטופל' },
  { k: 'practice', l: 'סיכום מרפאה' },
]


export default function ReportsPage() {
  const { S, set, toast } = useApp()
  const [repSort, setRepSort] = useState<SortState>(null)
  const onRepSort = (k: string) => setRepSort((c) => nextSort(c, k))

  const reportRows = REPORTS.map((r) => {
    const tm = REP_TYPES[r.type]
    return {
      ...r,
      typeLabel: tm.l, tagBg: tm.bg, tagColor: tm.color, iconBg: tm.iconBg, iconColor: tm.iconColor, icon: DOC_I,
      onView: () => toast('«' + r.name + '» נפתח לצפייה'),
      // a real text export (previously a toast with no file — download theater)
      onDownload: () => {
        downloadTextFile(
          r.name.replace(/\s+/g, '-') + '.txt',
          r.name + '\n' + 'היקף: ' + r.scope + ' · סוג: ' + REP_TYPES[r.type].l + ' · תאריך: ' + r.date + '\n\nדוח הדגמה · הופק מסביבת הדגמה של סנסיי ללא נתוני מטופלים אמיתיים.',
        )
        toast('«' + r.name + '» הורד כקובץ טקסט')
      },
    }
  })

  const q = String(S.reportSearch || '').trim().toLowerCase()
  const shown = reportRows.filter((r) =>
    (S.reportFilter === 'all' || r.type === S.reportFilter) &&
    (!q || r.name.toLowerCase().includes(q) || r.scope.toLowerCase().includes(q)))
  const filtering = q !== '' || S.reportFilter !== 'all'
  const repVal = (r: any, k: string) => (k === 'type' ? r.typeLabel : r[k])
  const repType = (k: string): 'text' | 'date' => (k === 'date' ? 'date' : 'text')
  const sortedShown = sortRows(shown, repSort, repVal, repType)

  const reportChips = REP_CHIPS.map((c) => {
    const on = S.reportFilter === c.k
    return {
      key: c.k, label: c.l, pressed: on,
      onClick: () => set({ reportFilter: c.k }),
      bg: on ? 'var(--primary)' : 'var(--paper)',
      color: on ? 'var(--paper)' : 'var(--text-2)',
      border: on ? 'var(--primary)' : 'var(--border-input)',
    }
  })

  const newReport = () => toast('אשף דוח חדש. בחרו סוג דוח וטווח תאריכים')

  return (
    <div data-screen-label="דוחות" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>דוחות</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>ספריית הדוחות שהופקו: התקדמות מטופלים וסיכומי מרפאה</p>
        </div>
        <button onClick={newReport} className="rep-new-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: 'none', borderRadius: 10, color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--on-accent)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          דוח חדש
        </button>
      </div>

      {/* Standard-treatment data table (DataGrid adoption, simplified per guide §12) */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 6px 20px rgba(16,40,80,.05)', overflow: 'hidden' }}>
        {/* toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '15px 18px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginInlineEnd: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>דוחות</h2>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{reportRows.length} רשומות</span>
            </div>
            {filtering && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{shown.length} מתוך {reportRows.length} תואמים</span>}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 11, pointerEvents: 'none' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" /></svg>
            <input
              value={S.reportSearch}
              onChange={(e) => set({ reportSearch: e.target.value })}
              placeholder="חיפוש לפי שם דוח או היקף…"
              aria-label="חיפוש לפי שם דוח או היקף"
              className="rep-search"
              style={{ height: 38, width: 230, borderRadius: 9, padding: '0 34px', fontSize: 13.5, background: 'var(--paper)', color: 'var(--text)', outline: 'none' }}
            />
            {q !== '' && (
              <button onClick={() => set({ reportSearch: '' })} aria-label="ניקוי חיפוש" style={{ position: 'absolute', insetInlineEnd: 9, width: 22, height: 22, border: 'none', borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
            )}
          </div>
        </div>

        {/* type filter chips */}
        <div role="group" aria-label="סינון לפי סוג דוח" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 18px', borderBottom: '1px solid var(--divider)' }}>
          {reportChips.map((c) => (
            <button key={c.key} onClick={c.onClick} aria-pressed={c.pressed} style={{ height: 34, padding: '0 14px', border: `1px solid ${c.border}`, borderRadius: 20, background: c.bg, color: c.color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{c.label}</button>
          ))}
        </div>

        {shown.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="טבלת דוחות" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 640 }}>
              <thead>
                <tr>
                  <SortableTh label="שם הדוח" sortKey="name" sort={repSort} onSort={onRepSort} style={{ minWidth: 240 }} />
                  <SortableTh label="סוג" sortKey="type" sort={repSort} onSort={onRepSort} style={{ minWidth: 140 }} />
                  <SortableTh label="תאריך" sortKey="date" sort={repSort} onSort={onRepSort} style={{ minWidth: 120 }} />
                  <th scope="col" style={thStyle}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>פעולות</span></th>
                </tr>
              </thead>
              <tbody>
                {sortedShown.map((r) => (
                  <tr key={r.id} className="rep-row">
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: r.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" width="20" height="20" fill={r.iconColor}><path d={r.icon} /></svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.scope}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: r.tagBg, color: r.tagColor }}>{r.typeLabel}</span>
                    </td>
                    <td style={tdStyle}>
                      <span dir="ltr" style={{ fontSize: 13.5, color: 'var(--text-2)', unicodeBidi: 'plaintext' }}>{r.date}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                        <button onClick={r.onView} aria-label="צפייה" title="צפייה" className="rep-action-btn" style={{ width: 32, height: 32, border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--text-secondary)"><path d={VIEW_I} /></svg>
                        </button>
                        <button onClick={r.onDownload} aria-label="הורדה" title="הורדה" className="rep-action-btn" style={{ width: 32, height: 32, border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--text-secondary)"><path d={DL_I} /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <img src="/assets/sensei-scroll.png" alt="" aria-hidden="true" width={140} height={108} style={{ display: 'block', margin: '0 auto 16px', objectFit: 'contain', opacity: 0.75 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>לא נמצאו דוחות תואמים</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 14.5 }}>{filtering ? 'אף דוח אינו תואם לחיפוש או לסינון הנוכחיים.' : 'הפיקו דוח חדש כדי שיופיע כאן.'}</p>
            {filtering && (
              <button onClick={() => set({ reportSearch: '', reportFilter: 'all' })} className="rep-clear" style={{ height: 40, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>ניקוי החיפוש והסינון</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
