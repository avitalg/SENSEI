import { useEffect, useRef } from 'react';

// "Tabbable" = focusable AND in the tab order. Every clause must exclude
// tabindex="-1": a natively-focusable element (or a role="button") that has
// deliberately opted OUT of the tab order — a roving-tabindex menu item, a
// pointer-only affordance, a skip-link target — still matches a naive
// `button` / `[role=button]` selector. Including it would let the trap focus it
// on open, or treat it as a cycle boundary that Tab can never actually reach.
const TABBABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[tabindex]',
].map((sel) => `${sel}:not([tabindex="-1"])`).join(',');

// Innermost-wins stack of currently-active traps. Overlays can legitimately
// nest (command palette over a dialog, shortcuts over a dialog), and every trap
// listens on `document`; without this, each one would handle the same Tab and
// fight over focus. Only the most recently opened trap acts.
const trapStack: HTMLElement[] = [];

// Keyboard focus management for a modal/overlay:
//  • records the element focused before the overlay opened (the trigger),
//  • keeps Tab / Shift+Tab cycling *within* the overlay while it's open
//    (WCAG 2.4.3 + ARIA modal practice — focus must not escape to the
//    background content behind the modal),
//  • pulls focus BACK if it has already escaped (e.g. the user clicked the
//    backdrop or background content, leaving focus on <body>),
//  • restores focus to the trigger when the overlay closes.
// It does NOT steal focus if the overlay already focused something inside
// (dialogs focus their first field, the palette focuses its input).
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;

    restoreTo.current = (document.activeElement as HTMLElement) || null;

    // The selector already excludes disabled / tabindex=-1; modal overlays don't
    // hold display:none focusables, so no visibility filter is needed (and
    // offsetParent-based filtering is unreliable — it's always null in jsdom).
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(TABBABLE));

    // If focus isn't already inside the overlay, move it to the first control.
    if (!container.contains(document.activeElement)) {
      const first = focusables()[0];
      if (first) first.focus();
    }

    trapStack.push(container);

    // Bound to `document`, NOT the container: once focus has escaped (a click on
    // the backdrop puts it on <body>), a container-bound listener never receives
    // the Tab keydown, so the trap silently stops trapping — the exact failure
    // this hook exists to prevent.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (trapStack[trapStack.length - 1] !== container) return; // an inner trap owns it
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement;
      if (!container.contains(activeEl)) { // focus escaped — pull it back in
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey) {
        if (activeEl === first) { e.preventDefault(); last.focus(); }
      } else if (activeEl === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = trapStack.lastIndexOf(container);
      if (i !== -1) trapStack.splice(i, 1);
      // Restore focus to the trigger, if it's still in the document.
      const el = restoreTo.current;
      if (el && document.contains(el) && typeof el.focus === 'function') el.focus();
    };
  }, [active]);

  return ref;
}
