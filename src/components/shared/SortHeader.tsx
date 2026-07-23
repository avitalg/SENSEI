// Reusable sortable column header for the app's data tables (Patients, Archive).
// A plain button (the table is a styled grid, not an ARIA grid, so sort state
// rides in the accessible name rather than aria-sort). Styling comes from the
// shared .pat-th-btn / .pat-th-caret classes in patients.css.
export default function SortHeader({ label, sortLabel, active, dir, onClick, className }: {
  label: string;
  /** what the column sorts by, e.g. "שם" → announced as "מיון לפי שם". */
  sortLabel: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  const aria = 'מיון לפי ' + sortLabel + (active ? (dir === 'asc' ? ' · ממוין בסדר עולה' : ' · ממוין בסדר יורד') : '');
  return (
    <button
      type="button"
      className={'pat-th-btn' + (active ? ' is-active' : '') + (className ? ' ' + className : '')}
      aria-label={aria}
      onClick={onClick}
    >
      <span>{label}</span>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className="pat-th-caret" style={{ opacity: active ? 1 : 0, transform: active && dir === 'asc' ? 'rotate(180deg)' : 'none' }} fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
    </button>
  );
}
