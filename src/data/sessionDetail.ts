// Per-session demo content — insight + transcript excerpts for detail & prep report.
import { sessionSummaries } from './sessions';
import { PATIENT_SESSION_CONTENT } from './patientSessionContent';

// Shared "full AI summary" content — main topics + risk flags. Repository
// patients carry their own per-session נושאים מרכזיים and דגלי סיכון (verbatim
// from the dataset); patients outside the repository remain empty.
export const SESSION_MAIN_TOPICS: string[] = [];

export interface RiskFlag { level: string; color: string; bg: string; text: string }
export const SESSION_RISK_FLAGS: RiskFlag[] = [];

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
  return '';
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

export function sessionSummaryText(p: { id?: string } | undefined, index: number): string {
  const summaries = sessionSummaries(p);
  return summaries.length ? summaries[index % summaries.length] : '';
}


/** Index in the session list (0 = most recent) for a session number within a total count. */
export function sessionIndexForNum(sessionNum: number, total: number): number {
  return total - sessionNum;
}
