// Canonical shared inline-style constants (single source of truth). These were
// previously copy-pasted across many pages/components; consolidated here.
import type { CSSProperties } from 'react';

// Standard card elevation used by nearly every content card/panel.
export const CARD_SHADOW = '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)';

// Floating-overlay surface (modal dialogs, command palette, record dialog, AI
// panel). One radius + one elevation so every overlay reads as the same object —
// previously these drifted across 15/16/18px and three different shadow values.
export const OVERLAY_RADIUS = 16;
export const OVERLAY_SHADOW = '0 24px 70px rgba(8,20,45,.34)';

// Form field label (dialogs + settings forms).
export const labelStyle: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 };

// Canonical button styles for dialog/overlay action bars — one primary, one
// neutral (cancel/ghost), one destructive. Previously defined per-file and
// hand-rolled with drifting height/padding; consolidated so every overlay CTA
// reads identically. 44px tall meets the touch-target floor.
export const btnCancel: CSSProperties = { height: 44, padding: '0 20px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', color: 'var(--text)', fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' };
export const btnPrimary: CSSProperties = { height: 44, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' };
export const btnDanger: CSSProperties = { height: 44, padding: '0 22px', border: '1px solid var(--error)', borderRadius: 10, background: 'transparent', color: 'var(--error-dark)', fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' };
