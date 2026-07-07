// Sessions list — cross-patient recordings & transcripts table.
// Ported from 'Sensei demo.dc.html' template lines 816–842 + renderVals (v.isSessions).
// The prototype embeds the shared DataGrid here; per the porting guide it is
// ported as a standard-treatment data table (search, rows, states, pager),
// enriched with the expandable-row / note / delete interactions from the logic class.
import { useApp } from '../store/AppStore'
import Pager from '../components/shared/Pager'
import { avatarColors, riskMeta } from '../utils'
import { hlParts } from '../utils/search'
import './sessions.css'
import { buildSessions } from '../data/sessions'
import { CARD_SHADOW } from '../utils/styles'



export default function SessionsPage() {
  const { S, set, navigate, toast, pager } = useApp()

  const openUploadScreen = () => set({ route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } })

  // all sessions (sessions list page) — ported from renderVals
  const all: any[] = []
  S.patients.slice(0, 6).forEach((p: any) => {
    const a = avatarColors(p.color)
    buildSessions(p, S, { navigate, set }).slice(0, 2).forEach((s: any) => {
      const topRisk = s.riskChips && s.riskChips.length ? s.riskChips[0] : null
      const rm2 = riskMeta(p.risk)
      all.push({
        ...s,
        id: p.id + '_' + (s.num != null ? s.num : all.length),
        pid: p.id, color: p.color,
        topicsText: (s.topics || []).join(' · '),
        risk: p.risk, name: p.name, initials: p.initials, avBg: a.bg, avColor: a.color,
        rowAccent: p.risk === 'high' ? 'var(--error)' : 'transparent',
        topRiskLabel: topRisk ? topRisk.label : rm2.label,
        topRiskColor: topRisk ? topRisk.color : rm2.color,
        topRiskBg: topRisk ? topRisk.bg : rm2.bg,
        topicChips: (s.topics || []).slice(0, 3),
        sesAria: 'פגישה ' + s.num + ' · ' + p.name + ' · ' + (s.date || ''),
      })
    })
  })

  const sq = (S.sessionsSearch || '').trim()
  // Highlight the matched term in searchable fields (name + topics) — the same canonical
  // highlighter used across the app's search surfaces, for consistent scanning.
  const mark = (text: string) => sq
    ? hlParts(text, sq).map((np, i) => <span key={i} style={{ background: np.bg, fontWeight: np.fw, borderRadius: 3 }}>{np.t}</span>)
    : text
  const filteredSessions = sq ? all.filter((s) => s.name.includes(sq) || (s.topics || []).some((t: string) => t.includes(sq))) : all
  const noResults = sq.length > 0 && filteredSessions.length === 0
  const { slice, view } = pager(filteredSessions, 'sessionsPage', 'sessionsSize')

  // ---- session notes + expandable rows (shared keys with the patient screen) ----
  const rows = slice.map((s: any) => {
    const key = s.pid + '_' + s.num
    const eKey = s.pid + '-' + s.num
    const note = S.sessionNotes[key] || ''
    const editing = S.editingSessionNote === key
    const exp = S.expandedSess[eKey]
    const expanded = exp === undefined ? false : exp
    return {
      ...s,
      sessionNote: note, hasNote: !!note, editingNote: editing,
      noteDraft: S.sessionNoteDraft,
      expanded,
      chevTransform: expanded ? 'rotate(180deg)' : 'none',
      onToggle: () => set({ expandedSess: { ...S.expandedSess, [eKey]: !expanded } }),
      onEditNote: (e?: any) => { if (e) e.stopPropagation(); set({ editingSessionNote: key, sessionNoteDraft: note }) },
      onNoteDraft: (e: any) => set({ sessionNoteDraft: e.target.value }),
      onSaveNote: (e?: any) => { if (e) e.stopPropagation(); set({ sessionNotes: { ...S.sessionNotes, [key]: S.sessionNoteDraft }, editingSessionNote: null }); toast('ההערה נשמרה') },
      onCancelNote: (e?: any) => { if (e) e.stopPropagation(); set({ editingSessionNote: null }) },
    }
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>הקלטות ותמלולים</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>כל ההקלטות והתמלולים האחרונים מכל המטופלים</p>
        </div>
        <button onClick={openUploadScreen} className="ses-upload-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--paper)"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
          העלאת הקלטה
        </button>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '18px 22px', borderBottom: '1px solid var(--bg)', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>פגישות ותמלולים</h2>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
            <input
              value={S.sessionsSearch}
              onChange={(e) => set({ sessionsSearch: e.target.value })}
              aria-label="חיפוש לפי שם מטופל או נושא"
              placeholder="חיפוש לפי שם מטופל או נושא…"
              className="ses-search"
              style={{ width: '100%', height: 40, border: '1px solid var(--divider)', background: 'var(--paper)', borderRadius: 10, padding: '0 38px 0 12px', fontSize: 14, outline: 'none', color: 'var(--text)' }}
            />
          </div>
        </div>

        {all.length === 0 && (
          <div style={{ padding: '46px 20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>אין פגישות עדיין</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 14 }}>העלו הקלטה כדי לקבל תמלול וסיכום AI.</p>
            <button onClick={openUploadScreen} className="ses-upload-btn" style={{ height: 40, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>העלאת הקלטה</button>
          </div>
        )}

        {noResults && all.length > 0 && (
          <div style={{ padding: '38px 20px', textAlign: 'center' }} aria-live="polite">
            <p style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>לא נמצאו תוצאות עבור „{sq}”</p>
            <a onClick={() => set({ sessionsSearch: '' })} role="button" tabIndex={0} className="ses-clear" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>ניקוי החיפוש</a>
          </div>
        )}

        {!noResults && rows.map((s: any) => (
          <div key={s.id} style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', borderInlineStart: '3px solid ' + s.rowAccent }}>
            <div onClick={s.onToggle} role="button" tabIndex={0} aria-expanded={s.expanded} aria-label={s.sesAria} className="ses-row-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: s.avBg, color: s.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>{s.initials}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{mark(s.name)} · פגישה {s.num}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}><span dir="ltr">{s.date}</span> · {s.duration}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {s.topicChips.map((t: string) => (
                    <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, background: 'var(--surface-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>{mark(t)}</span>
                  ))}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: s.topRiskBg, color: s.topRiskColor, whiteSpace: 'nowrap' }}>{s.topRiskLabel}</span>
                {s.hasNote && (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--text-muted)" aria-label="קיימת הערה" style={{ flexShrink: 0 }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
                )}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ flexShrink: 0, transition: 'transform .2s', transform: s.chevTransform }}><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg>
              </div>
            </div>

            {s.expanded && (
              <div style={{ marginTop: 11 }}>
                <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{s.summary}</p>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                  {s.topics.map((t: string) => (
                    <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, background: 'var(--surface-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>{mark(t)}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={s.onTranscript} className="ses-act-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>תמלול</button>
                  <button onClick={s.onSummary} className="ses-act-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>סיכום AI</button>
                  <button onClick={s.onEditNote} aria-label="הוספת הערה לפגישה" className="ses-act-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 11px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>הערה
                  </button>
                  <button onClick={s.onDelete} aria-label="מחיקת פגישה" className="ses-del-btn" style={{ width: 34, height: 34, border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--paper)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginInlineStart: 'auto' }}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="var(--error)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                </div>

                {s.editingNote && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      onChange={s.onNoteDraft}
                      value={s.noteDraft}
                      aria-label="הערת פגישה"
                      placeholder="הוסיפו הערה על פגישה זו…"
                      className="ses-note-ta"
                      style={{ width: '100%', minHeight: 70, border: '1.5px solid var(--primary-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: 'var(--text)' }}
                    />
                    <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
                      <button onClick={s.onSaveNote} style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 8, background: 'var(--primary)', color: 'var(--paper)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>שמירה</button>
                      <button onClick={s.onCancelNote} style={{ height: 32, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
                    </div>
                  </div>
                )}

                {s.hasNote && !s.editingNote && (
                  <div onClick={s.onEditNote} className="ses-note-view" style={{ marginTop: 9, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--text-muted)" style={{ flexShrink: 0, marginTop: 3 }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg>
                    <span style={{ flex: 1, lineHeight: 1.55 }}>{s.sessionNote}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <Pager p={view} />
      </div>
    </div>
  )
}
