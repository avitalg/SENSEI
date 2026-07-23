// דוח הכנה לפגישה (spec, priority 1) — the prep-report screen, reinstated as a
// nav destination and rebuilt on the canonical mock-patient repository. Every
// clinical statement on this page is dataset-derived:
//   quick review   ← the latest session's key insight + stated next focus
//   last summary   ← the latest session's סיכום הפגישה, verbatim
//   session goals  ← the therapist's stated "לפעם הבאה" + לתשומת לב notes
//   follow-ups     ← the latest session's נושאים מרכזיים
//   questions      ← templated from those topics (clearly marked AI helper copy)
// The layout mirrors the original senseiweb report page (report.css classes,
// patient card → gradient quick review → audio brief → sections → disclaimer).
import React, { useRef, useEffect, useState } from 'react';
import { CARD_SHADOW } from '../utils/styles';
import { useApp } from '../store/AppStore';
import { getPatient, avatarColors } from '../utils';
import { patientInitials, patientAvatarColor } from '../services/patients';
import { PATIENT_SESSION_CONTENT } from '../data/patientSessionContent';
import { repoPatient } from '../data/mockPatientsRepo';
import AiDisclaimer from '../components/shared/AiDisclaimer';
import { localApptsToUiEvents, isUpcomingEvent } from '../services/calendar';
import { formatMeetingWhen } from '../components/patient/UpcomingMeetingList';
import './report.css';

