// Accessibility helpers (leaf module — no imports from pages/components/store).
import type { KeyboardEvent } from 'react'

// Make a non-native control keyboard-operable. Elements that are visually/ARIA
// buttons but rendered on <a>/<div>/<span> (role="button") get NO automatic
// keyboard activation from the platform — unlike a native <button>, pressing
// Enter/Space does nothing unless we handle it. Wire this to onKeyDown alongside
// the element's onClick so keyboard-only users can operate it (WCAG 2.1.1).
//   <div role="button" tabIndex={0} onClick={go} onKeyDown={onKeyActivate(go)}>
export const onKeyActivate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() }
}
