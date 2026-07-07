// Table-sorting engine (`src/utils/tableSort.ts`) — the shared, framework-free logic
// behind the app's sortable data tables (Outcomes / Documents / Reports). Behaviour is
// derived from the module's documented rules: MUI-Data-Grid-style header cycling,
// Hebrew-aware text ordering, numeric (not lexicographic) ordering, DD.MM.YYYY dates,
// blanks-sort-last in ascending, and a STABLE sort. These lock the contract before the
// SortableTh component consumes it.
import { describe, expect, it } from 'vitest'
import { nextSort, ariaSort, sortRows, type SortState } from '../src/utils/tableSort'

describe('nextSort — MUI-style header cycle (unsorted → asc → desc → unsorted)', () => {
  it('starts a fresh column ascending', () => {
    expect(nextSort(null, 'name')).toEqual({ key: 'name', dir: 'asc' })
  })
  it('advances the active column ascending → descending', () => {
    expect(nextSort({ key: 'name', dir: 'asc' }, 'name')).toEqual({ key: 'name', dir: 'desc' })
  })
  it('clears the active column on the third click (descending → unsorted)', () => {
    expect(nextSort({ key: 'name', dir: 'desc' }, 'name')).toBeNull()
  })
  it('switching to a different column restarts at ascending (even from a descending column)', () => {
    expect(nextSort({ key: 'name', dir: 'asc' }, 'age')).toEqual({ key: 'age', dir: 'asc' })
    expect(nextSort({ key: 'name', dir: 'desc' }, 'age')).toEqual({ key: 'age', dir: 'asc' })
  })
})

describe('ariaSort — the value announced to screen readers per header (WCAG)', () => {
  it('is "none" when nothing is sorted or another column is active', () => {
    expect(ariaSort(null, 'name')).toBe('none')
    expect(ariaSort({ key: 'age', dir: 'asc' }, 'name')).toBe('none')
  })
  it('reflects the active column direction', () => {
    expect(ariaSort({ key: 'name', dir: 'asc' }, 'name')).toBe('ascending')
    expect(ariaSort({ key: 'name', dir: 'desc' }, 'name')).toBe('descending')
  })
})

// --- sortRows: a small, explicit fixture and one accessor pair used across cases ---
type Row = { id: number; name: string; score: string; date: string }
const val = (r: Row, k: string) => (r as any)[k]
const typeOf = (k: string): 'text' | 'number' | 'date' =>
  k === 'score' ? 'number' : k === 'date' ? 'date' : 'text'
const ids = (rows: Row[]) => rows.map((r) => r.id)

