// Canonical empty state for the data-table screens (Patients, Archive,
// Meeting-History directory). One implementation so the "nothing to show"
// moment reads identically everywhere: centred message, and — when the
// emptiness is caused by a search query — a one-tap recovery that clears it.
// Pass `onClearSearch` only for the query-empty case; omit it when the table
// is genuinely empty, and the message renders on its own with no dead button.
import React from 'react';

export default function TableEmptyState({ message, onClearSearch }: {
  message: React.ReactNode;
  /** query-empty recovery — omit when the table is empty for any other reason */
  onClearSearch?: () => void;
}) {
  return (
    <div style={{ padding: '44px 24px', textAlign: 'center' }}>
      <p style={{ margin: onClearSearch ? '0 0 14px' : 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>{message}</p>
      {onClearSearch && (
        <button type="button" onClick={onClearSearch} style={{ height: 38, padding: '0 16px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>ניקוי החיפוש</button>
      )}
    </div>
  );
}
