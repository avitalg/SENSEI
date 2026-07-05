// Resources library — ported from 'Sensei demo.dc.html'
// (template lines 2087–2114 · logic: renderVals RESOURCES section ~3391–3412).
import { useApp } from '../store/AppStore'
import './resources.css'
import { RES } from '../data/catalogs'

// Static catalog — ported verbatim from the prototype logic class.
const resCatMeta: Record<string, any> = {
  worksheets: { bg: 'var(--primary-tint)', color: 'var(--primary)', tagBg: 'var(--primary-surface)', tagColor: 'var(--primary)' },
  assessments: { bg: 'var(--secondary-bg)', color: 'var(--secondary)', tagBg: 'var(--secondary-tint)', tagColor: 'var(--secondary-strong)' },
  guides: { bg: 'var(--primary-tint)', color: 'var(--primary)', tagBg: 'var(--primary-surface)', tagColor: 'var(--primary)' },
  protocols: { bg: 'var(--secondary-bg)', color: 'var(--secondary)', tagBg: 'var(--secondary-tint)', tagColor: 'var(--secondary-strong)' },
}
const RES_CATS = [
  { k: 'all', l: 'הכל' },
  { k: 'worksheets', l: 'דפי עבודה' },
  { k: 'assessments', l: 'שאלוני הערכה' },
  { k: 'guides', l: 'מדריכים' },
  { k: 'protocols', l: 'פרוטוקולים' },
]
const SAVE_ON = 'M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z'
const SAVE_OFF = 'M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z'

export default function ResourcesPage() {
  const { S, set, toast } = useApp()

  const resCategories = RES_CATS.map((c) => {
    const on = S.resFilter === c.k
    return {
      k: c.k, label: c.l,
      onClick: () => set({ resFilter: c.k }),
      bg: on ? 'var(--primary)' : 'var(--paper)',
      color: on ? 'var(--paper)' : 'var(--text-2)',
      border: on ? 'var(--primary)' : 'var(--border-input)',
    }
  })
  const resQ = (S.resSearch || '').trim()
  const resShown = RES.filter((r) => (S.resFilter === 'all' || r.cat === S.resFilter) && (!resQ || r.title.includes(resQ) || r.desc.includes(resQ)))
  const resCards = resShown.map((r) => {
    const cm = resCatMeta[r.cat]
    const saved = S.resSaved.includes(r.id)
    return {
      id: r.id, title: r.title, desc: r.desc, meta: r.meta, icon: r.icon, tag: r.tag,
      iconBg: cm.bg, iconColor: cm.color, tagBg: cm.tagBg, tagColor: cm.tagColor,
      saveIcon: saved ? SAVE_ON : SAVE_OFF,
      saveColor: saved ? 'var(--primary)' : 'var(--text-muted)',
      onSave: () => set((s: any) => ({ resSaved: s.resSaved.includes(r.id) ? s.resSaved.filter((x: string) => x !== r.id) : [...s.resSaved, r.id] })),
      onAssign: () => toast('«' + r.title + '» מוכן לשיתוף. בחרו מטופל'),
    }
  })
  const resEmpty = resShown.length === 0

  return (
    <div data-screen-label="ספריית משאבים" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>ספריית משאבים</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>דפי עבודה, שאלוני הערכה ומדריכים קליניים לשיתוף עם המטופלים</p>
        </div>
      </div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 13, top: 12 }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
        <input value={S.resSearch} onChange={(e: any) => set({ resSearch: e.target.value })} aria-label="חיפוש משאבים" placeholder="חיפוש לפי שם או נושא…" className="res-search-input" style={{ width: '100%', height: 44, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 14px 0 42px', fontSize: 14.5, outline: 'none', background: 'var(--paper)' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {resCategories.map((rc: any) => (
          <button key={rc.k} onClick={rc.onClick} style={{ height: 34, padding: '0 15px', border: '1px solid ' + rc.border, borderRadius: 20, background: rc.bg, color: rc.color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{rc.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {resCards.map((r: any) => (
          <div key={r.id} style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)', padding: 18, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: r.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill={r.iconColor}><path d={r.icon} /></svg>
              </div>
              <button onClick={r.onSave} aria-label="שמירה" className="res-save-btn" style={{ width: 34, height: 34, border: 'none', borderRadius: 9, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="21" height="21" fill={r.saveColor}><path d={r.saveIcon} /></svg>
              </button>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: r.tagColor, background: r.tagBg, padding: '2px 9px', borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 }}>{r.tag}</span>
            <h2 style={{ margin: '0 0 5px', fontSize: 15.5, fontWeight: 700, lineHeight: 1.3 }}>{r.title}</h2>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{r.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.meta}</span>
              <button onClick={r.onAssign} className="res-assign-btn" style={{ height: 36, padding: '0 15px', border: '1px solid var(--primary-border)', borderRadius: 9, background: 'var(--primary-surface)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>שיתוף למטופל</button>
            </div>
          </div>
        ))}
      </div>
      {resEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--text-muted)"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" /></svg>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14.5 }}>לא נמצאו משאבים תואמים</div>
        </div>
      )}
    </div>
  )
}
