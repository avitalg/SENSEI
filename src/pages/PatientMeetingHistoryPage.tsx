// Full meeting history for one patient — all past recorded sessions.
import { useState } from 'react';
import Highlight from '../components/shared/Highlight';
import { useApp } from '../store/AppStore';
import { getPatient, avatarColors, heCount } from '../utils';
import { patientInitials, patientAvatarColor } from '../services/patients';
import { normHe } from '../utils/search';
import { buildPatientSessions, enrichPatientSessions, demoSessionCount } from '../utils/patientSessions';
import PatientSessionList from '../components/patient/PatientSessionList';
import { CARD_SHADOW } from '../utils/styles';
import './meetingHistory.css';

export default function PatientMeetingHistoryPage() {
  const { S, set, navigate } = useApp();
  const goPatient = () => navigate('patient', { patientId: S.patientId });

  // No patient chosen (reached from the sidebar) → the canonical directory: ALL
  // patients (active + archived) A–Z with search; picking one opens the same
  // history screen. Never silently show an arbitrary patient.
  if (!S.patientId) {
    return <HistoryDirectory />;
  }

  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);
  const onPatientPick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = S.patients.find((x: any) => x.id === e.target.value);
    if (p) navigate('meetingHistory', { patientId: p.id });
  };

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
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{cp.name} · {heCount(sessions.length, 'פגישה אחת', 'פגישות')}</p>
        </div>
        <select
          onChange={onPatientPick}
          value={cp.id}
          aria-label="בחירת מטופל"
          className="app-select"
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

// Canonical patient directory for Session History — all patients (active +
// archived) A–Z with search; a row opens that patient's full history.
function HistoryDirectory() {
  const { S, navigate } = useApp();
  const [query, setQuery] = useState('');
  const all = [...(S.patients || []), ...(S.archivedPatients || [])];
  const q = normHe(query.trim());
  const rows = all
    .filter((p: any) => !q || normHe(p.name).includes(q) || normHe(p.phone || '').includes(q))
    .sort((a: any, b: any) => a.name.localeCompare(b.name, 'he'))
    .map((p: any) => {
      const a = avatarColors(patientAvatarColor(p.id));
      return { id: p.id, name: p.name, archived: !!p.archived, initials: patientInitials(p.name), avBg: a.bg, avColor: a.color, count: demoSessionCount(p) };
    });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>היסטוריית פגישות</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 15 }}>בחרו מטופל כדי לצפות בהיסטוריית הפגישות המלאה שלו.</p>

      {all.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--text-muted)" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש מטופל" placeholder="חיפוש לפי שם או טלפון…" className="mh-dir-search" style={{ width: '100%', height: 46, border: '1px solid var(--divider)', background: 'var(--paper)', borderRadius: 10, padding: '0 44px', fontSize: 14.5, outline: 'none', fontFamily: 'inherit', color: 'var(--text)' }} />
        </div>
      )}

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <p style={{ margin: 0, padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14.5 }}>{q ? 'לא נמצאו מטופלים התואמים לחיפוש.' : 'אין מטופלים להצגה.'}</p>
        ) : rows.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => navigate('meetingHistory', { patientId: p.id })}
            aria-label={p.name + ' · היסטוריית פגישות' + (p.archived ? ' · בארכיון' : '')}
            data-name={p.name}
            className="mh-dir-row"
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'start', padding: '13px 20px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--divider)', background: 'var(--paper)', cursor: 'pointer', fontFamily: 'inherit', font: 'inherit' }}
          >
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: p.avBg, color: p.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, opacity: p.archived ? 0.8 : 1 }}>{p.initials}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}><Highlight text={p.name} query={query} /></span>
                {p.archived && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 20, padding: '2px 8px' }}>ארכיון</span>}
              </span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{heCount(p.count, 'פגישה אחת', 'פגישות')}</span>
            </span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}
