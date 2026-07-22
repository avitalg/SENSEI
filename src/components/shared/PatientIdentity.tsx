// Canonical patient-identity cell for the app's data tables (Patients — the
// canonical table — Archive, Meeting-History directory). One implementation of
// the avatar + highlighted-name block so every table renders identity the same
// way: 40px avatar, 15px/700 truncated name, optional badge / second line.
// `as` adapts the element to the host table's interaction model: a standalone
// button cell (Patients, Archive) or a plain span inside a whole-row button
// (Meeting-History). Tables must differ only by their data — not by how a
// patient looks.
import React from 'react';
import Highlight from './Highlight';

export default function PatientIdentity({ as = 'span', className, onClick, ariaLabel, initials, avBg, avColor, name, query = '', badge, sub, dimmed }: {
  /** 'button' → standalone clickable cell; 'span' → inert block inside a row-button */
  as?: 'button' | 'span';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
  initials: string;
  avBg: string;
  avColor: string;
  name: string;
  /** current search query — highlights the match inside the name */
  query?: string;
  /** small trailing pill next to the name (e.g. "ארכיון") */
  badge?: React.ReactNode;
  /** optional second line under the name (e.g. the archive's phone) */
  sub?: React.ReactNode;
  /** archived/inactive rows dim the avatar slightly */
  dimmed?: boolean;
}) {
  const body = (
    <>
      <span style={{ width: 40, height: 40, borderRadius: '50%', background: avBg, color: avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14.5, flexShrink: 0, opacity: dimmed ? 0.8 : 1 }}>{initials}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Highlight text={name} query={query} /></span>
          {badge}
        </span>
        {sub}
      </span>
    </>
  );
  const layout: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 };
  if (as === 'button') {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel ?? name} className={className} style={{ border: 'none', background: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit', textAlign: 'start', cursor: 'pointer', ...layout }}>
        {body}
      </button>
    );
  }
  return <span className={className} style={layout}>{body}</span>;
}
