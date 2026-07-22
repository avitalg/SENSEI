// In-browser session recording — a thin MediaRecorder wrapper for the
// "הקלטה" flow. Produces a .webm audio File that is handed to the existing
// upload pipeline (services/recordingHandoff → UploadPage), so a recorded
// session goes through the same validation, patient wiring, and processing as
// an uploaded file. Gracefully unsupported (supported=false) where the APIs are
// absent (older browsers, jsdom) — callers hide the entry points then.
//
// Lifecycle: idle → recording ⇄ paused → (stop) → review → (submit consumes
// `file`, or `discard` returns to idle to re-record). `error` on mic denial.
import { useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'paused' | 'review' | 'error';

const pad = (n: number) => String(n).padStart(2, '0');

export function recorderSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as any).MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia;
}

export function useSessionRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startingRef = useRef(false);
  const startedAtRef = useRef(0);
  // Accumulated paused time + when the current pause began, so `elapsed` counts
  // only the actively-recorded wall-clock and stays frozen while paused.
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);
  const supported = recorderSupported();

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const releaseStream = () => { recRef.current?.stream?.getTracks().forEach((t) => t.stop()); };
  const revokeUrl = () => { if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; } };
  const tick = () => setElapsed(Math.floor((Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000));
  const runTimer = () => { clearTimer(); timerRef.current = setInterval(tick, 1000); };

  useEffect(() => () => { clearTimer(); revokeUrl(); try { releaseStream(); } catch { /* unmount cleanup */ } }, []);

  const start = async () => {
    // startingRef guards the async getUserMedia window: a double-click before the
    // permission resolves would otherwise open two streams and leak the first.
    if (!supported || state === 'recording' || state === 'paused' || startingRef.current) return;
    startingRef.current = true;
    setError('');
    revokeUrl();
    setFile(null);
    setFileUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.start();
      recRef.current = rec;
      setElapsed(0);
      // Wall-clock elapsed (not a tick counter): stays accurate through
      // background-tab timer throttling and never drifts on long recordings.
      startedAtRef.current = Date.now();
      pausedTotalRef.current = 0;
      pausedAtRef.current = 0;
      runTimer();
      setState('recording');
    } catch {
      setError('אין גישה למיקרופון · בדקו את הרשאות הדפדפן ונסו שוב');
      setState('error');
    } finally {
      startingRef.current = false;
    }
  };

  /** Pause an in-progress recording (freezes the duration). */
  const pause = () => {
    const rec = recRef.current;
    if (!rec || rec.state !== 'recording') return;
    try { rec.pause(); } catch { /* pause unsupported → ignore */ return; }
    clearTimer();
    pausedAtRef.current = Date.now();
    setState('paused');
  };

  /** Resume a paused recording. */
  const resume = () => {
    const rec = recRef.current;
    if (!rec || rec.state !== 'paused') return;
    try { rec.resume(); } catch { /* resume unsupported → ignore */ return; }
    if (pausedAtRef.current) { pausedTotalRef.current += Date.now() - pausedAtRef.current; pausedAtRef.current = 0; }
    runTimer();
    setState('recording');
  };

  /** Stop and enter review: builds the audio File + a playback URL, or returns
   *  to idle if nothing was captured. */
  const stop = (): Promise<void> => new Promise((resolve) => {
    const rec = recRef.current;
    clearTimer();
    if (!rec || rec.state === 'inactive') { setState('idle'); resolve(); return; }
    rec.onstop = () => {
      releaseStream();
      recRef.current = null;
      if (!chunksRef.current.length) { setState('idle'); resolve(); return; }
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      const d = new Date();
      const name = `session-recording-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.webm`;
      revokeUrl();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setFile(new File([blob], name, { type: blob.type }));
      setFileUrl(url);
      setState('review');
      resolve();
    };
    rec.stop();
  });

  /** Discard the reviewed clip and return to idle so the user can re-record. */
  const discard = () => {
    revokeUrl();
    setFile(null);
    setFileUrl(null);
    setElapsed(0);
    setState('idle');
  };

  /** Fully reset — discard an in-progress or reviewed recording, no file kept. */
  const cancel = () => {
    const rec = recRef.current;
    clearTimer();
    if (rec && rec.state !== 'inactive') { rec.onstop = () => releaseStream(); rec.stop(); }
    else releaseStream();
    recRef.current = null;
    chunksRef.current = [];
    revokeUrl();
    setFile(null);
    setFileUrl(null);
    setElapsed(0);
    setState('idle');
  };

  const mm = Math.floor(elapsed / 60);
  const elapsedLabel = pad(mm) + ':' + pad(elapsed % 60);

  return { supported, state, elapsed, elapsedLabel, error, file, fileUrl, start, pause, resume, stop, discard, cancel };
}
