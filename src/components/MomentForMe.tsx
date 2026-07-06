// "רגע בשבילי" (Moment for Me) v1 — the P0 wellbeing feature from the Mativ
// therapist-feedback guidelines: a single, dismissible between-session pause
// plus one one-minute breathing exercise. Design constraints (binding, from
// the guidelines): always optional, never interrupts a workflow, quiet and
// non-judgmental, dismiss is one click, and the whole thing can be turned off
// in Settings → notifications (S.momentEnabled).
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import './moment.css'

const EXERCISE_SECONDS = 60
const PHASE_SECONDS = 4 // slow 4-4 breathing rhythm

const LEAF_ICON = 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z'
const CLOSE_X = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'

// The quiet suggestion card (rendered on the dashboard, between sessions).
export function MomentCard() {
  const { S, set, toast } = useApp()
  if (!S.momentEnabled || S.momentDismissed) return null
  const dismiss = () => {
    set({ momentDismissed: true })
    toast('ההצעה הוסתרה · אפשר להפעיל שוב בהגדרות ההתראות', 'info')
  }
  const start = () => set({ momentOpen: true })
  return (
    <div className="moment-card" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="var(--success)" aria-hidden="true"><path d={LEAF_ICON} /></svg>
      </div>
      {/* the text column claims a real width so narrow screens wrap the CTA below instead of crushing the copy */}
      <div style={{ flex: '1 1 170px', minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>רגע בשבילי</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>הפסקה קצרה בין פגישות · דקה אחת של נשימה שקטה</div>
      </div>
      <button onClick={start} className="moment-cta" style={{ height: 38, padding: '0 16px', border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--primary-surface)', color: 'var(--primary-dark)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>תרגיל נשימה של דקה</button>
      <button type="button" onClick={dismiss} aria-label="הסתרת ההצעה" className="moment-dismiss" style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'transparent', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d={CLOSE_X} /></svg>
      </button>
    </div>
  )
}

// The one-minute breathing exercise overlay. Closable at any moment (button,
// backdrop, or the global Escape cascade) — it never traps the therapist.
export function MomentOverlay() {
  const { S, set } = useApp()
  const open = !!S.momentOpen
  const trapRef = useFocusTrap<HTMLDivElement>(open)
  const [elapsed, setElapsed] = useState(0)
  const timer = useRef<any>(null)

  useEffect(() => {
    if (!open) { setElapsed(0); return undefined }
    timer.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer.current)
  }, [open])

  if (!open) return null
  const done = elapsed >= EXERCISE_SECONDS
  const inhale = Math.floor(elapsed / PHASE_SECONDS) % 2 === 0
  const remaining = Math.max(0, EXERCISE_SECONDS - elapsed)
  const close = () => set({ momentOpen: false })

  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,40,.5)', zIndex: 180, backdropFilter: 'blur(2px)' }} />
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="תרגיל נשימה של דקה" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 380, maxWidth: 'calc(100vw - 32px)', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 16, boxShadow: '0 24px 70px rgba(8,20,50,.32)', zIndex: 181, padding: '30px 28px', textAlign: 'center' }}>
        {!done && (<>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>נשימה שקטה</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13.5, color: 'var(--text-secondary)' }}>עקבו אחרי המעגל · ‏{remaining} שניות</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150, marginBottom: 20 }}>
            <div className="moment-circle" aria-hidden="true" style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--primary-tint)', border: '2px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-surface)' }}></div>
            </div>
          </div>
          {/* the phase cue is the accessible heart of the exercise — announced politely */}
          <div aria-live="polite" style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 24 }}>{inhale ? 'שאיפה…' : 'נשיפה…'}</div>
          <button onClick={close} style={{ height: 42, padding: '0 22px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>סיום מוקדם</button>
        </>)}
        {done && (<>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="var(--success)" aria-hidden="true"><path d={LEAF_ICON} /></svg>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>הדקה הסתיימה</h2>
          <p role="status" style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>חוזרים בנחת · הפגישה הבאה יכולה לחכות עוד רגע.</p>
          <button onClick={close} style={{ height: 42, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>חזרה לעבודה</button>
        </>)}
      </div>
    </>
  )
}
