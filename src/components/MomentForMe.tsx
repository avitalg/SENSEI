// "רגע בשבילי" (Moment for Me) v2 — the wellbeing companion from the Mativ
// therapist-feedback guidelines, expanded per the P2 roadmap ("expand the
// wellbeing library"). A quiet, dismissible between-session pause offering a
// small curated set of restorative activities. Binding design constraints:
// always optional (start / remind-later / dismiss / settings off-switch),
// never interrupts a workflow, no gamification, no pressure, no patient data
// anywhere in the experience. Trigger detection stays DETERMINISTIC and
// user-controlled by decision — simulating "AI emotional-intensity" signals
// without a real model would be feature theater.
import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { scrimStyle } from '../utils/styles'
import './moment.css'

const PHASE_SECONDS = 4 // slow 4-4 breathing rhythm

const LEAF_ICON = 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z'
const CLOSE_X = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'

// The library — small and curated on purpose (calm over choice overload).
export const MOMENT_ACTIVITIES = [
  { key: 'breath', label: 'נשימה שקטה', desc: 'מעגל נשימה איטי · 4-4' },
  { key: 'ground', label: 'תרגיל קרקוע', desc: 'חמשת החושים · 5-4-3-2-1' },
  { key: 'reflect', label: 'הרהור שקט', desc: 'משפט אחד ורגע של דממה' },
  { key: 'stretch', label: 'מתיחה ומים', desc: 'תזכורת עדינה לגוף' },
] as const

const BREATH_DURATIONS = [
  { seconds: 30, label: '30 שניות' },
  { seconds: 60, label: 'דקה' },
  { seconds: 180, label: '3 דקות' },
]

// Grounding: the 5-4-3-2-1 senses walk, one gentle prompt at a time.
const GROUND_STEPS = [
  'שימו לב ל-5 דברים שאתם רואים סביבכם',
  'הבחינו ב-4 דברים שאפשר לגעת בהם',
  'הקשיבו ל-3 צלילים ברקע',
  'זהו 2 ריחות בחלל',
  'טעם אחד שנשאר · ונשימה עמוקה לסיום',
]
const GROUND_STEP_SECONDS = 12

// Quiet reflections — original, Japanese-inspired minimalism. Rotates by day.
const REFLECTIONS = [
  'נשימה אחת עמוקה היא מרחק שלם בין פגישה לפגישה.',
  'העץ אינו ממהר לצמוח · וגם הוא מגיע לשמיים.',
  'מים שקטים · עומק רב.',
  'גם המקשיבים זקוקים לרגע של הקשבה לעצמם.',
  'רגע של שקט אינו עצירה · הוא חלק מהדרך.',
]
const REFLECT_SECONDS = 45
const STRETCH_SECONDS = 30

