// Page-level error boundary: a render error in one screen shows a recoverable
// card instead of white-screening the whole app. `resetKey` (the current route)
// clears the error when the user navigates elsewhere, so the app self-recovers.
import React from 'react'

interface Props { children: React.ReactNode; resetKey: string; onReset?: () => void }
interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Observability: a caught render error is otherwise swallowed silently (the UI
    // recovers, but nothing is logged). Surface it so it appears in the console / any
    // log capture, and as the single hook point to wire a real error reporter later
    // (e.g. Sentry) without touching the recovery UI.
    console.error('[ErrorBoundary] render error on route:', this.props.resetKey, error, info.componentStack)
  }

  override componentDidUpdate(prev: Props) {
    // clear the error when the route changes (navigation recovers the app)
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{ maxWidth: 560, margin: '48px auto', background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 16, padding: '32px 28px', textAlign: 'center', boxShadow: '0 1px 2px rgba(16,40,80,.06),0 6px 22px rgba(16,40,80,.07)' }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--error)" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>משהו השתבש במסך הזה</h1>
          <p style={{ margin: '0 0 20px', fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            העבודה שלכם נשמרה. נסו לרענן את המסך או לעבור למסך אחר.
          </p>
          <button
            onClick={() => { this.setState({ error: null }); this.props.onReset?.() }}
            style={{ height: 44, padding: '0 24px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}
          >
            חזרה לדף הבית
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
