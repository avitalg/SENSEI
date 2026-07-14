// Mobile prep report (design: "Sensei Mobile · Prep report") for the report /
// nextMeetingReport routes. Presents the same store-derived content as the
// desktop ReportPage (previous-session summary, what-changed, open topics as
// checkable goals, AI insight) in a touch layout, plus start-recording / patient
// CTAs. No new clinical logic — shared data modules only.
import { useState } from 'react';
import { useApp } from '../../store/AppStore';
import { getPatient } from '../../utils';
import { sessionInsight, sessionSummaryText } from '../../data/sessionDetail';
import { REPORT_CHANGES, REPORT_OPEN } from '../../data/reportContent';
import { ChevronStartIcon } from './icons';

interface Props {
  onOpenRecording: (pid: string, name: string) => void;
}

export default function MobilePrepReport({ onOpenRecording }: Props) {
  const { S, navigate } = useApp();
  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);
  const [goalsDone, setGoalsDone] = useState<Record<number, boolean>>({});

  const summary = sessionSummaryText(cp, 0);
  const insight = sessionInsight(cp, 0);

  return (
    <div className="mob-screen">
      <div className="mob-screen-header">
        <button type="button" className="mob-back" aria-label="חזרה" onClick={() => window.history.back()}>
          <ChevronStartIcon size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>דוח הכנה · {cp.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>סיכום אוטומטי לקראת הפגישה הבאה</div>
        </div>
        <span className="mob-badge">נוצר ע״י AI</span>
      </div>

      <div className="mob-screen-body">
        <div className="mob-card">
          <div className="mob-card-title">סיכום הפגישה הקודמת</div>
          <div className="mob-card-body">{summary}</div>
        </div>

        <div className="mob-card">
          <div className="mob-card-title">נקודות למעקב</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {REPORT_CHANGES.map((t) => (
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
            {REPORT_OPEN.map((t, i) => {
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

        <div className="mob-card" style={{ background: 'var(--primary-tint)', border: 'none' }}>
          <div className="mob-card-title">תובנה מהפגישה האחרונה</div>
          <div className="mob-card-body">{insight}</div>
        </div>
      </div>

      <div className="mob-footer">
        <button type="button" className="mob-ghost-btn" onClick={() => onOpenRecording(cp.id, cp.name)}>התחל הקלטה</button>
        <button type="button" className="mob-primary-btn" style={{ marginTop: 0 }} onClick={() => navigate('patient', { patientId: cp.id })}>תיק מטופל</button>
      </div>
    </div>
  );
}
