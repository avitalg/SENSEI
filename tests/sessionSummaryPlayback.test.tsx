// Session-summary playback: inside the session-detail screen the therapist can
// hear THIS specific session's summary (speech synthesis of the real summary
// text), scoped to the shown session — its aria-label carries the session
// number + date, never a patient-level blurb. The control appears only when the
// Web Speech API is supported, and toggles play → stop.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
const settle = () => act(() => new Promise((r) => setTimeout(r, 100)));
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

function mountSession() {
  window.location.hash = '#/session/p5/5';
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'session', patientId: 'p5', sessionNum: 5 }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

const playBtn = () => [...document.querySelectorAll('button')].find(
  (b) => b.getAttribute('aria-label')?.startsWith('השמעת סיכום פגישה'),
) as HTMLElement | undefined;

describe('session detail — per-session summary playback', () => {
  it('speaks this session\'s summary and toggles to stop, with session-scoped label', async () => {
    const { synth } = stubSpeech();
    mountSession();
    await settle();

    const btn = await waitFor(() => { const b = playBtn(); expect(b).toBeTruthy(); return b!; });
    // the label ties playback to the specific session (number + date), not the patient
    expect(btn.getAttribute('aria-label')).toContain('פגישה 5');

    fireEvent.click(btn);
    expect(synth.speak).toHaveBeenCalledTimes(1);

    // flips to a stop toggle while playing
    const stop = document.querySelector('[aria-label="עצירת השמעת סיכום הפגישה"]') as HTMLElement;
    expect(stop).toBeTruthy();
    expect(stop.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(stop);
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('renders no playback control when the Web Speech API is absent (no dead button)', async () => {
    mountSession();
    await settle();
    await waitFor(() => expect(document.querySelector('#main-content')?.textContent).toContain('סיכום הפגישה'));
    expect(playBtn()).toBeFalsy();
  });
});
