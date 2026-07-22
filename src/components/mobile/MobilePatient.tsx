// Mobile patient profile (design: "Sensei Mobile · Patient"). Avatar, contact,
// next meeting, and recent sessions. Uses the SAME upcoming-meetings hook as the
// desktop PatientPage (usePatientUpcomingMeetings → senseiapi `/calendar` when
// configured, local scheduled appts otherwise), so it's not demo-only.
import { useApp } from '../../store/AppStore';
import { avatarColors } from '../../utils';
import { patientInitials, patientAvatarColor, displayPatientEmail } from '../../services/patients';
import { formatMeetingWhen } from '../patient/UpcomingMeetingList';
import { usePatientUpcomingMeetings } from '../patient/usePatientUpcomingMeetings';
import { sessionDates, sessionSummaries } from '../../data/sessions';
import { demoSessionCount } from '../../utils/patientSessions';
import { useTts } from '../../hooks/useTts';
import { patientOverviewBase } from '../../data/patientOverview';
import { isApiConfigured } from '../../services/apiClient';
import { ChevronStartIcon } from './icons';

const RECENT_COUNT = 4;

export default function MobilePatient() {
  const { navigate, set } = useApp();
  const { cp, upcomingMeetings } = usePatientUpcomingMeetings();
  const av = avatarColors(patientAvatarColor(cp.id));

  const next = upcomingMeetings[0];
  const nextLabel = next ? formatMeetingWhen(new Date(next.start)) : 'טרם נקבעה';
  // Appointment-specific prep playback: the specific upcoming meeting's when +
  // the prep notes toward it + previous-session context (not a generic summary).
  const tts = useTts();
  const prepText = next
    ? 'הפגישה הבאה עם ' + cp.name + ', ' + nextLabel + '. הכנה לפגישה: '
      + (patientOverviewBase(cp.id, isApiConfigured()).prep || '')
      + (sessionSummaries(cp)[0] ? '. מהפגישה הקודמת: ' + sessionSummaries(cp)[0] : '')
    : '';

  const summaries = sessionSummaries(cp);
  // Use the canonical per-patient session count (same as SessionDetailPage /
  // buildPatientSessions), so the newest session number is real and tapping a
  // row navigates to a session that exists.
  const total = demoSessionCount(cp);
  const sessions = sessionDates(cp).slice(0, RECENT_COUNT).map((date, i) => ({
    num: total - i,
    date,
    summary: summaries[i % summaries.length],
  }));

  return (
    <div className="mob-screen">
      <div className="mob-screen-header">
        <button type="button" className="mob-back" aria-label="חזרה" onClick={() => navigate('patients')}>
          <ChevronStartIcon size={18} />
        </button>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--primary)' }}>תיק מטופל</h1>
      </div>

      <div className="mob-screen-body">
        <div style={{ textAlign: 'center', padding: '6px 0 8px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: av.bg, color: av.color, fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{patientInitials(cp.name)}</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--primary)' }}>{cp.name}</div>
          <div dir="ltr" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{cp.phone} · {displayPatientEmail(cp.email)}</div>
          {cp.address && <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{cp.address}</div>}
        </div>

        <div className="mob-card" style={{ background: 'var(--primary-tint)', border: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>הפגישה הבאה</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{nextLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {tts.supported && next && (
              <button type="button" onClick={() => tts.toggle(prepText)} aria-pressed={tts.speaking} aria-label={tts.speaking ? 'עצירת ההשמעה' : 'השמעת סיכום ההכנה לפגישה הקרובה'} style={{ width: 44, minHeight: 44, border: '1px solid var(--primary-border)', borderRadius: 11, background: 'var(--paper)', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {tts.speaking
                  ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6 6h4v12H6zm8 0h4v12h-4z" /></svg>
                  : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
              </button>
            )}
            <button type="button" onClick={() => navigate('report', { patientId: cp.id })} style={{ padding: '10px 14px', border: '1px solid var(--primary-border)', borderRadius: 11, background: 'var(--paper)', color: 'var(--primary)', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>דוח הכנה</button>
          </div>
        </div>

        {/* Create a session recording — record and upload are equally primary
            (spec: both options available wherever a session can be captured). */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => set({ recordOpen: true, recordPid: cp.id })} aria-label="הקלטת מפגש" style={{ flex: 1, height: 48, border: 'none', borderRadius: 12, background: 'var(--primary)', color: 'var(--on-accent)', fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A.998.998 0 0 0 5.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z" /></svg>הקלטת מפגש
          </button>
          <button type="button" onClick={() => navigate('upload', { patientId: cp.id, upload: { state: 'idle', progress: 0, fileName: '', error: '' } })} aria-label="העלאת הקלטה" style={{ flex: 1, height: 48, border: '1px solid var(--primary-border)', borderRadius: 12, background: 'var(--paper)', color: 'var(--primary)', fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>העלאת הקלטה
          </button>
        </div>

        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', margin: '6px 2px 2px' }}>פגישות אחרונות</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map((s) => (
            <button
              key={s.num}
              type="button"
              className="mob-sess-row"
              onClick={() => navigate('session', { patientId: cp.id, sessionNum: s.num })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span dir="ltr" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--primary)' }}>{s.date}</span>
                <span className="mob-badge">פגישה {s.num}</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', textAlign: 'start' }}>{s.summary}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
