// Dashboard — focused home view: today's schedule, one next action, essentials only.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppStore';
import { avatarColors, getPatient, mergeAppointments } from '../utils';
import { isApiConfigured } from '../services/apiClient';
import {
  dayKey,
  loadCalendarEvents,
  weekEnd,
  weekStart,
  type CalendarUiEvent,
} from '../services/calendar';
import { patientInitials, patientAvatarColor } from '../services/patients';
import './dashboard.css';

function formatTodayDate(date = new Date()): string {
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

const DEMO_APPTS = [
  { time: '09:00', pid: 'p1', type: 'פגישה שבועית', dur: 50, status: 'done' },
  { time: '10:30', pid: 'p3', type: 'פגישת מעקב', dur: 50, status: 'now' },
  { time: '13:00', pid: 'p2', type: 'פגישה שבועית', dur: 50, status: 'upcoming' },
  { time: '16:00', pid: 'p5', type: 'פגישת מעקב', dur: 50, status: 'upcoming' },
];

function stMeta(st: string) {
  return st === 'done'
    ? { label: 'הסתיימה', dot: 'var(--success)' }
    : st === 'now'
      ? { label: 'עכשיו', dot: 'var(--primary)' }
      : { label: 'מתוכננת', dot: 'var(--toggle-off)' };
}

function statusForRange(start: Date, end: Date, now: Date): 'done' | 'now' | 'upcoming' {
  if (end <= now) return 'done';
  if (start <= now && now < end) return 'now';
  return 'upcoming';
}

function eventToDashAppt(e: CalendarUiEvent, now: Date) {
  const start = new Date(e.start);
  const end = new Date(e.end);
  return {
    id: e.id,
    time: String(start.getHours()).padStart(2, '0') + ':' + String(start.getMinutes()).padStart(2, '0'),
    endTime: String(end.getHours()).padStart(2, '0') + ':' + String(end.getMinutes()).padStart(2, '0'),
    pid: e.patientId || '',
    name: e.title,
    type: e.description?.trim() || 'פגישה',
    status: statusForRange(start, end, now),
    dur: Math.max(1, Math.round((+end - +start) / 60000)),
  };
}

export default function DashboardPage() {
  const { S, set, navigate } = useApp();
  const apiMode = isApiConfigured();
  const [apiToday, setApiToday] = useState<ReturnType<typeof eventToDashAppt>[] | null>(null);

  useEffect(() => {
    if (!apiMode) {
      setApiToday(null);
      return undefined;
    }
    const ac = new AbortController();
    const today = dayKey(new Date());
    const anchor = new Date();
    loadCalendarEvents({
      timeMin: weekStart(anchor),
      timeMax: weekEnd(anchor),
      weekAnchor: anchor,
      signal: ac.signal,
      resolvePatientName: (patientId) => {
        if (!patientId) return undefined;
        return S.patients.find((p: any) => p.id === patientId)?.name;
      },
    })
      .then((events) => {
        if (ac.signal.aborted) return;
        const now = new Date();
        const rows = events
          .filter((e) => dayKey(new Date(e.start)) === today)
          .sort((a, b) => +a.start - +b.start)
          .map((e) => eventToDashAppt(e, now));
        setApiToday(rows);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setApiToday([]);
      });
    return () => ac.abort();
  }, [apiMode, S.patients, S.calendarRefreshNonce]);

  const addMin = (t: string, m: number) => {
    const [h, mm] = t.split(':').map(Number);
    const tot = h * 60 + mm + m;
    return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0');
  };
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const allAppts = useMemo(() => {
    if (apiMode) return apiToday || [];
    return mergeAppointments(DEMO_APPTS, S.scheduledAppts || [])
      .filter((a: any) => !a.date || a.date === dayKey(new Date()))
      .sort((a: any, b: any) => toMin(a.time) - toMin(b.time));
  }, [apiMode, apiToday, S.scheduledAppts]);

  const todayAppts = allAppts.map((a: any) => {
    const p = a.pid ? getPatient(S.patients, a.pid) : { id: a.pid || '', name: a.name || '—' };
    const name = a.name || p.name;
    const av = avatarColors(patientAvatarColor(p.id || name));
    const sm = stMeta(a.status);
    return {
      id: a.id,
      time: a.time,
      endTime: a.endTime || addMin(a.time, a.dur || 50),
      name,
      initials: patientInitials(name),
      avBg: av.bg,
      avColor: av.color,
      type: a.type || 'פגישה',
      stLabel: sm.label,
      lineColor: sm.dot,
      isNow: a.status === 'now',
      pid: a.pid || p.id,
      onOpen: () => {
        if (a.pid || p.id) navigate('patient', { patientId: a.pid || p.id });
        else navigate('calendar');
      },
      onUpload: (e: any) => {
        if (e) e.stopPropagation();
        const pid = a.pid || p.id;
        if (!pid) return;
        set({ patientId: pid, route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
      },
    };
  });

  let nextMarked = false;
  const dashToday = todayAppts.slice(0, 4).map((a: any) => {
    const isNext = !nextMarked && !a.isNow && a.stLabel !== 'הסתיימה';
    if (isNext || a.isNow) nextMarked = true;
    return { ...a, showNext: isNext, showUpload: a.isNow || isNext };
  });

  const dashDateLine = formatTodayDate();

  const nextAppt = allAppts.find((a: any) => a.status !== 'done') as any;
  const nextPatient = nextAppt
    ? (nextAppt.pid ? getPatient(S.patients, nextAppt.pid) : { id: '', name: nextAppt.name || '—' })
    : null;

  const stats = [
    { label: 'מטופלים', value: String(S.patients.length), onClick: () => navigate('patients') },
    { label: 'פגישות היום', value: String(todayAppts.length), onClick: () => navigate('calendar') },
  ];

  return (
    <div className="dash-root">
      <header className="dash-header">
        <div>
          <h1 className="dash-title">שלום, ד״ר שגב</h1>
          <p className="dash-subtitle">{dashDateLine}</p>
        </div>
      </header>

      <div className="dash-stats">
        {stats.map((s) => (
          <button key={s.label} type="button" onClick={s.onClick} className="dash-stat">
            <span className="dash-stat-label">{s.label}</span>
            <span className="dash-stat-value">{s.value}</span>
          </button>
        ))}
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2 className="dash-panel-title">לוח היום</h2>
          <button type="button" onClick={() => navigate('calendar')} className="dash-link">ליומן ›</button>
        </div>
        {apiMode && apiToday === null ? (
          <div className="dash-appt-type" style={{ padding: '12px 4px' }}>טוען פגישות מהשרת…</div>
        ) : dashToday.length === 0 ? (
          <div className="dash-appt-type" style={{ padding: '12px 4px' }}>אין פגישות להיום</div>
        ) : dashToday.map((a: any) => (
          <div
            key={a.id}
            onClick={a.onOpen}
            className={'dash-appt-row' + (a.isNow || a.showNext ? ' dash-appt-row--active' : '')}
            style={{ borderInlineStartColor: a.lineColor }}
          >
            <div className="dash-appt-time">
              <div dir="ltr">{a.time}</div>
              <div dir="ltr" className="dash-appt-end">{a.endTime}</div>
            </div>
            <div className="dash-appt-avatar" style={{ background: a.avBg, color: a.avColor }}>{a.initials}</div>
            <div className="dash-appt-body">
              <div className="dash-appt-name">
                {a.name}
                {a.isNow && <span className="dash-appt-badge dash-appt-badge--now">עכשיו</span>}
                {a.showNext && !a.isNow && <span className="dash-appt-badge">הבא</span>}
              </div>
              <div className="dash-appt-type">{a.type}</div>
            </div>
            {a.showUpload && a.pid && (
              <button
                type="button"
                onClick={a.onUpload}
                aria-label={'העלאת הקלטה · ' + a.name}
                className="dash-appt-upload"
              >
                ↑
              </button>
            )}
          </div>
        ))}
      </section>

      <div className="dash-secondary">
        {nextAppt && nextPatient && (
          <button
            type="button"
            className="dash-action dash-action--primary"
            onClick={() => navigate('report', { patientId: nextAppt.pid || nextPatient.id })}
          >
            הכנה לפגישה עם {nextPatient.name}
            <span className="dash-action-sub">{nextAppt.status === 'now' ? 'מתקיימת כעת' : 'היום ' + nextAppt.time}</span>
          </button>
        )}

        <div className="dash-quick">
          <button type="button" className="dash-quick-btn" onClick={() => set({ route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } })}>
            העלאת הקלטה
          </button>
          <button type="button" className="dash-quick-btn" onClick={() => navigate('patients')}>
            מטופלים
          </button>
        </div>
      </div>
    </div>
  );
}
