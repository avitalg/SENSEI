// Full upcoming meetings for one patient — all scheduled future sessions.
import { useApp } from '../store/AppStore';
import UpcomingMeetingList, { formatMeetingWhen } from '../components/patient/UpcomingMeetingList';
import Breadcrumb from '../components/shared/Breadcrumb';
import { usePatientUpcomingMeetings } from '../components/patient/usePatientUpcomingMeetings';
import { toCalEventDetail } from '../services/calendar';
import { CARD_SHADOW } from '../utils/styles';

export default function PatientUpcomingMeetingsPage() {
  const { S, set, navigate } = useApp();
  const { cp, meetingPatientId, upcomingMeetings, loading } = usePatientUpcomingMeetings();
  const goPatient = () => navigate('patient', { patientId: S.patientId });

  const openMeetingDetail = (event: Parameters<typeof toCalEventDetail>[0]) =>
    set({ dialog: 'calEvent', calEventDetail: toCalEventDetail(event, meetingPatientId) });
  const deleteMeeting = (event: Parameters<typeof toCalEventDetail>[0]) =>
    set({
      dialog: 'delMeeting',
      dialogMeetingId: event.id,
      dialogMeetingLabel: event.title + ' · ' + formatMeetingWhen(new Date(event.start)),
    });

  const onPatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = S.patients.find((x: any) => x.name === e.target.value);
    if (p) navigate('upcomingMeetings', { patientId: p.id });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Breadcrumb items={[{ label: cp.name, onClick: goPatient }, { label: 'פגישות קרובות' }]} />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 27, fontWeight: 900, letterSpacing: '-.6px' }}>פגישות קרובות</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{cp.name} · {upcomingMeetings.length} פגישות</p>
        </div>
        <select
          onChange={onPatientSelect}
          value={cp.name}
          aria-label="בחירת מטופל"
          className="app-select"
        >
          {S.patients.map((p: any) => <option key={p.id}>{p.name}</option>)}
        </select>
      </div>

      {S.loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 26 }}>
          <div className="skeleton" style={{ width: '35%', height: 14, borderRadius: 6, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '90%', height: 11, borderRadius: 6 }} />
        </div>
      )}

      {!S.loading && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '0 22px 18px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0' }} aria-hidden="true">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ width: '100%', height: 44, borderRadius: 9 }} />)}
            </div>
          ) : (
            <UpcomingMeetingList meetings={upcomingMeetings} onSelect={openMeetingDetail} onDelete={deleteMeeting} />
          )}
        </div>
      )}
    </div>
  );
}
