import { describe, expect, it } from 'vitest';
import { formatRecorderElapsed } from '../src/hooks/useAudioRecorder';

describe('formatRecorderElapsed', () => {
  it('formats mm:ss with zero padding', () => {
    expect(formatRecorderElapsed(0)).toBe('00:00');
    expect(formatRecorderElapsed(1_500)).toBe('00:01');
    expect(formatRecorderElapsed(65_000)).toBe('01:05');
    expect(formatRecorderElapsed(600_000)).toBe('10:00');
  });
});