// The quiet suggestion card (dashboard, between sessions).
// Three levels of control, per the guidelines: start now · remind later
// (this visit only) · hide (persisted; reversible in Settings → notifications).
export function MomentCard() {
  const { S, set, toast } = useApp()
  if (!S.momentEnabled || S.momentDismissed || S.momentSnoozed) return null
  const dismiss = () => {
    set({ momentDismissed: true })
    toast('ההצעה הוסתרה · אפשר להפעיל שוב בהגדרות ההתראות', 'info')
  }
  const snooze = () => {
    set({ momentSnoozed: true })
    toast('נזכיר בפעם הבאה', 'info')
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
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>הפסקה קצרה בין פגישות · נשימה, קרקוע או הרהור שקט</div>
      </div>
      <button onClick={start} className="moment-cta" style={{ height: 38, padding: '0 16px', border: '1px solid var(--primary-border)', borderRadius: 10, background: 'var(--primary-surface)', color: 'var(--primary-dark)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>התחלת הפסקה</button>
      <button type="button" onClick={snooze} className="moment-snooze" style={{ height: 38, padding: '0 10px', border: 'none', background: 'transparent', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>מאוחר יותר</button>
      <button type="button" onClick={dismiss} aria-label="הסתרת ההצעה" className="moment-dismiss" style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'transparent', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d={CLOSE_X} /></svg>
      </button>
    </div>
  )
}

const quietBtn: React.CSSProperties = { height: 42, padding: '0 22px', border: '1px solid var(--border-input)', borderRadius: 10, background: 'var(--paper)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }
const primaryBtn: React.CSSProperties = { height: 42, padding: '0 22px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }

// The pause overlay: a quiet chooser, then the chosen activity. Closable at
// any moment (buttons, backdrop, the global Escape cascade) — never traps.
// No patient names, notes, or clinical data are ever rendered here.
export function MomentOverlay() {
  const { S, set } = useApp()
  const open = !!S.momentOpen
  const trapRef = useFocusTrap<HTMLDivElement>(open)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timer = useRef<any>(null)

  useEffect(() => {
    if (!open) { setRunning(false); setElapsed(0); return undefined }
    return undefined
  }, [open])
  useEffect(() => {
    if (!open || !running) return undefined
    timer.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer.current)
  }, [open, running])

  if (!open) return null
  const close = () => set({ momentOpen: false })
  const activity = S.momentActivity || 'breath'
  const duration =
    activity === 'breath' ? (S.momentDuration || 60)
      : activity === 'ground' ? GROUND_STEPS.length * GROUND_STEP_SECONDS
        : activity === 'reflect' ? REFLECT_SECONDS
          : STRETCH_SECONDS
  const done = running && elapsed >= duration
  const remaining = Math.max(0, duration - elapsed)
  const startActivity = (key: string) => { set({ momentActivity: key }); setElapsed(0); setRunning(true) }

  const inhale = Math.floor(elapsed / PHASE_SECONDS) % 2 === 0
  const groundStep = Math.min(GROUND_STEPS.length - 1, Math.floor(elapsed / GROUND_STEP_SECONDS))
  const reflection = REFLECTIONS[new Date().getDate() % REFLECTIONS.length]

  return (
    <>
      <div onClick={close} style={{ ...scrimStyle, zIndex: 180 }} />
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="רגע בשבילי · הפסקה קצרה" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, maxWidth: 'calc(100vw - 32px)', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 16, boxShadow: '0 24px 70px rgba(8,20,50,.32)', zIndex: 181, padding: '30px 28px', textAlign: 'center' }}>

        {/* ---- chooser ---- */}
        {!running && (<>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>רגע בשבילי</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--text-secondary)' }}>בחרו הפסקה קצרה · הכול אופציונלי, אפשר לסיים בכל רגע</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {MOMENT_ACTIVITIES.map((a) => (
              <button key={a.key} onClick={() => startActivity(a.key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', border: '1px solid ' + (activity === a.key ? 'var(--primary-border)' : 'var(--divider)'), borderRadius: 10, background: activity === a.key ? 'var(--primary-surface)' : 'var(--paper)', cursor: 'pointer', textAlign: 'start' }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{a.label}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{a.desc}</span>
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="משך תרגיל הנשימה" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {BREATH_DURATIONS.map((d) => {
              const on = (S.momentDuration || 60) === d.seconds
              return (
                <button key={d.seconds} role="radio" aria-checked={on} onClick={() => set({ momentDuration: d.seconds })} style={{ height: 30, padding: '0 13px', border: '1px solid ' + (on ? 'var(--primary)' : 'var(--divider)'), borderRadius: 20, background: on ? 'var(--primary)' : 'var(--paper)', color: on ? 'var(--paper)' : 'var(--text-secondary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{d.label}</button>
              )
            })}
          </div>
          <button onClick={close} style={quietBtn}>לא עכשיו</button>
        </>)}

        {/* ---- breathing ---- */}
        {running && !done && activity === 'breath' && (<>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>נשימה שקטה</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13.5, color: 'var(--text-secondary)' }}>עקבו אחרי המעגל · ‏{remaining} שניות</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150, marginBottom: 20 }}>
            <div className="moment-circle" aria-hidden="true" style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--primary-tint)', border: '2px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-surface)' }}></div>
            </div>
          </div>
          {/* the phase cue is the accessible heart of the exercise — announced politely */}
          <div aria-live="polite" style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 24 }}>{inhale ? 'שאיפה…' : 'נשיפה…'}</div>
          <button onClick={close} style={quietBtn}>סיום מוקדם</button>
        </>)}

        {/* ---- grounding 5-4-3-2-1 ---- */}
        {running && !done && activity === 'ground' && (<>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>תרגיל קרקוע</h2>
          <p style={{ margin: '0 0 26px', fontSize: 13.5, color: 'var(--text-secondary)' }}>שלב {groundStep + 1} מתוך {GROUND_STEPS.length} · ‏{remaining} שניות</p>
          <p aria-live="polite" style={{ margin: '0 0 28px', fontSize: 16.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.7, minHeight: 56 }}>{GROUND_STEPS[groundStep]}</p>
          <button onClick={close} style={quietBtn}>סיום מוקדם</button>
        </>)}

        {/* ---- quiet reflection ---- */}
        {running && !done && activity === 'reflect' && (<>
          <h2 style={{ margin: '0 0 24px', fontSize: 17, fontWeight: 700 }}>הרהור שקט</h2>
          <p style={{ margin: '0 0 28px', fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.9 }}>{reflection}</p>
          <p style={{ margin: '0 0 24px', fontSize: 12.5, color: 'var(--text-muted)' }}>‏{remaining} שניות של שקט</p>
          <button onClick={close} style={quietBtn}>סיום מוקדם</button>
        </>)}

        {/* ---- stretch + water ---- */}
        {running && !done && activity === 'stretch' && (<>
          <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>מתיחה ומים</h2>
          <p style={{ margin: '0 0 26px', fontSize: 15.5, color: 'var(--text)', lineHeight: 1.8 }}>הרפו את הכתפיים · מתחו את הגב בעדינות · ולגימה של מים לפני הפגישה הבאה.</p>
          <p style={{ margin: '0 0 24px', fontSize: 12.5, color: 'var(--text-muted)' }}>‏{remaining} שניות</p>
          <button onClick={close} style={quietBtn}>סיום מוקדם</button>
        </>)}

        {/* ---- done ---- */}
        {done && (<>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="var(--success)" aria-hidden="true"><path d={LEAF_ICON} /></svg>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>ההפסקה הסתיימה</h2>
          <p role="status" style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>חוזרים בנחת · הפגישה הבאה יכולה לחכות עוד רגע.</p>
          <button onClick={close} style={primaryBtn}>חזרה לעבודה</button>
        </>)}
      </div>
    </>
  )
}
