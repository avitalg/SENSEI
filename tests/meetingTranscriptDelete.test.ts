import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('VITE_API_BASE_URL', '');
});

describe('deleteMeetingTranscript', () => {
  it('DELETEs /meetings/{id}/transcript and treats 404 as already clear', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test.example');
    vi.resetModules();
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { deleteMeetingTranscript } = await import('../src/services/meetingTranscript');
    await deleteMeetingTranscript('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(fetchMock).toHaveBeenCalled();
    const call = fetchMock.mock.calls[0] as [string, RequestInit] | undefined;
    expect(call).toBeTruthy();
    expect(String(call![0])).toContain('/meetings/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/transcript');
    expect(call![1]?.method).toBe('DELETE');

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'gone' }), { status: 404 }));
    await expect(deleteMeetingTranscript('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).resolves.toBeUndefined();
  });
});
