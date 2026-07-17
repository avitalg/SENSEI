// Next-meeting report launcher — pick a patient, then open the prep report.
import { useEffect, useState } from 'react';
import { useApp } from '../store/AppStore';
import {
  localApptsToUiEvents,
  isUpcomingEvent,
  loadPatientUpcomingEvents,
} from '../services/calendar';
import { isApiConfigured } from '../services/apiClient';
import { formatMeetingWhen } from '../components/patient/UpcomingMeetingList';
import { CARD_SHADOW } from '../utils/styles';
import './nextMeetingReport.css';

function nextMeetingLabelFromLocal(
  scheduledAppts: Array<{ id?: string; pid: string; date?: string; time: string; dur?: number; description?: string }>,
  patientId: string,
  patientName: string,
): string {
  const now = new Date();
  const events = localApptsToUiEvents(scheduledAppts || [], patientId, patientName)
    .filter((e) => isUpcomingEvent(e, now))
    .sort((a, b) => +a.start - +b.start);
  const next = events[0];
  return next ? formatMeetingWhen(new Date(next.start)) : '';
}

export default function NextMeetingReportPage() {
  const { S, navigate, toast } = useApp();
  const defaultPid = S.patientId || S.patients[0]?.id || '';
  const [patientId, setPatientId] = useState(defaultPid);
  const [nextMeetingLabel, setNextMeetingLabel] = useState('');
  const [meetingsLoading, setMeetingsLoading] = useState(false);

  const selected = S.patients.find((p: any) => p.id === patientId) ?? S.patients[0];
  const selectedId = selected?.id || '';

  useEffect(() => {
    if (!selected) {
      setNextMeetingLabel('');
      setMeetingsLoading(false);
      return undefined;
    }

    if (!isApiConfigured()) {
      setMeetingsLoading(false);
      setNextMeetingLabel(nextMeetingLabelFromLocal(S.scheduledAppts || [], selected.id, selected.name));
      return undefined;
    }

    const ac = new AbortController();
    setMeetingsLoading(true);
    loadPatientUpcomingEvents({
      patientId: selected.id,
      patientName: selected.name,
      scheduledAppts: S.scheduledAppts || [],
      signal: ac.signal,
      resolvePatientName: (id) => S.patients.find((p: any) => p.id === id)?.name,
    })
      .then((events) => {
        const next = events[0];
        setNextMeetingLabel(next ? formatMeetingWhen(new Date(next.start)) : '');
        setMeetingsLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setNextMeetingLabel(nextMeetingLabelFromLocal(S.scheduledAppts || [], selected.id, selected.name));
        setMeetingsLoading(false);
      });

    return () => { ac.abort(); };
  }, [selected, selectedId, S.scheduledAppts, S.patients, S.calendarRefreshNonce]);

  const openReport = () => {
    if (!selectedId) {
      toast('יש לבחור מטופל', 'error');
      return;
    }
    navigate('report', { patientId: selectedId });
  };

  const empty = S.patients.length === 0 || S.demoEmpty;
  const noMeetingFallback = 'אין פגישה מתוכננת · הדוח יתבסס על הפגישה האחרונה';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>דוח לפגישה הבאה</h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 15 }}>
        בחרו מטופל ויצרו דוח הכנה אוטומטי לפגישה הקרובה · סיכום, נושאים פתוחים ותובנות מהפגישה האחרונה.
      </p>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
        {empty ? (
          <div style={{ textAlign: 'center', padding: '28px 12px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>אין מטופלים פעילים</h2>
            <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 14.5 }}>הוסיפו מטופל כדי ליצור דוח הכנה.</p>
            <button
              type="button"
              onClick={() => navigate('patients')}
              className="nmr-primary-btn"
              style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}
            >
              מעבר למטופלים
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="nmr-patient" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>מטופל</label>
              <select
                id="nmr-patient"
                aria-label="בחירת מטופל לדוח"
                value={selectedId}
                onChange={(e) => setPatientId(e.target.value)}
                style={{ width: '100%', height: 44, border: '1px solid var(--border-input)', borderRadius: 10, padding: '0 12px', fontSize: 14.5, background: 'var(--paper)', outline: 'none', cursor: 'pointer', color: 'var(--text)' }}
              >
                {S.patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selected && (
              <div style={{ marginBottom: 22, padding: '12px 14px', borderRadius: 10, background: 'var(--primary-surface)', border: '1px solid var(--primary-border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>הפגישה הבאה</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: meetingsLoading ? 'var(--text-muted)' : 'var(--primary)' }}>
                  {meetingsLoading ? 'טוען פגישות…' : (nextMeetingLabel || noMeetingFallback)}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={openReport}
              disabled={!selectedId}
              aria-label="יצירת דוח הכנה"
              className="nmr-primary-btn"
              style={{
                width: '100%', height: 46, border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--paper)',
                fontSize: 15, fontWeight: 700, cursor: selectedId ? 'pointer' : 'default', opacity: selectedId ? 1 : 0.55,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>
              יצירת דוח
            </button>
          </>
        )}
      </div>
    </div>
  );
}
