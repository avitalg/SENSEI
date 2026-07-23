// Canonical mock-patient repository layer — discovery, parsing, domain mapping.
// Guards the contract that the vendored mock_patients/ markdown is the single
// source of truth: every folder is discovered, nothing is lost or duplicated,
// patients stay isolated, and missing values stay empty (never invented).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { repoPatients, repoPatient, repoTasks, repoParseIssues, riskLevelKey } from '../src/data/mockPatientsRepo';

const ROOT = path.join(__dirname, '..', 'src', 'data', 'mock_patients');
const folders = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

describe('repository discovery', () => {
  it('discovers every patient folder on disk — no hardcoded list', () => {
    const ids = repoPatients().map((p) => p.id);
    expect(ids).toEqual(folders); // adding a folder = one more patient, zero code changes
    expect(ids.length).toBeGreaterThanOrEqual(11);
  });

  it('parses the whole repository without issues', () => {
    expect(repoParseIssues()).toEqual([]);
  });
});

describe('domain mapping', () => {
  it('maps patient identity, approach and clinical background from the intro', () => {
    const simba = repoPatient('simba')!;
    expect(simba.name).toBe('סימבה');
    expect(simba.gender).toBe('m');
    expect(simba.approach).toContain('EMDR');
    expect(simba.background).toContain('נסיך צעיר');
    const elsa = repoPatient('elsa')!;
    expect(elsa.gender).toBe('f'); // תיק מטופלת
  });

  it('merges both files into ordered, deduplicated sessions with full content', () => {
    for (const p of repoPatients()) {
      expect(p.sessions.map((s) => s.num)).toEqual([1, 2, 3, 4, 5]);
      for (const s of p.sessions) {
        expect(s.recording.length).toBeGreaterThan(50); // from recorded_sessions.md
        expect(s.therapistNote.length).toBeGreaterThan(30); // 🎙️ note
        expect(s.summary.length).toBeGreaterThan(50); // סיכום הפגישה
        expect(s.insight.length).toBeGreaterThan(20); // תובנות מרכזיות
        expect(s.topics.length).toBeGreaterThanOrEqual(3); // נושאים מרכזיים
        expect(s.risk).not.toBeNull(); // דגלי סיכון on every session
        expect(s.date).toMatch(/^\d{2}\/\d{2}\/\d{2}$/);
        expect(s.time).toMatch(/^\d{1,2}:\d{2}$/);
        expect(s.durationMin).toBeGreaterThan(0); // stated per session (40/50 דק׳ both occur)
      }
    }
  });

  it('keeps sessions verbatim — rendered content matches the source markdown', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'simba', 'session_summaries.md'), 'utf8');
    const s1 = repoPatient('simba')!.sessions[0];
    expect(raw).toContain(s1.summary.split('\n')[0]);
    expect(raw).toContain(s1.insight);
    for (const t of s1.topics) expect(raw).toContain(t);
    const rec = fs.readFileSync(path.join(ROOT, 'simba', 'recorded_sessions.md'), 'utf8');
    expect(rec).toContain(s1.recording.slice(0, 60));
    expect(rec).toContain(s1.therapistNote.slice(0, 60));
  });

  it('keeps patients isolated — no content bleeds between files', () => {
    const simba = repoPatient('simba')!;
    const elsa = repoPatient('elsa')!;
    expect(simba.sessions[0].summary).not.toBe(elsa.sessions[0].summary);
    expect(simba.background).not.toBe(elsa.background);
  });

  it('normalizes the dataset risk labels into riskMeta buckets', () => {
    expect(riskLevelKey('נמוך')).toBe('low');
    expect(riskLevelKey('בינוני')).toBe('medium');
    expect(riskLevelKey('בינוני-גבוה')).toBe('high');
    expect(riskLevelKey('גבוה')).toBe('high');
  });
});

describe('task extraction', () => {
  it('extracts every לתשומת לב note and לפעם-הבאה focus — no duplicates, no inventions', () => {
    const tasks = repoTasks();
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicate tasks
    const attention = tasks.filter((t) => t.category === 'attention');
    // The dataset carries 17 explicit לתשומת לב notes — all must surface.
    expect(attention.length).toBe(17);
    for (const t of tasks) {
      expect(t.description.trim().length).toBeGreaterThan(10);
      expect(t.dueDate).toBeNull(); // never stated in the dataset → never invented
      expect(folders).toContain(t.patientId);
    }
  });
});
