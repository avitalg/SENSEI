// Next-meeting report launcher — pick a patient, then open the prep report.
// Desktop: native <select>. Mobile: full-width trigger + bottom-sheet list
// (iOS native <select> popovers are thin/misaligned and hard to use).
import { useState } from 'react';
import { useApp } from '../store/AppStore';
import { formatMeetingWhen } from '../components/patient/UpcomingMeetingList';
import PatientSelect from '../components/patient/PatientSelect';
import { usePatientNextMeeting } from '../hooks/usePatientNextMeeting';
import { CARD_SHADOW } from '../utils/styles';
import './nextMeetingReport.css';

export default function NextMeetingReportPage() {
  const { S, navigate, toast } = useApp();
  const defaultPid = S.patientId || S.patients[0]?.id || '';
  const [patientId, setPatientId] = useState(defaultPid);

  const selected = S.patients.find((p: any) => p.id === patientId) ?? S.patients[0];
  const selectedId = selected?.id || '';
  const { nextMeetingStart, nextMeetingId, loading: meetingsLoading } = usePatientNextMeeting(
    selectedId,
    selected?.name || '',
    S.scheduledAppts || [],
    S.patients,
    S.calendarRefreshNonce,
  );

  const openReport = () => {
    if (!selectedId) {
      toast('יש לבחור מטופל', 'error');
      return;
    }
    navigate('report', {
      patientId: selectedId,
      reportMeetingId: nextMeetingId || null,
    });
  };

  const empty = S.patients.length === 0 || S.demoEmpty;
  const noMeetingFallback = 'אין פגישה מתוכננת · הדוח יתבסס על הפגישה האחרונה';

  return (
    <div className="nmr-page" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>דוח לפגישה הבאה</h1>
      <p className="nmr-lead" style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 15 }}>
        בחרו מטופל ויצרו דוח הכנה אוטומטי לפגישה הקרובה · סיכום, נושאים פתוחים ותובנות מהפגישה האחרונה.
      </p>

      <div className="nmr-card" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
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
              <span id="nmr-patient-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>מטופל</span>
              <PatientSelect
                id="nmr-patient"
                patients={S.patients}
                value={selectedId}
                onChange={setPatientId}
                ariaLabel="בחירת מטופל לדוח"
                labelledBy="nmr-patient-label"
                selectClassName="nmr-patient-select"
                dialogAriaLabel="בחירת מטופל לדוח"
              />
            </div>

            {selected && (
              <div className="nmr-next-chip" style={{ marginBottom: 22, padding: '12px 14px', borderRadius: 10, background: 'var(--primary-surface)', border: '1px solid var(--primary-border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>הפגישה הבאה</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: meetingsLoading ? 'var(--text-muted)' : 'var(--primary)' }}>
                  {meetingsLoading ? 'טוען פגישות…' : (nextMeetingStart ? formatMeetingWhen(nextMeetingStart) : noMeetingFallback)}
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
              יצירת דוח
            </button>
          </>
        )}
      </div>
    </div>
  );
}
