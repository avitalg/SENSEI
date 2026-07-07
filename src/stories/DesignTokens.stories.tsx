import type { Meta, StoryObj } from '@storybook/react'

// Documents the app's real design system: the CSS-variable token set in
// src/styles/tokens.css (the single source of truth). Swatches read live from
// the tokens, so this page always reflects the current values in both themes —
// switch light/dark with the toolbar Theme control. Sensei's identity is
// blue-only: the semantic error/warning/success tokens are a blue depth ladder,
// so meaning is carried by icons + labels, never hue alone.
const meta = { title: 'Design Tokens/Colors', parameters: { layout: 'padded' } } satisfies Meta
export default meta
type Story = StoryObj

const GROUPS: { title: string; tokens: string[] }[] = [
  { title: 'Surfaces', tokens: ['--bg', '--paper', '--surface', '--surface-2', '--surface-3'] },
  { title: 'Text', tokens: ['--text', '--text-2', '--text-secondary', '--text-muted', '--text-disabled'] },
  { title: 'Primary (brand)', tokens: ['--primary', '--primary-dark', '--primary-light', '--primary-surface', '--primary-tint', '--primary-border'] },
  { title: 'Semantic (blue ladder)', tokens: ['--success', '--info', '--warning', '--error'] },
  { title: 'Lines & inputs', tokens: ['--divider', '--line', '--border-input', '--selection'] },
]

function Swatch({ token }: { token: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 132 }}>
      <div style={{ height: 56, borderRadius: 10, background: `var(${token})`, border: '1px solid var(--divider)' }} />
      <code style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontFamily: 'ui-monospace, monospace', direction: 'ltr', textAlign: 'start' }}>{token}</code>
    </div>
  )
}

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{g.title}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {g.tokens.map((t) => <Swatch key={t} token={t} />)}
          </div>
        </section>
      ))}
    </div>
  ),
}
