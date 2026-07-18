// Single recorded session — insight, summary, and transcript on one page.
import { useApp } from '../store/AppStore';
import { getPatient } from '../utils';
import { buildPatientSessions, demoSessionCount } from '../utils/patientSessions';
import {
  SESSION_MAIN_TOPICS,
  SESSION_RISK_FLAGS,
  sessionIndexForNum,
  sessionInsight,
  sessionSummaryText,
  sessionTitle,
} from '../data/sessionDetail';
import { CARD_SHADOW } from '../utils/styles';
import './session.css';

export default function SessionDetailPage() {
  const { S, set, navigate } = useApp();
  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);
  const sessionNum = S.sessionNum;
  const ctx = { navigate, set };
  const sessions = buildPatientSessions(cp, S.deletedSessions || [], ctx);
  const session = sessions.find((s) => s.num === sessionNum) ?? null;
  const total = demoSessionCount(cp);
  const idx = sessionNum != null ? sessionIndexForNum(sessionNum, total) : 0;

  const goHistory = () => navigate('meetingHistory', { patientId: S.patientId });
  const goPatient = () => navigate('patient', { patientId: S.patientId });
  const goFullSummary = () => navigate('summary', { patientId: S.patientId });

  const insight = sessionInsight(cp, idx);
  const summary = session ? session.summary : sessionSummaryText(cp, idx);
  const title = sessionTitle(cp, idx);

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <a onClick={goPatient} className="sesd-crumb" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>{cp.name}</a>
        <span>›</span>
        <a onClick={goHistory} className="sesd-crumb" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>היסטוריית פגישות</a>
        <span>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>פגישה {sessionNum ?? '—'}</span>
      </div>

      {S.loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 26 }}>
          <div className="skeleton" style={{ width: '40%', height: 16, borderRadius: 6, marginBottom: 14 }} />
          <div className="skeleton" style={{ width: '100%', height: 12, borderRadius: 6 }} />
        </div>
      )}

      {!S.loading && !session && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: 28, textAlign: 'center' }}>
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>הפגישה לא נמצאה.</p>
          <button type="button" onClick={goHistory} style={{ height: 40, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontWeight: 600, cursor: 'pointer' }}>חזרה להיסטוריה</button>
        </div>
      )}

      {!S.loading && session && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>פגישה {session.num}</h1>
              {title && <p style={{ margin: '0 0 4px', color: 'var(--text-2)', fontSize: 16, fontWeight: 600 }}>{title}</p>}
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>
                {cp.name} · <span dir="ltr">{session.date}</span> · {session.duration}
              </p>
            </div>
          </div>

          <section style={{ background: 'linear-gradient(120deg,var(--accent-grad-1),var(--accent-grad-2))', borderRadius: 10, padding: '22px 24px', color: 'var(--on-accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--paper)"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>תובנות מרכזיות</h2>
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, opacity: .95 }}>{insight}</p>
          </section>

          <section style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>סיכום הפגישה</h2>
              <button type="button" onClick={goFullSummary} className="sesd-link-btn" style={{ height: 34, padding: '0 12px', border: '1px solid var(--border-input)', borderRadius: 8, background: 'var(--paper)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--primary)' }}>עריכת הסיכום ›</button>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: 'var(--text)' }}>{summary}</p>
          </section>

          <section style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>נושאים מרכזיים</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {SESSION_MAIN_TOPICS.map((t) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: 'var(--text)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--secondary-strong)', flexShrink: 0 }} />{t}
                </div>
              ))}
            </div>
          </section>

          <section style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '16px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--divider)' }}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--error)" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>דגלי סיכון</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginInlineStart: 4 }}>(אינדיקטור בלבד. אינו מהווה אבחנה רפואית)</span>
            </div>
            <div style={{ padding: '4px 24px 16px' }}>
              {SESSION_RISK_FLAGS.map((rf, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 0', borderBottom: i < SESSION_RISK_FLAGS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: rf.bg, color: rf.color, whiteSpace: 'nowrap', marginTop: 2 }}>{rf.level}</span>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--text)' }}>{rf.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
