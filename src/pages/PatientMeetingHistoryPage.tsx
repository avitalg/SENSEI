// Full meeting history for one patient — all past recorded sessions.
import { useState } from 'react';
import PatientIdentity from '../components/shared/PatientIdentity';
import { useApp } from '../store/AppStore';
import { avatarColors, heCount } from '../utils';
import { patientInitials, patientAvatarColor } from '../services/patients';
import { isApiConfigured } from '../services/apiClient';
import { normHe } from '../utils/search';
import { demoSessionCount } from '../utils/patientSessions';
import { usePatientMeetingHistory } from '../components/patient/usePatientMeetingHistory';
import PatientSessionList from '../components/patient/PatientSessionList';
import WorkspaceTabs from '../components/shared/WorkspaceTabs';
import Breadcrumb from '../components/shared/Breadcrumb';
import SortHeader from '../components/shared/SortHeader';
import TableSearch from '../components/shared/TableSearch';
import { sessionDates } from '../data/sessions';
import { CARD_SHADOW } from '../utils/styles';
import './patients.css'; // shared data-table classes (.pat-thead/.pat-row/.mhd-grid)

export default function PatientMeetingHistoryPage() {
  const { S, navigate } = useApp();
  const goPatient = () => navigate('patient', { patientId: S.patientId });

  // No patient chosen (reached from the sidebar) → the canonical directory: ALL
  // patients (active + archived) A–Z with search; picking one opens the same
  // history screen. Never silently show an arbitrary patient.
  if (!S.patientId) {
    return <HistoryDirectory />;
  }

  return <PatientHistoryBody goPatient={goPatient} />;
}

