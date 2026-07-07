// Canonical shared inline-style constants (single source of truth). These were
// previously copy-pasted across many pages/components; consolidated here.
import type { CSSProperties } from 'react'

// Standard card elevation used by nearly every content card/panel.
export const CARD_SHADOW = '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)'

// Form field label (dialogs + settings forms).
export const labelStyle: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }

// Standard-treatment data-table cells (documents / outcomes / reports).
export const thStyle: CSSProperties = { textAlign: 'start', padding: '11px 14px', fontWeight: 700, fontSize: 12.5, color: 'var(--text-secondary)', background: 'var(--surface-2)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--divider)' }
export const tdStyle: CSSProperties = { padding: '11px 14px', fontSize: 14, color: 'var(--text-2)', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }
