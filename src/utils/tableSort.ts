// Table sorting — shared, framework-free logic behind the app's sortable data tables
// (Outcomes / Documents / Reports), giving them one consistent MUI-Data-Grid-style behavior:
// clicking a column header cycles unsorted → ascending → descending → unsorted, with
// Hebrew-aware text ordering, numeric ordering (scores like "3.1" vs "11"), and DD.MM.YYYY
// date ordering. Pure and framework-free — the SortableTh component and the unit tests
// consume these. This is a LEAF module: it imports nothing from UI/state.

export type SortDir = 'asc' | 'desc'
export type ColType = 'text' | 'number' | 'date'
export type SortState = { key: string; dir: SortDir } | null

// Cycle a column's sort the way MUI Data Grid does: a new column starts ascending; the
// active column goes ascending → descending → unsorted (back to the natural order).
export function nextSort(cur: SortState, key: string): SortState {
  if (!cur || cur.key !== key) return { key, dir: 'asc' }
  if (cur.dir === 'asc') return { key, dir: 'desc' }
  return null
}

// aria-sort value for a column header (WCAG: announces the current sort to screen readers).
export function ariaSort(sort: SortState, key: string): 'ascending' | 'descending' | 'none' {
  if (!sort || sort.key !== key) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

// DD.MM.YYYY → sortable YYYYMMDD number; anything else → NaN (sorts last).
function dateVal(s: unknown): number {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(s ?? '').trim())
  return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : NaN
}

// Compare two raw cell values under a column type. Empty/blank/unparseable values sort to
// the end (in ascending order) rather than jumbling into the middle.
function cmp(a: unknown, b: unknown, type: ColType): number {
  if (type === 'number') {
    const na = parseFloat(String(a)); const nb = parseFloat(String(b))
    return (isNaN(na) ? Infinity : na) - (isNaN(nb) ? Infinity : nb)
  }
  if (type === 'date') {
    const da = dateVal(a); const db = dateVal(b)
    return (isNaN(da) ? Infinity : da) - (isNaN(db) ? Infinity : db)
  }
  const sa = String(a ?? '').trim(); const sb = String(b ?? '').trim()
  if (!sa && sb) return 1
  if (sa && !sb) return -1
  return sa.localeCompare(sb, 'he')
}

// Return a sorted COPY of rows for the active column; a null sort state returns the input
// order unchanged. The sort is stable (equal rows keep their original relative order), so
// it composes cleanly with an existing filter/search + pager pipeline.
export function sortRows<T>(
  rows: T[],
  sort: SortState,
  getValue: (row: T, key: string) => unknown,
  getType?: (key: string) => ColType,
): T[] {
  if (!sort) return rows
  const type: ColType = (getType && getType(sort.key)) || 'text'
  const sign = sort.dir === 'asc' ? 1 : -1
  return rows
    .map((row, i) => ({ row, i }))
    .sort((x, y) => {
      const c = cmp(getValue(x.row, sort.key), getValue(y.row, sort.key), type)
      // A NaN comparator result (e.g. two unparseable numbers → Infinity − Infinity) or an
      // exact tie both fall through to the stable index tiebreak — never return NaN to sort().
      return Number.isNaN(c) || c === 0 ? x.i - y.i : c * sign
    })
    .map((w) => w.row)
}
