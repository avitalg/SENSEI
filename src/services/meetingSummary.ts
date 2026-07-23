// Per-meeting session summary — request + poll against senseiapi.
import { apiRequest, isApiConfigured } from './apiClient';

export type MeetingSummaryStatus = 'pending' | 'running' | 'ready' | 'failed';

/** The risk block, already split by the backend. Every part is optional. */
export interface StructuredRiskFlags {
  level?: string | null
  note?: string | null
  attention?: string | null
  disclaimer?: string | null
}

/**
 * The rendered summary split by heading (senseiapi `SummaryResponse.summary`).
 * When present it is authoritative — the client renders these sections instead
 * of re-parsing the flat `text`. Absent sections stay empty/null.
 */
export interface StructuredSummary {
  title?: string | null
  subtitle?: string | null
  insights?: string | null
  session_summary?: string | null
  session_main_topics?: string[] | null
  session_risk_flags?: StructuredRiskFlags | null
  therapist_interventions?: string[] | null
  follow_up?: string[] | null
}

export interface MeetingSummary {
  meeting_id: string
  status: MeetingSummaryStatus
  text?: string | null
  model?: string | null
  error?: string | null
  /** Section-split view of `text`; null when the backend could not split it. */
  summary?: StructuredSummary | null
}

const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;

function pathFor(meetingId: string): string {
  return '/meetings/' + encodeURIComponent(meetingId) + '/summary';
}

export async function fetchMeetingSummary(
  meetingId: string,
  signal?: AbortSignal,
): Promise<MeetingSummary> {
  return apiRequest<MeetingSummary>(pathFor(meetingId), {
    method: 'GET',
    signal,
    timeoutMs: 30000,
  });
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function pollUntilSettled(
  meetingId: string,
  summary: MeetingSummary,
  opts: { signal?: AbortSignal; onUpdate?: (s: MeetingSummary) => void },
): Promise<MeetingSummary> {
  opts.onUpdate?.(summary);
  const started = Date.now();
  let current = summary;
  while (current.status === 'pending' || current.status === 'running') {
    if (Date.now() - started > MAX_WAIT_MS) {
      throw Object.assign(new Error('Summary generation timed out'), { code: 'TIMEOUT' });
    }
    await wait(POLL_MS, opts.signal);
    current = await fetchMeetingSummary(meetingId, opts.signal);
    opts.onUpdate?.(current);
  }
  return current;
}

/**
 * Poll GET /meetings/{id}/summary until it settles. The backend contract is
 * read-only: the summary row is created by the audio-upload pipeline and there
 * is no POST/regenerate route, so 404 means "no summary exists for this
 * meeting" (surfaced as a coded, user-readable failure — not retried blindly).
 */
export async function pollMeetingSummary(
  meetingId: string,
  opts: { signal?: AbortSignal; onUpdate?: (s: MeetingSummary) => void } = {},
): Promise<MeetingSummary> {
  if (!isApiConfigured()) {
    throw Object.assign(new Error('API not configured'), { code: 'NO_API' });
  }

  let summary: MeetingSummary;
  try {
    summary = await fetchMeetingSummary(meetingId, opts.signal);
  } catch (e: any) {
    if (e?.status === 404) {
      throw Object.assign(
        new Error('אין עדיין סיכום לפגישה זו · העלו הקלטה כדי ליצור אחד'),
        { code: 'NOT_FOUND', status: 404 },
      );
    }
    throw e;
  }

  return pollUntilSettled(meetingId, summary, opts);
}

export async function deleteMeetingSummary(
  meetingId: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!isApiConfigured() || !meetingId) return;
  try {
    await apiRequest<void>(pathFor(meetingId), {
      method: 'DELETE',
      signal,
      timeoutMs: 30000,
    });
  } catch (e: any) {
    if (e?.status === 404) return;
    throw e;
  }
}
