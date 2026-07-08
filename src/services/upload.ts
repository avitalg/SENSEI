// Upload pipeline — simulated processing when offline/API unavailable, real queue when offline.
import { isApiConfigured } from './apiClient';
import { enqueueUpload, listPendingUploads, removePendingUpload } from './uploadQueue';

export type UploadProgressFn = (progress: number) => void;

/** True when uploads use the simulated pipeline (no backend). */
export function usesMockUploadPipeline(): boolean {
  return !isApiConfigured();
}

/** Demo recording file — same idea as the drag-and-drop fallback sample. */
export function buildMockRecordingFile(): File {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new File(['mock-session-audio'], 'recording-' + ts + '.mp3', { type: 'audio/mpeg' });
}

export interface SubmitUploadOpts {
  patientId: string
  sessionDate?: string
  online: boolean
  onProgress: UploadProgressFn
  signal?: AbortSignal
}

export interface SubmitUploadResult {
  status: 'success' | 'queued'
  queueId?: string
}

function todayKey(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
}

/** Simulated staged upload + processing (demo / no API). */
export async function simulateUploadProgress(onProgress: UploadProgressFn, signal?: AbortSignal): Promise<void> {
  let p = 0;
  while (p < 100) {
    await wait(380, signal);
    p = Math.min(100, Math.round(p + Math.random() * 14 + 6));
    onProgress(p);
  }
}

async function uploadToApi(file: File, opts: SubmitUploadOpts): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  form.append('patient_id', opts.patientId);
  form.append('session_date', opts.sessionDate || todayKey());
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const res = await fetch(base + '/audio/upload', {
    method: 'POST',
    body: form,
    signal: opts.signal,
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  // Poll or stream progress if the API supports it; for now simulate after accept.
  await simulateUploadProgress(opts.onProgress, opts.signal);
}

export async function submitUpload(file: File, opts: SubmitUploadOpts): Promise<SubmitUploadResult> {
  if (!opts.online) {
    const queueId = await enqueueUpload({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      blob: file,
      patientId: opts.patientId,
      sessionDate: opts.sessionDate || todayKey(),
    });
    return { status: 'queued', queueId };
  }

  if (isApiConfigured()) {
    await uploadToApi(file, opts);
  } else {
    await simulateUploadProgress(opts.onProgress, opts.signal);
  }
  return { status: 'success' };
}

export async function drainUploadQueue(opts: {
  online: boolean
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}): Promise<number> {
  if (!opts.online) return 0;
  const pending = await listPendingUploads();
  let synced = 0;
  for (const item of pending) {
    if (opts.signal?.aborted) break;
    const file = new File([item.blob], item.fileName, { type: item.mimeType });
    const uploadOpts: SubmitUploadOpts = {
      patientId: item.patientId,
      sessionDate: item.sessionDate,
      online: true,
      onProgress: (p) => opts.onProgress?.(p),
      signal: opts.signal,
    };
    if (isApiConfigured()) {
      await uploadToApi(file, uploadOpts);
    } else {
      await simulateUploadProgress(uploadOpts.onProgress, opts.signal);
    }
    await removePendingUpload(item.id);
    synced++;
  }
  return synced;
}

/** Lightweight ping — used before attempting API upload. */
export function isBrowserOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}
