// Auth screens — 5 states ported from the prototype (template lines 256–381):
// login / signup / forgot (idle + sent) / session-expired / unauthorized.
import { useEffect, useRef } from 'react'
import { useApp } from '../../store/AppStore'
import './auth.css'

// Shared password-visibility icons (identical in login + signup blocks of the source).
const EyeOffIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
)
const EyeIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
)

export default function AuthScreens() {
  const { S, set, navigate, toast, login } = useApp()
  const loginTimer = useRef<any>(null)
  useEffect(() => () => clearTimeout(loginTimer.current), [])

  // ---- view derivations (renderVals "auth" section) ----
  const authIsLogin = S.authScreen === 'login'
  const authIsSignup = S.authScreen === 'signup'
  const authIsForgot = S.authScreen === 'forgot'
  const authIsExpired = S.authScreen === 'expired'
  const authIsUnauth = S.authScreen === 'unauthorized'
  const loginHasError = !!S.loginError
  const loginPassType = S.loginShowPass ? 'text' : 'password'
  const loginPassToggleLabel = S.loginShowPass ? 'הסתרת סיסמה' : 'הצגת סיסמה'
  const signupPassType = S.signupShowPass ? 'text' : 'password'
  const signupPassToggleLabel = S.signupShowPass ? 'הסתרת סיסמה' : 'הצגת סיסמה'

  // ---- handlers ----
  const toggleLoginPass = () => set((s: any) => ({ loginShowPass: !s.loginShowPass }))
  const toggleSignupPass = () => set((s: any) => ({ signupShowPass: !s.signupShowPass }))
  const onLoginEmail = (e: any) => set({ loginEmail: e.target.value, loginError: '' })
  const onLoginPass = (e: any) => set({ loginPass: e.target.value, loginError: '' })
  const doLogin = () => {
    if (S.loginLoading) return
    const email = (S.loginEmail || '').trim()
    const pass = S.loginPass || ''
    if (!/.+@.+\..+/.test(email)) { set({ loginError: 'הזינו כתובת דוא״ל תקינה' }); return }
    if (pass.length < 6) { set({ loginError: 'הסיסמה חייבת לכלול לפחות 6 תווים' }); return }
    set({ loginLoading: true, loginError: '' })
    clearTimeout(loginTimer.current)
    loginTimer.current = setTimeout(() => { set({ demoMode: false }); login() }, 850)
  }
  const onLoginKey = (e: any) => { if (e.key === 'Enter') { e.preventDefault(); doLogin() } }
  const doSignup = () => { set({ demoMode: false }); login() }
  const enterDemo = () => {
    set({ demoMode: true })
    login()
    toast('נכנסתם למצב הדגמה · הנתונים לדוגמה בלבד', 'info')
  }
  const goSignup = () => set({ authScreen: 'signup', loginError: '' })
  const goLogin = () => set({ authScreen: 'login', forgotSent: false, loginError: '', loginLoading: false })
  const goForgot = () => set({ authScreen: 'forgot', forgotSent: false })
  const goExpired = () => set({ authScreen: 'expired' })
  const goUnauth = () => set({ authScreen: 'unauthorized' })
  const doForgot = () => set({ forgotSent: true })
  const goDashboard = () => { set({ view: 'app' }); navigate('dashboard') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--paper)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 430, animation: 'pop .35s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, marginBottom: 24 }}>
          <div style={{ width: 54, height: 54, borderRadius: 15, background: '#FFFFFF', border: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,40,80,.06),0 4px 12px rgba(16,40,80,.06)' }}>
            <img src="/assets/sensei-mark.png" alt="סנסיי" width={54} height={54} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%' }} />
          </div>
          <span style={{ color: 'var(--primary)', fontSize: 29, fontWeight: 800, letterSpacing: '-.6px', fontFamily: "'Heebo',system-ui,sans-serif" }}>סנסיי</span>
        </div>

        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 16, boxShadow: '0 1px 2px rgba(16,40,80,.06),0 6px 22px rgba(16,40,80,.07)', padding: '34px 32px' }}>
          {/* login */}
          {authIsLogin && (
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 23, fontWeight: 700 }}>כניסה למערכת</h1>
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14.5 }}>ניהול שקט למטפלים · מבוסס AI</p>
              {loginHasError && (
                <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, padding: '11px 13px', marginBottom: 18 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg viewBox="0 0 24 24" width="17" height="17" fill="var(--error)" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>
                  <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text)', fontWeight: 600, lineHeight: 1.45 }}>{S.loginError}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--error)', background: 'var(--error-bg)', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>שגיאה</span>
                </div>
              )}
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>דוא״ל</label>
              <input className="auth-input" value={S.loginEmail} onInput={onLoginEmail} onKeyDown={onLoginKey} aria-label="דוא״ל" aria-invalid={loginHasError} autoComplete="email" autoFocus dir="ltr" placeholder="name@clinic.co.il" style={{ width: '100%', height: 46, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 14px', fontSize: 15, outline: 'none', marginBottom: 16, textAlign: 'start' }} />
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>סיסמה</label>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <input className="auth-input" value={S.loginPass} onInput={onLoginPass} onKeyDown={onLoginKey} type={loginPassType} aria-label="סיסמה" aria-invalid={loginHasError} autoComplete="current-password" dir="ltr" placeholder="••••••••" style={{ width: '100%', height: 46, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 44px 0 14px', fontSize: 15, outline: 'none', textAlign: 'start' }} />
                <button type="button" className="auth-eye" onClick={toggleLoginPass} aria-label={loginPassToggleLabel} title={loginPassToggleLabel} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  {S.loginShowPass && EyeOffIcon}
                  {!S.loginShowPass && EyeIcon}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--text-2)', cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />זכרו אותי</label>
                <a onClick={goForgot} style={{ fontSize: 13.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>שכחתם סיסמה?</a>
              </div>
              <button className="auth-login-btn" onClick={doLogin} disabled={S.loginLoading} aria-busy={S.loginLoading} style={{ width: '100%', height: 48, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(31,99,214,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                {S.loginLoading && (<><span aria-hidden="true" style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }}></span><span>מתחברים…</span></>)}
                {!S.loginLoading && <span>כניסה</span>}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}><span style={{ flex: 1, height: 1, background: 'var(--divider)' }}></span><span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>או</span><span style={{ flex: 1, height: 1, background: 'var(--divider)' }}></span></div>
              <button className="auth-demo-btn" onClick={enterDemo} style={{ width: '100%', height: 48, border: '1.5px solid var(--primary-border)', borderRadius: 10, background: 'var(--primary-surface)', color: 'var(--primary-dark)', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                כניסה למצב הדגמה
              </button>
              <p style={{ textAlign: 'center', margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>גישה מיידית ללא הרשמה · נתוני הדגמה בלבד</p>
              <p style={{ textAlign: 'center', margin: '20px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>אין לכם חשבון? <a onClick={goSignup} style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>הרשמה</a></p>
            </div>
          )}
          {/* signup */}
          {authIsSignup && (
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 23, fontWeight: 700 }}>הרשמת מטפל</h1>
              <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 14.5 }}>צרו חשבון חדש בכמה שניות</p>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>שם מלא</label>
              <input className="auth-input" aria-label="שם מלא" placeholder="ד״ר רותם שגב" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 14px', fontSize: 15, outline: 'none', marginBottom: 14 }} />
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>דוא״ל</label>
              <input className="auth-input" aria-label="דוא״ל" dir="ltr" placeholder="name@clinic.co.il" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 14px', fontSize: 15, outline: 'none', marginBottom: 14, textAlign: 'start' }} />
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>סיסמה</label>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input className="auth-input" aria-label="סיסמה" type={signupPassType} dir="ltr" placeholder="לפחות 8 תווים" style={{ width: '100%', height: 44, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 44px 0 14px', fontSize: 15, outline: 'none', textAlign: 'start' }} />
                <button type="button" className="auth-eye" onClick={toggleSignupPass} aria-label={signupPassToggleLabel} title={signupPassToggleLabel} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  {S.signupShowPass && EyeOffIcon}
                  {!S.signupShowPass && EyeIcon}
                </button>
              </div>
              <button className="auth-signup-btn" onClick={doSignup} style={{ width: '100%', height: 48, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(31,99,214,.32)' }}>יצירת חשבון</button>
              <p style={{ textAlign: 'center', margin: '22px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>כבר רשומים? <a onClick={goLogin} style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>כניסה</a></p>
            </div>
          )}
          {/* forgot */}
          {authIsForgot && (
            <div>
              {S.forgotSent && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><svg viewBox="0 0 24 24" width="34" height="34" fill="var(--success)"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                  <h1 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 700 }}>נשלח קישור איפוס</h1>
                  <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>שלחנו קישור לאיפוס הסיסמה לכתובת הדוא״ל שלכם. בדקו את תיבת הדואר.</p>
                  <button onClick={goLogin} style={{ width: '100%', height: 46, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>חזרה לכניסה</button>
                </div>
              )}
              {!S.forgotSent && (
                <div>
                  <h1 style={{ margin: '0 0 4px', fontSize: 23, fontWeight: 700 }}>איפוס סיסמה</h1>
                  <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>הזינו את כתובת הדוא״ל ונשלח אליכם קישור לאיפוס.</p>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>דוא״ל</label>
                  <input className="auth-input" aria-label="דוא״ל" dir="ltr" placeholder="name@clinic.co.il" style={{ width: '100%', height: 46, border: '1.5px solid var(--border-input)', borderRadius: 10, padding: '0 14px', fontSize: 15, outline: 'none', marginBottom: 20, textAlign: 'start' }} />
                  <button onClick={doForgot} style={{ width: '100%', height: 48, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>שליחת קישור</button>
                  <p style={{ textAlign: 'center', margin: '20px 0 0', fontSize: 14 }}><a onClick={goLogin} style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>חזרה לכניסה</a></p>
                </div>
              )}
            </div>
          )}
          {/* expired */}
          {authIsExpired && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><svg viewBox="0 0 24 24" width="34" height="34" fill="var(--warning-strong)"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div>
              <h1 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 700 }}>פג תוקף ההתחברות</h1>
              <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>מטעמי אבטחה, ההתחברות פגה לאחר חוסר פעילות. אנא התחברו מחדש.</p>
              <button onClick={goLogin} style={{ width: '100%', height: 46, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>התחברות מחדש</button>
            </div>
          )}
          {/* unauthorized */}
          {authIsUnauth && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><svg viewBox="0 0 24 24" width="34" height="34" fill="var(--error)"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v6h-2V7zm0 8h2v2h-2v-2z"/></svg></div>
              <h1 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 700 }}>אין הרשאת גישה</h1>
              <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.6 }}>אין לכם הרשאה לצפות בעמוד זה. המטפל רואה רק את המטופלים המשויכים אליו.</p>
              <button onClick={goDashboard} style={{ width: '100%', height: 46, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>חזרה לדף הבית</button>
            </div>
          )}

          {import.meta.env.DEV && (
          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', borderTop: '1px solid var(--bg)', paddingTop: 16 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', width: '100%', textAlign: 'center', marginBottom: 2 }}>מצבי מסך (הדגמה)</span>
            <a onClick={goExpired} style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>פג תוקף</a>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <a onClick={goUnauth} style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>חסר הרשאה</a>
          </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, color: 'var(--text-muted)' }}><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ flexShrink: 0 }}><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg><span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.5, textAlign: 'center' }}>מוצפן מקצה לקצה · תואם תקני אבטחת מידע רפואי</span></div>
      </div>
    </div>
  )
}
