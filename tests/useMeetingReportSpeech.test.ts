// useMeetingReportSpeech wraps useTts with a fixed report text — the desktop
// and mobile prep-report play/pause buttons share this so their toggle
// behavior stays a single source of truth. Must degrade gracefully when the
// Web Speech API is absent (jsdom / embedded browsers).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMeetingReportSpeech } from '../src/hooks/useMeetingReportSpeech';

afterEach(() => {
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
});

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
});
