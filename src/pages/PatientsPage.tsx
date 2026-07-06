// Patients — searchable / filterable patient roster with dedup banner + pagination.
// Ported from 'Sensei demo.dc.html' template lines 612–650 + renderVals (v.isPatients).
// The prototype embeds the shared DataGrid here; per the porting guide it is ported
// as a standard-treatment data table (search, risk/tag filters, avatar rows, states,
// pager) using filteredPatients from the logic class.
import { useApp } from '../store/AppStore'
import Pager from '../components/shared/Pager'
import { avatarColors, riskMeta, hg } from '../utils'
import { scoreP, hlParts } from '../utils/search'
import { buildDupClusters } from '../utils/dedup'
import './patients.css'
import { CARD_SHADOW } from '../utils/styles'


// ---- shared search helpers (relevance ranking) — ported from the logic class ----

const tagMeta = (tag: string) => ({ label: tag, color: 'var(--primary)', bg: 'var(--primary-tint)', border: 'var(--primary-border)' })

const RISK_OPTS = [
  { value: 'all', label: 'כל רמות הסיכון' },
  { value: 'high', label: 'סיכון גבוה' },
  { value: 'medium', label: 'סיכון בינוני' },
  { value: 'low', label: 'סיכון נמוך' },
  { value: 'none', label: 'יציב' },
]