function PatientHistoryBody({ goPatient }: { goPatient: () => void }) {
  const { S, navigate } = useApp();
  const { cp, sessions, loading, useApi, totalCount } = usePatientMeetingHistory();
  const onPatientPick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = S.patients.find((x: any) => x.id === e.target.value);
    if (p) navigate('meetingHistory', { patientId: p.id });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Breadcrumb items={[{ label: cp.name, onClick: goPatient }, { label: 'היסטוריית פגישות' }]} />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>היסטוריית פגישות</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>
            {cp.name}
            {!loading && (
              <> · {heCount(totalCount, 'פגישה אחת', 'פגישות')}</>
            )}
          </p>
        </div>
        <select
          onChange={onPatientPick}
          value={cp.id}
          aria-label="בחירת מטופל"
          className="app-select"
        >
          {/* Include archived patients: the session-history directory reaches them too,
              so the controlled select must have a matching option for cp.id. */}
          {[...S.patients, ...(S.archivedPatients || []).filter((a: any) => !S.patients.some((p: any) => p.id === a.id))]
            .map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {(S.loading || loading) && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 26 }}>
          <div className="skeleton" style={{ width: '35%', height: 14, borderRadius: 6, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '90%', height: 11, borderRadius: 6 }} />
        </div>
      )}

      {!S.loading && !loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '8px 22px 18px' }}>
          <PatientSessionList sessions={sessions} />
          {useApi && sessions.length === 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              פגישות עם הקלטה וסיכום יופיעו כאן לאחר שהן יסתיימו.
            </p>
          )}
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
  // Filter the directory by file status — active vs archived — instead of a mixed
  // list decoded only by a small badge. "הכל" is the default so nothing is hidden.
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  // Header-driven sort: patient name / last-meeting date / meeting count. Clicking
  // "פגישה אחרונה" desc is the "recently updated" ordering.
  const [sortKey, setSortKey] = useState<'name' | 'last' | 'count'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const live = isApiConfigured();
  const all = [...(S.patients || []), ...(S.archivedPatients || [])];
  const q = normHe(query.trim());
  const searched = all.filter((p: any) => !q || normHe(p.name).includes(q) || normHe(p.phone || '').includes(q));
  const counts = {
    all: searched.length,
    active: searched.filter((p: any) => !p.archived).length,
    archived: searched.filter((p: any) => p.archived).length,
  };

  // Session dates are DD/MM/YY (latest first) → a sortable timestamp.
  const parseDmy = (s: string | null) => {
    if (!s) return 0;
    const [d, m, y] = s.split('/');
    return new Date(2000 + Number(y), Number(m) - 1, Number(d)).getTime();
  };

  const decorated = searched
    .filter((p: any) => filter === 'all' || (filter === 'archived' ? p.archived : !p.archived))
    .map((p: any) => {
      const a = avatarColors(patientAvatarColor(p.id));
      const count = live ? (null as number | null) : demoSessionCount(p);
      const lastDate = (!live && count) ? (sessionDates(p)[0] || null) : null;
      return {
        id: p.id, name: p.name, archived: !!p.archived,
        initials: patientInitials(p.name), avBg: a.bg, avColor: a.color,
        count, lastDate, lastTs: parseDmy(lastDate),
      };
    });

  const dir = sortDir === 'asc' ? 1 : -1;
  const rows = [...decorated].sort((x, y) => {
    if (sortKey === 'name') return x.name.localeCompare(y.name, 'he') * dir;
    if (sortKey === 'last') return (x.lastTs - y.lastTs) * dir;
    return ((x.count ?? -1) - (y.count ?? -1)) * dir;
  });

  const applySort = (key: 'name' | 'last' | 'count') => {
    if (key === sortKey) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
    setSortKey(key);
    setSortDir(key === 'name' ? 'asc' : 'desc'); // dates/counts lead with most-recent/largest
  };
  const sortLabelFor = (k: 'name' | 'last' | 'count') => (k === 'name' ? 'שם' : k === 'last' ? 'תאריך הפגישה האחרונה' : 'מספר הפגישות');
  const Th = ({ label, k, cls }: { label: string; k: 'name' | 'last' | 'count'; cls?: string }) => (
    <SortHeader label={label} sortLabel={sortLabelFor(k)} active={sortKey === k} dir={sortDir} onClick={() => applySort(k)} className={cls} />
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>היסטוריית פגישות</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 15 }}>בחרו מטופל כדי לצפות בפגישות, בסיכומים, בהקלטות, בהערות ובמסמכים שלו.</p>

      {all.length > 0 && (
        <TableSearch value={query} onChange={setQuery} ariaLabel="חיפוש מטופלים" placeholder="חיפוש מטופלים" style={{ marginBottom: 16 }} />
      )}

      {all.some((p: any) => p.archived) && (
        <WorkspaceTabs
          ariaLabel="סינון לפי סטטוס תיק"
          active={filter}
          onSelect={setFilter}
          tabs={[
            { key: 'all', label: 'הכל', count: counts.all },
            { key: 'active', label: 'פעילים', count: counts.active },
            { key: 'archived', label: 'ארכיון', count: counts.archived },
          ]}
        />
      )}

      <div className="pat-table-card" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: CARD_SHADOW }}>
        {rows.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center' }}>
            <p style={{ margin: q ? '0 0 14px' : 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>{q ? 'לא נמצאו מטופלים התואמים לחיפוש “' + query + '”.' : 'אין מטופלים להצגה.'}</p>
            {/* Canonical query-empty recovery (same as the Patients / Archive tables). */}
            {q && <button type="button" onClick={() => setQuery('')} style={{ height: 38, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>ניקוי החיפוש</button>}
          </div>
        ) : (
          <>
            <div className="pat-thead mhd-grid" role="presentation">
              <Th label="מטופל" k="name" />
              <Th label="פגישה אחרונה" k="last" cls="mhd-last" />
              <Th label="מספר פגישות" k="count" cls="mhd-count pat-th-num" />
              <span className="pat-th pat-th-actions">פעולות</span>
            </div>
            {rows.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate('meetingHistory', { patientId: p.id })}
                aria-label={p.name + ' · פתיחת היסטוריית הפגישות' + (p.archived ? ' · בארכיון' : '') + (p.count ? ' · ' + heCount(p.count, 'פגישה אחת', 'פגישות') : '')}
                data-name={p.name}
                className="mh-dir-row pat-row mhd-grid"
                style={{ width: '100%', textAlign: 'start', border: 'none', background: 'var(--paper)', cursor: 'pointer', fontFamily: 'inherit', font: 'inherit' }}
              >
                {/* Patient */}
                <PatientIdentity
                  className="mhd-patient"
                  initials={p.initials} avBg={p.avBg} avColor={p.avColor} name={p.name} query={query} dimmed={p.archived}
                  badge={p.archived ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>ארכיון</span> : undefined}
                />
                {/* Last meeting — canonical missing-value placeholder (—), matching
                    the roster; "no sessions yet" is stated once, in the count cell. */}
                <span className="mhd-cell mhd-last">
                  {p.lastDate ? <span dir="ltr">{p.lastDate}</span> : <span style={{ color: 'var(--text-disabled)' }}>{'—'}</span>}
                </span>
                {/* Session count — the same centered badge pill as the roster
                    (same data type, same presentation), count spelled out in the tooltip. */}
                <span className="mhd-cell mhd-count pat-th-num">
                  {p.count
                    ? <span title={heCount(p.count, 'פגישה אחת', 'פגישות')} style={{ display: 'inline-flex', minWidth: 30, justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', background: 'var(--surface-2)', borderRadius: 8, padding: '3px 9px', fontVariantNumeric: 'tabular-nums' }}>{p.count}</span>
                    : <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>אין פגישות עדיין</span>}
                </span>
                {/* Actions — chevron always; "view history" revealed on hover/focus */}
                <span className="mhd-actions">
                  <span className="mhd-view" aria-hidden="true">צפייה בהיסטוריה</span>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-disabled)" aria-hidden="true" className="pat-row-chevron" style={{ flexShrink: 0 }}><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
