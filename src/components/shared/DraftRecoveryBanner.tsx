// Canonical "unsaved draft" recovery banner — ONE implementation for every
// editor that auto-saves a draft (clinical summaries, patient notes, and any
// future editor). Previously each editor inlined its own near-identical banner;
// consolidated here so the pattern — copy, layout, tokens, a11y — stays
// identical everywhere. Pure/presentational: the caller owns the draft state
// and passes the resume/discard handlers.
//
// Accessible: role="status" (polite), text-labelled buttons (never icon-only),
// keyboard-native, RTL via logical layout, design-token colors only.

const CLOCK_ICON = 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z'

export default function DraftRecoveryBanner({
  onResume,
  onDiscard,
  message = 'יש טיוטה שלא נשמרה מעריכה קודמת. להמשיך מהמקום שהפסקתם?',
}: {
  onResume: () => void
  onDiscard: () => void
  message?: string
}) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--primary-surface)', border: '1px solid var(--primary-border)', borderRadius: 9, padding: '11px 13px', marginBottom: 14 }}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--primary)" aria-hidden="true" style={{ flexShrink: 0 }}><path d={CLOCK_ICON} /></svg>
      <span style={{ flex: 1, minWidth: 130, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{message}</span>
      <button onClick={onResume} style={{ height: 32, padding: '0 13px', border: 'none', borderRadius: 8, background: 'var(--primary)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>המשך עריכה</button>
      <button onClick={onDiscard} style={{ height: 32, padding: '0 11px', border: '1px solid var(--border-input)', borderRadius: 8, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>מחיקת הטיוטה</button>
    </div>
  )
}
