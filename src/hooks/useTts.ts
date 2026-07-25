// Text-to-speech via the Web Speech API (a browser built-in — no dependency,
// no backend). Speaks Hebrew UI content aloud for the "audio recap" affordances.
// Degrades gracefully: `supported` is false when the API is absent (older or
// embedded browsers, jsdom), so callers hide the control instead of offering a
// dead button. Any in-flight speech is cancelled on unmount.
import { useCallback, useEffect, useRef, useState } from 'react';

interface TtsController {
  supported: boolean
  speaking: boolean
  /** How far into the current utterance, 0-100. Zero while idle. */
  progress: number
  /** True once `onboundary` fired for the current utterance — some browsers never do. */
  boundarySupported: boolean
  speak: (text: string) => void
  stop: () => void
  toggle: (text: string) => void
}

export function useTts(): TtsController {
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';
  const [speaking, setSpeaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [boundarySupported, setBoundarySupported] = useState(false);
  const supportedRef = useRef(supported);
  supportedRef.current = supported;

  const stop = useCallback(() => {
    if (!supportedRef.current) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setProgress(0);
  }, []);

  const speak = useCallback((text: string) => {
    if (!supportedRef.current || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    // `onboundary` is the only progress signal the Web Speech API offers, and not
    // every browser fires it. Track whether it did, so the UI can show a real
    // position instead of a bar frozen at zero during playback.
    u.onboundary = (e: SpeechSynthesisEvent) => {
      setBoundarySupported(true);
      setProgress(Math.min(100, (e.charIndex / text.length) * 100));
    };
    u.onend = () => { setSpeaking(false); setProgress(100); };
    u.onerror = () => { setSpeaking(false); setProgress(0); };
    setSpeaking(true);
    setProgress(0);
    setBoundarySupported(false);
    window.speechSynthesis.speak(u);
  }, []);

  const toggle = useCallback((text: string) => {
    if (speaking) stop();
    else speak(text);
  }, [speaking, speak, stop]);

  // Stop any speech when the consuming component unmounts.
  useEffect(() => () => { if (supportedRef.current) window.speechSynthesis?.cancel(); }, []);

  return { supported, speaking, progress, boundarySupported, speak, stop, toggle };
}
