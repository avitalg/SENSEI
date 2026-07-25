// useTts wraps the Web Speech API. It must degrade gracefully when the API is
// absent (jsdom / embedded browsers) and drive speechSynthesis when present.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTts } from '../src/hooks/useTts';

afterEach(() => {
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
});

describe('useTts', () => {
  it('reports unsupported when the Web Speech API is absent, and speak is a safe no-op', () => {
    const { result } = renderHook(() => useTts());
    expect(result.current.supported).toBe(false);
    act(() => result.current.speak('שלום'));
    expect(result.current.speaking).toBe(false);
  });

  it('drives speechSynthesis when supported, and stop cancels', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    (window as any).speechSynthesis = { speak, cancel };
    (window as any).SpeechSynthesisUtterance = class {
      lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(public text: string) {}
    };
    const { result } = renderHook(() => useTts());
    expect(result.current.supported).toBe(true);

    act(() => result.current.speak('סיכום היום'));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(result.current.speaking).toBe(true);

    act(() => result.current.stop());
    expect(cancel).toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it('tracks playback position from onboundary, and reports whether the browser fires it', () => {
    const utterances: any[] = [];
    (window as any).speechSynthesis = { speak: vi.fn((u: any) => utterances.push(u)), cancel: vi.fn() };
    (window as any).SpeechSynthesisUtterance = class {
      lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      onboundary: ((e: any) => void) | null = null;
      constructor(public text: string) {}
    };
    const { result } = renderHook(() => useTts());

    const text = '0123456789'; // 10 chars — charIndex maps straight to percent
    act(() => result.current.speak(text));
    expect(result.current.progress, 'starts at zero').toBe(0);
    expect(result.current.boundarySupported, 'unknown until the first boundary fires').toBe(false);

    act(() => utterances[0].onboundary({ charIndex: 4 }));
    expect(result.current.progress).toBe(40);
    expect(result.current.boundarySupported).toBe(true);

    act(() => utterances[0].onend());
    expect(result.current.progress, 'a finished utterance reads as complete').toBe(100);

    act(() => result.current.stop());
    expect(result.current.progress, 'stopping returns the bar to empty').toBe(0);
  });

  it('leaves boundarySupported false when the browser never fires onboundary', () => {
    const utterances: any[] = [];
    (window as any).speechSynthesis = { speak: vi.fn((u: any) => utterances.push(u)), cancel: vi.fn() };
    (window as any).SpeechSynthesisUtterance = class {
      lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      onboundary: ((e: any) => void) | null = null;
      constructor(public text: string) {}
    };
    const { result } = renderHook(() => useTts());
    act(() => result.current.speak('סיכום'));
    expect(result.current.speaking).toBe(true);
    expect(result.current.boundarySupported).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('ignores empty text', () => {
    const speak = vi.fn();
    (window as any).speechSynthesis = { speak, cancel: vi.fn() };
    (window as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    const { result } = renderHook(() => useTts());
    act(() => result.current.speak('   '));
    expect(speak).not.toHaveBeenCalled();
  });
});
