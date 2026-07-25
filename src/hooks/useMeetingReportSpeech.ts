// Voice playback for the prep-report quick summary — browser-native Web Speech
// (useTts), shared by the desktop and mobile prep report so the toggle behavior
// stays a single source of truth between the two shells.
import { useTts } from './useTts';

export interface MeetingReportSpeechController {
  supported: boolean
  speaking: boolean
  toggle: () => void
}

export function useMeetingReportSpeech(reportText: string): MeetingReportSpeechController {
  const tts = useTts();
  return {
    supported: tts.supported,
    speaking: tts.speaking,
    toggle: () => tts.toggle(reportText),
  };
}
