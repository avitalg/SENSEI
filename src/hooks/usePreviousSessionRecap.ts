// Previous-session recap for meeting dialogs / hero chips.
// Offline: seeded sessionSummaries. Live API: latest ready meeting summary
// for the patient (empty string when none — caller should hide the block).
import { useQuery } from '@tanstack/react-query';
import { isApiConfigured } from '../services/apiClient';
import {
  dbEventApiId,
  loadPatientPastEvents,
  resolveCalendarEventApiId,
} from '../services/calendar';
import { fetchMeetingSummary } from '../services/meetingSummary';
import { parseSummaryContent, summaryPreviewText } from '../services/summaryDisplay';
import { sessionSummaries } from '../data/sessions';
import { queryKeys } from '../query/keys';

async function loadLatestReadySummaryText(
  patientId: string,
  patientName: string,
  signal?: AbortSignal,
): Promise<string> {
  const events = await loadPatientPastEvents({
    patientId,
    patientName,
    signal,
  });
  for (const event of events.slice(0, 8)) {
    const meetingId = resolveCalendarEventApiId(event.id) || dbEventApiId(event.id);
    if (!meetingId) continue;
    try {
      const s = await fetchMeetingSummary(meetingId, signal);
      if (s.status === 'ready' && s.text) {
        const raw = String(s.text);
        return parseSummaryContent(raw)?.displayText || summaryPreviewText(raw, 400);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
    }
  }
  return '';
}

/** Hebrew prose for "מהפגישה הקודמת", or '' when live mode has no ready summary. */
export function usePreviousSessionRecap(
  patientId: string | null | undefined,
  patientName = '',
  enabled = true,
): string {
  const useApi = isApiConfigured();
  const pid = patientId || '';

  const query = useQuery({
    queryKey: [...queryKeys.patientPast(pid), 'previous-recap'],
    queryFn: ({ signal }) => loadLatestReadySummaryText(pid, patientName, signal),
    enabled: enabled && useApi && !!pid,
    staleTime: 60_000,
    retry: false,
  });

  if (!pid) return '';
  if (!useApi) return sessionSummaries({ id: pid })[0] || '';
  return query.data || '';
}
