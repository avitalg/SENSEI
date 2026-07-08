// Dashboard — focused home view: today's schedule, one next action, essentials only.
import { useApp } from '../store/AppStore';
import { avatarColors, getPatient, mergeAppointments } from '../utils';
import { dayKey } from '../services/calendar';
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

export default function DashboardPage() {
  const { S, set, navigate } = useApp();

  const addMin = (t: string, m: number) => { const [h, mm] = t.split(':').map(Number); const tot = h * 60 + mm + m; return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0'); };
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const APPTS = [
    { time: '09:00', pid: 'p1', type: 'פגישה שבועית', dur: 50, status: 'done' },
    { time: '10:30', pid: 'p3', type: 'פגישת מעקב', dur: 50, status: 'now' },
    { time: '13:00', pid: 'p2', type: 'פגישה שבועית', dur: 50, status: 'upcoming' },
    { time: '16:00', pid: 'p5', type: 'פגישת מעקב', dur: 50, status: 'upcoming' },
  ];
  const stMeta = (st: string) => st === 'done'
    ? { label: 'הסתיימה', dot: 'var(--success)' }
    : st === 'now'
      ? { label: 'עכשיו', dot: 'var(--primary)' }
      : { label: 'מתוכננת', dot: 'var(--toggle-off)' };

  const todayKey = dayKey(new Date());
  const allAppts = mergeAppointments(APPTS, S.scheduledAppts || [])
    .filter((a: any) => !a.date || a.date === todayKey)
    .sort((a: any, b: any) => toMin(a.time) - toMin(b.time));
  const todayAppts = allAppts.map((a: any) => {
    const p = getPatient(S.patients, a.pid);
    const av = avatarColors(patientAvatarColor(p.id));
    const sm = stMeta(a.status);
    return {
      id: a.id,
      time: a.time,
      endTime: addMin(a.time, a.dur),
      name: p.name,
      initials: patientInitials(p.name),
      avBg: av.bg,
      avColor: av.color,
      type: a.type || 'פגישה',
      stLabel: sm.label,
      lineColor: sm.dot,
      isNow: a.status === 'now',
      onOpen: () => navigate('patient', { patientId: p.id }),
      onUpload: (e: any) => {
        if (e) e.stopPropagation();
        set({ patientId: p.id, route: 'upload', upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
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

  const nextAppt = allAppts.find((a: any) => a.status !== 'done');
  const nextPatient = nextAppt ? getPatient(S.patients, nextAppt.pid) : null;

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
        {dashToday.map((a: any) => (
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
            {a.showUpload && (
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
            onClick={() => navigate('report', { patientId: nextAppt.pid })}
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
