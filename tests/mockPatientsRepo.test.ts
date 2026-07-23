// Canonical mock-patient repository layer — discovery, parsing, domain mapping.
// Guards the contract that the vendored mock_patients/ markdown is the single
// source of truth: every folder is discovered, nothing is lost or duplicated,
// patients stay isolated, and missing values stay empty (never invented).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildRepo, parseMarkdownBlocks, patientIdFromFolder, repoPatients, repoPatient, repoTasks, repoParseIssues, riskLevelKey } from '../src/data/mockPatientsRepo';

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

  it('discovers patient directories recursively and retains future files verbatim', () => {
    const recorded = '# נועה — תיק מטופלת\n\n**רקע קליני:** רקע\n\n## מפגש 1: פתיחה\n\n"תוכן הקלטה"\n';
    const summaries = '# סיכומים\n\n## פגישה 1\n\nפתיחה\n\nנועה · 01/01/26 · 09:00 · 50 דק׳\n\n**סיכום הפגישה**\nסיכום\n';
    const repo = buildRepo({
      './mock_patients/region/a/noa/recorded_sessions.md': recorded,
      './mock_patients/region/a/noa/session_summaries.md': summaries,
      './mock_patients/region/a/noa/future/assessment.json': '{"score":7}',
    });
    expect(repo).toHaveLength(1);
    expect(repo[0].id).toBe('region_sa_snoa');
    expect(repo[0].sourceFiles['future/assessment.json']).toBe('{"score":7}');
    expect(repo[0].sourceDocuments['future/assessment.json'].raw).toBe('{"score":7}');
    expect(repo[0].parseIssues).toContain('קובץ לא מוכר במאגר: future/assessment.json (נשמר, לא מפורש)');
  });

  it('safely preserves common Markdown block structures and inline syntax', () => {
    const markdown = [
      '# כותרת',
      '',
      'פסקה עם **הדגשה** ו-`code`.',
      '',
      '- פריט א',
      '- פריט ב',
      '',
      '> ציטוט',
      '',
      '| שם | ערך |',
      '| --- | --- |',
      '| סיכון | נמוך |',
      '',
      '```ts',
      'const safe = true;',
      '```',
    ].join('\n');
    const document = parseMarkdownBlocks(markdown);
    expect(document.raw).toBe(markdown);
    expect(document.blocks.map((block) => block.type)).toEqual([
      'heading', 'paragraph', 'list', 'blockquote', 'table', 'code',
    ]);
    expect(document.blocks[1].raw).toContain('**הדגשה**');
    expect(document.blocks[4]).toMatchObject({ type: 'table', rows: [['שם', 'ערך'], ['סיכון', 'נמוך']] });
    expect(document.blocks[5]).toMatchObject({ type: 'code', language: 'ts', text: 'const safe = true;' });
  });

  it('isolates a malformed patient so the remaining repository still loads', () => {
    const valid = '# תקין — תיק מטופל\n\n## מפגש 1\n\n"תוכן"\n';
    const repo = buildRepo({
      './mock_patients/a/recorded_sessions.md': valid,
      './mock_patients/b/session_summaries.md': '# סיכומים',
    });
    expect(repo.map((p) => p.id)).toEqual(['a', 'b']);
    expect(repo.find((p) => p.id === 'a')?.sessions).toHaveLength(1);
    expect(repo.find((p) => p.id === 'b')?.parseIssues).toContain('recorded_sessions.md חסר');
  });

  it('creates stable route-safe ids for nested, Unicode and long folders', () => {
    expect(patientIdFromFolder('forrest_gump')).toBe('forrest_gump');
    for (const folder of ['region/a/noa', 'אזור/מטופלת', 'a/'.repeat(50) + 'patient']) {
      expect(patientIdFromFolder(folder)).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
      expect(patientIdFromFolder(folder)).toBe(patientIdFromFolder(folder));
    }
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
      expect(Object.keys(p.sourceFiles).sort()).toEqual(['recorded_sessions.md', 'session_summaries.md']);
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
