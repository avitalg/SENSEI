// Accessible row overflow ("kebab") menu — groups a row's secondary actions
// behind one control so dense tables stay quiet. WAI-ARIA menu-button pattern:
// aria-haspopup/expanded on the trigger, role="menu"/"menuitem" items, first item
// focused on open, Escape / outside-click close (focus returns to the trigger),
// Up/Down arrows roam the items. RTL-native (opens toward the start edge).
// The panel is always rendered and only `hidden` when closed, so callers' item
// aria-labels remain queryable.
import { useEffect, useRef, useState } from 'react';
import './RowMenu.css';

export interface RowMenuItem {
  label: string
  icon: JSX.Element
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  danger?: boolean
}

export default function RowMenu({ ariaLabel, items }: { ariaLabel: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const focusTrigger = () => ref.current?.querySelector<HTMLElement>('.rowmenu-trigger')?.focus();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); focusTrigger(); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 0);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const its = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [])];
    const i = its.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % its.length : (i - 1 + its.length) % its.length;
    its[next]?.focus();
  };

  return (
    <div ref={ref} className="rowmenu" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="rowmenu-trigger icon-btn tap44"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title="פעולות נוספות"
        onClick={() => setOpen((v) => !v)}
        style={{ width: 34, height: 34 }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
      </button>
      <div role="menu" aria-label={ariaLabel} className="rowmenu-panel" hidden={!open} onKeyDown={onMenuKey}>
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            role="menuitem"
            aria-label={it.label}
            className={'rowmenu-item' + (it.danger ? ' is-danger' : '')}
            onClick={(e) => { setOpen(false); it.onClick(e); }}
          >
            <span className="rowmenu-item-icon" aria-hidden="true">{it.icon}</span>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
