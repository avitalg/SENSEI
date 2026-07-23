// The patient's open follow-ups — the repository's own "לתשומת לב" and
// "לפעם הבאה" notes from this patient's latest session, each deep-linking to
// its source session. Shared by the desktop patient file (overview tab) and the
// mobile patient screen; the cross-patient dashboard card is a separate surface.
// Renders nothing for patients without open repository tasks.
import { useApp } from '../../store/AppStore';
import { riskMeta } from '../../utils';
import { openRepoTasks } from '../../data/mockPatientsRepo';
import { CARD_SHADOW } from '../../utils/styles';

export default function PatientFollowups({ pid }: { pid: string }) {
  const { navigate } = useApp();
  const tasks = openRepoTasks().filter((t) => t.patientId === pid);
  if (!tasks.length) return null;
  return (
    <div className="pw-readable" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 20, marginBlockStart: 14 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>משימות להמשך טיפול</h2>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-secondary)' }}>מהפגישה האחרונה · מתוך התיעוד עצמו</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((t) => {
          const rm = t.priority && t.priority !== 'low' ? riskMeta(t.priority) : null;
          return (
            <button key={t.id} type="button" onClick={() => navigate('session', { patientId: t.patientId, sessionNum: t.sessionNum })} aria-label={'פתיחת פגישת המקור · ' + t.title} style={{ display: 'block', width: '100%', textAlign: 'start', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--paper)', padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.title}</span>
                {rm && <span style={{ fontSize: 11, fontWeight: 700, color: rm.color, background: rm.bg, borderRadius: 999, padding: '1px 8px', flexShrink: 0 }}>{rm.label}</span>}
                {t.sessionDate && <span dir="ltr" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginInlineStart: 'auto', flexShrink: 0 }}>{t.sessionDate}</span>}
              </span>
              <span style={{ display: 'block', fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)' }}>{t.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
