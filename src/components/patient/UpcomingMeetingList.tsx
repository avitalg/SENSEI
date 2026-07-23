import { dayKey, type CalendarUiEvent } from '../../services/calendar';
import { fmtTime } from '../../utils/dates';
import IconButton from '../shared/IconButton';

export const formatMeetingWhen = (start: Date) => {
  const todayKey = dayKey(new Date());
  const key = dayKey(start);
  const time = fmtTime(start);
  if (key === todayKey) return 'היום · ' + time;
  return new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: 'numeric', month: 'short' }).format(start) + ' · ' + time;
};

interface UpcomingMeetingListProps {
  meetings: CalendarUiEvent[]
  onSelect: (event: CalendarUiEvent) => void
  onDelete?: (event: CalendarUiEvent, e: React.MouseEvent) => void
  /** Record this specific meeting's session (spec: dedicated record icon per row). */
  onRecord?: (event: CalendarUiEvent) => void
  /** Whether scheduling is available (false for archived patients — no CTA then). */
  canSchedule?: boolean
}

export default function UpcomingMeetingList({ meetings, onSelect, onDelete, onRecord, canSchedule = true }: UpcomingMeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {canSchedule
          ? 'אין פגישות מתוכננות. קבעו פגישה (בכפתור ״קביעת פגישה״ למעלה) כדי לתזמן את המפגש הבא.'
          : 'אין פגישות מתוכננות.'}
      </div>
    );
  }

  return (
    <>
      {meetings.map((m) => {
        const start = new Date(m.start);
        const end = new Date(m.end);
        return (
          <div
            key={m.id}
            className="pd-upcoming-row"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line)' }}
          >
            <button
              type="button"
              onClick={() => onSelect(m)}
              aria-label={formatMeetingWhen(start)}
              style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit', textAlign: 'start', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1.1 }}>
                <span dir="ltr" style={{ fontSize: 13, fontWeight: 800 }}>{fmtTime(start)}</span>
                <span dir="ltr" style={{ fontSize: 10, opacity: 0.75 }}>{fmtTime(end)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{formatMeetingWhen(start)}</div>
                {m.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.description}</div>
                )}
              </div>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-muted)" style={{ flexShrink: 0 }}><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
            </button>
            {onRecord && (
              <IconButton
                size={30}
                onClick={(e) => { e.stopPropagation(); onRecord(m); }}
                ariaLabel={'הקלטה לפגישה · ' + formatMeetingWhen(start)}
                className="pd-record-btn"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--primary)"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A.998.998 0 0 0 5.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z" /></svg>
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size={30}
                onClick={(e) => { e.stopPropagation(); onDelete(m, e); }}
                ariaLabel="מחיקת פגישה"
                className="pat-del-btn"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--error)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
              </IconButton>
            )}
          </div>
        );
      })}
    </>
  );
}
