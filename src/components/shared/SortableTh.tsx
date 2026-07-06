// Sortable table-header cell — the one consistent MUI-Data-Grid-style sort affordance used
// by every data table (Outcomes / Documents / Reports). Renders a `<th scope="col">` whose
// full area is a button: clicking cycles unsorted → ascending → descending → unsorted. The
// active direction is announced via `aria-sort` on the cell and shown with an arrow glyph
// (never colour alone). Reuses the canonical `thStyle`; no CSS-file changes.
import type { CSSProperties } from 'react'
import { thStyle } from '../../utils/styles'
import { ariaSort, type SortState } from '../../utils/tableSort'

interface SortableThProps {
  label: string
  sortKey: string
  sort: SortState
  onSort: (key: string) => void
  style?: CSSProperties
}

const ARROW_UP = 'M7 14l5-5 5 5z'
const ARROW_DOWN = 'M7 10l5 5 5-5z'

export default function SortableTh({ label, sortKey, sort, onSort, style }: SortableThProps) {
  const active = !!sort && sort.key === sortKey
  const dir = active ? sort!.dir : null
  const hint = dir === 'asc' ? ' (ממויין עולה)' : dir === 'desc' ? ' (ממויין יורד)' : ''
  return (
    <th scope="col" aria-sort={ariaSort(sort, sortKey)} style={{ ...thStyle, padding: 0, ...style }}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={'מיון לפי ' + label + hint}
        className="tbl-sort-th"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, width: '100%',
          padding: '11px 14px', border: 'none', background: 'transparent', font: 'inherit',
          fontWeight: 700, fontSize: 12.5, textAlign: 'start', whiteSpace: 'nowrap',
          color: active ? 'var(--text)' : 'var(--text-secondary)', cursor: 'pointer',
        }}
      >
        {label}
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"
          style={{ flexShrink: 0, opacity: active ? 1 : 0.32, color: active ? 'var(--primary)' : 'var(--text-muted)' }}>
          <path d={dir === 'desc' ? ARROW_DOWN : ARROW_UP} />
        </svg>
      </button>
    </th>
  )
}
