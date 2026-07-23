// Mobile patient profile (design: "Sensei Mobile · Patient"). Avatar, contact,
// next meeting, and the SAME clinical-workspace tabs as the desktop file
// (פגישות · סקירה · הערות · מסמכים) plus the recap playback — desktop parity
// per the spec's mobile section. Uses the SAME upcoming-meetings hook as the
// desktop PatientPage (usePatientUpcomingMeetings → senseiapi `/calendar` when
// configured, local scheduled appts otherwise), so it's not demo-only.
import { useEffect, useState } from 'react';
import { useApp } from '../../store/AppStore';
import { avatarColors } from '../../utils';
import { patientInitials, patientAvatarColor, displayPatientEmail } from '../../services/patients';
import { formatMeetingWhen } from '../patient/UpcomingMeetingList';
import { usePatientUpcomingMeetings } from '../patient/usePatientUpcomingMeetings';
import { sessionDates, sessionSummaries } from '../../data/sessions';
import { demoSessionCount } from '../../utils/patientSessions';
import { patientOverviewBase, OVERVIEW_FIELDS, type PatientOverview } from '../../data/patientOverview';
import { deriveNotes, type NoteEntry } from '../../utils/therapistNotes';
import { isApiConfigured } from '../../services/apiClient';
import { useTts } from '../../hooks/useTts';
import WorkspaceTabs from '../shared/WorkspaceTabs';
import PatientDocuments from '../patient/PatientDocuments';
import { ChevronStartIcon } from './icons';

const RECENT_COUNT = 4;

type Tab = 'sessions' | 'overview' | 'notes' | 'documents';

export default function MobilePatient() {
  const { S, navigate, set } = useApp();
  const { cp, upcomingMeetings } = usePatientUpcomingMeetings();
  const av = avatarColors(patientAvatarColor(cp.id));
  const useApi = isApiConfigured();

  const next = upcomingMeetings[0];
  const nextLabel = next ? formatMeetingWhen(new Date(next.start)) : 'טרם נקבעה';

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

  // Clinical-workspace tabs — the same set and order as the desktop file.
  const [tab, setTab] = useState<Tab>('sessions');

  // Recap playback (השמעת תקציר) — the general patient summary, same source and
  // wording as the desktop hero (patientOverviewBase → repo רקע קליני).
  const tts = useTts();
  const patientRecap = patientOverviewBase(cp.id, useApi).summary || summaries[0] || '';
  const [playingRecap, setPlayingRecap] = useState(false);
  useEffect(() => { if (!tts.speaking) setPlayingRecap(false); }, [tts.speaking]);
  const playRecap = () => {
    if (playingRecap) { tts.stop(); setPlayingRecap(false); return; }
    if (!patientRecap) return;
    tts.speak(cp.name + '. סיכום כללי: ' + patientRecap);
    setPlayingRecap(true);
  };

  const overview: PatientOverview = { ...patientOverviewBase(cp.id, useApi), ...((S.overviewOverrides || {})[cp.id] || {}) };
  const noteEntries: NoteEntry[] = deriveNotes(S.therapistNotes, S.notesOverrides, cp.id);
  const fmtNoteDate = (at: string | null) =>
    at ? new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(at)) : 'הערה קודמת';

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
          {/* השמעת תקציר · desktop-parity recap playback (spec, mobile patient file) */}
          {tts.supported && patientRecap && (
            <button
              type="button"
              className="tap44"
              onClick={playRecap}
              aria-label={playingRecap ? 'עצירת ההשמעה' : 'השמעת תקציר המטופל'}
              aria-pressed={playingRecap}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, height: 36, padding: '0 14px', border: '1px solid ' + (playingRecap ? 'var(--primary)' : 'var(--border-input)'), borderRadius: 18, background: playingRecap ? 'var(--primary-tint)' : 'var(--paper)', color: playingRecap ? 'var(--primary)' : 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                {playingRecap ? <path d="M6 6h4v12H6zm8 0h4v12h-4z" /> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />}
              </svg>
              {playingRecap ? 'עצירה' : 'השמעת תקציר'}
            </button>
          )}
        </div>

        <div className="mob-card" style={{ background: 'var(--primary-tint)', border: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>הפגישה הבאה</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{nextLabel}</div>
          </div>
        </div>

        {/* Unified capture (spec): one action opens the tabbed הוספת מפגש dialog
            (record / upload) with this patient fixed. */}
        <button type="button" onClick={() => set({ recordOpen: true, recordPid: cp.id })} aria-label="הוספת מפגש" style={{ width: '100%', height: 48, border: 'none', borderRadius: 12, background: 'var(--primary)', color: 'var(--on-accent)', fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A.998.998 0 0 0 5.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z" /></svg>הוספת מפגש
        </button>

        {/* Clinical-workspace tabs — desktop-parity set (spec, mobile patient file). */}
        <WorkspaceTabs<Tab>
          ariaLabel="אזורי העבודה בתיק"
          active={tab}
          onSelect={setTab}
          tabs={[
            { key: 'sessions', label: 'פגישות', count: total },
            { key: 'overview', label: 'סקירה' },
            { key: 'notes', label: 'הערות', count: noteEntries.length },
            { key: 'documents', label: 'מסמכים' },
          ]}
        />

        {tab === 'sessions' && (
          <>
            {/* Recent sessions cap at RECENT_COUNT — the full-history link keeps older
                sessions reachable on mobile too (desktop parity; no dead end). */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '6px 2px 2px' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>פגישות אחרונות</span>
              <button type="button" className="tap44" onClick={() => navigate('meetingHistory', { patientId: cp.id })} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                כל הפגישות ({total}) ›
              </button>
            </div>
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
          </>
        )}

        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {OVERVIEW_FIELDS.map((f) => (
              <div key={f.key} className="mob-card" style={{ margin: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBlockEnd: 4 }}>{f.label}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)' }}>{overview[f.key] || '—'}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'notes' && (
          noteEntries.length === 0 ? (
            <p style={{ margin: '6px 2px', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>אין עדיין הערות. הוסיפו הערות בין פגישות מתצוגת המחשב.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {noteEntries.map((n) => (
                <div key={n.id} className="mob-card" style={{ margin: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBlockEnd: 4 }}>{fmtNoteDate(n.at)}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{n.text}</div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'documents' && <PatientDocuments patientId={cp.id} />}
      </div>
    </div>
  );
}
