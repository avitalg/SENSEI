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
import CalendarErrorBanner from '../shared/CalendarErrorBanner';
import TodayAgenda from './TodayAgenda';
import '../../pages/dashboard.css';

export default function DashboardHome() {
  const { S } = useApp();
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


  return (
    <div className="calh-root dash-home">
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>{greetWord}{therapistName ? ', ' + therapistName : ''}</h1>
        <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          {todayLabel}{' · '}
          {todaysEvents.length ? heCount(todaysEvents.length, 'פגישה אחת היום', 'פגישות היום') : 'אין פגישות מתוזמנות היום'}
        </p>
      </div>

      {/* ---- unified daily overview: workload pills + who's-next / schedule /
              resume cards as ONE band — the therapist's immediate priorities
              surface together at the top, before any scrolling. ---- */}
      <section aria-label="סקירה יומית" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
        <DashboardSummary todayCount={todaysEvents.length} weekCount={weekCount} />
        <DashboardFocus />
      </section>

      {/* ---- today's schedule; the full-calendar handoff moved into the agenda
              toolbar, directly beside the daily-summary control. ---- */}
      <h2 style={{ margin: '4px 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.02em' }}>המשך היום</h2>

      {loading && (
        <div aria-hidden="true" style={{ height: 3, background: 'var(--primary-tint)', overflow: 'hidden', borderRadius: 3, marginBottom: 10 }}>
          <div style={{ height: 3, width: '55%', background: 'var(--primary)', animation: 'loadbar 1.1s cubic-bezier(.4,0,.2,1) infinite' }} />
        </div>
      )}
      {error && !loading && <CalendarErrorBanner onRetry={reload} style={{ marginBottom: 10 }} />}

      <TodayAgenda events={todaysEvents} />
    </div>
  );
}
