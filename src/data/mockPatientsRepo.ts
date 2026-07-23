// Canonical mock-patient repository layer — the ONE place that reads the
// vendored `mock_patients/` markdown (mirrored verbatim, byte-identical, from
// https://github.com/thaler10/sensei-patients → mock_patients/). Everything the
// offline demo shows about a patient — roster, background, sessions, summaries,
// insights, topics, risk flags, therapist notes, follow-up tasks — derives from
// these files through this module. No component reads the markdown directly,
// and no other module may declare patient clinical content.
//
// Discovery is automatic: every `mock_patients/<folder>/*.md` is picked up by
// import.meta.glob at build time, so adding a patient folder to the repo (and
// re-syncing the mirror) requires ZERO code changes here or anywhere else.
//
// Parsing rules (fail-soft): one malformed file degrades only that patient —
// the issue is recorded in `parseIssues` and the rest of the repository loads.
// Unknown/bold sections that the parser does not model are preserved verbatim
// in `unknownSections` so future UI can surface them; nothing is discarded.
// Missing values stay null/'' — never invented.

export interface RepoSessionRisk {
  /** The dataset's own level label, verbatim (e.g. "בינוני-גבוה"). */
  label: string
  /** Normalized bucket for riskMeta(): low | medium | high. */
  levelKey: 'low' | 'medium' | 'high'
  /** The level's explanation text, verbatim. */
  text: string
  /** The dataset's indicator disclaimer line, when present. */
  disclaimer: string | null
}

export interface RepoSession {
  /** Stable id — `<patientId>#<num>`. */
  id: string
  num: number
  /** Session title from the summaries file (falls back to the recorded file's). */
  title: string
  /** DD/MM/YY, verbatim from the meta line; '' when absent. */
  date: string
  /** HH:MM, verbatim from the meta line; '' when absent. */
  time: string
  /** Minutes, from the meta line; null when absent. */
  durationMin: number | null
  /** The therapist's spoken recording (quoted paragraph in recorded_sessions.md). */
  recording: string
  /** The therapist note attached to the recording. */
  therapistNote: string
  /** תובנות מרכזיות · key insight paragraph. */
  insight: string
  /** סיכום הפגישה · structured summary prose. */
  summary: string
  /** נושאים מרכזיים · bullet list, verbatim items. */
  topics: string[]
  /** דגלי סיכון · level + explanation; null when the section is absent. */
  risk: RepoSessionRisk | null
  /** לתשומת לב · explicit attention note; null when absent. */
  attention: string | null
  /** The "לפעם הבאה / לקראת המפגש הבא" sentence extracted from the recording. */
  nextFocus: string | null
  /** Bold sections the parser does not model — preserved verbatim, unrendered. */
  unknownSections: Record<string, string>
}

export interface RepoPatient {
  /** Stable id = the repository folder name (slug; URL-safe, order-independent). */
  id: string
  folder: string
  /** Display name from the recorded-sessions H1. */
  name: string
  /** From the H1 wording: תיק מטופלת → 'f', תיק מטופל → 'm'; null if unclear. */
  gender: 'm' | 'f' | null
  /** גישה טיפולית מרכזית · verbatim; null when not provided. */
  approach: string | null
  /** רקע קליני · verbatim; null when not provided. */
  background: string | null
  /** Sessions ordered by session number, ascending (1 = first). */
  sessions: RepoSession[]
  /** Intro bold-fields the parser does not model — preserved verbatim. */
  unknownIntro: Record<string, string>
  /** Non-fatal problems encountered while parsing this patient's files. */
  parseIssues: string[]
}

export interface RepoTask {
  /** Stable id — `<patientId>#<num>:<category>`. */
  id: string
  patientId: string
  patientName: string
  sessionNum: number
  /** Short imperative-ish label derived from the source section name. */
  title: string
  /** The task body, verbatim from the dataset. */
  description: string
  /** Derived from the session's risk bucket when present; null otherwise. */
  priority: 'high' | 'medium' | 'low' | null
  status: 'open'
  /** The dataset never states due dates — kept null, never invented. */
  dueDate: null
  category: 'attention' | 'follow-up'
  /** DD/MM/YY of the originating session ('' when the session has no date). */
  sessionDate: string
}

// ---------------------------------------------------------------------------
// Discovery — every markdown file under mock_patients/, keyed by path.
// ---------------------------------------------------------------------------

