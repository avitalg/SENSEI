// Full meeting history for one patient — all past recorded sessions.
import { useApp } from '../store/AppStore';
import { getPatient } from '../utils';
import { buildPatientSessions, enrichPatientSessions } from '../utils/patientSessions';
import PatientSessionList from '../components/patient/PatientSessionList';
import { CARD_SHADOW } from '../utils/styles';
import './meetingHistory.css';

export default function PatientMeetingHistoryPage() {
  const { S, set, navigate } = useApp();
  const goPatient = () => navigate('patient', { patientId: S.patientId });

  const onPatientPick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = S.patients.find((x: any) => x.id === e.target.value);
    if (p) navigate('meetingHistory', { patientId: p.id });
  };

  // No patient chosen (e.g. reached from the sidebar) → a picker, not an arbitrary
  // patient's history. Never silently show someone the user didn't select.
  if (!S.patientId) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>היסטוריית פגישות</h1>
        <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 15 }}>בחרו מטופל כדי לצפות בהיסטוריית הפגישות שלו.</p>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '40px 24px', textAlign: 'center' }}>
          <svg viewBox="0 0 24 24" width="42" height="42" fill="var(--text-muted)" aria-hidden="true" style={{ opacity: 0.6, marginBottom: 14 }}><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z" /></svg>
          <div style={{ marginBottom: 4 }}>
            <label htmlFor="mh-pick" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>בחירת מטופל</label>
            <select id="mh-pick" onChange={onPatientPick} defaultValue="" aria-label="בחירת מטופל להיסטוריית פגישות" className="mh-patient-select" style={{ height: 44, minWidth: 240, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 14px', fontSize: 14, background: 'var(--paper)', color: 'var(--text-2)', outline: 'none', cursor: 'pointer' }}>
              <option value="" disabled>בחרו מטופל…</option>
              {S.patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);

  const base = buildPatientSessions(cp, S.deletedSessions || [], { navigate, set });
  const sessions = enrichPatientSessions(base, S, cp.id);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <a onClick={goPatient} className="mh-crumb" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>{cp.name}</a>
        <span>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>היסטוריית פגישות</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>היסטוריית פגישות</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{cp.name} · {sessions.length} פגישות</p>
        </div>
        <select
          onChange={onPatientPick}
          value={cp.id}
          aria-label="בחירת מטופל"
          className="mh-patient-select"
          style={{ height: 44, border: '1px solid var(--divider)', borderRadius: 10, padding: '0 14px', fontSize: 14, background: 'var(--paper)', color: 'var(--text-2)', outline: 'none', cursor: 'pointer' }}
        >
          {S.patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {S.loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 26 }}>
          <div className="skeleton" style={{ width: '35%', height: 14, borderRadius: 6, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '90%', height: 11, borderRadius: 6 }} />
        </div>
      )}

      {!S.loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '8px 22px 18px' }}>
          <PatientSessionList sessions={sessions} />
        </div>
      )}
    </div>
  );
}
