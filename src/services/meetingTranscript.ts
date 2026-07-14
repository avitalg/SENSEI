// Probe whether a meeting already has a stored transcript.
import { apiRequest, isApiConfigured } from './apiClient';

export interface MeetingTranscriptProbe {
  meeting_id: string
  transcript_id: string
  excerpt?: string | null
}

export async function fetchMeetingTranscript(
  meetingId: string,
  signal?: AbortSignal,
): Promise<MeetingTranscriptProbe | null> {
  if (!isApiConfigured() || !meetingId) return null;
  try {
    return await apiRequest<MeetingTranscriptProbe>(
      '/meetings/' + encodeURIComponent(meetingId) + '/transcript',
      { method: 'GET', signal, timeoutMs: 15000 },
    );
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}
