// Daily "סיכום יומי" controller — prefetches today's senseiapi daily meeting
// report and speaks the Hebrew `text` via the Web Speech API. Falls back to a
// local agenda script when the API is off, not ready, or text is empty.
// Shared by desktop Dashboard and mobile day view.
import { useCallback, useEffect, useState } from 'react';
import { isApiConfigured } from '../services/apiClient';
import {
  pollDailyMeetingReport,
  type DailyMeetingReport,
  type DailyMeetingReportStatus,
} from '../services/dailyMeetingReport';
import { useTts } from './useTts';

export interface DailyMeetingReportController {
  loading: boolean
  status: DailyMeetingReportStatus | null
  reportId: string | null
  text: string | null
  error: string
  live: boolean
  playing: boolean
  /** True when the control can play (browser TTS available). */
  available: boolean
  toggle: (localFallbackText: string) => void
  stop: () => void
}

export function useDailyMeetingReport(): DailyMeetingReportController {
  const useApi = isApiConfigured();
  const tts = useTts();
  const [report, setReport] = useState<DailyMeetingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ttsOwned, setTtsOwned] = useState(false);

  const stop = useCallback(() => {
    if (ttsOwned) {
      tts.stop();
      setTtsOwned(false);
    }
  }, [tts, ttsOwned]);

  // Prefetch today's report when the live API is configured.
  useEffect(() => {
    if (!useApi) {
      setReport(null);
      setError('');
      setLoading(false);
      return undefined;
    }
    const ac = new AbortController();
    setLoading(true);
    setError('');
    setReport(null);
    pollDailyMeetingReport({ signal: ac.signal, onUpdate: setReport })
      .then((r) => {
        setReport(r);
        if (r.status === 'failed') setError(r.error || 'יצירת הסיכום היומי נכשלה');
      })
      .catch((e: any) => {
        if (e?.name === 'AbortError' || ac.signal.aborted) return;
        if (e?.code === 'NOT_AVAILABLE') return;
        setError(
          (typeof e?.details?.detail === 'string' && e.details.detail)
          || e?.message
          || 'לא ניתן לטעון את הסיכום היומי',
        );
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => { ac.abort(); };
  }, [useApi]);

  useEffect(() => {
    if (!tts.speaking) setTtsOwned(false);
  }, [tts.speaking]);

  const speak = useCallback((text: string) => {
    setTtsOwned(true);
    tts.speak(text);
  }, [tts]);

  const toggle = useCallback((localFallbackText: string) => {
    if (ttsOwned && tts.speaking) {
      stop();
      return;
    }

    const serverText = (useApi && report?.status === 'ready' && report.text?.trim())
      ? report.text.trim()
      : '';
    speak(serverText || localFallbackText);
  }, [report, speak, stop, tts.speaking, ttsOwned, useApi]);

  const live = !!(useApi && report?.status === 'ready' && report.id);
  const status = report?.status ?? null;

  return {
    loading: useApi && (loading || status === 'pending' || status === 'running'),
    status,
    reportId: report?.id ?? null,
    text: live ? (report?.text || null) : null,
    error: useApi ? error : '',
    live,
    playing: ttsOwned && tts.speaking,
    available: tts.supported,
    toggle,
    stop,
  };
}