export default function PatientsPage() {
  const { S, set, navigate, pager } = useApp()

  const openCreatePatient = () => set({
    dialog: 'create', form: { name: '', age: '', gender: 'נקבה', focus: '', notes: '' },
    errors: {}, dupWarnId: null, notesExpanded: false,
  })
  const goDedup = () => navigate('dedup')

  // ---- dedup banner ----
  const clusters = buildDupClusters(S.patients)
  const hasDuplicates = clusters.length > 0
  const dupBannerLabel = clusters.length === 1
    ? 'זוהתה התאמת כפילות אפשרית אחת'
    : ('זוהו ' + clusters.length + ' התאמות כפילות אפשריות')

  // ---- tag filter options (all tags across patients) ----
  const allTagsList = [...new Set(Object.values(S.patientTags as Record<string, string[]>).flat())].sort()
  const tagFilterOptions = [{ value: 'all', label: 'כל התגיות' }, ...allTagsList.map((t) => ({ value: t as string, label: t as string }))]

  // ---- filtering + sorting (ported from renderVals) ----
  const q = (S.patientSearch || '').trim()
  // Highlight the matched term in searchable row fields — the same canonical highlighter
  // the global search / palette / transcript use, so search reads consistently everywhere.
  const mark = (text: string) => q
    ? hlParts(text, q).map((np, i) => <span key={i} style={{ background: np.bg, fontWeight: np.fw, borderRadius: 3 }}>{np.t}</span>)
    : text
  let filtered: any[] = S.demoEmpty ? [] : S.patients
  if (S.riskFilter && S.riskFilter !== 'all') filtered = filtered.filter((p: any) => p.risk === S.riskFilter)
  if (S.tagFilter && S.tagFilter !== 'all') filtered = filtered.filter((p: any) => (S.patientTags[p.id] || []).includes(S.tagFilter))
  if (q) filtered = filtered.filter((p: any) => scoreP(p, q, S.patientTags) > 0)

  const _riskRank: Record<string, number> = { high: 3, medium: 2, low: 1 }
  const _parseDate = (d: string) => { const m = (d || '').split('.').map(Number); return m.length === 3 ? new Date(m[2], m[1] - 1, m[0]).getTime() : 0 }
  const sortBy = S.sortBy
  if (sortBy === 'relevance' && q) filtered = [...filtered].sort((a, b) => scoreP(b, q, S.patientTags) - scoreP(a, q, S.patientTags) || a.name.localeCompare(b.name, 'he'))
  else if (sortBy === 'name' || (sortBy === 'relevance' && !q)) filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'he'))
  else if (sortBy === 'risk') filtered = [...filtered].sort((a, b) => _riskRank[b.risk] - _riskRank[a.risk])
  else if (sortBy === 'sessions') filtered = [...filtered].sort((a, b) => b.sessions - a.sessions)
  else if (sortBy === 'recent') filtered = [...filtered].sort((a, b) => _parseDate(b.lastSession) - _parseDate(a.lastSession))

  const patientCountLabel = S.patients.length + ' מטופלים פעילים'
  const { slice, view } = pager(filtered, 'patientsPage', 'patientsSize')

  const rows = slice.map((p: any) => {
    const a = avatarColors(p.color); const rm = riskMeta(p.risk)
    const open = () => navigate('patient', { patientId: p.id })
    return {
      ...p, avBg: a.bg, avColor: a.color, riskLabel: rm.label, riskColor: rm.color, riskBg: rm.bg,
      meta: hg('[[בן|בת]] ', p.gender) + p.age,
      tags: (S.patientTags[p.id] || []).map((t: string) => tagMeta(t)),
      rowAccent: p.risk === 'high' ? 'var(--error)' : 'transparent',
      onOpen: open,
      onEdit: (e: any) => { e.stopPropagation(); set({ dialog: 'edit', dialogPatientId: p.id, form: { name: p.name, age: String(p.age), gender: p.gender === 'נ' ? 'נקבה' : 'זכר', focus: p.focus, notes: '' }, errors: {}, notesExpanded: false }) },
      onDelete: (e: any) => { e.stopPropagation(); set({ dialog: 'delete', dialogPatientId: p.id }) },
    }
  })

  const patientsEmpty = S.patients.length === 0 || (S.demoEmpty && !q)
  const patientsNoResults = !patientsEmpty && filtered.length === 0

  const clearSearch = () => set({ patientSearch: '', riskFilter: 'all', tagFilter: 'all', sortBy: 'relevance' })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>מטופלים</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{patientCountLabel}</p>
        </div>
        <button onClick={openCreatePatient} className="pat-new-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--paper)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          מטופל חדש
        </button>
      </div>

      {hasDuplicates && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '14px 18px', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--warning-strong)"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{dupBannerLabel}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--warning-strong)', background: 'var(--warning-bg)', borderRadius: 5, padding: '2px 7px' }}>אזהרה</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>ייתכן שאותו מטופל הוזן יותר מפעם אחת. סקרו ומזגו לשמירה על מקור אמת יחיד.</div>
          </div>
          <button onClick={goDedup} className="pat-dup-btn" style={{ height: 40, padding: '0 18px', border: '1px solid var(--warning)', borderRadius: 10, background: 'transparent', color: 'var(--warning-strong)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>סקירה ומיזוג</button>
        </div>
      )}

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '18px 22px', borderBottom: '1px solid var(--bg)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
            <input
              value={S.patientSearch}
              onChange={(e) => set({ patientSearch: e.target.value })}
              aria-label="חיפוש לפי שם או נושא טיפול"
              placeholder="חיפוש לפי שם או נושא טיפול…"
              className="pat-search"
              style={{ width: '100%', height: 40, border: '1px solid var(--divider)', background: 'var(--paper)', borderRadius: 10, padding: '0 38px 0 12px', fontSize: 14, outline: 'none', color: 'var(--text)' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={S.riskFilter || 'all'}
              onChange={(e) => set({ riskFilter: e.target.value })}
              aria-label="סינון לפי רמת סיכון"
              className="pat-filter"
              style={{ height: 40, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 14px', fontSize: 13.5, background: 'var(--paper)', color: 'var(--text-2)', outline: 'none', cursor: 'pointer' }}
            >
              {RISK_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={S.tagFilter}
              onChange={(e) => set({ tagFilter: e.target.value })}
              aria-label="סינון לפי תגית"
              className="pat-filter"
              style={{ height: 40, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 14px', fontSize: 13.5, background: 'var(--paper)', color: 'var(--text-2)', outline: 'none', cursor: 'pointer' }}
            >
              {tagFilterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {patientsEmpty && (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <img src="/assets/sensei-fan.png" alt="" aria-hidden="true" width={140} height={108} style={{ display: 'block', margin: '0 auto 16px', objectFit: 'contain', opacity: 0.8 }} />
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>אין מטופלים עדיין</h2>
            <p style={{ margin: '0 auto 20px', color: 'var(--text-secondary)', fontSize: 14.5, maxWidth: 420 }}>הוסיפו את המטופל הראשון שלכם כדי להתחיל לנהל פגישות ותובנות.</p>
            <button onClick={openCreatePatient} className="pat-new-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--on-accent)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>מטופל חדש
            </button>
          </div>
        )}

        {patientsNoResults && (
          <div style={{ padding: '46px 24px', textAlign: 'center' }} aria-live="polite">
            <img src="/assets/sensei-scroll.png" alt="" aria-hidden="true" width={140} height={108} style={{ display: 'block', margin: '0 auto 16px', objectFit: 'contain', opacity: 0.8 }} />
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>לא נמצאו מטופלים תואמים</h2>
            <p style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400 }}>נסו לשנות את מונחי החיפוש או לאפס את המסננים.</p>
            <a onClick={clearSearch} role="button" tabIndex={0} className="pat-clear" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>ניקוי החיפוש והמסננים</a>
          </div>
        )}

        {!patientsEmpty && !patientsNoResults && rows.map((p: any) => (
          <div
            key={p.id}
            className="pat-row"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 22px', borderBottom: '1px solid var(--line)', borderInlineStart: '3px solid ' + p.rowAccent, cursor: 'pointer' }}
          >
            <button
              type="button"
              onClick={p.onOpen}
              aria-label={p.name}
              style={{ border: 'none', background: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit', textAlign: 'start', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}
            >
              <span style={{ width: 44, height: 44, borderRadius: '50%', background: p.avBg, color: p.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{p.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{mark(p.name)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: p.riskBg, color: p.riskColor }}>{p.riskLabel}</span>
                  {p.tags.map((tg: any) => (
                    <span key={tg.label} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: tg.bg, color: tg.color, border: '1px solid ' + tg.border }}>{tg.label}</span>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.meta} · {mark(p.focus)} · {p.sessions} פגישות</div>
              </div>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button onClick={p.onEdit} aria-label="עריכת מטופל" className="pat-icon-btn" style={{ width: 34, height: 34, border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
              </button>
              <button onClick={p.onDelete} aria-label="מחיקת מטופל" className="pat-del-btn" style={{ width: 34, height: 34, border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--error)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
              </button>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--text-muted)" style={{ flexShrink: 0 }}><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
            </div>
          </div>
        ))}

        {!patientsEmpty && !patientsNoResults && <Pager p={view} />}
      </div>
    </div>
  )
}
