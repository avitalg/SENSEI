// Bespoke per-patient session content (the Simba/p5 arc) must override the
// generic seed arrays, while every other patient keeps the shared content.
import { describe, expect, it } from 'vitest';

describe('treatment arc data (dataset "מפת התהליך")', () => {
  it('p5 phases read chronologically as the dataset arc: ייצוב → … → אינטגרציה', () => {
    // stored newest-first; chronological = reversed indexes (5 sessions)
    const chrono = Array.from({ length: 5 }, (_, i) => sessionMeta({ id: 'p5' }, 4 - i)?.phase);
    expect(chrono[0]).toBe('ייצוב');
    expect(chrono[4]).toBe('אינטגרציה');
    expect(chrono).toHaveLength(5);
    expect(chrono.every(Boolean)).toBe(true);
  });

  it('patients without the richer v3 metadata have no arc (sessionMeta null — no fabricated arcs)', () => {
    // p1–p7 all carry titles/summaries/insights, but only Simba (p5) carries the
    // v3 phase/protocol metadata; everyone else — and any unknown id — returns null.
    expect(sessionMeta({ id: 'p1' }, 0)).toBeNull();
    expect(sessionMeta({ id: 'zz-generic' }, 0)).toBeNull();
  });

  it('p5 exposes the dataset core-belief trajectory, earliest → latest; others do not', () => {
    const t = beliefTrajectory({ id: 'p5' });
    expect(t).toBeTruthy();
    expect(t![0]).toContain('הרגתי את אבא');
    expect(t![t!.length - 1]).toContain('צלק ניצל');
    expect(beliefTrajectory({ id: 'p1' }), 'no fabricated trajectories').toBeNull();
    expect(beliefTrajectory({ id: 'zz-generic' }), 'no fabricated trajectories').toBeNull();
  });
});
import { buildPatientSessions, demoSessionCount } from '../src/utils/patientSessions';
import { SESSION_DATES, sessionDates, sessionSummaries } from '../src/data/sessions';
import { beliefTrajectory, sessionInsight, sessionMeta, sessionSummaryText, sessionTitle } from '../src/data/sessionDetail';
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

  it('an unknown / non-roster patient still shares the neutral content (no bespoke override)', () => {
    // p1–p7 are all bespoke now; the generic fallback covers anyone outside the roster.
    const generic = { id: 'zz-generic', name: 'לקוח כללי' };
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

  it('no em dash sits adjacent to Hebrew in any bespoke content (house style)', () => {
    const all = Object.values(PATIENT_SESSION_CONTENT)
      .flatMap((c) => [...c.summaries, ...c.insights, ...c.titles])
      .join('\n');
    expect(/[א-ת].{0,2}—|—.{0,2}[א-ת]/.test(all)).toBe(false);
  });
});

describe('per-patient session content — full offline roster (p1–p7)', () => {
  const ROSTER = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];

  it('every offline roster patient carries their own aligned title/summary/insight arc', () => {
    for (const id of ROSTER) {
      const c = PATIENT_SESSION_CONTENT[id];
      expect(c, `${id} must have bespoke session content`).toBeTruthy();
      expect(c.summaries.length, `${id} summaries`).toBeGreaterThanOrEqual(4);
      // arrays are aligned so index-based lookups never fall out of range
      expect(c.titles).toHaveLength(c.summaries.length);
      expect(c.insights).toHaveLength(c.summaries.length);
      // newest-first: index 0 is a real, non-empty latest session
      expect(c.summaries[0]).toBeTruthy();
    }
  });

  it('Forrest (p6) and Harry (p7) carry their own five-session trauma arcs', () => {
    const forrest = PATIENT_SESSION_CONTENT.p6;
    expect(forrest.summaries).toHaveLength(5);
    expect(forrest.summaries[0]).toContain('אינטגרציה');
    expect(forrest.summaries[4]).toContain('קהות רגשית');
    expect(sessionTitle({ id: 'p6' }, 0)).toContain('אינטגרציה');

    const harry = PATIENT_SESSION_CONTENT.p7;
    expect(harry.summaries).toHaveLength(5);
    expect(harry.summaries[4]).toContain('עוררות יתר');
    expect(demoSessionCount({ id: 'p7' })).toBe(5);
  });

  it('the four-session patients (p1–p4) drive the builder count, title and summary', () => {
    expect(demoSessionCount({ id: 'p1' })).toBe(4);
    // most-recent-first: Dana's latest session is her successful presentation
    expect(sessionTitle({ id: 'p1' }, 0)).toContain('מסוגלות');
    expect(sessionSummaryText({ id: 'p1' }, 0)).toContain('הצגה');
    expect(sessionInsight({ id: 'p3' }, 0)).toContain('גבול');
  });

  it('unknown / undefined patients fall back to the generic demo set', () => {
    expect(sessionTitle({ id: 'zz-nope' }, 0)).toBe('');
    expect(sessionTitle(undefined, 0)).toBe('');
    expect(sessionMeta({ id: 'zz-nope' }, 0)).toBeNull();
  });

  it('every roster patient carries its own aligned dates; the builder uses them (newest-first)', () => {
    for (const id of ROSTER) {
      const c = PATIENT_SESSION_CONTENT[id];
      expect(c.dates, `${id} must have per-patient dates`).toBeTruthy();
      expect(c.dates).toHaveLength(c.summaries.length); // aligned with the arc
    }
    // sessionDates() prefers the override; non-roster ids share SESSION_DATES
    expect(sessionDates({ id: 'p1' })[0]).toBe('15/07/26');
    expect(sessionDates({ id: 'zz-nope' })).toEqual(SESSION_DATES);
    expect(sessionDates(undefined)).toEqual(SESSION_DATES);
    // the builder threads the real per-patient dates onto each history row
    const dana = buildPatientSessions({ id: 'p1', name: 'דנה לוי' }, [], { navigate: () => {}, set: () => {} });
    expect(dana).toHaveLength(4);
    expect(dana[0].date).toBe('15/07/26'); // latest
    expect(dana[3].date).toBe('24/06/26'); // earliest
  });

  it('Forrest (p6) and Harry (p7) carry the richer v3 clinical metadata (parity with Simba)', () => {
    for (const id of ['p6', 'p7']) {
      const latest = sessionMeta({ id }, 0);
      expect(latest, `${id} should expose session metadata`).not.toBeNull();
      expect(latest!.phase).toContain('אינטגרציה'); // newest session = integration
      expect(latest!.protocol).toBeTruthy();
      expect(latest!.homework).toBeTruthy();
      expect(latest!.interventions.length).toBeGreaterThan(0); // parsed into a list
      // patient_state present on the first + last session, empty in between
      expect(sessionMeta({ id }, 4)!.patientState).toBeTruthy();
      expect(sessionMeta({ id }, 2)!.patientState).toBe('');
      // core-belief trajectory, earliest → latest
      const t = beliefTrajectory({ id });
      expect(t, `${id} belief trajectory`).toBeTruthy();
      expect(t!.length).toBeGreaterThanOrEqual(2);
    }
    expect(beliefTrajectory({ id: 'p7' })![0]).toContain('להילחם לבד'); // earliest
    expect(beliefTrajectory({ id: 'p7' })!.at(-1)).toContain('שרדתי'); // latest
  });
});
