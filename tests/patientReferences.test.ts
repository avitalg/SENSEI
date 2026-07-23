// R-1 regression — referential integrity on PERMANENT delete. A hard-removed
// patient must leave no orphaned references in any pid-keyed collection (an
// orphan appointment would otherwise resolve to patients[0] via the getPatient
// fallback and render as a ghost). purgePatientReferences must be exhaustive,
// idempotent (a no-op on an already-clean id), and must touch only the target id.
import { describe, expect, it } from 'vitest';
import { purgePatientReferences } from '../src/utils/patientReferences';

function fullState() {
  return {
    notesOverrides: { aladdin: 'a', bruce_wayne: 'b' },
    notesDrafts: { aladdin: 'd1', bruce_wayne: 'd2' },
    overviewOverrides: { aladdin: {}, bruce_wayne: {} },
    documentsByPatient: { aladdin: [{ id: 'x' }], bruce_wayne: [{ id: 'y' }] },
    summaryEdits: { aladdin: 's', bruce_wayne: 's2' },
    summaryDrafts: { aladdin: 'sd', bruce_wayne: 'sd2' },
    transcriptsByPatient: { aladdin: ['t'], bruce_wayne: ['u'] },
    scheduledAppts: [{ id: 'a1', pid: 'aladdin' }, { id: 'a2', pid: 'bruce_wayne' }, { id: 'a3', pid: 'aladdin' }],
    sessionNotes: { 'aladdin_1': 'n', 'aladdin_2': 'n2', 'bruce_1': 'm' },
    deletedSessions: ['aladdin#3', 'bruce_wayne#1', 'aladdin#4'],
    recentPatientIds: ['bruce_wayne', 'aladdin', 'dumbo'],
    activeTranscriptPatientId: 'aladdin',
  };
}

describe('purgePatientReferences — R-1 orphan cleanup', () => {
  it('strips every reference to the deleted id and leaves other patients intact', () => {
    const s = fullState();
    const patch = purgePatientReferences('aladdin', s);
    const next = { ...s, ...patch };

    // p1 fully purged across every collection
    expect(next.notesOverrides).toEqual({ bruce_wayne: 'b' });
    expect(next.notesDrafts).toEqual({ bruce_wayne: 'd2' });
    expect(next.overviewOverrides).toEqual({ bruce_wayne: {} });
    expect(next.documentsByPatient).toEqual({ bruce_wayne: [{ id: 'y' }] });
    expect(next.summaryEdits).toEqual({ bruce_wayne: 's2' });
    expect(next.summaryDrafts).toEqual({ bruce_wayne: 'sd2' });
    expect(next.transcriptsByPatient).toEqual({ bruce_wayne: ['u'] });
    expect(next.scheduledAppts).toEqual([{ id: 'a2', pid: 'bruce_wayne' }]);
    expect(next.sessionNotes).toEqual({ 'bruce_1': 'm' });
    expect(next.deletedSessions).toEqual(['bruce_wayne#1']);
    expect(next.recentPatientIds).toEqual(['bruce_wayne', 'dumbo']);
    expect(next.activeTranscriptPatientId).toBe(null);

    // no dangling reference to p1 anywhere
    expect(JSON.stringify(next)).not.toContain('aladdin');
  });

  it('is idempotent — re-running on an already-clean id is a no-op', () => {
    const s = fullState();
    const cleaned = { ...s, ...purgePatientReferences('aladdin', s) };
    const secondPass = purgePatientReferences('aladdin', cleaned);
    expect(secondPass).toEqual({});
  });

  it('returns an empty patch for an unknown id (only changed slices are emitted)', () => {
    expect(purgePatientReferences('nope', fullState())).toEqual({});
  });

  it('ignores a partial id (p1 must not purge p10 / p1_x lookalikes)', () => {
    const s = { ...fullState(), notesOverrides: { aladdin: 'a', p10: 'keep' }, scheduledAppts: [{ id: 'a', pid: 'p10' }] };
    const next = { ...s, ...purgePatientReferences('aladdin', s) };
    expect(next.notesOverrides).toEqual({ p10: 'keep' });
    expect(next.scheduledAppts).toEqual([{ id: 'a', pid: 'p10' }]);
  });

  it('handles empty/absent collections without throwing', () => {
    expect(purgePatientReferences('aladdin', {})).toEqual({});
    expect(purgePatientReferences('', fullState())).toEqual({});
  });
});
