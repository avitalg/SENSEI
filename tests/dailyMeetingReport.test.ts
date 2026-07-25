// dailyMeetingReport — POST/poll JSON + binary /speech fetch against senseiapi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'https://api.test.example';

function loadService() {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', BASE);
  try { localStorage.removeItem('sensei_data_source'); } catch { /* */ }
  return import('../src/services/dailyMeetingReport');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
});

const readyReport = {
  id: 'rep-1',
  report_date: '2026-07-25',
  time_zone: 'Asia/Jerusalem',
  status: 'ready' as const,
  meeting_limit: 4,
  meeting_count: 2,
  text: 'היום ביומן שלך מתוכננות שתי פגישות.',
  model: 'llama',
  generated_at: '2026-07-25T08:00:00Z',
  error: null,
};

describe('pollDailyMeetingReport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('POSTs then returns a ready report without further polling', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(readyReport), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const svc = await loadService();
    const updates: string[] = [];
    const report = await svc.pollDailyMeetingReport({
      onUpdate: (r) => updates.push(r.status),
    });
    expect(report.status).toBe('ready');
    expect(report.text).toContain('שתי פגישות');
    expect(updates).toEqual(['ready']);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/daily-meeting-reports?');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('polls GET until the report leaves pending/running', async () => {
    const pending = { ...readyReport, status: 'pending' as const, text: null, generated_at: null };
    const running = { ...readyReport, status: 'running' as const, text: null, generated_at: null };
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(pending), { status: 202, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(running), { status: 202, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(readyReport), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const svc = await loadService();
    vi.useFakeTimers();
    try {
      const done = svc.pollDailyMeetingReport();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1500);
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1500);
      const report = await done;
      expect(report.status).toBe('ready');
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(String(fetchMock.mock.calls[1][0])).toContain('/daily-meeting-reports/rep-1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a failed report without throwing', async () => {
    const failed = {
      ...readyReport,
      status: 'failed' as const,
      text: null,
      generated_at: null,
      error: 'model unavailable',
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(failed), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const svc = await loadService();
    const report = await svc.pollDailyMeetingReport();
    expect(report.status).toBe('failed');
    expect(report.error).toBe('model unavailable');
  });

  it('maps POST 404 to NOT_AVAILABLE', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }),
    );
    const svc = await loadService();
    await expect(svc.pollDailyMeetingReport()).rejects.toMatchObject({ code: 'NOT_AVAILABLE', status: 404 });
  });
});

describe('fetchDailyMeetingReportSpeech', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('returns the audio blob and media type', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    fetchMock.mockResolvedValueOnce(
      new Response(bytes, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }),
    );
    const svc = await loadService();
    const result = await svc.fetchDailyMeetingReportSpeech('rep-1');
    expect(result.mediaType).toBe('audio/mpeg');
    expect(result.blob.size).toBe(4);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${BASE}/daily-meeting-reports/rep-1/speech`);
  });

  it('maps 503 to TTS_UNAVAILABLE', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'text-to-speech is not available' }), {
        status: 503, headers: { 'Content-Type': 'application/json' },
      }),
    );
    const svc = await loadService();
    await expect(svc.fetchDailyMeetingReportSpeech('rep-1')).rejects.toMatchObject({
      code: 'TTS_UNAVAILABLE',
      status: 503,
    });
  });

  it('maps 409 to NOT_READY', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'still generating' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      }),
    );
    const svc = await loadService();
    await expect(svc.fetchDailyMeetingReportSpeech('rep-1')).rejects.toMatchObject({
      code: 'NOT_READY',
      status: 409,
    });
  });
});
