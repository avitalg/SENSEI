// Canonical table-toolbar search — magnifier + input + one-tap clear (×).
// One implementation for the data-table screens (Patients, Archive,
// Meeting-History directory) so the search affordance matches the global
// Search page: the clear button appears only while a query is typed, keeps
// focus behavior predictable, and is a ≥44px touch target (tap44).
import React from 'react';

export default function TableSearch({ value, onChange, onSubmit, ariaLabel, placeholder, style }: {
  value: string;
  onChange: (value: string) => void;
  /** Enter in the field — jump to the top matching row (host wires its first-row
      action). Fires only on Enter; the host decides whether there is a match. */
  onSubmit?: () => void;
  ariaLabel: string;
  placeholder?: string;
  /** wrapper overrides (maxWidth / margins per host page) */
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="var(--text-muted)" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)' }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onSubmit ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } } : undefined} aria-label={ariaLabel} placeholder={placeholder} className="app-search" />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="ניקוי החיפוש"
          title="ניקוי החיפוש"
          className="search-clear tap44"
          style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: 7, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
        </button>
      )}
    </div>
  );
}
