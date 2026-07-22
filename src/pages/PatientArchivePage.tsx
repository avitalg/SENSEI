// Archived patients — inactive client files with restore / permanent-delete.
// Same enterprise data-table language as the active roster (sticky sortable
// header, grid-aligned rows of consistent height), so the two screens feel like
// one product. Hebrew RTL: columns flow start→end; phone stays dir="ltr".
import { useMemo, useState } from 'react';
import { useApp } from '../store/AppStore';
import { avatarColors, heCount } from '../utils';
import {
  formatTreatmentSpan,
  patientAvatarColor, patientInitials, restorePatient,
} from '../services/patients';
import { normHe } from '../utils/search';
import Highlight from '../components/shared/Highlight';
import SortHeader from '../components/shared/SortHeader';
import IconButton from '../components/shared/IconButton';
import './patients.css';
import { CARD_SHADOW } from '../utils/styles';

type SortKey = 'name' | 'recent';

export default function PatientArchivePage() {
  const { S, set, navigate, toast } = useApp();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(S.sortBy === 'recent' ? 'recent' : 'name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(S.sortBy === 'recent' ? 'desc' : 'asc');

  const archived = S.archivedPatients || [];
  const q = normHe(query.trim());

  const rows = useMemo(() => {
    const list = archived.filter((p: any) =>
      !q || normHe(p.name).includes(q) || normHe(p.phone || '').includes(q) || normHe(p.email || '').includes(q));
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') list.sort((a: any, b: any) => a.name.localeCompare(b.name, 'he') * dir);
    else list.sort((a: any, b: any) => (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir);
    return list.map((p: any) => {
      const av = avatarColors(patientAvatarColor(p.id));
      return {
        ...p,
        avBg: av.bg, avColor: av.color, initials: patientInitials(p.name),
        span: formatTreatmentSpan(p.created_at, p.archived_at),
        onOpen: () => navigate('patient', { patientId: p.id }),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archived, q, sortKey, sortDir]);

  const countLabel = heCount(archived.length, 'מטופל אחד בארכיון', 'מטופלים בארכיון');

  const applySort = (k: SortKey) => {
    if (k === sortKey) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
    setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc'); set({ sortBy: k });
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
        <div style={{ position: 'relative', marginBottom: 14, maxWidth: 460 }}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--text-muted)" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש בארכיון" placeholder="חיפוש לפי שם, טלפון או דוא״ל…" className="app-search" />
        </div>
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
              <SortHeader label="תקופת טיפול" sortLabel="תקופת טיפול" active={sortKey === 'recent'} dir={sortDir} onClick={() => applySort('recent')} className="arc-col-span" />
              <span className="pat-th pat-th-actions" aria-hidden="true" />
            </div>

            {rows.length === 0 && (
              <div style={{ padding: '44px 24px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: 14.5 }}>לא נמצאו מטופלים בארכיון התואמים לחיפוש “{query}”.</p>
                <button type="button" onClick={() => setQuery('')} style={{ height: 38, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>ניקוי החיפוש</button>
              </div>
            )}

            {rows.map((p: any) => (
              <div key={p.id} className="pat-row arc-grid" onClick={p.onOpen}>
                <button type="button" onClick={(e) => { e.stopPropagation(); p.onOpen(); }} aria-label={p.name} className="pat-open-btn" style={{ border: 'none', background: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit', textAlign: 'start', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                  <span style={{ width: 44, height: 44, borderRadius: '50%', background: p.avBg, color: p.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0, opacity: 0.85 }}>{p.initials}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Highlight text={p.name} query={query} /></span>
                    <span dir="ltr" style={{ display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'start', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.phone}</span>
                  </span>
                </button>

                <div className="pat-cell arc-col-span" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>טיפול: {p.span}</div>

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
