import { describe, expect, it } from 'vitest'
import { formatRecordDuration } from '../src/hooks/useAudioRecorder'

describe('formatRecordDuration', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatRecordDuration(0)).toBe('00:00')
    expect(formatRecordDuration(5)).toBe('00:05')
    expect(formatRecordDuration(65)).toBe('01:05')
    expect(formatRecordDuration(3599)).toBe('59:59')
  })
})
