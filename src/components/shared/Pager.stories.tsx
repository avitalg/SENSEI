import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import Pager from './Pager'

// The shared pagination bar used by the patients / sessions / documents tables.
// It renders a view model produced by the store's pager() helper; these stories
// supply representative view models so the presentation can be reviewed in
// isolation (RTL arrow semantics, page-size group, aria-current page).
const meta = {
  title: 'Components/Pager',
  component: Pager,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Pager>

export default meta
type Story = StoryObj<typeof meta>

// A representative middle-of-range view model (page 2 of 5).
const viewModel = (page: number, pages: number) => ({
  show: true,
  rangeLabel: `${(page - 1) * 10 + 1}–${page * 10} מתוך ${pages * 10}`,
  sizeOpts: [10, 25, 50].map((n) => ({
    n, active: n === 10, onClick: fn(),
    bg: n === 10 ? 'var(--primary)' : 'var(--paper)',
    color: n === 10 ? 'var(--paper)' : 'var(--text-2)',
    weight: n === 10 ? 700 : 500,
  })),
  onPrev: fn(), onNext: fn(), onFirst: fn(), onLast: fn(),
  prevDisabled: page === 1, nextDisabled: page === pages,
  prevCursor: page === 1 ? 'not-allowed' : 'pointer', nextCursor: page === pages ? 'not-allowed' : 'pointer',
  prevOpacity: page === 1 ? 0.5 : 1, nextOpacity: page === pages ? 0.5 : 1,
  pageItems: Array.from({ length: pages }, (_, i) => i + 1).map((n) => ({
    n, onClick: fn(), ariaCurrent: n === page ? ('page' as const) : undefined,
    border: n === page ? 'var(--primary)' : 'var(--divider)',
    bg: n === page ? 'var(--primary-surface)' : 'var(--paper)',
    color: n === page ? 'var(--primary)' : 'var(--text-2)',
    weight: n === page ? 700 : 500,
  })),
})

export const MiddlePage: Story = { args: { p: viewModel(2, 5) } }
export const FirstPage: Story = { args: { p: viewModel(1, 5) } }
export const LastPage: Story = { args: { p: viewModel(5, 5) } }
