// Newest past meeting for a patient. Lets `#/summary/<pid>` — a link that names
// no meeting, which is what most in-app navigations produce — resolve to that
// patient's latest meeting instead of falling back to demo copy. Shares
// queryKeys.patientPast with usePatientMeetingHistory, so arriving from the
// patient screen hits cache rather than refetching.
import { useQuery } from '@tanstack/react-query';
import {
  dbEventApiId,
  loadPatientPastEvents,
  resolveCalendarEventApiId,
} from '../services/calendar';
import { queryKeys } from '../query/keys';

export function useLatestMeetingId(
  patientId: string,
  patientName: string,
  enabled: boolean,
): { meetingId: string; loading: boolean } {
  const query = useQuery({
    queryKey: queryKeys.patientPast(patientId),
    queryFn: ({ signal }) => loadPatientPastEvents({ patientId, patientName, signal }),
    enabled: enabled && !!patientId,
  });
  // The service sorts newest-first (calendar.ts:548), so [0] is the latest.
  const newest = query.data?.[0];
  const meetingId = newest ? (resolveCalendarEventApiId(newest.id) || dbEventApiId(newest.id)) : '';
  return { meetingId, loading: enabled && query.isLoading };
}
