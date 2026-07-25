// useDailyMeetingReport — prefetch + speak server text via Web Speech.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

vi.mock('../src/services/apiClient', () => ({ isApiConfigured: vi.fn(() => false) }));
vi.mock('../src/services/dailyMeetingReport', () => ({
  pollDailyMeetingReport: vi.fn(),
}));

import { isApiConfigured } from '../src/services/apiClient';
import { pollDailyMeetingReport } from '../src/services/dailyMeetingReport';
import { useDailyMeetingReport } from '../src/hooks/useDailyMeetingReport';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
});

function stubSpeech() {
  const spoken: string[] = [];
  (window as any).speechSynthesis = { speak: vi.fn((u: any) => spoken.push(u.text)), cancel: vi.fn() };
  (window as any).SpeechSynthesisUtterance = class {
    lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
    constructor(public text: string) {}
  };
  return spoken;
}

describe('useDailyMeetingReport', () => {
  it('mock mode: does not hit the network; toggle speaks the local fallback', () => {
    (isApiConfigured as any).mockReturnValue(false);
    const spoken = stubSpeech();
    const { result } = renderHook(() => useDailyMeetingReport());
    expect(result.current.live).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(pollDailyMeetingReport).not.toHaveBeenCalled();
    expect(result.current.available).toBe(true);

    act(() => { result.current.toggle('סיכום פתיחת יום. אין לך פגישות מתוזמנות היום.'); });
    expect(spoken[0]).toContain('סיכום פתיחת יום');
    expect(result.current.playing).toBe(true);
  });

  it('API mode: surfaces live when the report is ready', async () => {
    (isApiConfigured as any).mockReturnValue(true);
    stubSpeech();
    (pollDailyMeetingReport as any).mockResolvedValue({
      id: 'rep-1',
      report_date: '2026-07-25',
      time_zone: 'Asia/Jerusalem',
      status: 'ready',
      meeting_limit: 4,
      meeting_count: 1,
      text: 'היום ביומן שלך מתוכננת פגישה אחת.',
    });
    const { result } = renderHook(() => useDailyMeetingReport());
    await waitFor(() => expect(result.current.live).toBe(true));
    expect(result.current.reportId).toBe('rep-1');
    expect(result.current.text).toContain('פגישה אחת');
    expect(result.current.loading).toBe(false);
  });

  it('API mode: toggle speaks the server text (not the local fallback)', async () => {
    (isApiConfigured as any).mockReturnValue(true);
    const spoken = stubSpeech();
    (pollDailyMeetingReport as any).mockResolvedValue({
      id: 'rep-1', status: 'ready', report_date: '2026-07-25', time_zone: 'Asia/Jerusalem',
      meeting_limit: 4, meeting_count: 1, text: 'LIVE SERVER BRIEF',
    });

    const { result } = renderHook(() => useDailyMeetingReport());
    await waitFor(() => expect(result.current.live).toBe(true));

    act(() => { result.current.toggle('LOCAL FALLBACK'); });
    expect(spoken).toEqual(['LIVE SERVER BRIEF']);
    expect(spoken[0]).not.toContain('LOCAL FALLBACK');
    expect(result.current.playing).toBe(true);
  });

  it('API mode: empty server text falls back to local script', async () => {
    (isApiConfigured as any).mockReturnValue(true);
    const spoken = stubSpeech();
    (pollDailyMeetingReport as any).mockResolvedValue({
      id: 'rep-1', status: 'ready', report_date: '2026-07-25', time_zone: 'Asia/Jerusalem',
      meeting_limit: 4, meeting_count: 0, text: '   ',
    });

    const { result } = renderHook(() => useDailyMeetingReport());
    await waitFor(() => expect(result.current.live).toBe(true));

    act(() => { result.current.toggle('LOCAL FALLBACK TEXT'); });
    expect(spoken).toEqual(['LOCAL FALLBACK TEXT']);
  });

  it('API mode: NOT_AVAILABLE leaves text null (local fallback in UI)', async () => {
    (isApiConfigured as any).mockReturnValue(true);
    stubSpeech();
    (pollDailyMeetingReport as any).mockRejectedValue(
      Object.assign(new Error('missing'), { code: 'NOT_AVAILABLE', status: 404 }),
    );
    const { result } = renderHook(() => useDailyMeetingReport());
    await waitFor(() => expect(pollDailyMeetingReport).toHaveBeenCalled());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.live).toBe(false);
    expect(result.current.text).toBeNull();
    expect(result.current.error).toBe('');
  });
});
