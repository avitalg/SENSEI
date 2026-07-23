// Patients roster — an enterprise-grade data table: sticky sortable column
// headers, grid-aligned rows of consistent height, per-row quick actions, live
// search, and distinct empty / no-results / loading states. Hebrew RTL: columns
// flow start→end (right→left); technical strings (phone, dates) stay dir="ltr".
import { useMemo, useState } from 'react';
import SortHeader from '../components/shared/SortHeader';
import TableSearch from '../components/shared/TableSearch';
import PatientIdentity from '../components/shared/PatientIdentity';
import RowMenu from '../components/shared/RowMenu';
import { useApp } from '../store/AppStore';
import { avatarColors, heCount } from '../utils';
import { patientInitials, patientAvatarColor } from '../services/patients';
import { normHe } from '../utils/search';
import { fmtDate } from '../utils/dates';
import { demoSessionCount } from '../utils/patientSessions';
import { sessionDates } from '../data/sessions';
import { isApiConfigured } from '../services/apiClient';
import './patients.css';
import { CARD_SHADOW } from '../utils/styles';
import TableEmptyState from '../components/shared/TableEmptyState';

type SortKey = 'name' | 'next' | 'sessions' | 'last';
type SortDir = 'asc' | 'desc';

export default function PatientsPage() {
  const { S, set, navigate } = useApp();
  const [query, setQuery] = useState('');

  const live = isApiConfigured();
  // Sort is header-driven (click a column to sort; click again to flip). Seeded
  // from the persisted S.sortBy (legacy 'recent' → most-recent activity = last
  // meeting, desc) so a returning user keeps their ordering.
  const [sortKey, setSortKey] = useState<SortKey>(S.sortBy === 'recent' ? 'last' : 'name');
  const [sortDir, setSortDir] = useState<SortDir>(S.sortBy === 'recent' ? 'desc' : 'asc');

  const openCreatePatient = () => set({
    dialog: 'create', form: { name: '', phone: '', email: '', address: '' },
    errors: {},
  });

  const roster: any[] = S.demoEmpty ? [] : S.patients;
  const q = normHe(query.trim());

  // Next upcoming appointment per patient — date and time surfaced as separate
  // columns; `sort` is the sortable datetime key. Time-aware (compare the full
  // start moment to now, not just the date string) so an appointment earlier
  // TODAY is not shown as "next" — matching the dashboard's who's-next and the
  // patient-detail upcoming list (both use start/end >= now), so the three
  // surfaces never disagree for the same patient at the same moment.
  const nowMs = Date.now();
  const nextApptFor = (pid: string): { date: string; time: string; sort: string } | null => {
    const upcoming = (S.scheduledAppts || [])
      .filter((a: any) => a.pid === pid && new Date(a.date + 'T' + (a.time || '00:00')).getTime() >= nowMs)
      .sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
    if (!upcoming.length) return null;
    const a = upcoming[0];
    return {
      // Canonical DD/MM/YY (fmtDate) — the same date type must look the same in
      // every table (matches "פגישה אחרונה" and the archive's start/end columns).
      date: fmtDate(new Date(a.date + 'T00:00:00')),
      time: a.time,
      sort: a.date + 'T' + a.time,
    };
  };
  // Last recorded meeting date (demo only; the live API roster has no count/dates).
  const parseDmy = (s: string | null) => { if (!s) return 0; const [d, m, y] = s.split('/'); return new Date(2000 + Number(y), Number(m) - 1, Number(d)).getTime(); };

  const rows = useMemo(() => {
    const list = q
      ? roster.filter((p: any) => normHe(p.name).includes(q) || normHe(p.phone || '').includes(q) || normHe(p.email || '').includes(q))
      : [...roster];
    const decorated = list.map((p: any) => {
      const av = avatarColors(patientAvatarColor(p.id));
      const sessions = live ? (null as number | null) : demoSessionCount(p);
      const lastDate = (!live && sessions) ? (sessionDates(p)[0] || null) : null;
      const next = nextApptFor(p.id);
      return {
        ...p,
        avBg: av.bg, avColor: av.color, initials: patientInitials(p.name),
        sessions, lastDate, lastSort: parseDmy(lastDate),
        nextDate: next?.date || '', nextTime: next?.time || '', nextSort: next?.sort || '',
        onOpen: () => navigate('patient', { patientId: p.id }),
        onEdit: (e: any) => {
          e.stopPropagation();
          set({ dialog: 'edit', dialogPatientId: p.id, form: { name: p.name, phone: p.phone, email: p.email || '', address: p.address || '' }, errors: {} });
        },
        onDelete: (e: any) => { e.stopPropagation(); set({ dialog: 'delete', dialogPatientId: p.id }); },
      };
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    decorated.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'he') * dir;
      if (sortKey === 'sessions') return ((a.sessions ?? -1) - (b.sessions ?? -1)) * dir;
      if (sortKey === 'last') return (a.lastSort - b.lastSort) * dir;
      // next appointment: patients with a scheduled one always come first.
      if (!!a.nextSort !== !!b.nextSort) return a.nextSort ? -1 : 1;
      return a.nextSort.localeCompare(b.nextSort) * dir;
    });
    return decorated;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, q, sortKey, sortDir, S.scheduledAppts]);

  const patientsEmpty = S.patients.length === 0 || S.demoEmpty;
  const countLabel = q ? rows.length + ' מתוך ' + S.patients.length + ' מטופלים' : heCount(S.patients.length, 'מטופל פעיל אחד', 'מטופלים פעילים');

  // Header click: same column → flip direction; new column → its natural default.
  // Names ascend A→ת; PAST dates/counts lead with the newest/largest; the FUTURE
  // date (next appointment) leads with the soonest — the question it answers is
  // "who's next?", not "whose appointment is farthest away?".
  const applySort = (key: SortKey) => {
    if (key === sortKey) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
    setSortKey(key);
    setSortDir(key === 'name' || key === 'next' ? 'asc' : 'desc');
    if (key === 'name') set({ sortBy: 'name' });
    else if (key === 'last') set({ sortBy: 'recent' });
  };

  const sortLabelFor = (k: SortKey) => (k === 'name' ? 'שם' : k === 'next' ? 'תאריך הפגישה הבאה' : k === 'sessions' ? 'מספר פגישות' : 'פגישה אחרונה');
  const Th = ({ label, k, cls }: { label: string; k: SortKey; cls?: string }) => (
    <SortHeader label={label} sortLabel={sortLabelFor(k)} active={sortKey === k} dir={sortDir} onClick={() => applySort(k)} className={cls} />
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>מטופלים</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{countLabel}</p>
        </div>
        <button onClick={openCreatePatient} className="pat-new-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--paper)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          מטופל חדש
        </button>
      </div>

      {!patientsEmpty && (
        <TableSearch value={query} onChange={setQuery} onSubmit={() => { if (q && rows.length) rows[0].onOpen(); }} ariaLabel="חיפוש מטופלים" placeholder="חיפוש לפי שם, טלפון או דוא״ל…" style={{ marginBottom: 14, maxWidth: 460 }} />
      )}

      <div className="pat-table-card" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: CARD_SHADOW }}>
        {patientsEmpty && (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <img src="/assets/sensei-fan.png" alt="" aria-hidden="true" width={140} height={108} style={{ display: 'block', margin: '0 auto 16px', objectFit: 'contain', opacity: 0.8 }} />
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>אין מטופלים עדיין</h2>
            <p style={{ margin: '0 auto 20px', color: 'var(--text-secondary)', fontSize: 14.5, maxWidth: 420 }}>הוסיפו את המטופל הראשון שלכם כדי להתחיל לנהל פגישות ותובנות.</p>
            <button onClick={openCreatePatient} className="pat-new-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--on-accent)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>מטופל חדש
            </button>
            <div style={{ marginTop: 14 }}>
              <a onClick={() => navigate('upload', { uploadPatientFixed: false, upload: { state: 'idle', progress: 0, fileName: '', error: '' } })} role="button" tabIndex={0} className="pat-empty-upload" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}>או העלו הקלטה של מפגש כדי להתחיל ›</a>
            </div>
          </div>
        )}

        {!patientsEmpty && (
          <>
            <div className="pat-thead pat-grid" role="presentation">
              <Th label="מטופל" k="name" />
              <span className="pat-th pat-col-phone">טלפון</span>
              <Th label="תאריך הפגישה הבאה" k="next" cls="pat-col-nextdate" />
              <span className="pat-th pat-col-time">שעה</span>
              <Th label="מספר פגישות" k="sessions" cls="pat-col-sessions pat-th-num" />
              <Th label="פגישה אחרונה" k="last" cls="pat-col-last" />
              <span className="pat-th pat-th-actions">פעולות</span>
            </div>

            {S.loading && rows.length === 0 && Array.from({ length: 4 }).map((_, i) => (
              <div key={'sk' + i} className="pat-row pat-grid" aria-hidden="true">
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <span className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                  <span className="skeleton" style={{ display: 'block', width: '60%', height: 13, borderRadius: 6 }} />
                </div>
                <span className="skeleton pat-col-phone" style={{ width: '80%', height: 12, borderRadius: 6 }} />
                <span className="skeleton pat-col-nextdate" style={{ width: '70%', height: 12, borderRadius: 6 }} />
                <span className="skeleton pat-col-time" style={{ width: 40, height: 12, borderRadius: 6 }} />
                <span className="skeleton pat-col-sessions" style={{ width: 30, height: 22, borderRadius: 8 }} />
                <span className="skeleton pat-col-last" style={{ width: '70%', height: 12, borderRadius: 6 }} />
                <span />
              </div>
            ))}

            {!S.loading && rows.length === 0 && (
              <TableEmptyState message={<>לא נמצאו מטופלים התואמים לחיפוש “{query}”.</>} onClearSearch={() => setQuery('')} />
            )}

            {rows.map((p: any) => (
              <div key={p.id} className="pat-row pat-grid" onClick={p.onOpen}>
                {/* מטופל · identity (canonical PatientIdentity). The button is the
                    keyboard/SR open control (aria-label = name); the whole row is
                    mouse-clickable. */}
                <PatientIdentity as="button" className="pat-open-btn pat-col-identity" onClick={(e) => { e.stopPropagation(); p.onOpen(); }} initials={p.initials} avBg={p.avBg} avColor={p.avColor} name={p.name} query={query} />

                {/* טלפון */}
                <div className={`pat-cell pat-col-phone${p.phone ? '' : ' is-empty'}`} data-label="טלפון" dir="ltr" style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', textAlign: 'start', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.phone || <span style={{ color: 'var(--text-disabled)' }}>{'—'}</span>}</div>

                {/* תאריך הפגישה הבאה */}
                <div className="pat-cell pat-col-nextdate" data-label="הפגישה הבאה">
                  {p.nextDate
                    ? <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{p.nextDate}</span>
                    : <span style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>אין פגישה מתוכננת</span>}
                </div>

                {/* שעה */}
                <div className={`pat-cell pat-col-time${p.nextTime ? '' : ' is-empty'}`} data-label="שעה" dir="ltr" style={{ textAlign: 'start' }}>
                  {p.nextTime
                    ? <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{p.nextTime}</span>
                    : <span style={{ color: 'var(--text-disabled)' }}>{'—'}</span>}
                </div>

                {/* מספר פגישות */}
                <div className="pat-cell pat-col-sessions pat-th-num" data-label="פגישות">
                  {p.sessions == null
                    ? <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>·</span>
                    : <span title={heCount(p.sessions, 'פגישה אחת', 'פגישות')} style={{ display: 'inline-flex', minWidth: 30, justifyContent: 'center', fontSize: 13, fontWeight: 700, color: p.sessions ? 'var(--text-2)' : 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 8, padding: '3px 9px', fontVariantNumeric: 'tabular-nums' }}>{p.sessions}</span>}
                </div>

                {/* פגישה אחרונה */}
                <div className="pat-cell pat-col-last" data-label="פגישה אחרונה" dir="ltr" style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', textAlign: 'start' }}>
                  {p.lastDate || <span style={{ color: 'var(--text-disabled)' }}>{'—'}</span>}
                </div>

                {/* פעולות · primary is the row (open); edit/archive grouped in an overflow menu */}
                <div className="pat-row-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <button
                    type="button"
                    className="pat-mobile-capture tap44"
                    aria-label={'הוספת מפגש · ' + p.name}
                    title="הוספת מפגש"
                    onClick={(e) => {
                      e.stopPropagation();
                      set({ recordOpen: true, recordPid: p.id });
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" /></svg>
                  </button>
                  <RowMenu
                    ariaLabel={'פעולות · ' + p.name}
                    items={[
                      { label: 'עריכת מטופל', onClick: p.onEdit, icon: <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg> },
                      { label: 'העברה לארכיון', onClick: p.onDelete, icon: <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" /></svg> },
                    ]}
                  />
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--text-disabled)" aria-hidden="true" className="pat-row-chevron" style={{ flexShrink: 0 }}><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
