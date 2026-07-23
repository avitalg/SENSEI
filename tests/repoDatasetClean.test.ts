// Repository dataset cleanliness guard. The canonical layer is fail-soft at
// runtime (a malformed file degrades one patient, the rest load) — which also
// means a bad repo re-sync would ship silently. This guard makes CI the signal:
// the vendored mock_patients/ mirror must parse with ZERO issues, and every
// patient must carry the full expected shape. If a future sync trips this,
// fix the data (or teach the parser the new format) — do not weaken the guard.
import { describe, expect, it } from 'vitest';
import { repoPatients, repoParseIssues, repoTasks } from '../src/data/mockPatientsRepo';

describe('mock-patient repository — dataset cleanliness', () => {
  it('parses the entire vendored repository with zero issues', () => {
    expect(repoParseIssues()).toEqual([]);
  });

  it('every patient has a complete intro and at least one full session', () => {
    const patients = repoPatients();
    expect(patients.length).toBeGreaterThan(0);
    for (const p of patients) {
      expect(p.name, p.id).not.toBe('');
      expect(p.approach, p.id).toBeTruthy();
      expect(p.background, p.id).toBeTruthy();
      expect(p.sessions.length, p.id).toBeGreaterThan(0);
      for (const s of p.sessions) {
        const at = p.id + ' session ' + s.num;
        expect(s.title, at).not.toBe('');
        expect(s.date, at).toMatch(/^\d{2}\/\d{2}\/\d{2}$/);
        expect(s.time, at).toMatch(/^\d{1,2}:\d{2}$/);
        expect(s.summary, at).not.toBe('');
        expect(s.recording, at).not.toBe('');
        expect(s.insight, at).not.toBe('');
        expect(s.topics.length, at).toBeGreaterThan(0);
      }
      // Session numbers are contiguous 1..N — no gaps, no duplicates.
      expect(p.sessions.map((s) => s.num), p.id).toEqual(p.sessions.map((_, i) => i + 1));
    }
  });

  it('task ids are globally unique and reference existing sessions', () => {
    const tasks = repoTasks();
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    const byId = new Map(repoPatients().map((p) => [p.id, p]));
    for (const t of tasks) {
      const p = byId.get(t.patientId);
      expect(p, t.id).toBeTruthy();
      expect(p!.sessions.some((s) => s.num === t.sessionNum), t.id).toBe(true);
    }
  });
});