export default function NextMeetingReportPage() {
  const { S, set, navigate, toast } = useApp();
  const bTimer = useRef<any>(null);
  const refreshTimer = useRef<any>(null);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => () => {
    if (bTimer.current) clearInterval(bTimer.current);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);
  const cpa = avatarColors(patientAvatarColor(cp.id));
  const bespoke = PATIENT_SESSION_CONTENT[cp.id];
  const rp = repoPatient(cp.id);
  const latest = rp?.sessions[rp.sessions.length - 1];

  // Next meeting from the (repo-derived) local schedule.
  const now = new Date();
  const nextMeeting = localApptsToUiEvents(S.scheduledAppts || [], cp.id, cp.name)
    .filter((e) => isUpcomingEvent(e, now))
    .sort((a, b) => +a.start - +b.start)[0] || null;
  const nextDateLabel = nextMeeting ? formatMeetingWhen(new Date(nextMeeting.start)) : 'לא נקבעה';

  // Dataset-derived report body (see the module comment for the mapping).
  const reportIntro = bespoke
    ? [bespoke.insights?.[0], bespoke.nextFocus?.[0] ? 'לקראת הפגישה: ' + bespoke.nextFocus[0] + '.' : '']
      .filter(Boolean).join(' ')
    : 'אין עדיין סיכומי פגישות מנותחים עבור מטופל זה. הדוח יתמלא לאחר הפגישה הראשונה שתוקלט ותנותח.';
  const lastSummary = bespoke?.summaries?.[0] || '';
  const sessionGoals = bespoke
    ? [bespoke.nextFocus?.[0], bespoke.attention?.[0]].filter((x): x is string => !!x)
    : [];
  const followUpPoints = latest?.topics || [];
  // AI helper copy, mechanically templated from the session's own topics.
  const suggestedQuestions = followUpPoints.slice(0, 3).map((t) => 'מה עלה השבוע סביב "' + t + '"?');

  const goPatientFile = () => navigate('patient', { patientId: cp.id });
  const goMeetingHistory = () => navigate('meetingHistory', { patientId: cp.id });
  const onPickPatient = (e: any) => {
    const p = S.patients.find((x: any) => x.name === e.target.value);
    if (!p) return;
    clearInterval(bTimer.current);
    set({ briefPlaying: false, briefProgress: 0 });
    setGeneratedAt(new Date());
    navigate(S.route, { patientId: p.id });
  };
  const refreshReport = () => {
    if (refreshing) return;
    setRefreshing(true);
    refreshTimer.current = setTimeout(() => {
      setGeneratedAt(new Date());
      setRefreshing(false);
      toast('דוח ההכנה עודכן מהמידע האחרון בתיק', 'success');
    }, 350);
  };
  const generatedLabel = new Intl.DateTimeFormat('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(generatedAt);

  // Simulated audio brief (existing demo scaffolding — briefPlaying/briefProgress).
  const secs = Math.round((S.briefProgress / 100) * 108);
  const briefCur = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
  const briefIcon = S.briefPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z';
  const briefBars = Array.from({ length: 32 }, (_, i) => { const filled = (i / 32) * 100 <= S.briefProgress; return { h: (10 + Math.abs(Math.sin(i * 1.3)) * 22) + 'px', color: filled ? 'var(--primary)' : 'var(--primary-border)' }; });
  const toggleBrief = () => {
    if (S.briefPlaying) { clearInterval(bTimer.current); set({ briefPlaying: false }); return; }
    set({ briefPlaying: true, briefProgress: S.briefProgress >= 100 ? 0 : S.briefProgress });
    clearInterval(bTimer.current);
    bTimer.current = setInterval(() => {
      set((s: any) => { const np = s.briefProgress + 2; if (np >= 100) { clearInterval(bTimer.current); return { briefProgress: 100, briefPlaying: false }; } return { briefProgress: np }; });
    }, 120);
  };

  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <button type="button" onClick={goPatientFile} className="rep-crumb tap44" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>{cp.name}</button>
        <span>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>דוח הכנה</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>דוח הכנה לפגישה</h1>
          <p style={{ margin: '0 0 6px', color: 'var(--text-secondary)', fontSize: 15 }}>סיכום אוטומטי לקראת הפגישה הבאה</p>
          <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', fontSize: 12.5 }}>
            נוצר: <span dir="ltr">{generatedLabel}</span> · נתוני הדגמה מקומיים
          </p>
          <a onClick={goMeetingHistory} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goMeetingHistory(); } }} className="rep-history-link tap44" style={{ display: 'inline-flex', fontSize: 13.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>היסטוריית הפגישות המלאה ›</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={refreshReport} disabled={refreshing} aria-busy={refreshing} className="rep-refresh-btn">
            {refreshing ? 'מעדכן…' : 'רענון דוח'}
          </button>
          <select value={cp.name} onChange={onPickPatient} aria-label="בחירת מטופל" className="app-select">
            {S.patients.map((p: any) => (<option key={p.id}>{p.name}</option>))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* patient card */}
        <div style={{ ...card, padding: '20px 22px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: 'var(--text-2)' }}>כרטיס מטופל</h2>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: cpa.bg, color: cpa.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>{patientInitials(cp.name)}</div>
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>שם המטופל: </span>
                <span style={{ color: 'var(--text)' }}>{cp.name}</span>
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>הפגישה הבאה: </span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{nextDateLabel}</span>
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>טלפון: </span>
                <span dir={cp.phone ? 'ltr' : 'rtl'} style={{ color: cp.phone ? 'var(--text)' : 'var(--text-muted)' }}>{cp.phone || 'לא צוין'}</span>
              </div>
              {rp?.approach && (
                <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>גישה טיפולית: </span>
                  <span style={{ color: 'var(--text)' }}>{rp.approach}</span>
                </div>
              )}
              <div style={{ marginTop: 4 }}>
                <button type="button" onClick={goPatientFile} aria-label="מעבר לתיק מטופל" className="rep-patient-link rep-patient-file-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
                  מעבר לתיק מטופל
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* quick review (gradient) */}
        <div style={{ background: 'linear-gradient(120deg,var(--accent-grad-1),var(--accent-grad-2))', borderRadius: 10, padding: '22px 24px', color: 'var(--on-accent)' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>סקירה מהירה</h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, opacity: .95 }}>{reportIntro}</p>
        </div>

        {/* audio brief */}
        <div style={{ ...card, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={toggleBrief} aria-label={S.briefPlaying ? 'השהיית התקציר הקולי' : 'ניגון התקציר הקולי'} aria-pressed={S.briefPlaying} className="rep-brief-btn" style={{ width: 50, height: 50, border: 'none', borderRadius: '50%', background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(31,99,214,.3)' }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="var(--on-accent)"><path d={briefIcon} /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>תקציר קולי מהיר</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--secondary-bg)', color: 'var(--secondary-strong)' }}>AI</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>הקשבה מהירה בין פגישות (1:48 דקות)</span>
            </div>
            <div role="progressbar" aria-label="התקדמות התקציר הקולי" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(S.briefProgress)} aria-valuetext={`${briefCur} מתוך 1:48`} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 30 }}>
              {briefBars.map((bar, i) => (<div key={i} style={{ flex: 1, height: bar.h, background: bar.color, borderRadius: 2 }}></div>))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <span dir="ltr">{briefCur}</span><span dir="ltr">1:48</span>
            </div>
          </div>
        </div>

        {/* last-session summary */}
        {lastSummary && (
          <div style={{ ...card, padding: 22 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>סיכום הפגישה הקודמת</h2>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: 'var(--text)' }}>{lastSummary}</p>
          </div>
        )}

        {/* goals for the coming session */}
        {sessionGoals.length > 0 && (
          <div style={{ ...card, padding: 22 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>מטרות לפגישה הקרובה</h2>
            <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessionGoals.map((g, i) => (<li key={i} style={{ fontSize: 14.5, lineHeight: 1.65 }}>{g}</li>))}
            </ul>
          </div>
        )}

        {/* follow-up points */}
        {followUpPoints.length > 0 && (
          <div style={{ ...card, padding: 22 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>נקודות למעקב</h2>
            <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {followUpPoints.map((t, i) => (<li key={i} style={{ fontSize: 14.5, lineHeight: 1.65 }}>{t}</li>))}
            </ul>
          </div>
        )}

        {/* suggested questions (templated AI helper copy) */}
        {suggestedQuestions.length > 0 && (
          <div style={{ ...card, padding: 22 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>שאלות מוצעות לפתיחה</h2>
            <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestedQuestions.map((q, i) => (<li key={i} style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)' }}>{q}</li>))}
            </ul>
          </div>
        )}

        <AiDisclaimer text="דוח ההכנה נוצר אוטומטית מסיכומי הפגישות ככלי עזר בלבד. אינו מהווה אבחנה או המלצה קלינית, והאחריות המקצועית ושיקול הדעת הקליני נותרים בידיכם." />
      </div>
    </div>
  );
}
