// useMeetingReportSpeech wraps useTts with a fixed report text — the desktop
// and mobile prep-report play/pause buttons share this so their toggle
// behavior stays a single source of truth. Must degrade gracefully when the
// Web Speech API is absent (jsdom / embedded browsers).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { buildMeetingReportSpeechText, estimateSpeechSeconds, useMeetingReportSpeech } from '../src/hooks/useMeetingReportSpeech';

afterEach(() => {
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Drives the waveform's requestAnimationFrame loop by hand: each `frame(ms)`
// advances the fake clock and runs the pending callback.
function stubClock() {
  let now = 0;
  let pending: FrameRequestCallback | null = null;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { pending = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { pending = null; });
  return (ms: number) => {
    now += ms;
    const cb = pending;
    pending = null;
    if (cb) act(() => { cb(now); });
  };
}

function stubSpeech() {
  const utterances: any[] = [];
  (window as any).speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
  (window as any).SpeechSynthesisUtterance = class {
    lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
    constructor(public text: string) { utterances.push(this); }
  };
  return utterances;
}

describe('useMeetingReportSpeech', () => {
  it('reports unsupported when the Web Speech API is absent', () => {
    const { result } = renderHook(() => useMeetingReportSpeech('דנה לוי. סיכום הדוח'));
    expect(result.current.supported).toBe(false);
    expect(result.current.speaking).toBe(false);
  });

  it('toggle speaks the given report text, and speaking flips true/false', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    (window as any).speechSynthesis = { speak, cancel };
    (window as any).SpeechSynthesisUtterance = class {
      lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(public text: string) {}
    };
    const { result } = renderHook(() => useMeetingReportSpeech('דנה לוי. סיכום הדוח'));
    expect(result.current.supported).toBe(true);

    act(() => result.current.toggle());
    expect(speak).toHaveBeenCalledTimes(1);
    expect((speak.mock.calls[0][0] as any).text).toBe('דנה לוי. סיכום הדוח');
    expect(result.current.speaking).toBe(true);

    act(() => result.current.toggle());
    expect(cancel).toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it('stops speaking when the report text changes under the utterance', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    (window as any).speechSynthesis = { speak, cancel };
    (window as any).SpeechSynthesisUtterance = class {
      lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(public text: string) {}
    };
    const { result, rerender } = renderHook(
      ({ text }) => useMeetingReportSpeech(text),
      { initialProps: { text: 'דנה לוי. סיכום ראשון' } },
    );

    act(() => result.current.toggle());
    expect(result.current.speaking).toBe(true);
    const cancelsBefore = cancel.mock.calls.length;

    rerender({ text: 'יוסי כהן. סיכום אחר' });
    expect(cancel.mock.calls.length, 'stale report never keeps narrating').toBeGreaterThan(cancelsBefore);
    expect(speak, 'text change does not start a new utterance on its own').toHaveBeenCalledTimes(1);
  });
});

describe('buildMeetingReportSpeechText', () => {
  it('concatenates the patient header, summary, follow-up points, and next-meeting goals', () => {
    const text = buildMeetingReportSpeechText({
      patientName: 'דנה לוי',
      intro: 'סקירה מהירה לדוגמה',
      summary: 'סיכום הפגישה הקודמת',
      followUpPoints: ['נקודה ראשונה', 'נקודה שנייה'],
      sessionGoals: ['מטרה ראשונה', 'מטרה שנייה'],
    });

    expect(text).toContain('דנה לוי');
    expect(text).toContain('סקירה מהירה לדוגמה');
    expect(text, 'reads the previous-meeting summary').toContain('סיכום הפגישה הקודמת');
    expect(text, 'reads the follow-up points section').toContain('נקודות למעקב: נקודה ראשונה. נקודה שנייה');
    expect(text, 'reads the next-meeting goals section').toContain('מטרות לפגישה הקרובה: מטרה ראשונה. מטרה שנייה');

    // Sections appear in a stable, spoken-friendly order.
    expect(text.indexOf('סיכום הפגישה הקודמת')).toBeLessThan(text.indexOf('נקודות למעקב'));
    expect(text.indexOf('נקודות למעקב')).toBeLessThan(text.indexOf('מטרות לפגישה הקרובה'));

    // Breathing room between the follow-up list and the next heading: the last
    // item is punctuated, then an explicit pause precedes "מטרות לפגישה הקרובה".
    expect(text, 'follow-up list ends with sentence punctuation, then a pause, before the goals heading')
      .toContain('נקודה שנייה.\n\nמטרות לפגישה הקרובה');
  });

  it('does not double-punctuate a follow-up item that already ends with sentence punctuation', () => {
    const text = buildMeetingReportSpeechText({
      patientName: 'דנה לוי',
      intro: 'סקירה מהירה לדוגמה',
      followUpPoints: ['האם חל שינוי השבוע?'],
      sessionGoals: ['מטרה ראשונה'],
    });

    expect(text).toContain('נקודות למעקב: האם חל שינוי השבוע?\n\nמטרות לפגישה הקרובה');
  });

  it('omits empty sections instead of leaving stray separators', () => {
    const text = buildMeetingReportSpeechText({
      patientName: 'דנה לוי',
      intro: 'סקירה מהירה לדוגמה',
      summary: '',
      followUpPoints: [],
      sessionGoals: [],
    });

    expect(text).toBe('דנה לוי. סקירה מהירה לדוגמה');
  });
});

describe('useMeetingReportSpeech — waveform progress', () => {
  // 140 characters ÷ 14 chars/sec = a 10-second estimated read.
  const TEXT = 'א'.repeat(140);

  it('estimates the read from text length, with a floor for very short text', () => {
    expect(estimateSpeechSeconds(TEXT)).toBe(10);
    expect(estimateSpeechSeconds('שלום'), 'short text still gets a visible sweep').toBe(3);
  });

  it('stays at 0 while nothing is being read', () => {
    stubClock();
    stubSpeech();
    const { result } = renderHook(() => useMeetingReportSpeech(TEXT));
    expect(result.current.progress).toBe(0);
  });

  it('sweeps over the estimated read time and caps below 100 until speech really ends', () => {
    const frame = stubClock();
    stubSpeech();
    const { result } = renderHook(() => useMeetingReportSpeech(TEXT));

    act(() => result.current.toggle());
    expect(result.current.progress).toBe(0);

    frame(2_500);
    expect(result.current.progress, 'a quarter through a 10s read').toBeCloseTo(25, 5);

    frame(2_500);
    expect(result.current.progress).toBeCloseTo(50, 5);

    // Past the estimate the bars hold just short of full — the utterance's own
    // `onend` is what declares the read over.
    frame(30_000);
    expect(result.current.progress).toBe(99);
  });

  it('empties the bars when the reader is stopped by hand', () => {
    const frame = stubClock();
    stubSpeech();
    const { result } = renderHook(() => useMeetingReportSpeech(TEXT));

    act(() => result.current.toggle());
    frame(5_000);
    expect(result.current.progress).toBeGreaterThan(0);

    act(() => result.current.toggle());
    expect(result.current.speaking).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('empties the bars when the utterance ends on its own', () => {
    const frame = stubClock();
    const utterances = stubSpeech();
    const { result } = renderHook(() => useMeetingReportSpeech(TEXT));

    act(() => result.current.toggle());
    frame(5_000);
    expect(result.current.progress).toBeGreaterThan(0);

    act(() => { utterances[0].onend?.(); });
    expect(result.current.speaking).toBe(false);
    expect(result.current.progress).toBe(0);
  });
});
