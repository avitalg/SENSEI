// Presentational shell for the "שאל את סנסיי" assistant — the floating action
// button, the chat panel, and the tool-call chip. Pure UI driven by props: it
// has NO @ai-sdk/react / ai dependency, so it stays in the main entry chunk and
// the FAB is available instantly. Both modes (live + demo) render through it.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { OVERLAY_RADIUS, OVERLAY_SHADOW } from '../../utils/styles';

// One tool call as the panel shows it: a 1-line label that expands to the full
// request/response of what the assistant fetched from the backend.
export interface ToolView {
  id: string
  label: string
  input: unknown
  output: unknown
  done: boolean
}

// A message as the panel renders it: which side, its text, and any tool calls.
export interface PanelMessage {
  me: boolean
  text: string
  tools?: ToolView[]
}

function textDirection(text: string): 'rtl' | 'ltr' {
  return /[\u0590-\u05FF]/.test(text) ? 'rtl' : 'ltr';
}

export const SUGGESTIONS = [
  { label: 'מה יש לי ביומן היום?', q: 'מה יש לי ביומן היום?' },
  { label: 'מתי נפגשתי לאחרונה עם סימבה?', q: 'מתי נפגשתי לאחרונה עם סימבה?' },
  { label: 'סכמו את הפגישה האחרונה עם סימבה', q: 'סכמו את הפגישה האחרונה עם סימבה' },
];

// Turn `#/patient/<id>` deep links the assistant may include into clickable links
// to the patient's card (the app navigates on hash change). The raw id/URL stays in
// the href only — the visible label is friendly, so no bare id is shown as text.
const PATIENT_LINK_RE = /#\/patient\/[A-Za-z0-9_-]+/g;

function linkifyPatientLinks(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(PATIENT_LINK_RE)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    nodes.push(
      <a key={key++} href={match[0]} className="shell-ai-link" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}>פתיחת הכרטיס</a>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : text;
}

// The closed launcher — a standalone FAB so it can also serve as the Suspense
// fallback while the live controller's chunk loads (keeps the FAB instant).
export function AiFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button onClick={onOpen} aria-label="שאל את סנסיי" title="שאל את סנסיי" className="shell-fab" style={{ position: 'fixed', bottom: 24, insetInlineEnd: 24, width: 60, height: 60, padding: 0, border: '2px solid var(--primary)', borderRadius: '50%', background: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 10px 28px rgba(31,99,214,.4)', zIndex: 140, transition: 'box-shadow .18s ease,transform .18s ease' }}>
      <img src="/assets/sensei-mark.png" alt="" aria-hidden="true" width={60} height={60} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%' }} />
    </button>
  );
}

export interface AiPanelProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  messages: PanelMessage[]
  typing: boolean
  input: string
  onInput: (value: string) => void
  onSend: (text: string) => void
}

