// Archived patients — inactive client files with restore / permanent-delete.
// Same enterprise data-table language as the active roster (sticky sortable
// header, grid-aligned rows of consistent height), so the two screens feel like
// one product. Hebrew RTL: columns flow start→end; phone stays dir="ltr".
import { useMemo, useState } from 'react';
import { useApp } from '../store/AppStore';
import { avatarColors, heCount } from '../utils';
import {
  patientAvatarColor, patientInitials, restorePatient,
} from '../services/patients';
import { normHe } from '../utils/search';
import { fmtDate } from '../utils/dates';
import PatientIdentity from '../components/shared/PatientIdentity';
import SortHeader from '../components/shared/SortHeader';
import TableSearch from '../components/shared/TableSearch';
import IconButton from '../components/shared/IconButton';
import './patients.css';
import { CARD_SHADOW } from '../utils/styles';
import TableEmptyState from '../components/shared/TableEmptyState';

type SortKey = 'name' | 'start' | 'end';

// Canonical DD/MM/YY from an ISO timestamp (empty for missing/invalid) — the
// formatting itself is the shared utils/dates fmtDate.
const shortDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtDate(d);
};

export default function PatientArchivePage() {
  const { S, set, navigate, toast } = useApp();
  const [query, setQuery] = useState('');
  // Legacy persisted 'recent' (the old combined-span sort) maps to treatment start.
  const [sortKey, setSortKey] = useState<SortKey>(S.sortBy === 'recent' ? 'start' : 'name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(S.sortBy === 'recent' ? 'desc' : 'asc');

  const archived = S.archivedPatients || [];
  const q = normHe(query.trim());

  const rows = useMemo(() => {
    const list = archived.filter((p: any) =>
      !q || normHe(p.name).includes(q) || normHe(p.phone || '').includes(q) || normHe(p.email || '').includes(q));
    const dir = sortDir === 'asc' ? 1 : -1;
    const ts = (iso: string | null | undefined) => { const t = iso ? new Date(iso).getTime() : NaN; return Number.isNaN(t) ? 0 : t; };
    if (sortKey === 'name') list.sort((a: any, b: any) => a.name.localeCompare(b.name, 'he') * dir);
    else if (sortKey === 'start') list.sort((a: any, b: any) => (ts(a.created_at) - ts(b.created_at)) * dir);
    else list.sort((a: any, b: any) => (ts(a.archived_at) - ts(b.archived_at)) * dir);
    return list.map((p: any) => {
      const av = avatarColors(patientAvatarColor(p.id));
      return {
        ...p,
        avBg: av.bg, avColor: av.color, initials: patientInitials(p.name),
        startDate: shortDate(p.created_at), endDate: shortDate(p.archived_at),
        onOpen: () => navigate('patient', { patientId: p.id }),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archived, q, sortKey, sortDir]);

  const countLabel = heCount(archived.length, 'מטופל אחד בארכיון', 'מטופלים בארכיון');

  const applySort = (k: SortKey) => {
    if (k === sortKey) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
    setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc');
    // Shared persisted sortBy understands 'name' | 'recent' only (seeds the
    // roster too) — date sorts map to the legacy 'recent' slot.
    set({ sortBy: k === 'name' ? 'name' : 'recent' });
  };

  const restore = (id: string) => {
    const record = archived.find((p: any) => p.id === id);
    if (!record) return;
    const restored = restorePatient(record);
    set({ archivedPatients: archived.filter((p: any) => p.id !== id), patients: [restored, ...S.patients] });
    // Undo parity with archiving — a mis-click restore is reversible in one tap.
    toast('התיק שוחזר לרשימת המטופלים הפעילים', 'success', { label: 'ביטול', onClick: () => set((s: any) => ({
      patients: s.patients.filter((p: any) => p.id !== id),
      archivedPatients: [record, ...(s.archivedPatients || [])],
    })) });
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>ארכיון מטופלים</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{countLabel}</p>
        </div>
        <button type="button" onClick={() => navigate('patients')} className="pat-new-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          חזרה למטופלים פעילים
        </button>
      </div>

      {archived.length > 0 && (
        <TableSearch value={query} onChange={setQuery} ariaLabel="חיפוש בארכיון" placeholder="חיפוש לפי שם, טלפון או דוא״ל…" style={{ marginBottom: 14, maxWidth: 460 }} />
      )}

      <div className="pat-table-card" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: CARD_SHADOW }}>
        {archived.length === 0 && (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>הארכיון ריק</h2>
            <p style={{ margin: '0 auto', color: 'var(--text-secondary)', fontSize: 14.5, maxWidth: 420 }}>מטופלים שהועברו לארכיון יופיעו כאן. ניתן לשחזר אותם בכל עת לרשימת המטופלים הפעילים.</p>
          </div>
        )}

        {archived.length > 0 && (
          <>
            <div className="pat-thead arc-grid" role="presentation">
              <SortHeader label="מטופל" sortLabel="שם" active={sortKey === 'name'} dir={sortDir} onClick={() => applySort('name')} />
              {/* Date range split into dedicated Start/End columns (canonical
                  table rule: one column per structured attribute). */}
              <SortHeader label="תחילת טיפול" sortLabel="תאריך תחילת הטיפול" active={sortKey === 'start'} dir={sortDir} onClick={() => applySort('start')} className="arc-col-start" />
              <SortHeader label="סיום טיפול" sortLabel="תאריך סיום הטיפול" active={sortKey === 'end'} dir={sortDir} onClick={() => applySort('end')} className="arc-col-end" />
              <span className="pat-th pat-th-actions">פעולות</span>
            </div>

            {rows.length === 0 && (
              <TableEmptyState message={<>לא נמצאו מטופלים בארכיון התואמים לחיפוש “{query}”.</>} onClearSearch={() => setQuery('')} />
            )}

            {rows.map((p: any) => (
              <div key={p.id} className="pat-row arc-grid" onClick={p.onOpen}>
                <PatientIdentity
                  as="button"
                  className="pat-open-btn"
                  onClick={(e) => { e.stopPropagation(); p.onOpen(); }}
                  initials={p.initials} avBg={p.avBg} avColor={p.avColor} name={p.name} query={query} dimmed
                  sub={<span dir="ltr" style={{ display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'start', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.phone}</span>}
                />

                <div className="pat-cell arc-col-start pat-col-last" dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, textAlign: 'start' }}>{p.startDate || <span style={{ color: 'var(--text-disabled)' }}>{'—'}</span>}</div>
                <div className="pat-cell arc-col-end pat-col-last" dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, textAlign: 'start' }}>{p.endDate || <span style={{ color: 'var(--text-disabled)' }}>{'—'}</span>}</div>

                <div className="pat-row-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); restore(p.id); }} aria-label="שחזור מטופל" className="pat-icon-btn tap44" style={{ height: 34, padding: '0 12px', border: '1px solid var(--primary-border)', borderRadius: 8, background: 'var(--primary-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: 12.5, fontWeight: 700 }}>שחזור</button>
                  <IconButton onClick={(e) => { e.stopPropagation(); set({ dialog: 'deletePatientPermanent', dialogPatientId: p.id }); }} ariaLabel="מחיקת מטופל לצמיתות" title="מחיקה לצמיתות" className="pat-del-btn tap44">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--error)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </IconButton>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