const FILES: Record<string, string> = import.meta.glob('./mock_patients/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// ---------------------------------------------------------------------------
// Markdown helpers (line-oriented; robust to CRLF and stray blank lines).
// ---------------------------------------------------------------------------

const norm = (s: string) => s.replace(/\r\n?/g, '\n');

/** Split a document into { intro, sections } on `## ` headings. */
function splitH2(md: string): { intro: string; sections: { heading: string; body: string }[] } {
  const lines = norm(md).split('\n');
  const sections: { heading: string; body: string }[] = [];
  const intro: string[] = [];
  let cur: { heading: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      if (cur) sections.push({ heading: cur.heading, body: cur.body.join('\n') });
      cur = { heading: m[1].trim(), body: [] };
    } else if (cur) cur.body.push(line);
    else intro.push(line);
  }
  if (cur) sections.push({ heading: cur.heading, body: cur.body.join('\n') });
  return { intro: intro.join('\n'), sections };
}

/** Split a session body into bold-titled subsections (+ the preamble before any). */
function splitBoldSections(body: string): { preamble: string; parts: { key: string; text: string }[] } {
  const lines = body.split('\n');
  const parts: { key: string; text: string }[] = [];
  const preamble: string[] = [];
  let cur: { key: string; text: string[] } | null = null;
  for (const line of lines) {
    // A standalone **key** line opens a section; `**level** — text` inside
    // דגלי סיכון is content (has text after the closing **), not a heading.
    const m = /^\*\*([^*]+)\*\*\s*$/.exec(line.trim());
    if (m) {
      if (cur) parts.push({ key: cur.key, text: cur.text.join('\n').trim() });
      cur = { key: m[1].trim(), text: [] };
    } else if (cur) cur.text.push(line);
    else preamble.push(line);
  }
  if (cur) parts.push({ key: cur.key, text: cur.text.join('\n').trim() });
  return { preamble: preamble.join('\n').trim(), parts };
}

const stripQuotes = (s: string) => s.trim().replace(/^["“]/, '').replace(/["”]$/, '').trim();