export function AiPanel({ open, onOpen, onClose, messages, typing, input, onInput, onSend }: AiPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Spec (Chat, desktop): the panel can expand to full screen for continuous
  // reading/work. Toggled per open — reopening returns to the compact panel.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!open) setExpanded(false); }, [open]);

  const closeAndRestoreFocus = () => {
    onClose();
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('.shell-fab')?.focus();
    });
  };

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeAndRestoreFocus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  });

  useLayoutEffect(() => {
    const composer = inputRef.current;
    if (!composer) return;
    composer.style.height = 'auto';
    composer.style.height = `${Math.min(composer.scrollHeight, 120)}px`;
  }, [input, open]);

  // keep the conversation pinned to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);

  // focus the message input when the panel opens, so keyboard users can type
  // immediately (matches the command palette). Non-modal, so no focus trap.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return <AiFab onOpen={onOpen} />;

  return (
    <div role="dialog" aria-modal={false} aria-label="שאל את סנסיי" className={`shell-ai-panel${expanded ? ' is-expanded' : ''}`} style={{ position: 'fixed', bottom: expanded ? 0 : 24, insetInlineEnd: expanded ? 0 : 24, width: expanded ? '100vw' : 390, maxWidth: expanded ? '100vw' : 'calc(100vw - 48px)', height: expanded ? '100vh' : '72vh', maxHeight: expanded ? '100vh' : 620, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: expanded ? 0 : OVERLAY_RADIUS, boxShadow: OVERLAY_SHADOW, zIndex: 150, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'pop .22s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px', borderBottom: '1px solid var(--line)', background: 'linear-gradient(120deg,var(--accent-grad-1),var(--accent-grad-2))' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          <img src="/assets/sensei-mark.png" alt="" aria-hidden="true" width={38} height={38} style={{ width: 38, height: 38, objectFit: 'cover', objectPosition: '50% 20%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--on-accent)', fontSize: 15.5, fontWeight: 800, lineHeight: 1.1 }}>שאל את סנסיי</div>
          <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 11.5 }}>עוזר AI · מבוסס על הסיכומים שלכם</div>
        </div>
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'חזרה לחלונית מוקטנת' : 'הרחבה למסך מלא'} aria-pressed={expanded} className="shell-ai-head-btn">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">{expanded ? <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /> : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />}</svg>
        </button>
        <button type="button" onClick={closeAndRestoreFocus} aria-label="סגירה" className="shell-ai-head-btn">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
        </button>
      </div>

      <div ref={scrollRef} id="ai-scroll" role="log" aria-live="polite" aria-relevant="additions text" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {m.tools?.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <ToolCallChip tool={t} />
              </div>
            ))}
            {m.text && (
              <div style={{ display: 'flex', justifyContent: m.me ? 'flex-end' : 'flex-start' }}>
                <div dir={textDirection(m.text)} style={{ maxWidth: '84%', background: m.me ? 'var(--primary)' : 'var(--surface-2)', color: m.me ? 'var(--paper)' : 'var(--text)', border: '1px solid ' + (m.me ? 'var(--primary)' : 'var(--divider)'), borderRadius: 10, padding: '11px 14px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'start' }}>{m.me ? m.text : linkifyPatientLinks(m.text)}</div>
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <span className="sr-only">סנסיי מקליד תשובה…</span>
            <div aria-hidden="true" style={{ background: 'var(--surface-2)', border: '1px solid var(--divider)', borderRadius: 10, padding: '13px 16px', display: 'flex', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s ease-in-out infinite' }} />
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s ease-in-out .2s infinite' }} />
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s ease-in-out .4s infinite' }} />
            </div>
          </div>
        )}
      </div>

      {/* Starter chips only until the user has actually asked something (the seed
          ships a greeting, so "fresh" = no user message yet). Once chatting, they
          stop competing with the message log for space in the height-capped panel. */}
      {!messages.some((m) => m.me) && (
        <div style={{ padding: '10px 14px 6px', display: 'flex', gap: 7, flexWrap: 'wrap', borderTop: '1px solid var(--line)' }}>
          {SUGGESTIONS.map((sg) => (
            <button type="button" key={sg.q} onClick={() => onSend(sg.q)} aria-label={sg.label} className="shell-ai-chip" style={{ fontSize: 12, padding: '6px 11px', border: '1px solid var(--primary-border)', borderRadius: 18, color: 'var(--primary)', background: 'var(--primary-surface)', cursor: 'pointer', fontWeight: 600 }}>{sg.label}</button>
          ))}
        </div>
      )}

      <div className="shell-ai-composer" style={{ padding: '10px 14px 14px', display: 'flex', gap: 9, alignItems: 'flex-end' }}>
        <textarea ref={inputRef} rows={1} value={input} onInput={(e) => onInput(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.trim()) onSend(input.trim()); } }} aria-label="הקלדת שאלה" aria-describedby="ai-composer-hint" placeholder="כתבו שאלה…" className="shell-input shell-ai-textarea" />
        <button type="button" onClick={() => onSend(input.trim())} disabled={!input.trim() || typing} aria-label={typing ? 'סנסיי מכין תשובה' : 'שליחה'} aria-busy={typing} className="shell-send" style={{ width: 44, height: 44, border: 'none', borderRadius: 10, background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--on-accent)" style={{ transform: 'scaleX(-1)' }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </button>
      </div>
      <div id="ai-composer-hint" style={{ padding: '0 16px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Enter לשליחה · Shift+Enter לשורה חדשה · סנסיי עשוי לטעות ואינו תחליף לשיקול דעת קליני</div>
    </div>
  );
}

// A tool call: a collapsed 1-line row that expands to the full request/response,
// so the therapist can see exactly what the assistant fetched from the backend.
function ToolCallChip({ tool }: { tool: ToolView }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ maxWidth: '92%', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="shell-ai-tool" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', textAlign: 'start' }}>
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: tool.done ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.label}</span>
        <span aria-hidden="true" style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }}>‹</span>
      </button>
      {open && (
        <pre dir="ltr" style={{ margin: 0, padding: '8px 10px', borderTop: '1px solid var(--divider)', fontSize: 11, lineHeight: 1.5, color: 'var(--text)', overflowX: 'auto', maxHeight: 220, whiteSpace: 'pre', fontFamily: 'monospace' }}>{toolDetail(tool)}</pre>
      )}
    </div>
  );
}

function toolDetail(tool: ToolView): string {
  const sections: string[] = [];
  if (tool.input !== undefined) sections.push('request:\n' + safeJson(tool.input));
  if (tool.output !== undefined) sections.push('response:\n' + safeJson(tool.output));
  return sections.join('\n\n') || '…';
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