describe('sortRows — stable, type-aware ordering', () => {
  it('returns the rows unchanged when there is no active sort', () => {
    const rows: Row[] = [{ id: 1, name: 'ב', score: '2', date: '' }, { id: 2, name: 'א', score: '1', date: '' }]
    expect(ids(sortRows(rows, null, val, typeOf))).toEqual([1, 2])
  })

  it('orders text with Hebrew collation ascending, and reverses for descending', () => {
    const rows: Row[] = [
      { id: 1, name: 'גדי', score: '', date: '' },
      { id: 2, name: 'אבי', score: '', date: '' },
      { id: 3, name: 'בני', score: '', date: '' },
    ]
    expect(ids(sortRows(rows, { key: 'name', dir: 'asc' }, val, typeOf))).toEqual([2, 3, 1]) // אבי, בני, גדי
    expect(ids(sortRows(rows, { key: 'name', dir: 'desc' }, val, typeOf))).toEqual([1, 3, 2]) // גדי, בני, אבי
  })

  it('orders a numeric column by value, not lexicographically ("11" > "3.1")', () => {
    const rows: Row[] = [
      { id: 1, name: '', score: '11', date: '' },
      { id: 2, name: '', score: '3.1', date: '' },
      { id: 3, name: '', score: '9', date: '' },
    ]
    // lexicographic would give 11, 3.1, 9 — numeric must give 3.1, 9, 11
    expect(ids(sortRows(rows, { key: 'score', dir: 'asc' }, val, typeOf))).toEqual([2, 3, 1])
  })

  it('orders a DD.MM.YYYY date column chronologically, not by string', () => {
    const rows: Row[] = [
      { id: 1, name: '', score: '', date: '05.01.2026' },
      { id: 2, name: '', score: '', date: '10.12.2025' },
      { id: 3, name: '', score: '', date: '02.01.2026' },
    ]
    // string order would misplace 10.12.2025; chronological asc is: Dec-2025, 02-Jan, 05-Jan
    expect(ids(sortRows(rows, { key: 'date', dir: 'asc' }, val, typeOf))).toEqual([2, 3, 1])
  })

  it('sends blank text values to the end in ascending order (not jumbled into the middle)', () => {
    const rows: Row[] = [
      { id: 1, name: 'בני', score: '', date: '' },
      { id: 2, name: '', score: '', date: '' },
      { id: 3, name: 'אבי', score: '', date: '' },
    ]
    expect(ids(sortRows(rows, { key: 'name', dir: 'asc' }, val, typeOf))).toEqual([3, 1, 2]) // אבי, בני, blank
  })

  it('sends blank / non-DD.MM.YYYY dates to the end in ascending order', () => {
    const rows: Row[] = [
      { id: 1, name: '', score: '', date: '' },            // blank → NaN → last
      { id: 2, name: '', score: '', date: '10.12.2025' },
      { id: 3, name: '', score: '', date: 'לא ידוע' },     // unparseable → NaN → last
      { id: 4, name: '', score: '', date: '02.01.2026' },
    ]
    const out = ids(sortRows(rows, { key: 'date', dir: 'asc' }, val, typeOf))
    // real dates first (chronological), then the two undated rows in stable input order
    expect(out).toEqual([2, 4, 1, 3])
  })

  it('sends unparseable numeric values to the end in ascending order', () => {
    const rows: Row[] = [
      { id: 1, name: '', score: '', date: '' },   // blank → NaN → last
      { id: 2, name: '', score: '5', date: '' },
      { id: 3, name: '', score: '2', date: '' },
    ]
    expect(ids(sortRows(rows, { key: 'score', dir: 'asc' }, val, typeOf))).toEqual([3, 2, 1])
  })

  it('is stable — rows equal on the sort key keep their original relative order', () => {
    const rows: Row[] = [
      { id: 1, name: 'שווה', score: '', date: '' },
      { id: 2, name: 'שווה', score: '', date: '' },
      { id: 3, name: 'שווה', score: '', date: '' },
    ]
    expect(ids(sortRows(rows, { key: 'name', dir: 'asc' }, val, typeOf))).toEqual([1, 2, 3])
    // stability must hold under descending too (sign flip must not scramble equal rows)
    expect(ids(sortRows(rows, { key: 'name', dir: 'desc' }, val, typeOf))).toEqual([1, 2, 3])
  })

  it('preserves original order for two unparseable numeric cells (no NaN-comparator scramble)', () => {
    // Both scores are blank → cmp does Infinity - Infinity = NaN. A NaN comparator return
    // must not corrupt ordering; the pair must keep its input order.
    const rows: Row[] = [
      { id: 1, name: '', score: 'n/a', date: '' },
      { id: 2, name: '', score: '', date: '' },
    ]
    expect(ids(sortRows(rows, { key: 'score', dir: 'asc' }, val, typeOf))).toEqual([1, 2])
  })

  it('defaults to text ordering when no type resolver is supplied', () => {
    const rows: Row[] = [
      { id: 1, name: 'ב', score: '', date: '' },
      { id: 2, name: 'א', score: '', date: '' },
    ]
    const sort: SortState = { key: 'name', dir: 'asc' }
    expect(ids(sortRows(rows, sort, val))).toEqual([2, 1])
  })

  it('does not mutate the input array (returns a sorted copy)', () => {
    const rows: Row[] = [
      { id: 1, name: 'ב', score: '', date: '' },
      { id: 2, name: 'א', score: '', date: '' },
    ]
    sortRows(rows, { key: 'name', dir: 'asc' }, val, typeOf)
    expect(ids(rows)).toEqual([1, 2]) // original order intact
  })
})
