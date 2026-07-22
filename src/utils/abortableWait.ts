// Abortable delay — resolves after `ms`, or rejects with an AbortError (and
// clears the pending timer) if the signal aborts first. Single source of truth
// for the polling services (upload, meeting-summary, next-meeting-report), which
// previously each defined an identical copy.
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
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
