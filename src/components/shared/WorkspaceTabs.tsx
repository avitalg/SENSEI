// Canonical horizontal workspace tabs — one reusable implementation for the
// patient file and the session-history directory (no per-screen one-offs).
// Uses native buttons with aria-current, an underlined active state, and
// RTL-safe horizontal scrolling. The active tab is kept visible on narrow
// viewports so switching never leaves the user's context off-screen.
import { useEffect, useRef } from 'react';
import './WorkspaceTabs.css';

export interface WorkspaceTabDef<K extends string = string> {
  key: K
  label: string
  /** Optional count badge — shown only when > 0. */
  count?: number
}

export default function WorkspaceTabs<K extends string>({
  tabs, active, onSelect, ariaLabel,
}: {
  tabs: WorkspaceTabDef<K>[]
  active: K
  onSelect: (key: K) => void
  ariaLabel: string
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const tab = activeRef.current;
    if (!tab || typeof tab.scrollIntoView !== 'function') return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    tab.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [active]);

  return (
    <nav className="pw-tabs" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          ref={active === t.key ? activeRef : undefined}
          aria-current={active === t.key ? 'page' : undefined}
          className="pw-tab"
          onClick={() => onSelect(t.key)}
        >
          {t.label}
          {t.count != null && t.count > 0 && <span className="pw-tab-count">{t.count}</span>}
        </button>
      ))}
    </nav>
  );
}
