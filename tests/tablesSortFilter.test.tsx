// Sortable/filterable data tables — the user-visible behavior the shared tableSort engine +
// SortableTh add to the real tables. Mounts the full app on each table route and drives it
// through real clicks. Strong ordering assertions run against Outcomes (whose row data is
// static and in-file, so the expected order is unambiguous); Documents adds a guard that
// sorting composes with the existing pager and status filter without breaking either.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(route: string) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)))
afterEach(() => { cleanup(); localStorage.clear() })

const outcomes = () => document.querySelector('table[aria-label="טבלת מדדי תוצאה"]') as HTMLTableElement
// measure badge lives in the 2nd column of each body row
const measureCol = () => Array.from(outcomes().querySelectorAll('tbody tr')).map((tr) => tr.querySelectorAll('td')[1].textContent!.trim())
const sortBtn = (label: string) => document.querySelector(`button[aria-label^="מיון לפי ${label}"]`) as HTMLButtonElement
const sortCell = (label: string) => sortBtn(label).closest('th') as HTMLTableCellElement

async function openOutcomes() {
  mount('outcomes')
  await settle()
  await waitFor(() => expect(outcomes()).toBeTruthy())
}

describe('Outcomes table — column sorting (MUI-style header cycle)', () => {
  it('starts in natural (unsorted) order with every header aria-sort="none"', async () => {
    await openOutcomes()
    expect(measureCol()).toEqual(['GAD-7', 'PCL-5', 'PHQ-9', 'EDE-Q', 'Y-BOCS', 'PHQ-9'])
    expect(sortCell('שאלון').getAttribute('aria-sort')).toBe('none')
  })

  it('cycles a column unsorted → ascending → descending → unsorted on repeated clicks', async () => {
    await openOutcomes()
    const btn = sortBtn('שאלון')
    fireEvent.click(btn) // ascending — Hebrew/Latin collation
    await waitFor(() => expect(sortCell('שאלון').getAttribute('aria-sort')).toBe('ascending'))
    expect(measureCol()).toEqual(['EDE-Q', 'GAD-7', 'PCL-5', 'PHQ-9', 'PHQ-9', 'Y-BOCS'])

    fireEvent.click(btn) // descending
    await waitFor(() => expect(sortCell('שאלון').getAttribute('aria-sort')).toBe('descending'))
    expect(measureCol()).toEqual(['Y-BOCS', 'PHQ-9', 'PHQ-9', 'PCL-5', 'GAD-7', 'EDE-Q'])

    fireEvent.click(btn) // back to natural order
    await waitFor(() => expect(sortCell('שאלון').getAttribute('aria-sort')).toBe('none'))
    expect(measureCol()).toEqual(['GAD-7', 'PCL-5', 'PHQ-9', 'EDE-Q', 'Y-BOCS', 'PHQ-9'])
  })

  it('sorts the score column numerically, not lexicographically', async () => {
    await openOutcomes()
    fireEvent.click(sortBtn('ציון נוכחי'))
    await waitFor(() => expect(sortCell('ציון נוכחי').getAttribute('aria-sort')).toBe('ascending'))
    // scores are 8,42,6,3.1,14,11 → numeric asc = 3.1,6,8,11,14,42 → measures in that order:
    expect(measureCol()).toEqual(['EDE-Q', 'PHQ-9', 'GAD-7', 'PHQ-9', 'Y-BOCS', 'PCL-5'])
  })

  it('only one column is active at a time (switching columns moves aria-sort)', async () => {
    await openOutcomes()
    fireEvent.click(sortBtn('שאלון'))
    await waitFor(() => expect(sortCell('שאלון').getAttribute('aria-sort')).toBe('ascending'))
    fireEvent.click(sortBtn('עודכן'))
    await waitFor(() => expect(sortCell('עודכן').getAttribute('aria-sort')).toBe('ascending'))
    expect(sortCell('שאלון').getAttribute('aria-sort')).toBe('none')
  })
})

describe('Outcomes table — filtering, search & clear-all', () => {
  it('a measure chip narrows the rows; clear-all restores every row', async () => {
    await openOutcomes()
    expect(measureCol()).toHaveLength(6)
    const phq = Array.from(document.querySelectorAll('[role="group"][aria-label="סינון לפי סוג שאלון"] button'))
      .find((b) => b.textContent?.trim() === 'PHQ-9') as HTMLButtonElement
    fireEvent.click(phq)
    await waitFor(() => expect(measureCol()).toEqual(['PHQ-9', 'PHQ-9']))
    const clear = document.querySelector('button.out-clear-all') as HTMLButtonElement
    expect(clear).toBeTruthy()
    fireEvent.click(clear)
    await waitFor(() => expect(measureCol()).toHaveLength(6))
  })

  it('a search + filter that matches nothing shows the empty state, and clear-all recovers', async () => {
    await openOutcomes()
    const input = document.querySelector('input.out-search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'זזזזזז' } })
    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו תוצאות תואמות'))
    expect(outcomes()).toBeFalsy() // table hidden while empty
    fireEvent.click(document.querySelector('a.out-clear') as HTMLElement)
    await waitFor(() => expect(outcomes()).toBeTruthy())
  })
})

describe('Documents table — sorting composes with the pager & status filter', () => {
  it('clicking a header sets aria-sort and keeps the table + pager intact', async () => {
    mount('documents')
    await settle()
    const table = () => document.querySelector('table[aria-label="טבלת מסמכים"]') as HTMLTableElement
    await waitFor(() => expect(table()).toBeTruthy())
    const dateBtn = document.querySelector('button[aria-label^="מיון לפי תאריך חתימה"]') as HTMLButtonElement
    expect(dateBtn).toBeTruthy()
    const rowsBefore = table().querySelectorAll('tbody tr').length
    fireEvent.click(dateBtn)
    await waitFor(() => expect(dateBtn.closest('th')!.getAttribute('aria-sort')).toBe('ascending'))
    // still a rendered table with the same number of rows on the page (sort ≠ filter)
    expect(table().querySelectorAll('tbody tr').length).toBe(rowsBefore)
  })
})
