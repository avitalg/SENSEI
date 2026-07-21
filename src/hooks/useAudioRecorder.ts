// In-browser microphone recording → webm/ogg File for the audio upload pipeline.
import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'unsupported'
  | 'denied'
  | 'error';

export interface UseAudioRecorderResult {
  state: RecorderState
  error: string
  elapsedMs: number
  isActive: boolean
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => Promise<File>
  cancel: () => void
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function extensionForMime(mime: string): string {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopResolveRef = useRef<((file: File) => void) | null>(null);
  const stopRejectRef = useRef<((err: Error) => void) | null>(null);
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartedAtRef = useRef(0);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => {
    if (state !== 'recording') return undefined;
    const tick = () => {
      setElapsedMs(Date.now() - startedAtRef.current - pausedTotalRef.current);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [state]);

  const cancel = useCallback(() => {
    stopResolveRef.current = null;
    stopRejectRef.current = null;
    try {
      if (mediaRef.current && mediaRef.current.state !== 'inactive') {
        mediaRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    releaseStream();
    startedAtRef.current = 0;
    pausedTotalRef.current = 0;
    pauseStartedAtRef.current = 0;
    setElapsedMs(0);
    setState('idle');
    setError('');
  }, []);

  const start = useCallback(async () => {
    setError('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      setError('הדפדפן אינו תומך בהקלטה');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setState('unsupported');
      setError('הדפדפן אינו תומך בהקלטה');
      return;
    }
    const mime = pickMimeType();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setState('error');
        setError('ההקלטה נכשלה');
        releaseStream();
      };
      recorder.onstop = () => {
        const resolve = stopResolveRef.current;
        const reject = stopRejectRef.current;
        stopResolveRef.current = null;
        stopRejectRef.current = null;
        const type = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        releaseStream();
        startedAtRef.current = 0;
        pausedTotalRef.current = 0;
        pauseStartedAtRef.current = 0;
        setElapsedMs(0);
        if (!resolve) {
          setState('idle');
          return;
        }
        if (!blob.size) {
          setState('error');
          setError('לא נקלטה הקלטה');
          reject?.(new Error('לא נקלטה הקלטה'));
          return;
        }
        const file = new File(
          [blob],
          `recording-${Date.now()}.${extensionForMime(type)}`,
          { type },
        );
        setState('idle');
        resolve(file);
      };
      startedAtRef.current = Date.now();
      pausedTotalRef.current = 0;
      pauseStartedAtRef.current = 0;
      setElapsedMs(0);
      recorder.start(250);
      setState('recording');
    } catch (e: any) {
      releaseStream();
      const name = String(e?.name || '');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState('denied');
        setError('נדרשת הרשאת מיקרופון להקלטה');
      } else {
        setState('error');
        setError(e?.message || 'לא ניתן להתחיל הקלטה');
      }
    }
  }, []);

  const pause = useCallback(() => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    try {
      recorder.pause();
      pauseStartedAtRef.current = Date.now();
      setState('paused');
    } catch {
      /* ignore — some browsers lack pause */
    }
  }, []);

  const resume = useCallback(() => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    try {
      if (pauseStartedAtRef.current) {
        pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = 0;
      }
      recorder.resume();
      setState('recording');
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback((): Promise<File> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRef.current;
      if (!recorder || recorder.state === 'inactive') {
        reject(new Error('אין הקלטה פעילה'));
        return;
      }
      setState('stopping');
      stopResolveRef.current = resolve;
      stopRejectRef.current = reject;
      try {
        if (recorder.state === 'paused') recorder.resume();
        recorder.stop();
      } catch (e: any) {
        releaseStream();
        setState('error');
        reject(e instanceof Error ? e : new Error('עצירת ההקלטה נכשלה'));
      }
    });
  }, []);

  return {
    state,
    error,
    elapsedMs,
    isActive: state === 'recording' || state === 'paused' || state === 'stopping',
    start,
    pause,
    resume,
    stop,
    cancel,
  };
}

export function formatRecorderElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
