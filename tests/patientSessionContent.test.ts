// Bespoke per-patient session content — DERIVED from the canonical mock-patient
// repository. Every repository patient overrides the generic seed arrays with
// their own verbatim arc; anyone outside the repository shares the neutral
// content, and nothing (arcs, trajectories, metadata) is fabricated for them.
import { describe, expect, it } from 'vitest';
import { buildPatientSessions, demoSessionCount } from '../src/utils/patientSessions';
import { sessionDates, sessionSummaries, sessionRisk } from '../src/data/sessions';
import { beliefTrajectory, sessionInsight, sessionMeta, sessionTitle, sessionMainTopics, sessionRiskFlags, SESSION_MAIN_TOPICS } from '../src/data/sessionDetail';
import { PATIENT_SESSION_CONTENT } from '../src/data/patientSessionContent';
import { repoPatients, repoPatient } from '../src/data/mockPatientsRepo';

describe('per-patient bespoke session content — repository-derived', () => {
  it('every repository patient carries a complete, aligned arc', () => {
    for (const rp of repoPatients()) {
      const c = PATIENT_SESSION_CONTENT[rp.id];
      expect(c, rp.id + ' must have bespoke content').toBeTruthy();
      const n = rp.sessions.length;
      expect(demoSessionCount({ id: rp.id })).toBe(n);
      for (const arr of [c.titles, c.summaries, c.insights, c.dates!, c.topics!, c.riskKeys!, c.recordings!, c.therapistNotes!]) {
        expect(arr).toHaveLength(n);
      }
    }
  });

  it('content is verbatim repo data, most-recent-first (index 0 = last session)', () => {
    const simba = repoPatient('simba')!;
    const last = simba.sessions[simba.sessions.length - 1];
    expect(sessionTitle({ id: 'simba' }, 0)).toBe(last.title);
    expect(sessionSummaries({ id: 'simba' })[0]).toBe(last.summary);
    expect(sessionInsight({ id: 'simba' }, 0)).toBe(last.insight);
    expect(sessionDates({ id: 'simba' })[0]).toBe(last.date);
    // chronological order preserved across the reversal
    expect(sessionSummaries({ id: 'simba' })[simba.sessions.length - 1]).toBe(simba.sessions[0].summary);
  });

  it('per-session risk buckets surface the dataset דגלי סיכון', () => {
    for (const rp of repoPatients()) {
      const risks = sessionRisk({ id: rp.id });
      expect(risks).toHaveLength(rp.sessions.length);
      expect(risks.every((r) => ['low', 'medium', 'high'].includes(r))).toBe(true);
    }
  });

  it('per-session topics and risk flags come from the dataset (not the generic constants)', () => {
    const simba = repoPatient('simba')!;
    const lastIdx = 0; // most recent
    const topics = sessionMainTopics({ id: 'simba' }, lastIdx);
    expect(topics).toEqual(simba.sessions[simba.sessions.length - 1].topics);
    expect(topics).not.toEqual(SESSION_MAIN_TOPICS);
    const flags = sessionRiskFlags({ id: 'simba' }, lastIdx);
    expect(flags[0].level).toBe(simba.sessions[simba.sessions.length - 1].risk!.label);
    expect(flags[0].text).toBe(simba.sessions[simba.sessions.length - 1].risk!.text);
  });

  it('a session with a לתשומת לב note surfaces it as an extra risk flag', () => {
    // Simba's first session carries an explicit attention note in the dataset.
    const simba = repoPatient('simba')!;
    const withAttention = simba.sessions.findIndex((s) => s.attention);
    expect(withAttention).toBeGreaterThanOrEqual(0);
    const idx = simba.sessions.length - 1 - withAttention; // most-recent-first index
    const flags = sessionRiskFlags({ id: 'simba' }, idx);
    expect(flags.some((f) => f.level === 'לתשומת לב' && f.text === simba.sessions[withAttention].attention)).toBe(true);
  });

  it('an unknown / non-repository patient has no fabricated clinical content', () => {
    const generic = { id: 'zz-generic', name: 'לקוח כללי' };
    expect(sessionTitle(generic, 0)).toBe('');
    expect(sessionSummaries(generic)).toEqual([]);
    expect(sessionMeta(generic, 0)).toBeNull();
    expect(beliefTrajectory(generic), 'no fabricated trajectories').toBeNull();
    expect(sessionMainTopics(generic, 0)).toEqual(SESSION_MAIN_TOPICS);
  });

  it('the legacy v3 metadata is not fabricated for repository patients', () => {
    // The repository does not carry phase/protocol/distress fields — sessionMeta
    // must return null (the UI hides the block) rather than invent values.
    for (const rp of repoPatients()) expect(sessionMeta({ id: rp.id }, 0)).toBeNull();
  });

  it('the session builder uses each patient’s own dates, newest-first', () => {
    const ctx = { navigate: () => {}, set: () => {} };
    for (const rp of repoPatients().slice(0, 3)) {
      const rows = buildPatientSessions({ id: rp.id, name: rp.name }, [], ctx);
      expect(rows[0].date).toBe(rp.sessions[rp.sessions.length - 1].date);
      expect(rows[rows.length - 1].num).toBe(1);
    }
  });
});
