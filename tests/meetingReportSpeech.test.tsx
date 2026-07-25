// Prep-report "play/pause" button — both the desktop ReportPage and the mobile
// MobilePrepReport speak the current report summary via the browser's Web
// Speech API (useMeetingReportSpeech → useTts), not a static demo audio file
// or a backend call. The button state mirrors tts.speaking.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));

function setMobile(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

afterEach(() => {
  cleanup(); localStorage.clear(); window.location.hash = '';
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
  vi.restoreAllMocks();
});

function stubSpeech() {
  const spoken: string[] = [];
  (window as any).speechSynthesis = { speak: vi.fn((u: any) => spoken.push(u.text)), cancel: vi.fn() };
  (window as any).SpeechSynthesisUtterance = class {
    lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
    constructor(public text: string) {}
  };
  return { spoken, synth: (window as any).speechSynthesis };
}

const playLabel = 'הקראת תקציר הדוח';
const stopLabel = 'עצירת ההקראה';
const playBtn = () => document.querySelector(`[aria-label="${playLabel}"]`) as HTMLElement;
const stopBtn = () => document.querySelector(`[aria-label="${stopLabel}"]`) as HTMLElement;

describe('desktop prep report — voice brief via browser TTS', () => {
  it('toggles speech via tts.toggle instead of playing a demo file or calling a backend', async () => {
    const { spoken, synth } = stubSpeech();
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(playBtn(), 'a speech play control renders on the report').toBeTruthy());

    fireEvent.click(playBtn());
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]).toContain('דנה לוי');

    const stop = stopBtn();
    expect(stop, 'flips to a stop toggle while speaking').toBeTruthy();
    expect(stop.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(stop);
    expect(synth.cancel).toHaveBeenCalled();
    await waitFor(() => expect(playBtn(), 'back to the play control after stopping').toBeTruthy());
  });

  it('hides the control when the Web Speech API is absent', async () => {
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('דוח הכנה לפגישה'));
    expect(playBtn(), 'no dead button without TTS support').toBeFalsy();
    expect(document.querySelector('.speech-wave'), 'no waveform without a reader').toBeFalsy();
  });

  it('shows the voice-brief waveform in the card, muted until the reader starts', async () => {
    stubSpeech();
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(playBtn()).toBeTruthy());

    const wave = () => document.querySelector('.speech-wave');
    expect(wave(), 'the graph is part of the card at rest too').toBeTruthy();
    expect(wave()!.children).toHaveLength(32);

    fireEvent.click(playBtn());
    expect(wave(), 'and stays while the report is read aloud').toBeTruthy();
  });
});

describe('mobile prep report — voice brief via browser TTS', () => {
  it('toggles speech via tts.toggle instead of playing a demo file or calling a backend', async () => {
    setMobile(true);
    const { spoken, synth } = stubSpeech();
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(playBtn(), 'a speech play control renders on the mobile prep report').toBeTruthy());

    fireEvent.click(playBtn());
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]).toContain('דנה לוי');

    const stop = stopBtn();
    expect(stop, 'flips to a stop toggle while speaking').toBeTruthy();
    expect(stop.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(stop);
    expect(synth.cancel).toHaveBeenCalled();
    await waitFor(() => expect(playBtn(), 'back to the play control after stopping').toBeTruthy());
  });

  it('shows the compact waveform only while the report is being read', async () => {
    setMobile(true);
    stubSpeech();
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(playBtn()).toBeTruthy());
    expect(document.querySelector('.mob-speech-wave'), 'idle header stays uncluttered').toBeFalsy();

    fireEvent.click(playBtn());
    const wave = document.querySelector('.mob-speech-wave .speech-wave');
    expect(wave, 'compact graph appears next to the stop button').toBeTruthy();
    expect(wave!.children).toHaveLength(20);

    fireEvent.click(stopBtn());
    await waitFor(() => expect(document.querySelector('.mob-speech-wave')).toBeFalsy());
  });

  it('hides the control when the Web Speech API is absent', async () => {
    setMobile(true);
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(document.querySelector('.mob-screen')).toBeTruthy());
    expect(playBtn(), 'no dead button without TTS support').toBeFalsy();
  });
});
