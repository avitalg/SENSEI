// Resolves a patient's next-meeting prep-report content: the live senseiapi
// report (polled) when VITE_API_BASE_URL is set, falling back to the shared demo
// copy otherwise — the same resolution the desktop ReportPage does, exposed as a
// hook so the mobile prep report shows live data too. Store data (patientId /
// name / demo fallbacks) is passed as args (leaf-layering rule).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isApiConfigured } from '../services/apiClient';
import {
  pollNextMeetingReport,
  regenerateNextMeetingReport,
  type NextMeetingReport,
} from '../services/nextMeetingReport';
import { reportIntro, REPORT_CHANGES, REPORT_OPEN, REPORT_QUESTIONS } from '../data/reportContent';
import { parseSummaryContent, summaryPreviewText } from '../services/summaryDisplay';

export interface ResolvedReport {
  live: boolean          // showing API-generated content (vs demo copy)
  loading: boolean
  regenerating: boolean
  canRegenerate: boolean // API configured + patient id present
  error: string
  intro: string
  changes: string[]
  openTopics: string[]
  questions: string[]    // suggested opening questions — demo-only (empty when live)
  summary: string
  insight: string
  model: string | null   // synthesizer model name when live + ready
  regenerate: () => Promise<'ok' | 'failed' | 'unavailable' | 'noop'>
}

function formatExcerpt(raw: string | null | undefined): string {
  if (!raw || !String(raw).trim()) return '';
  return parseSummaryContent(raw)?.displayText || summaryPreviewText(raw, 600) || String(raw).trim();
}

export function useNextMeetingReport(
  patientId: string,
  patientName: string,
  demoSummary: string,
  demoInsight: string,
  meetingId?: string,
): ResolvedReport {
  const useApi = isApiConfigured();
  const [report, setReport] = useState<NextMeetingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const regenAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!useApi || !patientId) {
      setReport(null);
      setError('');
      setLoading(false);
      return undefined;
    }
    const ac = new AbortController();
    setLoading(true);
    setError('');
    setReport(null);
    pollNextMeetingReport(patientId, { signal: ac.signal, onUpdate: setReport, meetingId })
      .then((r) => {
        setReport(r);
        if (r.status === 'failed') setError(r.error || 'יצירת הדוח נכשלה');
      })
      .catch((e: any) => {
        if (e?.name === 'AbortError' || ac.signal.aborted) return;
        // Route absent on the deployed backend — quiet fallback to the local report.
        if (e?.code === 'NOT_AVAILABLE') return;
        setError(e?.details?.detail || e?.message || 'לא ניתן לטעון את דוח ההכנה');
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => {
      ac.abort();
      regenAbortRef.current?.abort();
    };
  }, [useApi, patientId, meetingId]);

  const regenerate = useCallback(async (): Promise<'ok' | 'failed' | 'unavailable' | 'noop'> => {
    if (!useApi || !patientId || regenerating) return 'noop';
    regenAbortRef.current?.abort();
    const ac = new AbortController();
    regenAbortRef.current = ac;
    setRegenerating(true);
    setError('');
    try {
      const r = await regenerateNextMeetingReport(patientId, {
        signal: ac.signal,
        onUpdate: setReport,
        meetingId,
      });
      if (ac.signal.aborted) return 'noop';
      setReport(r);
      if (r.status === 'failed') {
        setError(r.error || 'יצירת הדוח נכשלה');
        return 'failed';
      }
      return 'ok';
    } catch (e: any) {
      if (e?.name === 'AbortError' || ac.signal.aborted) return 'noop';
      if (e?.code === 'NOT_AVAILABLE') return 'unavailable';
      setError(
        (typeof e?.details?.detail === 'string' && e.details.detail)
        || e?.message
        || 'לא ניתן לרענן את הדוח',
      );
      return 'failed';
    } finally {
      if (!ac.signal.aborted) setRegenerating(false);
    }
  }, [useApi, patientId, meetingId, regenerating]);

  return useMemo(() => {
    const ready = useApi && report?.status === 'ready';
    const excerpt = useApi ? formatExcerpt(report?.last_summary_excerpt) : '';
    return {
      live: !!ready,
      loading: useApi && (loading || report?.status === 'pending' || report?.status === 'running'),
      regenerating,
      canRegenerate: useApi && !!patientId,
      error: useApi ? error : '',
      intro: ready ? (report?.intro || '') : reportIntro(patientName),
      changes: ready ? (report?.changes || []) : REPORT_CHANGES,
      openTopics: ready ? (report?.open_topics || []) : REPORT_OPEN,
      questions: ready ? [] : REPORT_QUESTIONS,
      summary: excerpt || demoSummary,
      insight: excerpt ? excerpt.slice(0, 280) : demoInsight,
      model: ready ? (report?.model || null) : null,
      regenerate,
    };
  }, [
    useApi, report, loading, regenerating, error, patientId, patientName,
    demoSummary, demoInsight, regenerate,
  ]);
}
