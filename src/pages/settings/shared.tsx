// Settings screen — shared helpers ported from the prototype logic class.
import React from 'react';

// Enter/Space activation for non-native interactive elements (WCAG 2.1.1).
export const keyAct = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};

// The prototype's toggle-switch markup, repeated verbatim across tabs.
export function Toggle({ checked, onToggle, ariaLabel }: { checked: boolean; onToggle: () => void; ariaLabel?: string }) {
  return (
    <div
      onClick={onToggle}
      onKeyDown={keyAct(onToggle)}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      className="tap44"
      style={{ width: 44, height: 25, borderRadius: 14, background: checked ? 'var(--primary)' : 'var(--toggle-off)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}
    >
      <div style={{ width: 19, height: 19, borderRadius: '50%', background: 'var(--paper)', position: 'absolute', top: 3, [checked ? 'left' : 'right']: 3, boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'all .2s' } as any} />
    </div>
  );
}
