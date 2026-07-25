// Voice playback for the prep-report quick summary — browser-native Web Speech
// (useTts), shared by the desktop and mobile prep report so the toggle behavior
// stays a single source of truth between the two shells.
//
// `progress` drives the voice-brief waveform. The Web Speech API exposes no
// duration and no reliable position (word `onboundary` events are inconsistent
// across engines, more so for Hebrew), so progress is animated over an estimate
// derived from the text length and corrected by the real `onend`.
import { useEffect, useRef, useState } from 'react';
import { useTts } from './useTts';

// Rough Hebrew speaking pace at the default utterance rate. Only used to pace
// the waveform — the utterance's own `onend` is what declares playback over.
const CHARS_PER_SEC = 14;
const MIN_SPEECH_SECONDS = 3;
// Held just below 100 so the bars never read "finished" mid-sentence.
const MAX_PROGRESS = 99;

export function estimateSpeechSeconds(text: string): number {
  return Math.max(MIN_SPEECH_SECONDS, text.trim().length / CHARS_PER_SEC);
}

export interface MeetingReportSpeechSections {
  patientName: string
  intro: string
  summary?: string | null
  followUpPoints?: string[]
  sessionGoals?: string[]
}

const SENTENCE_END_RE = /[.!?]\s*$/;

// The list items are plain phrases with no guaranteed trailing punctuation —
// without this a TTS engine runs the last item straight into whatever
// follows with no pause.
function ensureSentenceEnd(text: string): string {
  const trimmed = text.trimEnd();
  return SENTENCE_END_RE.test(trimmed) ? trimmed : trimmed + '.';
}

// Single source for what the voice brief reads aloud — desktop ReportPage and
// MobilePrepReport both build their spoken text through this so the two stay
// in sync as report sections change. Section headings are spoken so the list
// items don't run together as one undifferentiated block.
export function buildMeetingReportSpeechText(sections: MeetingReportSpeechSections): string {
  const { patientName, intro, summary, followUpPoints = [], sessionGoals = [] } = sections;
  let text = patientName + '. ' + intro;
  if (summary) text += ' מהפגישה הקודמת: ' + summary;
  if (followUpPoints.length) {
    text += ' ' + ensureSentenceEnd('נקודות למעקב: ' + followUpPoints.join('. '));
  }
  if (sessionGoals.length) {
    // Explicit pause before the next heading — join(' ') elsewhere in this
    // function reads as one continuous sentence, which ran the follow-up
    // list straight into "מטרות לפגישה הקרובה" with no breathing room.
    text += '\n\n' + 'מטרות לפגישה הקרובה: ' + sessionGoals.join('. ');
  }
  return text;
}

export interface MeetingReportSpeechController {
  supported: boolean
  speaking: boolean
  /** 0–100, swept over the estimated reading time; back to 0 once speech stops. */
  progress: number
  toggle: () => void
}

export function useMeetingReportSpeech(reportText: string): MeetingReportSpeechController {
  const tts = useTts();
  const [progress, setProgress] = useState(0);
  const textRef = useRef(reportText);
  textRef.current = reportText;

  // The estimate is snapshotted when speech starts, so text changing mid-read
  // cannot make the fill jump backwards or forwards.
  useEffect(() => {
    if (!tts.speaking) { setProgress(0); return; }
    const startedAt = performance.now();
    const totalMs = estimateSpeechSeconds(textRef.current) * 1000;
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      setProgress(Math.min(MAX_PROGRESS, (elapsed / totalMs) * 100));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tts.speaking]);

  return {
    supported: tts.supported,
    speaking: tts.speaking,
    progress,
    toggle: () => tts.toggle(reportText),
  };
}
