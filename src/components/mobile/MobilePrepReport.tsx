// Mobile prep report for the `report` route. Uses the same senseiapi pipeline as
// desktop ReportPage (useNextMeetingReport → nextMeetingReport.ts poll/regenerate),
// with a touch layout. The nextMeetingReport route is the shared patient picker.
import { useApp } from '../../store/AppStore';
import { getPatient } from '../../utils';
import { sessionInsight, sessionSummaryText } from '../../data/sessionDetail';
import { useNextMeetingReport } from '../../hooks/useNextMeetingReport';
import { usePatientNextMeeting } from '../../hooks/usePatientNextMeeting';
import { useMeetingReportSpeech } from '../../hooks/useMeetingReportSpeech';
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

  // Voice brief — same browser-native Web Speech control as the desktop report
  // (useMeetingReportSpeech → useTts): reads the quick overview + previous-session
  // summary aloud. No backend, no static audio.
  const reportSpeechText = cp.name + '. ' + report.intro + (report.summary ? ' מהפגישה הקודמת: ' + report.summary : '');
  const reportSpeech = useMeetingReportSpeech(reportSpeechText);

  // Match desktop ReportPage: open_topics → follow-ups; changes → goals.
  const followUpPoints = report.openTopics;
  const sessionGoals = report.changes;

  // Desktop shows demo body with a notice when live generation fails — never a
  // hard error wall that blocks prep. Same contract here.
  const liveFailed = !!report.error && !report.loading;
  const showSkeleton = report.loading;
  const showBody = !showSkeleton;

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

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate('nextMeetingReport');
  };

  return (
    <div className="mob-screen">
      <div className="mob-screen-header">
        <button type="button" className="mob-back" aria-label="חזרה" onClick={goBack}>
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
        {reportSpeech.supported && (
          <button
            type="button"
            className="mob-speech-btn"
            onClick={reportSpeech.toggle}
            aria-label={reportSpeech.speaking ? 'עצירת ההקראה' : 'הקראת תקציר הדוח'}
            aria-pressed={reportSpeech.speaking}
            style={reportSpeech.speaking ? { background: 'var(--primary)', color: 'var(--on-accent)', borderColor: 'var(--primary)' } : undefined}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d={reportSpeech.speaking ? 'M6 6h4v12H6zm8 0h4v12h-4z' : 'M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z'} />
            </svg>
          </button>
        )}
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

        {showSkeleton && (
          <div className="mob-card" role="status" aria-live="polite">
            <div className="skeleton" style={{ height: 13, width: '45%', borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 11, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '80%', borderRadius: 6 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>מייצרים דוח הכנה מסיכומי הפגישות…</div>
          </div>
        )}

        {showBody && (
          <>
            {liveFailed && (
              <div className="mob-card" role="status" style={{ borderColor: 'var(--border-input)' }}>
                <div className="mob-card-body" style={{ color: 'var(--text-secondary)' }}>
                  לא הצלחנו לייצר דוח חי כרגע. מוצג דוח הדגמה; אפשר לנסות שוב עם &quot;רענון דוח&quot;.
                  {report.error ? <span style={{ display: 'block', marginTop: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>{report.error}</span> : null}
                </div>
              </div>
            )}

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
              {followUpPoints.length === 0 && report.live ? (
                <div className="mob-card-body" style={{ color: 'var(--text-secondary)' }}>לא זוהו נקודות למעקב בסיכומים</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {followUpPoints.map((t) => (
                    <div key={t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning-strong)', marginTop: 7, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mob-card">
              <div className="mob-card-title">מטרות לפגישה הקרובה</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {sessionGoals.map((t) => (
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
