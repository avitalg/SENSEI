// Canonical square icon button — the bordered "ghost" action control used in the
// data tables, agenda, and list rows. Replaces the same inline style object that
// was re-written at ~9 call sites. Base appearance lives in IconButton.css (a
// class, not inline) so per-surface hover classes compose over it cleanly.
// Callers pass their existing className (e.g. "pat-icon-btn tap44") for the
// surface's hover/touch-target rules, plus aria-label/title/onClick and the SVG.
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import './IconButton.css';

export default function IconButton({
  children, onClick, ariaLabel, title, className, size = 34, disabled, ariaPressed, style,
}: {
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  ariaLabel?: string
  title?: string
  className?: string
  /** Square edge length in px (34 default; 30 for compact list rows). */
  size?: number
  disabled?: boolean
  ariaPressed?: boolean
  /** Per-instance overrides (e.g. an active/toggled state). Merged over the base. */
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      title={title}
      disabled={disabled}
      className={'icon-btn' + (className ? ' ' + className : '')}
      style={{ width: size, height: size, ...style }}
    >
      {children}
    </button>
  );
}
