import { describe, expect, it } from 'vitest'
import { normHe, scoreP, hlParts } from '../src/utils/search'

describe('normHe', () => {
  it('strips niqqud and geresh/gershayim, trims', () => {
    expect(normHe('  שָׁלוֹם  ')).toBe('שלום')
    expect(normHe("ד״ר")).toBe('דר')
    expect(normHe(null)).toBe('')
  })
})

describe('scoreP (canonical relevance ranking)', () => {
  const p = { id: 'p1', name: 'דנה לוי', focus: 'חרדה', phone: '054-1234567', email: 'dana@mail.com' }
  const tags = { p1: ['CBT', 'חרדה'] }
  it('ranks exact > prefix > includes on name', () => {
    expect(scoreP(p, 'דנה לוי', tags)).toBe(7)
    expect(scoreP(p, 'דנה', tags)).toBe(6)
    expect(scoreP(p, 'לוי', tags)).toBe(5)
  })
  it('matches focus, tags, phone digits, email', () => {
    expect(scoreP(p, 'חרדה', tags)).toBe(4)      // focus prefix
    expect(scoreP(p, 'CBT', tags)).toBe(4.5)     // tag prefix
    expect(scoreP(p, '1234', tags)).toBe(2)      // phone digits
    expect(scoreP(p, 'dana@', tags)).toBe(1.5)   // email
  })
  it('returns 0 for empty query or no match', () => {
    expect(scoreP(p, '', tags)).toBe(0)
    expect(scoreP(p, 'zzz', tags)).toBe(0)
  })
  it('tolerates a missing tags map', () => {
    expect(scoreP(p, 'דנה')).toBe(6)
  })
})

describe('hlParts (query highlighting)', () => {
  it('splits around the match and flags the highlighted part', () => {
    const parts = hlParts('דנה לוי', 'לוי')
    expect(parts.map((x) => x.t)).toEqual(['דנה ', 'לוי'])
    expect(parts.find((x) => x.t === 'לוי')!.fw).toBe(700)
  })
  it('returns one plain part when there is no query/match', () => {
    expect(hlParts('דנה', '').length).toBe(1)
    expect(hlParts('דנה', 'x')[0].bg).toBe('transparent')
  })
})
