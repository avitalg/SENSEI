// Dashboard — ported from 'Sensei demo.dc.html' (template lines 508–611 + renderVals dashboard slices).
import { useApp } from '../store/AppStore'
import { CARD_SHADOW } from '../utils/styles'
import { riskMeta, avatarColors, getPatient } from '../utils'
import './dashboard.css'
import { SESSION_DATES, sessionSummaries } from '../data/sessions'
import { MomentCard, MomentOverlay } from '../components/MomentForMe'
import { onKeyActivate } from '../utils/a11y'

// Minimal port of the prototype's buildSessions(p) — only the fields the dashboard
// consumes (date + summary of each non-deleted session, newest first).
function buildDashSessions(p: any, deleted: string[]): { date: string; summary: string }[] {
  const dates = SESSION_DATES
  const summaries = sessionSummaries(p)
  const n = Math.min(p.sessions, 8)
  const out: { date: string; summary: string }[] = []
  for (let i = 0; i < n; i++) {
    const num = p.sessions - i
    const key = p.id + '#' + num
    if (deleted.indexOf(key) !== -1) continue
    out.push({ date: dates[i], summary: summaries[i % summaries.length] })
  }
  return out
}

export default function DashboardPage() {
  const { S, set, navigate, toast } = useApp()

  // ---- KPI stats ----
  const stats = [
    { label: 'מטופלים פעילים', value: String(S.patients.length), delta: '+2 החודש הזה', color: 'var(--primary)', bg: 'var(--primary-tint)', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z', onClick: () => navigate('patients') },
    { label: 'פגישות השבוע', value: '14', delta: '+3 מהשבוע שעבר', color: 'var(--success)', bg: 'var(--success-bg)', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z', onClick: () => navigate('sessions') },
    { label: 'סיכומי AI חדשים', value: '3', delta: '+3 השבוע', color: 'var(--warning)', bg: 'var(--warning-bg)', icon: 'M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z', onClick: () => navigate('sessions') },
    { label: 'התראות סיכון', value: String(S.patients.filter((p: any) => p.risk === 'high').length), delta: 'דורש תשומת לב', color: 'var(--error)', bg: 'var(--error-bg)', icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z', onClick: () => navigate('patients') },
  ]

  // ---- getting started / onboarding ----
  // Steps 3–4 are DERIVED from what the user actually did (previously hardcoded
  // "not done", so completing the suggested action was never acknowledged).
  const obSteps = [
    { done: true, title: 'הגדרת פרופיל', desc: 'שם, התמחות ומספר רישיון', go: () => navigate('settings') },
    { done: true, title: 'הוספת מטופל', desc: 'התיק הראשון כבר במערכת', go: () => navigate('patients') },
    { done: !!S.hasUploaded, title: 'העלאת הקלטה', desc: 'תמלול וניתוח AI אוטומטי', go: () => set({ route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } }) },
    { done: Object.keys(S.summaryApproved || {}).length > 0, title: 'אישור סיכום AI', desc: 'בדקו ואשרו סיכום ראשון', go: () => navigate('summary', { patientId: 'p3' }) },
  ]
  const obDone = obSteps.filter((s) => s.done).length
  const showOnboarding = !S.onboardingDismissed
  const onboardDoneLabel = obDone + ' מתוך ' + obSteps.length + ' הושלמו'
  const onboardPct = Math.round((obDone / obSteps.length) * 100) + '%'
  const onboardSteps = obSteps.map((s, i) => ({
    title: s.title, desc: s.desc, done: s.done, pending: !s.done, num: String(i + 1),
    border: s.done ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.16)',
    badgeBg: s.done ? 'var(--on-accent)' : 'rgba(255,255,255,.22)',
    opacity: s.done ? '.85' : '1', cursor: 'pointer', onClick: s.go,
  }))
  const dismissOnboarding = () => { set({ onboardingDismissed: true }); toast('מדריך הפתיחה הוסתר · ניתן לשחזר מדף העזרה') }

  // ---- latest AI summaries ----
  const deleted: string[] = S.deletedSessions || []
  const latestSummaries = [S.patients[0], S.patients[2], S.patients[4]]
    .filter((p: any) => p && buildDashSessions(p, deleted).length > 0)
    .map((p: any) => {
      const reviewed = !!S.summaryApproved[p.id]
      const s0 = buildDashSessions(p, deleted)[0]
      return { name: p.name, date: s0.date, text: s0.summary, reviewed, unreviewed: !reviewed, onOpen: () => navigate('summary', { patientId: p.id }) }
    })
  const summariesAwaiting = latestSummaries.filter((s: any) => s.unreviewed).length
  const hasSummariesAwaiting = summariesAwaiting > 0

  // ---- risk alerts ----
  const riskAlerts = S.patients.filter((p: any) => p.risk === 'high').map((p: any) => {
    const rm = riskMeta(p.risk)
    return { name: p.name, riskLabel: rm.label, riskColor: rm.color, riskBg: rm.bg, flag: p.focus === 'PTSD' ? 'עלייה בתסמיני הימנעות וערנות יתר' : 'ירידה במשקל ודפוסי אכילה מגבילים', onOpen: () => navigate('patient', { patientId: p.id }) }
  })

  // ---- today's appointments (same seed + helpers as the prototype's calendar slice) ----
  const addMin = (t: string, m: number) => { const [h, mm] = t.split(':').map(Number); const tot = h * 60 + mm + m; return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0') }
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const APPTS = [
    { time: '09:00', pid: 'p1', type: 'פגישה שבועית', dur: 50, status: 'done' },
    { time: '10:30', pid: 'p3', type: 'פגישת מעקב', dur: 50, status: 'now' },
    { time: '13:00', pid: 'p2', type: 'פגישה שבועית', dur: 50, status: 'upcoming' },
    { time: '16:00', pid: 'p5', type: 'פגישת מעקב', dur: 50, status: 'upcoming' },
  ]
  const stMeta = (st: string) => st === 'done' ? { label: 'הסתיימה', color: 'var(--success)', bg: 'var(--success-bg)', dot: 'var(--success)' }
    : st === 'now' ? { label: 'מתקיימת כעת', color: 'var(--primary)', bg: 'var(--primary-tint)', dot: 'var(--primary)' }
    : { label: 'מתוכננת', color: 'var(--text-secondary)', bg: 'var(--surface-2)', dot: 'var(--toggle-off)' }
  const allAppts = [...APPTS, ...S.scheduledAppts].sort((a: any, b: any) => toMin(a.time) - toMin(b.time))
  const todayAppts = allAppts.map((a: any) => {
    const p = getPatient(S.patients, a.pid); const av = avatarColors(p.color); const sm = stMeta(a.status)
    return {
      time: a.time, endTime: addMin(a.time, a.dur), name: p.name, initials: p.initials, avBg: av.bg, avColor: av.color,
      type: a.type, dur: a.dur + ' דק׳', stLabel: sm.label, lineColor: sm.dot, isNow: a.status === 'now',
      onOpen: () => navigate('patient', { patientId: p.id }),
      onUpload: (e: any) => { if (e) e.stopPropagation(); set({ patientId: p.id, route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } }) },
    }
  })
  let nextMarked = false
  const dashToday = todayAppts.slice(0, 5).map((a: any) => {
    const isNext = !nextMarked && !a.isNow && a.stLabel !== 'הסתיימה'
    if (isNext || a.isNow) nextMarked = true
    return { ...a, showNext: isNext, rowBg: (a.isNow || isNext) ? 'var(--primary-surface)' : 'var(--paper)' }
  })
  const dashApptCount = todayAppts.length
  const apptRemain = todayAppts.filter((a: any) => a.stLabel !== 'הסתיימה').length
  const dashDateLine = 'יום שלישי, 30 ביוני 2026 · ' + (apptRemain > 0 ? (apptRemain + ' פגישות עוד היום') : 'סיימת את פגישות היום')
  const highRisk = S.patients.filter((p: any) => p.risk === 'high').length
  const briefChips = [
    apptRemain > 0 ? { label: apptRemain + ' פגישות עוד היום', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', color: 'var(--primary)', bg: 'var(--primary-surface)', border: 'var(--primary-border)', onClick: () => navigate('calendar') } : null,
    summariesAwaiting > 0 ? { label: summariesAwaiting + ' סיכומים לאישור', icon: 'M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z', color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning)', onClick: () => navigate('sessions') } : null,
    highRisk > 0 ? { label: highRisk + ' התראות סיכון', icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z', color: 'var(--error)', bg: 'var(--error-bg-soft)', border: 'var(--error-border)', onClick: () => { set({ riskFilter: 'high', sortBy: 'risk' }); navigate('patients') } } : null,
  ].filter(Boolean) as any[]

  // ---- context-aware quick actions (prioritized by what's pending right now) ----
  const _upload = { label: 'העלאת הקלטה חדשה', icon: 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z', onClick: () => set({ route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } }) }
  const _addPatient = { label: 'הוספת מטופל חדש', icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', onClick: () => navigate('patients') }
  const _timeline = { label: 'צפייה בציר הזמן', icon: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.94l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z', onClick: () => navigate('timeline') }
  const _reportIcon = 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2z'
  const ctx: any[] = []
  // 1. prep for the next / current session
  const nextA = allAppts.filter((a: any) => a.status !== 'done').sort((a: any, b: any) => toMin(a.time) - toMin(b.time))[0]
  if (nextA) {
    const np = getPatient(S.patients, nextA.pid)
    ctx.push({ label: 'הכנה לפגישה עם ' + np.name, sub: (nextA.status === 'now' ? 'מתקיימת כעת' : 'היום ' + nextA.time) + ' · דוח הכנה', icon: _reportIcon, recommended: true, onClick: () => navigate('report', { patientId: nextA.pid }) })
  }
  // 2. summaries awaiting the therapist's approval
  if (summariesAwaiting > 0) {
    const first = latestSummaries.find((s: any) => s.unreviewed)
    ctx.push({ label: 'בדיקת ' + summariesAwaiting + ' סיכומים ממתינים', sub: 'ממתינים לאישורך', icon: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', recommended: ctx.length === 0, onClick: first ? first.onOpen : () => navigate('patients') })
  }
  // 3. high-risk patient needing attention
  if (riskAlerts.length > 0) {
    const ra = riskAlerts[0]
    ctx.push({ label: 'מטופל בסיכון גבוה: ' + ra.name, sub: 'דורש תשומת לב', icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z', onClick: ra.onOpen })
  }
  const quickActions = [...ctx, _upload, _addPatient, _timeline].slice(0, 5).map((q: any) => ({
    ...q,
    recommended: !!q.recommended,
    sub: q.sub || '',
    iconBg: q.recommended ? 'var(--primary)' : 'var(--primary-tint)',
    iconColor: q.recommended ? 'var(--paper)' : 'var(--primary)',
    borderColor: q.recommended ? 'var(--primary)' : 'var(--divider)',
    bgColor: q.recommended ? 'var(--primary-surface)' : 'var(--paper)',
  }))

  const goCalendar = () => navigate('calendar')

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, letterSpacing: '-.8px' }}>שלום, ד״ר שגב</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{dashDateLine}</p>
        </div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {briefChips.map((c: any) => (
            <a key={c.label} onClick={c.onClick} onKeyDown={onKeyActivate(c.onClick)} role="button" tabIndex={0} className="dash-chip" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px solid var(--divider)', borderInlineStart: '3px solid ' + c.color, background: 'var(--paper)', color: 'var(--text)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill={c.color}><path d={c.icon} /></svg>{c.label}
            </a>
          ))}
        </div>
      </div>

      {/* getting started / onboarding */}
      {showOnboarding && (
        <div style={{ background: 'linear-gradient(120deg,var(--accent-grad-1),var(--accent-grad-2))', borderRadius: 12, padding: '22px 24px', marginBottom: 24, boxShadow: '0 8px 26px rgba(16,40,80,.22)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                <svg viewBox="0 0 24 24" width="21" height="21" fill="var(--on-accent)"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--on-accent)' }}>ברוכים הבאים לסנסיי</h2>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,.85)' }}>כמה צעדים קצרים כדי להפיק את המרב מהמערכת · {onboardDoneLabel}</p>
            </div>
            <svg onClick={dismissOnboarding} role="button" tabIndex={0} aria-label="הסתרת מדריך הפתיחה" className="dash-ob-close" viewBox="0 0 24 24" width="22" height="22" fill="rgba(255,255,255,.75)" style={{ cursor: 'pointer', flexShrink: 0 }}><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,.2)', overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ height: '100%', borderRadius: 6, background: 'var(--on-accent)', width: onboardPct }}></div>
          </div>
          <div className="rx-kpi4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {onboardSteps.map((st: any) => (
              <div key={st.num} onClick={st.onClick} onKeyDown={onKeyActivate(st.onClick)} role="button" tabIndex={0} className="dash-ob-step" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid ' + st.border, borderRadius: 10, padding: 14, cursor: st.cursor, opacity: st.opacity }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: st.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {st.done && (<svg viewBox="0 0 24 24" width="15" height="15" fill="var(--primary)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>)}
                    {st.pending && (<span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--on-accent)' }}>{st.num}</span>)}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-accent)', lineHeight: 1.2 }}>{st.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.78)', lineHeight: 1.45 }}>{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moment for Me — quiet between-session pause (Mativ guidelines P0) */}
      <MomentCard />
      <MomentOverlay />

      <div className="rx-kpi4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s: any) => (
          <div key={s.label} onClick={s.onClick} className="dash-stat" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '20px 22px', cursor: 'pointer' }}>
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

      <div className="rx-main" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* today's schedule */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>לוח היום</h2>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-tint)', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{dashApptCount} פגישות</span>
              </div>
              <a onClick={goCalendar} style={{ fontSize: 13.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>ליומן ›</a>
            </div>
            {dashToday.map((a: any) => (
              <div key={a.time + '-' + a.name} onClick={a.onOpen} className="dash-appt-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 22px', borderBottom: '1px solid var(--line)', cursor: 'pointer', borderInlineStart: '3px solid ' + a.lineColor, background: a.rowBg }}>
                <div style={{ textAlign: 'center', minWidth: 46 }}>
                  <div dir="ltr" style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-.3px' }}>{a.time}</div>
                  <div dir="ltr" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.endTime}</div>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: a.avBg, color: a.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{a.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5 }}>{a.name}</span>
                    {a.isNow && (<span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--primary)', color: 'var(--paper)' }}>מתקיימת כעת</span>)}
                    {a.showNext && (<span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--primary-tint)', color: 'var(--primary)' }}>הבא בתור</span>)}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.type} · {a.dur}</div>
                </div>
                <button onClick={a.onUpload} aria-label="העלאת הקלטה לפגישה" className="dash-appt-upload" style={{ width: 34, height: 34, border: '1px solid var(--divider)', borderRadius: 10, background: 'var(--paper)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
                </button>
              </div>
            ))}
          </div>
          {/* latest summaries */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>סיכומי AI אחרונים</h2>
              {hasSummariesAwaiting && (<span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--warning-bg)', color: 'var(--warning)', whiteSpace: 'nowrap' }}>{summariesAwaiting} ממתינים לאישור</span>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {latestSummaries.map((ls: any) => (
                <div key={ls.name} onClick={ls.onOpen} className="dash-summary-card" style={{ border: '1px solid var(--divider)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--primary)"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14.5 }}>{ls.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {ls.date}</span>
                    {ls.unreviewed && (<span style={{ marginInlineStart: 'auto', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--warning-bg)', color: 'var(--warning)', whiteSpace: 'nowrap' }}>ממתין לאישור</span>)}
                    {ls.reviewed && (
                      <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>אושר
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{ls.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* risk alerts */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--divider)' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--error)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>התראות סיכון</h2>
            </div>
            {riskAlerts.map((r: any) => (
              <div key={r.name} onClick={r.onOpen} className="dash-risk-row" style={{ padding: '13px 20px', borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{r.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: r.riskBg, color: r.riskColor }}>{r.riskLabel}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{r.flag}</p>
              </div>
            ))}
          </div>
          {/* quick actions */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '20px 22px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>פעולות מהירות</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {quickActions.map((q: any) => (
                <button key={q.label} onClick={q.onClick} className="dash-quick-action" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', padding: '12px 14px', border: '1px solid ' + q.borderColor, borderRadius: 10, background: q.bgColor, cursor: 'pointer', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: q.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill={q.iconColor}><path d={q.icon} /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{q.label}</div>
                    {!!q.sub && (<div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 1 }}>{q.sub}</div>)}
                  </div>
                  {q.recommended && (<span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-tint)', borderRadius: 20, padding: '3px 9px', flexShrink: 0 }}>מומלץ</span>)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
