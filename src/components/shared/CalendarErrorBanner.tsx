// Canonical calendar-load-error banner — the single implementation of "the week
// failed to load, local appointments still show, retry" shared by every surface
// that consumes useWeekEvents (dashboard home, calendar workspace, mobile day
// view). Previously three near-identical inline copies had drifted apart
// (border vs border-bottom, 30 vs 32px button, full vs shortened copy). One
// role="alert" region, one message, one retry; density + attachment are the
// only controlled variants.
import React from 'react';

export default function CalendarErrorBanner({ onRetry, compact = false, attached = false, style }: {
  onRetry: () => void;
  /** phone density — slightly smaller text + a tap44 retry target */
  compact?: boolean;
  /** sits flush atop a card (calendar grid): bottom divider instead of a full framed pill */
  attached?: boolean;
  style?: React.CSSProperties;
}) {
  const frame: React.CSSProperties = attached
    ? { borderBottom: '1px solid var(--error-line)' }
    : { border: '1px solid var(--error-line)', borderRadius: 10 };
  return (
    <div
      role="alert"
      style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: compact ? '10px 12px' : '10px 14px', background: 'var(--error-bg-soft)', ...frame, ...style }}
    >
      <span style={{ flex: 1, minWidth: compact ? 150 : 180, fontSize: compact ? 12.5 : 13, fontWeight: 600, color: 'var(--error-dark)' }}>טעינת היומן נכשלה. הפגישות המקומיות עדיין מוצגות.</span>
      <button
        type="button"
        onClick={onRetry}
        className={compact ? 'tap44' : undefined}
        style={{ height: compact ? 30 : 32, padding: compact ? '0 12px' : '0 14px', border: '1px solid var(--error-border)', borderRadius: 8, background: 'var(--paper)', color: 'var(--error-dark)', fontSize: compact ? 12 : 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
      >
        נסו שוב
      </button>
    </div>
  );
}
