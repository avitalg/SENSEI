// Canonical keyboard-activation helper — the ONE source of truth for making a
// non-native control (role="button" on a div/span/svg/a) operable by keyboard.
//
// A focusable element (tabIndex={0}) that only wires onClick is reachable by Tab
// but does nothing on Enter/Space — a WCAG 2.1.1 failure. Native <button> gets
// this for free; every role="button" must opt in explicitly. Pair it with the
// element's own onClick so mouse and keyboard run the identical handler:
//
//   <div onClick={fn} onKeyDown={onKeyActivate(fn)} role="button" tabIndex={0} …>
//
// Leaf module · no app imports (usable from components/ and pages/ alike).
// Guarded by tests/keyboardActivation.test.ts, which fails the build if any
// role="button" + tabIndex element is missing an onKeyDown.
import type React from 'react';

export const onKeyActivate = (fn: () => void) => (e: React.KeyboardEvent): void => {
  // Space is the standard activation key alongside Enter; preventDefault stops
  // Space from also scrolling the page.
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};
