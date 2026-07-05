// Shared pure helpers — ported verbatim from the prototype logic class.

export interface RiskMeta { label: string; color: string; bg: string }

export function riskMeta(r: string): RiskMeta {
  if (r === 'high') return { label: 'סיכון גבוה', color: 'var(--error)', bg: 'var(--error-bg)' }
  if (r === 'medium') return { label: 'סיכון בינוני', color: 'var(--warning)', bg: 'var(--warning-bg)' }
  if (r === 'low') return { label: 'סיכון נמוך', color: 'var(--success)', bg: 'var(--success-bg)' }
  return { label: 'יציב', color: 'var(--text-secondary)', bg: 'var(--surface-2)' }
}

// Lift a hex toward white by `amt` (0..1) — keeps the hue, raises luminance.
function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v + (255 - v) * amt).toString(16).padStart(2, '0')
  return '#' + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255)
}

// Per-patient avatar tint. Theme-aware (the one non-pure helper here): in light mode
// a 13% tint bg + saturated initials reads well, but in dark mode that same-hue pair
// collapses to ~1.5–2.6:1, so we deepen the tint and lift the initials toward white —
// restoring WCAG AA while keeping each patient's hue.
export function avatarColors(c?: string): { bg: string; color: string } {
  if (!c || c.startsWith('var(')) return { bg: 'var(--primary-tint)', color: 'var(--primary)' }
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
  if (dark) return { bg: c + '33', color: lighten(c, 0.55) }
  return { bg: c + '22', color: c }
}

// File upload validation — MP3 / WAV / M4A by extension (GOVERNANCE §12).
export const SUPPORTED_FORMATS = /\.(mp3|wav|m4a)$/i

export function validateFile(name: string): boolean {
  return SUPPORTED_FORMATS.test(name || '')
}

export function getPatient(patients: any[], id: string) {
  return (
    patients.find((p) => p.id === id) ||
    patients[0] || {
      id: '', name: '—', initials: '—', color: '#1F63D6', risk: 'none', age: '',
      gender: 'נ', focus: '—', sessions: 0, lastSession: '—', phone: '—', email: '—', since: '—',
    }
  )
}

// Recently-viewed id list, most-recent-first: move-to-front, de-duplicated, capped.
// Deterministic — re-viewing the patient already at the front is a no-op — so it is
// safe to call on every navigation. Powers the palette's "מטופלים אחרונים" section.
export function pushRecent(list: string[] | undefined, id: string, cap = 6): string[] {
  const prev = Array.isArray(list) ? list : []
  if (!id) return prev
  return [id, ...prev.filter((x) => x !== id)].slice(0, cap)
}

// Gendered Hebrew microcopy — provided by /hebrew-grammar.js (window.HG).
export function hg(tpl: string, gender?: string): string {
  const HG = (window as any).HG
  return HG && HG.fill ? HG.fill(tpl, gender) : tpl
}

// Gendered dictionary term (patient/therapist/…). Guarded like hg(): if the
// grammar layer failed to load, fall back to the raw term instead of crashing.
export function hgTerm(term: string, gender?: string, opts?: any): string {
  const HG = (window as any).HG
  return HG && HG.term ? HG.term(term, gender, opts) : term
}
