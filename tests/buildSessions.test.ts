// buildSessions — the canonical per-patient session-list builder, consolidated
// from PatientPage / SessionsPage / TimelinePage (they had drifted copies).
// Locks the contract all three screens now depend on.
import { describe, expect, it, vi } from 'vitest'
import { buildSessions } from '../src/data/sessions'

const patient = { id: 'p1', name: 'דנה לוי', risk: 'high', sessions: 6, gender: 'נ' }
const ctx = () => ({ navigate: vi.fn(), set: vi.fn() })

describe('buildSessions (canonical)', () => {
  it('builds one view-model per session (capped at 8), newest first', () => {
    const rows = buildSessions(patient, { deletedSessions: [] }, ctx())
    expect(rows.length).toBe(6)
    expect(rows[0].num).toBe(6) // newest first
    expect(rows[rows.length - 1].num).toBe(1)
    // superset fields both screens rely on are present
    expect(rows[0]).toHaveProperty('duration')
    expect(rows[0]).toHaveProperty('topicsText')
    expect(rows[0]).toHaveProperty('topicChips')
    expect(Array.isArray(rows[0].riskChips)).toBe(true)
  })

  it('omits deleted sessions (by patient#num key)', () => {
    const all = buildSessions(patient, { deletedSessions: [] }, ctx())
    const withDeleted = buildSessions(patient, { deletedSessions: ['p1#6'] }, ctx())
    expect(withDeleted.length).toBe(all.length - 1)
    expect(withDeleted.find((r: any) => r.num === 6)).toBeUndefined()
  })

  it('wires navigate + set through ctx (no store/page coupling)', () => {
    const c = ctx()
    const rows = buildSessions(patient, { deletedSessions: [] }, c)
    rows[0].onSummary(); expect(c.navigate).toHaveBeenCalledWith('summary', { patientId: 'p1' })
    rows[0].onTranscript(); expect(c.navigate).toHaveBeenCalledWith('transcript', { patientId: 'p1' })
    rows[0].onDelete(); expect(c.set).toHaveBeenCalled() // opens the delete-session dialog
  })

  it('caps history at 8 even for high session counts', () => {
    expect(buildSessions({ ...patient, sessions: 40 }, { deletedSessions: [] }, ctx()).length).toBe(8)
  })

  it('emits empty riskChips for no-risk sessions and stops event propagation on delete', () => {
    // A low-risk patient's session pattern includes 'none' entries → those rows
    // carry no risk chips (exercises the rk === 'none' branch).
    const lowP = { id: 'p7', name: 'רון כהן', risk: 'low', sessions: 8, gender: 'ז' }
    const rows = buildSessions(lowP, { deletedSessions: [] }, ctx())
    expect(rows.some((r: any) => r.riskChips.length === 0)).toBe(true)
    // onDelete called with an event stops row-click propagation.
    const e = { stopPropagation: vi.fn() }
    rows[0].onDelete(e)
    expect(e.stopPropagation).toHaveBeenCalledOnce()
  })
})
