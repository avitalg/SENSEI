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
