// Duplicate-detection engine (`buildDupClusters`) — the canonical logic behind the
// dedup page, the patients-list banner, and the merge dialog. These tests turn the
// dedup dry-run's asserted properties into permanent, automated guarantees:
// deterministic + idempotent scoring, correct weighted signals, no false positives,
// phone normalization, the 60-point threshold, and a clean (zero-cluster) result
// after the duplicate is merged out. Locks the intentional seed duplicate too.
import { describe, expect, it } from 'vitest'
import { buildDupClusters } from '../src/utils/dedup'
import { initialState } from '../src/data/seed'

// Only the fields the engine reads (id / name / phone / email).
const yossi = { id: 'a', name: 'יוסי מזרחי', phone: '052-7654321', email: 'yossi.m@mail.com' }
const yosef = { id: 'b', name: 'יוסף מזרחי', phone: '052-765-4321', email: 'yossi.mizrahi@mail.com' }
const dana = { id: 'c', name: 'דנה לוי', phone: '054-1234567', email: 'dana.l@mail.com' }

describe('dedup — buildDupClusters detection engine', () => {
  it('clusters a match and scores the weighted signals, capped at 99', () => {
    const clusters = buildDupClusters([yossi, yosef, dana])
    expect(clusters).toHaveLength(1)
    expect(clusters[0].members.map((m: any) => m.id).sort()).toEqual(['a', 'b'])
    const meta = clusters[0].meta['b'] // meta is keyed by the non-anchor member
    expect(meta.score).toBe(99) // 60 phone + 25 surname + 15 first-name + 12 email → capped
    expect(meta.signals).toEqual(expect.arrayContaining([
      'מספר טלפון זהה', 'שם משפחה זהה', 'שם פרטי דומה', 'כתובת דוא״ל דומה',
    ]))
  })

  it('is deterministic and idempotent — same input yields identical output every run', () => {
    const a = buildDupClusters([yossi, yosef, dana])
    const b = buildDupClusters([yossi, yosef, dana])
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('exposes confidence + a deterministic canonicalId as first-class cluster fields', () => {
    // The engine — not the page — is the single source of truth for how confident a
    // cluster is and which record should survive. Canonical pick = most complete
    // (highest session count), ties broken by lowest id.
    const [c] = buildDupClusters([{ ...yossi, sessions: 12 }, { ...yosef, sessions: 3 }])
    expect(c.confidence).toBe(99)
    expect(c.canonicalId).toBe('a') // 'a' has 12 sessions vs 'b' with 3
    // tie on sessions → lowest id wins, deterministically
    const tie = buildDupClusters([{ ...yosef, id: 'z', sessions: 5 }, { ...yossi, id: 'k', sessions: 5 }])
    expect(tie[0].canonicalId).toBe('k')
  })

  it('normalizes phone formatting before comparison', () => {
    // same digits, different punctuation → one cluster
    expect(buildDupClusters([yossi, yosef])).toHaveLength(1)
  })

  it('phone is decisive: name+email similarity alone (52) stays below the 60 threshold', () => {
    const samePersonWrongPhone = { ...yosef, phone: '050-0000000' }
    expect(buildDupClusters([yossi, samePersonWrongPhone])).toHaveLength(0)
  })

  it('never matches on a missing phone ("—") — same name + email must not auto-merge', () => {
    // Data-integrity guard: '—' means "no phone on file". Two people who happen to share a
    // name but have no phone recorded must NOT be treated as the same patient. Without the
    // decisive phone signal the score tops out at 52 (surname 25 + first-name 15 + email 12),
    // staying below 60. Prevents silently collapsing two distinct records into one.
    const a = { id: 'a', name: 'רון כהן', phone: '—', email: 'ron.k@mail.com' }
    const b = { id: 'b', name: 'רון כהן', phone: '—', email: 'ron.kohen@mail.com' }
    expect(buildDupClusters([a, b])).toHaveLength(0)
  })

  it('produces no false positives for genuinely distinct patients', () => {
    expect(buildDupClusters([yossi, dana])).toHaveLength(0)
  })

  it('breaks a canonical tie by lowest id when session counts are equal (and tolerates a missing email field)', () => {
    // Records with NO email field (exercises the missing-email fallback) and equal
    // session counts (forces the deterministic id tie-break for the survivor pick).
    const b2 = { id: 'b2', name: 'נועה ברק', phone: '053-1112222', sessions: 4 }
    const a1 = { id: 'a1', name: 'נועה ברק', phone: '053-111-2222', sessions: 4 }
    const [cluster] = buildDupClusters([b2, a1])
    expect(cluster.members.map((m: any) => m.id).sort()).toEqual(['a1', 'b2'])
    expect(cluster.canonicalId).toBe('a1') // equal sessions → lowest id survives
  })

  it('detects exactly one cluster {p2, p9} in the real seed (confidence 99)', () => {
    const clusters = buildDupClusters(initialState.patients)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].members.map((m: any) => m.id).sort()).toEqual(['p2', 'p9'])
    expect(clusters[0].meta['p9'].score).toBe(99)
    // engine-derived canonical fields: p2 (12 sessions) survives over p9 (3)
    expect(clusters[0].confidence).toBe(99)
    expect(clusters[0].canonicalId).toBe('p2')
  })

  it('returns zero clusters once the duplicate is merged out — the canonical set is clean', () => {
    const canonical = initialState.patients.filter((p: any) => p.id !== 'p9')
    expect(buildDupClusters(canonical)).toHaveLength(0)
  })
})
