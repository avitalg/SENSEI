// Daily meeting report — request + poll + server speech against senseiapi.
import { API_BASE_URL, apiRequest, isApiConfigured, type ApiError } from './apiClient';
import { getApiAccessToken } from './apiAuth';

export type DailyMeetingReportStatus = 'pending' | 'running' | 'ready' | 'failed';

export interface DailyMeetingReport {
  id: string
  report_date: string
  time_zone: string
  status: DailyMeetingReportStatus
  meeting_limit: number
  meeting_count: number
  text?: string | null
  model?: string | null
  generated_at?: string | null
  error?: string | null
}

export interface DailyMeetingReportSpeech {
  blob: Blob
  mediaType: string
}

export interface RequestDailyMeetingReportOpts {
  reportDate?: string
  timeZone?: string
  meetingLimit?: number
  refresh?: boolean
  signal?: AbortSignal
}

const POLL_MS = 1500;
const MAX_WAIT_MS = 5 * 60 * 1000;
const DEFAULT_TIME_ZONE = 'Asia/Jerusalem';
const DEFAULT_MEETING_LIMIT = 4;

function apiError(message: string, extra: Partial<ApiError> = {}): ApiError {
  return Object.assign(new Error(message), extra) as ApiError;
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

export async function requestDailyMeetingReport(
  opts: RequestDailyMeetingReportOpts = {},
): Promise<DailyMeetingReport> {
  return apiRequest<DailyMeetingReport>('/daily-meeting-reports', {
    method: 'POST',
    signal: opts.signal,
    timeoutMs: 30000,
    query: {
      report_date: opts.reportDate,
      time_zone: opts.timeZone ?? DEFAULT_TIME_ZONE,
      meeting_limit: opts.meetingLimit ?? DEFAULT_MEETING_LIMIT,
      refresh: opts.refresh,
    },
  });
}

export async function fetchDailyMeetingReport(
  reportId: string,
  signal?: AbortSignal,
): Promise<DailyMeetingReport> {
  return apiRequest<DailyMeetingReport>(
    '/daily-meeting-reports/' + encodeURIComponent(reportId),
    { method: 'GET', signal, timeoutMs: 30000 },
  );
}

async function pollUntilSettled(
  report: DailyMeetingReport,
  opts: {
    signal?: AbortSignal
    onUpdate?: (report: DailyMeetingReport) => void
  },
): Promise<DailyMeetingReport> {
  opts.onUpdate?.(report);
  const started = Date.now();
  let current = report;
  while (current.status === 'pending' || current.status === 'running') {
    if (Date.now() - started > MAX_WAIT_MS) {
      throw apiError('Daily report generation timed out', { code: 'TIMEOUT' });
    }
    await wait(POLL_MS, opts.signal);
    current = await fetchDailyMeetingReport(current.id, opts.signal);
    opts.onUpdate?.(current);
  }
  return current;
}

/**
 * POST to start (or reuse) today's report, then poll GET until ready/failed.
 * 404/405 on POST → NOT_AVAILABLE (quiet local fallback).
 */
export async function pollDailyMeetingReport(
  opts: {
    reportDate?: string
    timeZone?: string
    meetingLimit?: number
    refresh?: boolean
    signal?: AbortSignal
    onUpdate?: (report: DailyMeetingReport) => void
  } = {},
): Promise<DailyMeetingReport> {
  if (!isApiConfigured()) {
    throw apiError('API not configured', { code: 'NO_API' });
  }

  let report: DailyMeetingReport;
  try {
    report = await requestDailyMeetingReport({
      reportDate: opts.reportDate,
      timeZone: opts.timeZone,
      meetingLimit: opts.meetingLimit,
      refresh: opts.refresh,
      signal: opts.signal,
    });
  } catch (e: any) {
    if (e?.status === 404 || e?.status === 405) {
      throw apiError('daily meeting report endpoint not available', {
        code: 'NOT_AVAILABLE',
        status: e.status,
      });
    }
    throw e;
  }

  return pollUntilSettled(report, opts);
}

/**
 * Fetch server-synthesized audio for a ready report.
 * Binary response — not via apiRequest (which always parses JSON).
 */
export async function fetchDailyMeetingReportSpeech(
  reportId: string,
  opts: { speed?: number; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<DailyMeetingReportSpeech> {
  if (!isApiConfigured()) {
    throw apiError('API not configured', { code: 'NO_API' });
  }

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60000);

  const qs = opts.speed != null ? '?speed=' + encodeURIComponent(String(opts.speed)) : '';
  const url = `${API_BASE_URL}/daily-meeting-reports/${encodeURIComponent(reportId)}/speech${qs}`;
  const token = getApiAccessToken();
  const headers: Record<string, string> = { Accept: 'audio/*,*/*' };
  if (token) headers.Authorization = 'Bearer ' + token;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (e: any) {
    if (controller.signal.aborted && !(opts.signal && opts.signal.aborted)) {
      throw apiError('Request timed out', { code: 'TIMEOUT' });
    }
    throw apiError(e?.message || 'Network error', { code: 'NETWORK' });
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', onExternalAbort);
  }

  if (!res.ok) {
    let details: unknown;
    try { details = await res.json(); } catch { /* non-JSON */ }
    if (res.status === 409) {
      throw apiError('daily meeting report speech not ready', {
        code: 'NOT_READY', status: 409, details,
      });
    }
    if (res.status === 503) {
      throw apiError('text-to-speech is not available', {
        code: 'TTS_UNAVAILABLE', status: 503, details,
      });
    }
    throw apiError('HTTP ' + res.status, {
      status: res.status, code: 'HTTP_' + res.status, details,
    });
  }

  const blob = await res.blob();
  const mediaType = res.headers.get('Content-Type') || blob.type || 'audio/mpeg';
  return { blob, mediaType };
}
