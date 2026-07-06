// URL-hash routing — canonical two-way mapping between the store's state-driven
// route and a shareable URL fragment. Hash-based by decision (see CHANGELOG
// 1.0.61): this is a client-only SPA on static hosting, so the fragment gives
// deep linking, bookmarking, browser history and Playwright-navigable screens
// with ZERO server rewrite config and no router dependency. Overlays, dialogs
// and sub-tabs stay state-driven on purpose — transient UI earns no URL.
import { ALL_ROUTES } from './navConfig'

// Routes whose meaning depends on the selected patient — the id is part of the
// deep link (`#/patient/p3`), so a shared URL opens the same file.
export const PATIENT_ROUTES = ['patient', 'transcript', 'summary', 'timeline', 'report', 'letter']

// Conservative id shape: seed ids (p1…) and future backend ids, never markup.
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

export function routeToHash(route: string, patientId?: string): string {
  if (!ALL_ROUTES.includes(route)) return '#/dashboard'
  if (PATIENT_ROUTES.includes(route) && patientId && ID_RE.test(patientId)) {
    return `#/${route}/${patientId}`
  }
  return `#/${route}`
}

// Parse a location.hash value. Returns null for anything that is not a valid
// deep link (empty, malformed, unknown route, bad id) — callers decide the
// fallback so a hand-edited URL can never crash or inject state.
export function parseHash(hash: string): { route: string; patientId?: string } | null {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts.length === 0) return null
  const route = parts[0]
  if (!ALL_ROUTES.includes(route)) return null
  if (parts.length >= 2) {
    if (!PATIENT_ROUTES.includes(route) || !ID_RE.test(parts[1])) return null
    return { route, patientId: parts[1] }
  }
  return { route }
}
