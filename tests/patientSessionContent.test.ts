// Bespoke per-patient session content (the Simba/p5 arc) must override the
// generic seed arrays, while every other patient keeps the shared content.
import { describe, expect, it } from 'vitest';
import { demoSessionCount } from '../src/utils/patientSessions';
import { sessionSummaries } from '../src/data/sessions';
import { sessionInsight, sessionMeta, sessionTitle } from '../src/data/sessionDetail';
import { PATIENT_SESSION_CONTENT } from '../src/data/patientSessionContent';

describe('per-patient bespoke session content', () => {
  it('Simba (p5) gets exactly his 5 bespoke sessions', () => {
    const simba = { id: 'p5', name: 'סימבה' };
    expect(demoSessionCount(simba)).toBe(5);
    expect(sessionSummaries(simba)).toHaveLength(5);
  });

  it('Simba content is his real arc (summary + therapist note as insight + title)', () => {
    const simba = { id: 'p5' };
    // most-recent-first: index 0 is the final integration session
    expect(sessionTitle(simba, 0)).toContain('אינטגרציה');
    expect(sessionSummaries(simba)[0]).toContain('אינטגרציה');
    expect(sessionInsight(simba, 4)).toBeTruthy();
    // arrays are aligned and complete
    expect(PATIENT_SESSION_CONTENT.p5.summaries).toHaveLength(5);
    expect(PATIENT_SESSION_CONTENT.p5.insights).toHaveLength(5);
    expect(PATIENT_SESSION_CONTENT.p5.titles).toHaveLength(5);
  });

  it('a generic patient still shares the neutral content (no bespoke override)', () => {
    const generic = { id: 'p1', name: 'דנה לוי' };
    expect(sessionTitle(generic, 0)).toBe('');
    expect(sessionSummaries(generic).length).toBeGreaterThan(5);
    expect(sessionMeta(generic, 0)).toBeNull();
  });

  it('Simba carries the richer v3 metadata (phase / protocol / distress / homework)', () => {
    const simba = { id: 'p5' };
    const m = sessionMeta(simba, 0); // latest = integration session
    expect(m).not.toBeNull();
    expect(m!.phase).toContain('אינטגרציה');
    expect(m!.protocol).toBeTruthy();
    expect(m!.distress).toBeTruthy();
    expect(m!.homework).toBeTruthy();
    expect(m!.focus).toBeTruthy();
    expect(m!.interventions.length).toBeGreaterThan(0); // parsed into a list
    // the earliest session (index 4) is the stabilization/assessment one
    const first = sessionMeta(simba, 4)!;
    expect(first.phase).toContain('ייצוב');
    expect(first.interventions).toContain('חוזה טיפולי');
    // patient_state is present on sessions 1 (index 4) and 5 (index 0), empty otherwise
    expect(first.patientState).toContain('עוררות יתר');
    expect(m!.patientState).toContain('יציבה זקופה');
    expect(sessionMeta(simba, 2)!.patientState).toBe('');
  });

  it('no em dash sits adjacent to Hebrew in the bespoke content (house style)', () => {
    const all = [
      ...PATIENT_SESSION_CONTENT.p5.summaries,
      ...PATIENT_SESSION_CONTENT.p5.insights,
      ...PATIENT_SESSION_CONTENT.p5.titles,
    ].join('\n');
    expect(/[א-ת].{0,2}—|—.{0,2}[א-ת]/.test(all)).toBe(false);
  });
});
