// Canonical horizontal workspace tabs — one reusable implementation for the
// patient file and the session-history directory (no per-screen one-offs).
// Mirrors the app's tab convention: role="button" + aria-current, so the global
// Enter/Space keydown delegate drives it; an underlined active tab, RTL-safe,
// and horizontally scrollable on narrow viewports.
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
  return (
    <nav className="pw-tabs" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <a
          key={t.key}
          role="button"
          tabIndex={0}
          aria-current={active === t.key ? 'page' : undefined}
          className="pw-tab"
          onClick={() => onSelect(t.key)}
        >
          {t.label}
          {t.count != null && t.count > 0 && <span className="pw-tab-count">{t.count}</span>}
        </a>
      ))}
    </nav>
  );
}