/** Map the dataset's Hebrew risk label to the app's riskMeta() bucket. */
export function riskLevelKey(label: string): 'low' | 'medium' | 'high' {
  const t = label.trim();
  if (t.includes('גבוה')) return 'high'; // covers גבוה and בינוני-גבוה
  if (t.includes('בינוני')) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Per-file parsers.
// ---------------------------------------------------------------------------

interface RecordedFile {
  name: string
  gender: 'm' | 'f' | null
  approach: string | null
  background: string | null
  unknownIntro: Record<string, string>
  sessions: Map<number, { title: string; recording: string; therapistNote: string; nextFocus: string | null }>
  issues: string[]
}

function parseRecorded(md: string, issues: string[]): RecordedFile {
  const { intro, sections } = splitH2(md);
  const h1 = /^#\s+(.+)$/m.exec(intro);
  let name = '';
  let gender: 'm' | 'f' | null = null;
  if (h1) {
    const t = h1[1].trim();
    name = (t.split('—')[0] || t).trim();
    if (/תיק מטופלת/.test(t)) gender = 'f';
    else if (/תיק מטופל/.test(t)) gender = 'm';
  } else issues.push('recorded_sessions.md: כותרת H1 חסרה');

  let approach: string | null = null;
  let background: string | null = null;
  const unknownIntro: Record<string, string> = {};
  for (const m of intro.matchAll(/^\*\*([^*]+):\*\*\s*(.+)$/gm)) {
    const key = m[1].trim();
    const val = m[2].trim();
    if (key === 'גישה טיפולית מרכזית') approach = val;
    else if (key === 'רקע קליני') background = val;
    else unknownIntro[key] = val; // preserved — never silently discarded
  }

  const sessions = new Map<number, { title: string; recording: string; therapistNote: string; nextFocus: string | null }>();
  for (const sec of sections) {
    const hm = /^מפגש\s+(\d+)\s*:?\s*(.*)$/.exec(sec.heading);
    if (!hm) { issues.push('recorded_sessions.md: כותרת מפגש לא מזוהה · "' + sec.heading + '"'); continue; }
    const num = parseInt(hm[1], 10);
    const title = (hm[2] || '').trim();
    // Recording = the quoted paragraph(s); therapist note = the line.
    let recording = '';
    let therapistNote = '';
    for (const para of sec.body.split(/\n{2,}/)) {
      const p = para.trim();
      if (!p || p === '---') continue;
      const noteM = /^\u{1F399}️[^:]*:\s*(.+)$/su.exec(p);
      if (noteM) therapistNote = stripQuotes(noteM[1]);
      else if (!recording) recording = stripQuotes(p);
      else recording += '\n\n' + stripQuotes(p);
    }
    // The forward-looking sentence inside the recording ("לפעם הבאה: …" /
    // "לקראת המפגש הבא…") — extracted verbatim, kept null when absent.
    const nf = /(?:לפעם הבאה|לקראת המפגש הבא[^:]*|לקראת סוף התהליך)\s*:?\s*([^"]+?)(?:\.\s*$|$)/.exec(recording);
    const nextFocus = nf ? nf[1].trim().replace(/\.$/, '') : null;
    if (sessions.has(num)) { issues.push('recorded_sessions.md: מפגש ' + num + ' כפול · נשמר הראשון'); continue; }
    sessions.set(num, { title, recording, therapistNote, nextFocus });
  }
  return { name, gender, approach, background, unknownIntro, sessions, issues };
}

interface SummaryEntry {
  num: number
  title: string
  date: string
  time: string
  durationMin: number | null
  insight: string
  summary: string
  topics: string[]
  risk: RepoSessionRisk | null
  attention: string | null
  unknownSections: Record<string, string>
}

function parseSummaries(md: string, issues: string[]): Map<number, SummaryEntry> {
  const { sections } = splitH2(md);
  const out = new Map<number, SummaryEntry>();
  for (const sec of sections) {
    const hm = /^פגישה\s+(\d+)\s*$/.exec(sec.heading.trim());
    if (!hm) { issues.push('session_summaries.md: כותרת פגישה לא מזוהה · "' + sec.heading + '"'); continue; }
    const num = parseInt(hm[1], 10);
    if (out.has(num)) { issues.push('session_summaries.md: פגישה ' + num + ' כפולה · נשמרה הראשונה'); continue; }

    const { preamble, parts } = splitBoldSections(sec.body);
    // Preamble: title line, then the `name · DD/MM/YY · HH:MM · NN דק׳` meta line.
    const preLines = preamble.split('\n').map((l) => l.trim()).filter(Boolean);
    let title = '';
    let date = '';
    let time = '';
    let durationMin: number | null = null;
    for (const line of preLines) {
      const meta = /·\s*(\d{2}\/\d{2}\/\d{2})\s*·\s*(\d{1,2}:\d{2})(?:\s*·\s*(\d+)\s*דק)?/.exec(line);
      if (meta) {
        date = meta[1];
        time = meta[2];
        durationMin = meta[3] ? parseInt(meta[3], 10) : null;
      } else if (!title) title = line;
    }
    if (!date) issues.push('session_summaries.md: פגישה ' + num + ' ללא שורת תאריך');

    let insight = '';
    let summary = '';
    let topics: string[] = [];
    let risk: RepoSessionRisk | null = null;
    let attention: string | null = null;
    const unknownSections: Record<string, string> = {};
    for (const part of parts) {
      if (part.key === 'תובנות מרכזיות') insight = part.text;
      else if (part.key === 'סיכום הפגישה') summary = part.text;
      else if (part.key === 'נושאים מרכזיים') {
        topics = part.text.split('\n').map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
      } else if (part.key === 'דגלי סיכון') {
        const dm = /^\*\(([^)]+)\)\*/m.exec(part.text);
        const lm = /^\*\*([^*]+)\*\*\s*[—–-]\s*(.+)$/m.exec(part.text);
        if (lm) {
          risk = { label: lm[1].trim(), levelKey: riskLevelKey(lm[1]), text: lm[2].trim(), disclaimer: dm ? '(' + dm[1] + ')' : null };
        } else if (part.text.trim()) {
          issues.push('session_summaries.md: פגישה ' + num + ' · דגלי סיכון בפורמט לא מזוהה');
          unknownSections[part.key] = part.text; // preserve rather than discard
        }
      } else if (part.key === 'לתשומת לב') attention = part.text.trim() || null;
      else unknownSections[part.key] = part.text; // future sections — preserved
    }
    out.set(num, { num, title, date, time, durationMin, insight, summary, topics, risk, attention, unknownSections });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Assembly — group files by folder, merge the two views of each session.
// ---------------------------------------------------------------------------

function buildRepo(files: Record<string, string>): RepoPatient[] {
  const byFolder = new Map<string, Record<string, string>>();
  for (const [path, content] of Object.entries(files)) {
    const m = /\.\/mock_patients\/([^/]+)\/([^/]+)\.md$/.exec(path);
    if (!m) continue;
    const folder = m[1];
    if (!byFolder.has(folder)) byFolder.set(folder, {});
    byFolder.get(folder)![m[2]] = content;
  }

  const patients: RepoPatient[] = [];
  for (const [folder, docs] of [...byFolder.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const issues: string[] = [];
    try {
      const recorded = docs.recorded_sessions
        ? parseRecorded(docs.recorded_sessions, issues)
        : (issues.push('recorded_sessions.md חסר'), null);
      const summaries = docs.session_summaries
        ? parseSummaries(docs.session_summaries, issues)
        : (issues.push('session_summaries.md חסר'), new Map<number, SummaryEntry>());
      for (const key of Object.keys(docs)) {
        if (key !== 'recorded_sessions' && key !== 'session_summaries') {
          issues.push('קובץ לא מוכר במאגר: ' + key + '.md (נשמר, לא מפורש)');
        }
      }

      // Union of session numbers from both files — nothing dropped, no duplicates.
      const nums = new Set<number>([...(recorded?.sessions.keys() || []), ...summaries.keys()]);
      const sessions: RepoSession[] = [...nums].sort((a, b) => a - b).map((num) => {
        const rec = recorded?.sessions.get(num);
        const sum = summaries.get(num);
        if (!rec) issues.push('מפגש ' + num + ' קיים רק בסיכומים');
        if (!sum) issues.push('מפגש ' + num + ' קיים רק בהקלטות');
        return {
          id: folder + '#' + num,
          num,
          title: sum?.title || rec?.title || '',
          date: sum?.date || '',
          time: sum?.time || '',
          durationMin: sum?.durationMin ?? null,
          recording: rec?.recording || '',
          therapistNote: rec?.therapistNote || '',
          insight: sum?.insight || '',
          summary: sum?.summary || '',
          topics: sum?.topics || [],
          risk: sum?.risk || null,
          attention: sum?.attention ?? null,
          nextFocus: rec?.nextFocus ?? null,
          unknownSections: sum?.unknownSections || {},
        };
      });

      patients.push({
        id: folder,
        folder,
        name: recorded?.name || folder,
        gender: recorded?.gender ?? null,
        approach: recorded?.approach ?? null,
        background: recorded?.background ?? null,
        sessions,
        unknownIntro: recorded?.unknownIntro || {},
        parseIssues: issues,
      });
    } catch (e: any) {
      // Fail-soft: a broken patient folder is reported, the rest still load.
      patients.push({
        id: folder, folder, name: folder, gender: null, approach: null, background: null,
        sessions: [], unknownIntro: {}, parseIssues: [...issues, 'שגיאת פירוש: ' + (e?.message || String(e))],
      });
    }
  }
  return patients;
}

// Parsed once per module load (build-time content — never changes at runtime).
const REPO: RepoPatient[] = buildRepo(FILES);

/** Every repository patient, ordered by folder name. */
export function repoPatients(): RepoPatient[] {
  return REPO;
}

export function repoPatient(id: string): RepoPatient | undefined {
  return REPO.find((p) => p.id === id);
}

/** Non-fatal parse issues across the whole repository (for tests/diagnostics). */
export function repoParseIssues(): { patientId: string; issue: string }[] {
  return REPO.flatMap((p) => p.parseIssues.map((issue) => ({ patientId: p.id, issue })));
}

// ---------------------------------------------------------------------------
// Follow-up tasks — extracted, never invented.
// ---------------------------------------------------------------------------

/**
 * Actionable follow-ups from the dataset: every explicit לתשומת לב note and
 * every "לפעם הבאה" focus stated in a recording. Priority derives from the
 * session's own risk bucket when present; due dates are never stated in the
 * dataset and therefore stay null.
 */
export function repoTasks(): RepoTask[] {
  const tasks: RepoTask[] = [];
  for (const p of REPO) {
    for (const s of p.sessions) {
      if (s.attention) {
        tasks.push({
          id: p.id + '#' + s.num + ':attention', patientId: p.id, patientName: p.name,
          sessionNum: s.num, title: 'לתשומת לב', description: s.attention,
          priority: s.risk ? (s.risk.levelKey as RepoTask['priority']) : null,
          status: 'open', dueDate: null, category: 'attention', sessionDate: s.date,
        });
      }
      if (s.nextFocus) {
        tasks.push({
          id: p.id + '#' + s.num + ':follow-up', patientId: p.id, patientName: p.name,
          sessionNum: s.num, title: 'המשך טיפול · מפגש ' + s.num, description: s.nextFocus,
          priority: s.risk ? (s.risk.levelKey as RepoTask['priority']) : null,
          status: 'open', dueDate: null, category: 'follow-up', sessionDate: s.date,
        });
      }
    }
  }
  return tasks;
}
