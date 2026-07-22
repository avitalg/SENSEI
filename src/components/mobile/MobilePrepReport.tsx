// Mobile prep report (design: "Sensei Mobile · Prep report") for the report /
// nextMeetingReport routes. Same content as the desktop ReportPage — the LIVE
// senseiapi next-meeting report when configured (via useNextMeetingReport),
// falling back to the shared demo copy otherwise — in a touch layout, plus
// upload / patient CTAs.
import { useState } from 'react';
import { useApp } from '../../store/AppStore';
import { useTts } from '../../hooks/useTts';
import { getPatient } from '../../utils';
import { sessionInsight, sessionSummaryText } from '../../data/sessionDetail';
import { useNextMeetingReport } from '../../hooks/useNextMeetingReport';
import { usePatientNextMeeting } from '../../hooks/usePatientNextMeeting';
import { formatMeetingWhen } from '../patient/UpcomingMeetingList';
import AiDisclaimer from '../shared/AiDisclaimer';
import { ChevronStartIcon } from './icons';

export default function MobilePrepReport() {
  const { S, navigate } = useApp();
  const tts = useTts();
  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);
  const [goalsDone, setGoalsDone] = useState<Record<number, boolean>>({});

  const reportMeetingId = (S.reportMeetingId as string | null | undefined) || undefined;
  const report = useNextMeetingReport(
    cp.id,
    cp.name,
    sessionSummaryText(cp, 0),
    sessionInsight(cp, 0),
    reportMeetingId,
  );
  const { nextMeetingStart } = usePatientNextMeeting(
    cp.id,
    cp.name,
    S.scheduledAppts || [],
    S.patients,
    S.calendarRefreshNonce,
  );
  const nextMeetingLabel = nextMeetingStart
    ? formatMeetingWhen(nextMeetingStart)
    : 'לא נקבעה פגישה קרובה';
  // Mirror ReportPage: skeleton / error / body are mutually exclusive, so demo
  // fallback copy is never shown as if it were the patient's live report.
  const showBody = !report.loading && !report.error;

  return (
    <div className="mob-screen">
      <div className="mob-screen-header">
        <button type="button" className="mob-back" aria-label="חזרה לתיק המטופל" onClick={() => navigate('patient', { patientId: cp.id })}>
          <ChevronStartIcon size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>דוח הכנה · {cp.name}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            הפגישה הבאה: {nextMeetingLabel}
          </div>
        </div>
        <span className="mob-badge">נוצר ע״י AI</span>
      </div>

      <div className="mob-screen-body">
        {report.loading && (
          <div className="mob-card" role="status" aria-live="polite">
            <div className="skeleton" style={{ height: 13, width: '45%', borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 11, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '80%', borderRadius: 6 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>מכינים את דוח ההכנה…</div>
          </div>
        )}
        {!report.loading && report.error && (
          <div className="mob-card" role="alert">
            <div className="mob-card-title">לא ניתן לטעון את הדוח</div>
            <div className="mob-card-body" style={{ color: 'var(--error)' }}>{report.error}</div>
          </div>
        )}
        {showBody && (<>
        <div className="mob-card" style={{ background: 'var(--primary-tint)', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="mob-card-title" style={{ flex: 1, margin: 0 }}>סקירה מהירה</div>
            {tts.supported && (report.intro || report.summary) && (
              <button
                type="button"
                onClick={() => tts.toggle([report.intro, report.summary].filter(Boolean).join(' '))}
                aria-pressed={tts.speaking}
                aria-label={tts.speaking ? 'עצירת ההשמעה' : 'השמעת תקציר קולי לפגישה'}
                className="tap44"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--paper)', color: 'var(--primary)', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                  {tts.speaking ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" /> : <path d="M8 5v14l11-7z" />}
                </svg>
                {tts.speaking ? 'עצירה' : 'השמעה'}
              </button>
            )}
          </div>
          <div className="mob-card-body" style={{ marginTop: 6 }}>{report.intro}</div>
        </div>

        <div className="mob-card">
          <div className="mob-card-title">סיכום הפגישה הקודמת</div>
          <div className="mob-card-body">{report.summary}</div>
        </div>

        <div className="mob-card">
          <div className="mob-card-title">נקודות למעקב</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {report.changes.map((t) => (
              <div key={t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mob-card">
          <div className="mob-card-title">מטרות לפגישה הקרובה</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.openTopics.map((t, i) => {
              const done = !!goalsDone[i];
              return (
                <button
                  key={t}
                  type="button"
                  className="mob-goal"
                  aria-pressed={done}
                  onClick={() => setGoalsDone((g) => ({ ...g, [i]: !done }))}
                >
                  <span className={'mob-check' + (done ? ' is-done' : '')} aria-hidden>{done ? '✓' : ''}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.5, color: done ? 'var(--text-muted)' : 'var(--text-2)', textDecoration: done ? 'line-through' : 'none' }}>{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        {report.questions.length > 0 && (
          <div className="mob-card">
            <div className="mob-card-title">שאלות מוצעות למפגש</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {report.questions.map((q) => (
                <div key={q} style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', fontStyle: 'italic' }}>&quot;{q}&quot;</div>
              ))}
            </div>
          </div>
        )}

        {/* Same clinical-AI trust signal the desktop prep report carries — the
            mobile report shows identical AI-generated guidance, so it must not
            omit the "not a diagnosis · judgment stays with you" disclaimer. */}
        <AiDisclaimer />
        </>)}
      </div>

      <div className="mob-footer">
        <button type="button" className="mob-ghost-btn" onClick={() => navigate('upload', { patientId: cp.id, upload: { state: 'idle', progress: 0, fileName: '', error: '' } })}>העלאת הקלטה</button>
        <button type="button" className="mob-primary-btn" style={{ marginTop: 0 }} onClick={() => navigate('patient', { patientId: cp.id })}>תיק מטופל</button>
      </div>
    </div>
  );
}
