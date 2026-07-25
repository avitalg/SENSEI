// The spoken form of the session-prep report ("תקציר קולי מהיר").
// Pure: takes the same content the report page renders and returns the Hebrew
// text the browser reads aloud, so what the therapist sees is what they hear.
// A section with no data is dropped entirely — a heading spoken into silence
// ("נקודות למעקב." then nothing) reads as a bug to the listener.

export interface ReportBriefInput {
  patientName: string
  /** Spoken form of the next meeting ("יום שני, 6 ביולי"), never the 06.07.2026 chip. */
  nextMeetingWhen?: string
  intro: string
  lastSummary: string
  followUps: string[]
  goals: string[]
  questions: string[]
}

/** Close a spoken clause so the synthesizer pauses between sections. */
function sentence(text: string): string {
  const t = String(text || '').trim();
  if (!t) return '';
  return /[.!?…]$/.test(t) ? t : t + '.';
}

function section(title: string, items: string[]): string {
  const parts = items.map(sentence).filter(Boolean);
  return parts.length ? title + '. ' + parts.join(' ') : '';
}

export function buildReportBriefText(input: ReportBriefInput): string {
  const name = String(input.patientName || '').trim();
  const lines = [
    name ? 'תקציר הכנה לפגישה עם ' + name + '.' : 'תקציר הכנה לפגישה.',
    input.nextMeetingWhen ? 'הפגישה הבאה: ' + sentence(input.nextMeetingWhen) : '',
    section('סקירה מהירה', [input.intro || '']),
    section('סיכום הפגישה הקודמת', [input.lastSummary || '']),
    section('נקודות למעקב', input.followUps || []),
    section('מטרות לפגישה הקרובה', input.goals || []),
    section('שאלות מוצעות למפגש', input.questions || []),
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * How long the brief takes to read aloud, in seconds. The Web Speech API exposes
 * no duration before (or during) playback, so this is an estimate from the word
 * count at the default rate — roughly 150 words per minute — and the UI labels it
 * as one ("כ-2:10"). Never presented as an exact runtime.
 */
export function estimateSpeechSeconds(text: string): number {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  return Math.max(1, Math.ceil(words / 2.5));
}
