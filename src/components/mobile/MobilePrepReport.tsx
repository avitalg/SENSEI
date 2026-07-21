// Mobile prep report (design: "Sensei Mobile · Prep report") for the report /
// nextMeetingReport routes. Same content as the desktop ReportPage — the LIVE
// senseiapi next-meeting report when configured (via useNextMeetingReport),
// falling back to the shared demo copy otherwise — in a touch layout, plus
// upload / patient CTAs.
import { useApp } from '../../store/AppStore';
import { getPatient } from '../../utils';
import { sessionInsight, sessionSummaryText } from '../../data/sessionDetail';
import { useNextMeetingReport } from '../../hooks/useNextMeetingReport';
import { usePatientNextMeeting } from '../../hooks/usePatientNextMeeting';
import { formatMeetingWhen } from '../patient/UpcomingMeetingList';
import { ChevronStartIcon } from './icons';

export default function MobilePrepReport() {
  const { S, navigate, toast } = useApp();
  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);

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

  const onRegenerate = () => {
    if (!report.canRegenerate || report.regenerating) return;
    void report.regenerate().then((result) => {
      if (result === 'ok') toast('הדוח עודכן');
      else if (result === 'unavailable') {
        toast('רענון מהשרת אינו זמין עדיין · מוצג הדוח המקומי');
      } else if (result === 'failed') {
        toast('רענון הדוח נכשל', 'error');
      }
    });
  };

  return (
    <div className="mob-screen">
      <div className="mob-screen-header">
        <button type="button" className="mob-back" aria-label="חזרה" onClick={() => window.history.back()}>
          <ChevronStartIcon size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>דוח הכנה · {cp.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            הפגישה הבאה: {nextMeetingLabel}
          </div>
        </div>
        <span className="mob-badge" dir={report.model ? 'ltr' : undefined}>
          {report.model ? report.model : 'נוצר ע״י AI'}
        </span>
      </div>

      <div className="mob-screen-body">
        {report.canRegenerate && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              dir={report.model ? 'ltr' : undefined}
            >
              {report.regenerating
                ? 'מרעננים את הדוח…'
                : (report.model ? report.model : (report.live ? 'דוח חי' : 'דוח הדגמה'))}
            </span>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={report.regenerating || report.loading}
              aria-label="רענון דוח"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 34,
                padding: '0 12px',
                border: '1px solid var(--border-input)',
                borderRadius: 8,
                background: 'var(--paper)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-2)',
                cursor: (report.regenerating || report.loading) ? 'default' : 'pointer',
                opacity: (report.regenerating || report.loading) ? 0.6 : 1,
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="currentColor"
                aria-hidden="true"
                style={report.regenerating ? { animation: 'spin 1s linear infinite' } : undefined}
              >
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              {report.regenerating ? 'מרעננים…' : 'רענון דוח'}
            </button>
          </div>
        )}
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
            {report.canRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={report.regenerating}
                style={{
                  marginTop: 12,
                  height: 40,
                  padding: '0 16px',
                  border: 'none',
                  borderRadius: 10,
                  background: 'var(--primary)',
                  color: 'var(--paper)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: report.regenerating ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {report.regenerating ? 'מרעננים…' : 'רענון דוח'}
              </button>
            )}
          </div>
        )}
        {showBody && (
          <>
            <div className="mob-card" style={{ background: 'var(--primary-tint)', border: 'none' }}>
              <div className="mob-card-title">סקירה מהירה</div>
              <div className="mob-card-body">{report.intro}</div>
            </div>

            <div className="mob-card">
              <div className="mob-card-title">סיכום הפגישה הקודמת</div>
              <div className="mob-card-body" style={{ whiteSpace: 'pre-wrap' }}>{report.summary}</div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {report.openTopics.map((t) => (
                  <div key={t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t}</span>
                  </div>
                ))}
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
          </>
        )}
      </div>

      <div className="mob-footer">
        <button type="button" className="mob-ghost-btn" onClick={() => navigate('upload', { patientId: cp.id, upload: { state: 'idle', progress: 0, fileName: '', error: '' } })}>העלאת הקלטה</button>
        <button type="button" className="mob-primary-btn" style={{ marginTop: 0 }} onClick={() => navigate('patient', { patientId: cp.id })}>תיק מטופל</button>
      </div>
    </div>
  );
}
