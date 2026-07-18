// Next-meeting prep report — request + poll against senseiapi.
import { apiRequest, isApiConfigured } from './apiClient';

export type NextMeetingReportStatus = 'pending' | 'running' | 'ready' | 'failed';

export interface NextMeetingReport {
  patient_id: string
  status: NextMeetingReportStatus
  intro?: string | null
  changes?: string[] | null
  open_topics?: string[] | null
  source_meeting_ids?: string[] | null
  last_summary_excerpt?: string | null
  generated_at?: string | null
  model?: string | null
  error?: string | null
}

const POLL_MS = 1500;
const MAX_WAIT_MS = 5 * 60 * 1000;

function pathFor(patientId: string): string {
  return '/patients/' + encodeURIComponent(patientId) + '/next-meeting-report';
}

export async function requestNextMeetingReport(
  patientId: string,
  signal?: AbortSignal,
): Promise<NextMeetingReport> {
  return apiRequest<NextMeetingReport>(pathFor(patientId), {
    method: 'POST',
    signal,
    timeoutMs: 30000,
  });
}

export async function fetchNextMeetingReport(
  patientId: string,
  signal?: AbortSignal,
): Promise<NextMeetingReport> {
  return apiRequest<NextMeetingReport>(pathFor(patientId), {
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
  patientId: string,
  report: NextMeetingReport,
  opts: { signal?: AbortSignal; onUpdate?: (report: NextMeetingReport) => void },
): Promise<NextMeetingReport> {
  opts.onUpdate?.(report);
  const started = Date.now();
  let current = report;
  while (current.status === 'pending' || current.status === 'running') {
    if (Date.now() - started > MAX_WAIT_MS) {
      throw Object.assign(new Error('Report generation timed out'), { code: 'TIMEOUT' });
    }
    await wait(POLL_MS, opts.signal);
    current = await fetchNextMeetingReport(patientId, opts.signal);
    opts.onUpdate?.(current);
  }
  return current;
}

/**
 * Prefer an existing report (GET). Only POST when none exists yet, then poll
 * until ready/failed — avoids wiping a ready report by re-POSTing from ReportPage.
 */
export async function pollNextMeetingReport(
  patientId: string,
  opts: { signal?: AbortSignal; onUpdate?: (report: NextMeetingReport) => void } = {},
): Promise<NextMeetingReport> {
  if (!isApiConfigured()) {
    throw Object.assign(new Error('API not configured'), { code: 'NO_API' });
  }

  let report: NextMeetingReport | null = null;
  try {
    report = await fetchNextMeetingReport(patientId, opts.signal);
  } catch (e: any) {
    if (e?.status !== 404) throw e;
  }

  if (!report) {
    try {
      report = await requestNextMeetingReport(patientId, opts.signal);
    } catch (e: any) {
      // GET 404'd AND POST 404/405'd: the route itself is absent — the deployed
      // senseiapi does not implement next-meeting reports yet (documented
      // backend blocker in docs/INTEGRATION.md). Callers fall back to the
      // local deterministic report instead of surfacing an error.
      if (e?.status === 404 || e?.status === 405) {
        throw Object.assign(new Error('next-meeting report endpoint not available'), {
          code: 'NOT_AVAILABLE', status: e.status,
        });
      }
      throw e;
    }
  }

  return pollUntilSettled(patientId, report, opts);
}

/**
 * Force a fresh report: POST (wipes the current row to pending and regenerates),
 * then poll until ready/failed. Unlike pollNextMeetingReport, this always POSTs.
 */
export async function regenerateNextMeetingReport(
  patientId: string,
  opts: { signal?: AbortSignal; onUpdate?: (report: NextMeetingReport) => void } = {},
): Promise<NextMeetingReport> {
  if (!isApiConfigured()) {
    throw Object.assign(new Error('API not configured'), { code: 'NO_API' });
  }
  let started: NextMeetingReport;
  try {
    started = await requestNextMeetingReport(patientId, opts.signal);
  } catch (e: any) {
    if (e?.status === 404 || e?.status === 405) {
      throw Object.assign(new Error('next-meeting report endpoint not available'), {
        code: 'NOT_AVAILABLE', status: e.status,
      });
    }
    throw e;
  }
  return pollUntilSettled(patientId, started, opts);
}
