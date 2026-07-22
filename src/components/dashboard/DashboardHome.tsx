// Dashboard home — the calm "focus" surface. It answers, at a glance: who's
// next, what needs attention, and what's on today — then hands off to the full
// calendar workspace. The heavy week/day/month grid lives on the Calendar route
// (CalendarHome); the home deliberately shows only today's schedule so there is
// one obvious focus. Same data source as the calendar (useWeekEvents = fixtures
// + scheduled appts), so counts never disagree across the two surfaces.
import { useMemo } from 'react';
import { useApp } from '../../store/AppStore';
import { useWeekEvents } from '../../hooks/useWeekEvents';
import { dayKey, type CalendarUiEvent } from '../../services/calendar';
import { heCount, heGreeting } from '../../utils';
import DashboardSummary from '../DashboardSummary';
import DashboardFocus from '../DashboardFocus';
import TodayAgenda from './TodayAgenda';
import '../../pages/dashboard.css';

export default function DashboardHome() {
  const { S, set, navigate } = useApp();
  const today = new Date();
  const { events: weekEvents, loading, error, reload } = useWeekEvents(today, S.scheduledAppts || [], S.patients);

  const todaysEvents = useMemo(() => {
    const tk = dayKey(today);
    return weekEvents
      .filter((e: CalendarUiEvent) => !e.allDay && dayKey(new Date(e.start)) === tk)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    // today's calendar key is stable within a render; recompute only when events change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEvents]);

  const greetWord = heGreeting(today);
  const therapistName = (S.profile && S.profile.name) || '';
  const todayLabel = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  const weekCount = weekEvents.filter((e: CalendarUiEvent) => !e.allDay).length;

  const startCoreFlow = () => navigate('upload', { upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
  const dismissTip = () => set({ onboardTipDismissed: true });

  return (
    <div className="calh-root dash-home">
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>{greetWord}{therapistName ? ', ' + therapistName : ''}</h1>
        <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          {todayLabel}{' · '}
          {todaysEvents.length ? heCount(todaysEvents.length, 'פגישה אחת היום', 'פגישות היום') : 'אין פגישות מתוזמנות היום'}
        </p>
      </div>

      {/* ---- at-a-glance workload ---- */}
      <DashboardSummary todayCount={todaysEvents.length} weekCount={weekCount} />

      {/* Onboarding tip — auto-hides once the core flow succeeded (hasUploaded). */}
      {!S.onboardTipDismissed && !S.hasUploaded && (
        <div role="note" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: 'var(--primary-surface)', border: '1px solid var(--primary-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--paper)" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>ברוכים הבאים לסנסיי</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>העלו הקלטה של מפגש כדי לקבל סיכום AI, תובנות מרכזיות ודוח הכנה לפגישה הבאה. הנתונים נשמרים מקומית במכשירכם.</div>
          </div>
          <button type="button" onClick={startCoreFlow} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
            העלאת הקלטה
          </button>
          <button type="button" onClick={dismissTip} aria-label="סגירת ההודעה" className="calh-icon-btn" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>
      )}

      {/* ---- focus zone: who's next + resume work ---- */}
      <DashboardFocus />

      {/* ---- today's schedule + the handoff to the full calendar workspace ---- */}
      <div className="dash-agenda-head">
        <h2 style={{ margin: '4px 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.02em' }}>המשך היום</h2>
        <button type="button" className="dash-open-cal" onClick={() => navigate('calendar')} aria-label="פתיחת היומן המלא">
          פתיחת היומן המלא
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
        </button>
      </div>

      {loading && (
        <div aria-hidden="true" style={{ height: 3, background: 'var(--primary-tint)', overflow: 'hidden', borderRadius: 3, marginBottom: 10 }}>
          <div style={{ height: 3, width: '55%', background: 'var(--primary)', animation: 'loadbar 1.1s cubic-bezier(.4,0,.2,1) infinite' }} />
        </div>
      )}
      {error && !loading && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--error-bg-soft)', border: '1px solid var(--error-line)', borderRadius: 10, marginBottom: 10 }}>
          <span style={{ flex: 1, minWidth: 180, fontSize: 13, fontWeight: 600, color: 'var(--error-dark)' }}>טעינת היומן נכשלה. הפגישות המקומיות עדיין מוצגות.</span>
          <button type="button" onClick={reload} style={{ height: 32, padding: '0 14px', border: '1px solid var(--error-border)', borderRadius: 8, background: 'var(--paper)', color: 'var(--error-dark)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>נסו שוב</button>
        </div>
      )}

      <TodayAgenda events={todaysEvents} />
    </div>
  );
}
