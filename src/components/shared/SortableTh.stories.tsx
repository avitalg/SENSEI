import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import SortableTh from './SortableTh'
import { nextSort, type SortState } from '../../utils/tableSort'
import { tdStyle } from '../../utils/styles'

// The single MUI-Data-Grid-style sortable header cell used by every data table
// (Outcomes / Documents / Reports). Clicking cycles unsorted → asc → desc →
// unsorted; the active direction is announced via aria-sort and an arrow glyph
// (never colour alone). Rendered inside a real <table> so the <th> is valid.
const meta = {
  title: 'Components/SortableTh',
  component: SortableTh,
  parameters: { layout: 'padded' },
  // Defaults satisfy the component's required props; the interactive story below
  // uses a custom render (with local sort state) and ignores these.
  args: { label: 'שם', sortKey: 'name', sort: null, onSort: () => {} },
} satisfies Meta<typeof SortableTh>

export default meta
type Story = StoryObj<typeof meta>

const ROWS = [
  { name: 'דנה לוי', sessions: 8 },
  { name: 'יוסי מזרחי', sessions: 12 },
  { name: 'מיכל כהן', sessions: 5 },
]

// Interactive: click the header to cycle the sort state; the arrow + aria-sort update.
function Demo() {
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  return (
    <table style={{ width: 420, borderCollapse: 'collapse', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, overflow: 'hidden' }}>
      <thead>
        <tr>
          <SortableTh label="שם" sortKey="name" sort={sort} onSort={(k) => setSort((c) => nextSort(c, k))} />
          <SortableTh label="פגישות" sortKey="sessions" sort={sort} onSort={(k) => setSort((c) => nextSort(c, k))} />
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.name}>
            <td style={tdStyle}>{r.name}</td>
            <td style={tdStyle}>{r.sessions}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const Interactive: Story = { render: () => <Demo /> }
