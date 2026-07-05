// Messages — ported from 'Sensei demo.dc.html'
// (template lines 2040–2086 · logic: renderVals MESSAGES section ~3356–3390).
import React, { useEffect, useRef } from 'react'
import { useApp } from '../store/AppStore'
import { hg } from '../utils'
import './messages.css'

// Fixed thread ordering + simulated replies — ported verbatim from the prototype.
const MSG_ORDER = ['p3', 'p5', 'p1', 'p2']
const MSG_REPLIES = [
  'תודה רבה, זה עוזר לי מאוד.',
  'קיבלתי, אנסה ליישם את זה עד הפגישה הבאה.',
  'מושלם, תודה על הזמינות.',
  'בסדר, מחכה לפגישה הבאה.',
  'אוקיי, אעדכן אותך אם ישתנה משהו.',
]

export default function MessagesPage() {
  const { S, set } = useApp()
  const msgTimer = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // ---- conversation list ----
  const allThreads = Object.keys(S.msgData)
  const orderedIds = MSG_ORDER.filter((id) => allThreads.includes(id))
    .concat(allThreads.filter((id) => !MSG_ORDER.includes(id)))
  const msgQ = (S.msgSearch || '').trim()
  const findPatient = (id: string) => S.patients.find((p: any) => p.id === id)
  const convFiltered = orderedIds.filter((id) => {
    const p = findPatient(id)
    if (!p) return false
    if (S.msgFilter === 'unread' && !S.msgUnread[id]) return false
    if (msgQ && !p.name.includes(msgQ)) return false
    return true
  })
  const msgConversations = convFiltered.map((id) => {
    const p = findPatient(id)
    const arr = S.msgData[id] || []
    const last = arr[arr.length - 1] || { text: '', time: '', from: '' }
    return {
      id,
      initials: p.initials,
      color: p.color,
      name: p.name,
      time: last.time,
      preview: (last.from === 'me' ? hg('[[אתה|את]]: ', S.profile.gender) : '') + last.text,
      unread: !!S.msgUnread[id],
      bg: id === S.msgThread ? 'var(--primary-surface)' : 'var(--paper)',
      onClick: () => set((s: any) => ({ msgThread: id, msgUnread: { ...s.msgUnread, [id]: false } })),
    }
  })
  const msgListEmpty = convFiltered.length === 0

  // ---- active thread ----
  const actP = findPatient(S.msgThread) || findPatient(orderedIds[0])
  const msgActiveName = actP ? actP.name : ''
  const msgActiveFocus = actP ? actP.focus : ''
  const msgActiveInitials = actP ? actP.initials : ''
  const msgActiveColor = actP ? actP.color : 'var(--primary)'
  const msgBubbles = (S.msgData[S.msgThread] || []).map((b: any) => {
    const me = b.from === 'me'
    return {
      text: b.text, time: b.time,
      justify: me ? 'flex-end' : 'flex-start',
      align: me ? 'left' : 'right',
      bubble: me ? 'var(--primary)' : 'var(--paper)',
      color: me ? 'var(--paper)' : 'var(--text)',
      border: me ? 'var(--primary)' : 'var(--divider)',
    }
  })

  // ---- composer + simulated reply ----
  const sendMsg = () => {
    const tx = (S.msgInput || '').trim()
    if (!tx) return
    const tid = S.msgThread
    const arr = [...(S.msgData[tid] || []), { from: 'me', text: tx, time: 'עכשיו' }]
    set({ msgData: { ...S.msgData, [tid]: arr }, msgInput: '', msgTyping: true })
    clearTimeout(msgTimer.current)
    msgTimer.current = setTimeout(() => {
      const reply = MSG_REPLIES[Math.floor(Math.random() * MSG_REPLIES.length)]
      set((s: any) => ({
        msgData: { ...s.msgData, [tid]: [...(s.msgData[tid] || []), { from: 'them', text: reply, time: 'עכשיו' }] },
        msgTyping: false,
      }))
    }, 1600)
  }
  const onMsgKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); sendMsg() } }

  // ---- filter chips ----
  const mAll = S.msgFilter !== 'unread'
  const msgAllBg = mAll ? 'var(--primary)' : 'var(--paper)'
  const msgAllColor = mAll ? 'var(--paper)' : 'var(--text-2)'
  const msgAllBorder = mAll ? 'var(--primary)' : 'var(--border-input)'
  const msgUnBg = !mAll ? 'var(--primary)' : 'var(--paper)'
  const msgUnColor = !mAll ? 'var(--paper)' : 'var(--text-2)'
  const msgUnBorder = !mAll ? 'var(--primary)' : 'var(--border-input)'

  // Prototype componentDidUpdate: keep the thread scrolled to the latest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  return (
    <div data-screen-label="הודעות" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>הודעות</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>תקשורת מאובטחת ומוצפנת מקצה-לקצה עם המטופלים</p>
      </div>
      <div className="rx-msg" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, height: 'calc(100vh - 210px)', minHeight: 480 }}>
        {/* conversation list */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 11, top: 11 }}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" /></svg>
              <input value={S.msgSearch} onChange={(e: any) => set({ msgSearch: e.target.value })} aria-label="חיפוש שיחות" placeholder="חיפוש שיחה…" className="msg-search-input" style={{ width: '100%', height: 40, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px 0 38px', fontSize: 14, outline: 'none', background: 'var(--surface)' }} />
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => set({ msgFilter: 'all' })} style={{ height: 30, padding: '0 13px', border: '1px solid ' + msgAllBorder, borderRadius: 20, background: msgAllBg, color: msgAllColor, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>הכל</button>
              <button onClick={() => set({ msgFilter: 'unread' })} style={{ height: 30, padding: '0 13px', border: '1px solid ' + msgUnBorder, borderRadius: 20, background: msgUnBg, color: msgUnColor, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>לא נקראו</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {msgConversations.map((c: any) => (
              <div key={c.id} onClick={c.onClick} className="msg-conv-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: c.bg }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{c.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0 }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{c.preview}</div>
                </div>
                {c.unread && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></span>}
              </div>
            ))}
            {msgListEmpty && <div style={{ padding: '30px 16px', textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)' }}>אין שיחות תואמות</div>}
          </div>
        </div>
        {/* active thread */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 12, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.045)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: msgActiveColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{msgActiveInitials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{msgActiveName}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{msgActiveFocus}</div>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--success)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" /></svg>
              מוצפן
            </span>
          </div>
          <div ref={scrollRef} data-scroll="msg" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg)' }}>
            {msgBubbles.map((b: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: b.justify }}>
                <div style={{ maxWidth: '72%' }}>
                  <div style={{ background: b.bubble, color: b.color, border: '1px solid ' + b.border, borderRadius: 14, padding: '11px 15px', fontSize: 14, lineHeight: 1.55 }}>{b.text}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, textAlign: b.align }}>{b.time}</div>
                </div>
              </div>
            ))}
            {S.msgTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 14, padding: '13px 16px', display: 'flex', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s ease-in-out infinite' }}></span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s ease-in-out .2s infinite' }}></span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s ease-in-out .4s infinite' }}></span>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 9, alignItems: 'center' }}>
            <input value={S.msgInput} onChange={(e: any) => set({ msgInput: e.target.value })} onKeyDown={onMsgKey} aria-label="כתיבת הודעה" placeholder="כתבו הודעה…" className="msg-compose-input" style={{ flex: 1, height: 46, border: '1px solid var(--border-input)', borderRadius: 12, padding: '0 15px', fontSize: 14.5, outline: 'none', background: 'var(--surface)' }} />
            <button onClick={sendMsg} aria-label="שליחה" className="msg-send-btn" style={{ width: 46, height: 46, border: 'none', borderRadius: 12, background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" style={{ transform: 'scaleX(-1)' }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
