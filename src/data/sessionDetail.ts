// Per-session demo content — insight + transcript excerpts for detail & prep report.
import { sessionSummaries } from './sessions';
import { PATIENT_SESSION_CONTENT } from './patientSessionContent';

const INSIGHTS = [
  'נצפה שימוש עצמאי בכלי ויסות תחת לחץ. כדאי לחזק את חוויית המסוגלות ולקשר אותה לאירועים עתידיים.',
  'חרדת הביצוע עדיין מניעה הימנעות, אך יש סימני התמודדות מוצלחת. המשך חשיפה הדרגתית מומלץ.',
  'עלו קשיים ביחסים בין-אישיים וגבולות. רגישות רגשית גבוהה מהממוצע בפגישות קודמות.',
  'מצב רוח ירוד יחסית. כדאי לבחון טריגרים מהשבוע האחרון.',
  'התקדמות יציבה במטרות הטיפול. דווח על שימוש עצמאי בכלים.',
  'דפוסי התקשרות ממשפחת המוצא עדיין משפיעים. נדרש ויסות במהלך העיבוד.',
  'מוטיבציה גבוהה לשינוי. זמן טוב להגדרת מטרות לרבעון הקרוב.',
  'פגישת פתיחה: מיפוי תלונות, ציפיות וקצב טיפולי מתאים.',
];


// Shared "full AI summary" content — main topics + risk flags. Repository
// patients carry their own per-session נושאים מרכזיים and דגלי סיכון (verbatim
// from the dataset); the generic constants remain only as the fallback for
// user-created patients outside the repository.
export const SESSION_MAIN_TOPICS = ['חרדת ביצוע במצבים חברתיים-מקצועיים', 'הפרעות שינה סביב אירועים מלחיצים', 'שימוש מוצלח בכלי ויסות עצמי', 'תחושת מסוגלות וגאווה לאחר התמודדות'];

export interface RiskFlag { level: string; color: string; bg: string; text: string }
export const SESSION_RISK_FLAGS: RiskFlag[] = [
  { level: 'נמוך', color: 'var(--success)', bg: 'var(--success-bg)', text: 'לחץ נקודתי סביב אירוע ספציפי, ללא סימני מצוקה כללית. מגמה חיובית.' },
  { level: 'לתשומת לב', color: 'var(--warning)', bg: 'var(--warning-bg)', text: 'חשש מצבי עתידי שעשוי להזין דפוסי הימנעות. כדאי להמשיך לעקוב.' },
];

const RISK_TOKENS: Record<string, { color: string; bg: string }> = {
  low: { color: 'var(--success)', bg: 'var(--success-bg)' },
  medium: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  high: { color: 'var(--error)', bg: 'var(--error-bg)' },
};

/** Per-session main topics — the dataset's נושאים מרכזיים, or the generic fallback. */
export function sessionMainTopics(p: { id?: string } | unknown, index: number): string[] {
  const id = (p as { id?: string })?.id;
  const b = id ? PATIENT_SESSION_CONTENT[id] : undefined;
  const t = b?.topics?.[index];
  return t && t.length ? t : SESSION_MAIN_TOPICS;
}

/**
 * Per-session risk flags — the dataset's דגלי סיכון (its own level label +
 * explanation, colored by the normalized bucket), plus the session's לתשומת לב
 * note when present. Generic fallback for patients outside the repository.
 */
export function sessionRiskFlags(p: { id?: string } | unknown, index: number): RiskFlag[] {
  const id = (p as { id?: string })?.id;
  const b = id ? PATIENT_SESSION_CONTENT[id] : undefined;
  if (!b?.riskLabels) return SESSION_RISK_FLAGS;
  const flags: RiskFlag[] = [];
  const label = b.riskLabels[index];
  const key = b.riskKeys?.[index] || 'low';
  const text = b.riskTexts?.[index] || '';
  if (label) flags.push({ level: label, ...(RISK_TOKENS[key] || RISK_TOKENS.low), text });
  const attention = b.attention?.[index];
  if (attention) flags.push({ level: 'לתשומת לב', color: 'var(--warning)', bg: 'var(--warning-bg)', text: attention });
  return flags.length ? flags : SESSION_RISK_FLAGS;
}

export function sessionInsight(p: { id?: string } | unknown, index: number): string {
  const id = (p as { id?: string })?.id;
  const bespoke = id ? PATIENT_SESSION_CONTENT[id] : undefined;
  if (bespoke) return bespoke.insights[index % bespoke.insights.length];
  return INSIGHTS[index % INSIGHTS.length];
}

/** Bespoke session title (e.g. Simba's arc), or '' when the patient shares generic content. */
export function sessionTitle(p: { id?: string } | unknown, index: number): string {
  const id = (p as { id?: string })?.id;
  const bespoke = id ? PATIENT_SESSION_CONTENT[id] : undefined;
  return bespoke ? bespoke.titles[index % bespoke.titles.length] : '';
}

export interface SessionMeta { phase: string; protocol: string; distress: string; homework: string; focus: string; interventions: string[]; patientState: string }

/** Richer per-session clinical metadata (phase/protocol/distress/homework/focus/interventions), or null when generic. */
export function sessionMeta(p: { id?: string } | unknown, index: number): SessionMeta | null {
  const id = (p as { id?: string })?.id;
  const b = id ? PATIENT_SESSION_CONTENT[id] : undefined;
  if (!b || !b.phases) return null;
  const at = (arr?: string[]) => (arr && arr.length ? arr[index % arr.length] : '');
  return {
    phase: at(b.phases), protocol: at(b.protocols), distress: at(b.distress), homework: at(b.homework),
    focus: at(b.focus),
    interventions: at(b.interventions).split(',').map((s) => s.trim()).filter(Boolean),
    patientState: at(b.patientState),
  };
}

// The dataset's core-belief trajectory (earliest → latest restatement of the
// patient's central belief). Bespoke content only — null for generic patients.
export function beliefTrajectory(p: { id?: string } | unknown): string[] | null {
  const id = (p as { id?: string })?.id;
  const b = id ? PATIENT_SESSION_CONTENT[id] : undefined;
  return b?.beliefTrajectory && b.beliefTrajectory.length >= 2 ? b.beliefTrajectory : null;
}

export interface SessionTherapistDoc { recording: string; note: string; nextFocus: string }

/**
 * The therapist's own per-session documentation from the repository's
 * recorded_sessions.md — the dictated recording, the attached clinical note,
 * and the stated "לפעם הבאה" focus. Exact index only (never cycled): verbatim
 * clinical content must never be attributed to another session. Null for
 * patients outside the repository — nothing is invented for them.
 */
export function sessionTherapistDoc(p: { id?: string } | unknown, index: number): SessionTherapistDoc | null {
  const id = (p as { id?: string })?.id;
  const b = id ? PATIENT_SESSION_CONTENT[id] : undefined;
  if (!b?.recordings || index < 0 || index >= b.recordings.length) return null;
  const recording = b.recordings[index] || '';
  const note = b.therapistNotes?.[index] || '';
  const nextFocus = b.nextFocus?.[index] || '';
  if (!recording && !note && !nextFocus) return null;
  return { recording, note, nextFocus };
}

export function sessionSummaryText(p: { id?: string } | undefined, index: number): string {
  return sessionSummaries(p)[index % sessionSummaries(p).length];
}


/** Index in the session list (0 = most recent) for a session number within a total count. */
export function sessionIndexForNum(sessionNum: number, total: number): number {
  return total - sessionNum;
}
