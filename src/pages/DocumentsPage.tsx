// Documents & consents — KPI stats, status filter chips, documents table with pager.
// Ported from 'Sensei demo.dc.html' template lines 1486–1526 + renderVals (v.isDocuments ~4539).
// The prototype embeds the shared DataGrid; per the porting guide (§12) it is ported here as the
// standard-treatment data table (status filter chips, rows, empty state, pager via useApp().pager).
import { useApp } from '../store/AppStore'
import Pager from '../components/shared/Pager'
import { getPatient, avatarColors } from '../utils'
import './documents.css'
import { DOCS } from '../data/catalogs'
import { CARD_SHADOW, thStyle, tdStyle } from '../utils/styles'

const DL_ICON = 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z'


const DOC_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  signed: { label: 'חתום', color: 'var(--success)', bg: 'var(--success-bg)' },
  pending: { label: 'ממתין לחתימה', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  draft: { label: 'טיוטה', color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
}

const DOC_FILTERS: [string, string][] = [['all', 'הכל'], ['signed', 'חתום'], ['pending', 'ממתין'], ['draft', 'טיוטה']]


export default function DocumentsPage() {
  const { S, set, toast, pager } = useApp()

  const effDocs = DOCS.map((d) => ({ ...d, status: (d.status === 'draft' && S.docSent[d.id]) ? 'pending' : d.status }))
  const signedCount = effDocs.filter((d) => d.status === 'signed').length
  const pendingDocs = effDocs.filter((d) => d.status === 'pending').length
  const draftDocs = effDocs.filter((d) => d.status === 'draft').length
  const consentSigned = new Set(effDocs.filter((d) => d.type === 'הסכמה מדעת' && d.status === 'signed').map((d) => d.pid))
  const consentMissing = S.patients.filter((p: any) => !consentSigned.has(p.id)).length

  const docStatFilters = ['signed', 'pending', 'draft', 'all']
  const docStats = [
    { label: 'מסמכים חתומים', value: String(signedCount), delta: 'מתוך ' + effDocs.length + ' מסמכים', color: 'var(--success)', bg: 'var(--success-bg)', icon: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
    { label: 'ממתינים לחתימה', value: String(pendingDocs), delta: 'נשלחו למטופלים', color: 'var(--warning)', bg: 'var(--warning-bg)', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
    { label: 'טיוטות', value: String(draftDocs), delta: 'טרם נשלחו', color: 'var(--text-secondary)', bg: 'var(--surface-2)', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z' },
    { label: 'הסכמה מדעת חסרה', value: String(consentMissing), delta: consentMissing === 1 ? 'מטופל אחד' : consentMissing + ' מטופלים', color: 'var(--error)', bg: 'var(--error-bg)', icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' },
  ].map((s, i) => ({ ...s, onClick: () => set({ docFilter: docStatFilters[i] }) }))

  const docFilters = DOC_FILTERS.map(([k, label]) => {
    const on = S.docFilter === k
    return { k, label, pressed: on, onClick: () => set({ docFilter: k }), border: on ? 'var(--primary)' : 'var(--divider)', bg: on ? 'var(--primary)' : 'var(--paper)', color: on ? 'var(--paper)' : 'var(--text-2)' }
  })

  const shownDocs = effDocs.filter((d) => S.docFilter === 'all' || d.status === S.docFilter)
  const { slice, view } = pager(shownDocs, 'docsPage', 'docsSize')

  const docRows = slice.map((d: any) => {
    const p = getPatient(S.patients, d.pid)
    const a = avatarColors(p.color)
    const m = DOC_STATUS_META[d.status]
    const signed = d.status === 'signed'
    const pend = d.status === 'pending'
    return {
      id: d.id, name: p.name, initials: p.initials, avBg: a.bg, avColor: a.color,
      type: d.type, date: d.date || '—', hasDate: !!d.date,
      statusLabel: m.label, statusColor: m.color, statusBg: m.bg,
      actionLabel: signed ? 'הורדה' : pend ? 'שליחת תזכורת' : 'שליחה לחתימה',
      actionBg: signed ? 'var(--paper)' : pend ? 'var(--paper)' : 'var(--primary)',
      actionColor: signed || pend ? 'var(--text-2)' : '#fff',
      actionBorder: signed || pend ? 'var(--border-input)' : 'transparent',
      showIcon: signed,
      onAction: () => {
        if (signed) toast('המסמך הורד למחשב')
        else if (pend) toast('תזכורת חתימה נשלחה ל' + p.name)
        else { set({ docSent: { ...S.docSent, [d.id]: true } }); toast('המסמך נשלח לחתימה דיגיטלית ל' + p.name) }
      },
    }
  })
  const docEmpty = shownDocs.length === 0

  const newDocument = () => toast('נפתחה תבנית מסמך חדשה. בחרו מטופל וסוג מסמך')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>מסמכים והסכמות</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>ניהול טפסי הסכמה, ויתור סודיות ומסמכי טיפול</p>
        </div>
        <button onClick={newDocument} className="doc-new-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--paper)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          מסמך חדש
        </button>
      </div>

      <div className="rx-kpi4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        {docStats.map((s) => (
          <div key={s.label} onClick={s.onClick} role="button" tabIndex={0} className="doc-kpi" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '20px 22px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13.5, fontWeight: 600 }}>{s.label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill={s.color}><path d={s.icon} /></svg>
              </div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: s.color, fontWeight: 600, marginTop: 6 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Standard-treatment data table (DataGrid adoption, simplified per guide §12) */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
        <div role="group" aria-label="סינון לפי סטטוס מסמך" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '15px 18px', borderBottom: '1px solid var(--divider)' }}>
          {docFilters.map((c) => (
            <button key={c.k} onClick={c.onClick} aria-pressed={c.pressed} style={{ height: 34, padding: '0 15px', border: '1px solid ' + c.border, borderRadius: 20, background: c.bg, color: c.color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{c.label}</button>
          ))}
        </div>

        {docEmpty ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>אין מסמכים בקטגוריה זו</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>לא נמצאו מסמכים בסטטוס שנבחר.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table aria-label="טבלת מסמכים" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 640 }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ ...thStyle, minWidth: 200 }}>מטופל</th>
                    <th scope="col" style={{ ...thStyle, minWidth: 160 }}>סוג מסמך</th>
                    <th scope="col" style={{ ...thStyle, minWidth: 140 }}>תאריך חתימה</th>
                    <th scope="col" style={{ ...thStyle, minWidth: 130 }}>סטטוס</th>
                    <th scope="col" style={thStyle}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>פעולות</span></th>
                  </tr>
                </thead>
                <tbody>
                  {docRows.map((d) => (
                    <tr key={d.id} className="doc-row">
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <span style={{ width: 36, height: 36, borderRadius: '50%', background: d.avBg, color: d.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{d.initials}</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{d.name}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{d.type}</td>
                      <td style={tdStyle}>
                        {d.hasDate
                          ? <span dir="ltr" style={{ fontSize: 13.5, color: 'var(--text-2)', unicodeBidi: 'plaintext' }}>{d.date}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>{d.date}</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: d.statusBg, color: d.statusColor }}>{d.statusLabel}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={d.onAction} className="doc-action-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', border: '1px solid ' + d.actionBorder, borderRadius: 9, background: d.actionBg, color: d.actionColor, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {d.showIcon && <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d={DL_ICON} /></svg>}
                            {d.actionLabel}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager p={view} />
          </>
        )}
      </div>

      <p style={{ margin: '16px 4px 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>חתימות דיגיטליות נשמרות באופן מוצפן ומתועדות ביומן הפעילות. יש לוודא הסכמה מדעת חתומה בטרם תחילת טיפול.</p>
    </div>
  )
}
