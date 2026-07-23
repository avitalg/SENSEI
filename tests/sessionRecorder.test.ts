// useSessionRecorder wraps MediaRecorder for the "הקלטה" flow. It must
// degrade gracefully when the API is absent (jsdom) and, when present, drive the
// full lifecycle: record → pause ⇄ resume → stop → review (with a playable file)
// → discard/re-record. jsdom has no MediaRecorder/getUserMedia, so we install
// minimal fakes for the supported-path assertions.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionRecorder } from '../src/hooks/useSessionRecorder';

class FakeRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: any) {}
  start() { this.state = 'recording'; }
  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

function installMediaMocks() {
  (window as any).MediaRecorder = FakeRecorder;
  (navigator as any).mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
  };
  (URL as any).createObjectURL = vi.fn(() => 'blob:fake-url');
  (URL as any).revokeObjectURL = vi.fn();
}

describe('useSessionRecorder', () => {
  afterEach(() => {
    delete (window as any).MediaRecorder;
    delete (navigator as any).mediaDevices;
  });

  it('reports unsupported and stays idle when MediaRecorder is absent', async () => {
    const { result } = renderHook(() => useSessionRecorder());
    expect(result.current.supported).toBe(false);
    await act(async () => { await result.current.start(); });
    expect(result.current.state).toBe('idle');
  });

  describe('supported path', () => {
    beforeEach(installMediaMocks);

    it('drives record → pause → resume → stop(review) → discard', async () => {
      const { result } = renderHook(() => useSessionRecorder());
      expect(result.current.supported).toBe(true);

      await act(async () => { await result.current.start(); });
      expect(result.current.state).toBe('recording');

      act(() => { result.current.pause(); });
      expect(result.current.state).toBe('paused');

      act(() => { result.current.resume(); });
      expect(result.current.state).toBe('recording');

      await act(async () => { await result.current.stop(); });
      expect(result.current.state).toBe('review');
      expect(result.current.file).toBeInstanceOf(File);
      expect(result.current.fileUrl).toBe('blob:fake-url');

      act(() => { result.current.discard(); });
      expect(result.current.state).toBe('idle');
      expect(result.current.file).toBeNull();
      expect(result.current.fileUrl).toBeNull();
    });

    it('cancel discards an in-progress recording without producing a file', async () => {
      const { result } = renderHook(() => useSessionRecorder());
      await act(async () => { await result.current.start(); });
      act(() => { result.current.cancel(); });
      expect(result.current.state).toBe('idle');
      expect(result.current.file).toBeNull();
    });
  });
});
