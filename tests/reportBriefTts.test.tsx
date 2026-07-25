// The prep report's "תקציר קולי מהיר" reads the report aloud through the browser's
// speech synthesis (no backend, no audio file). Without Web Speech the card states
// that plainly instead of offering a control that plays nothing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => {
  cleanup(); localStorage.clear(); window.location.hash = '';
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
});

function stubSpeech() {
  const spoken: string[] = [];
  (window as any).speechSynthesis = { speak: vi.fn((u: any) => spoken.push(u.text)), cancel: vi.fn() };
  (window as any).SpeechSynthesisUtterance = class {
    lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
    onboundary: ((e: any) => void) | null = null;
    constructor(public text: string) {}
  };
  return { spoken, synth: (window as any).speechSynthesis };
}
const playBtn = () => document.querySelector('[aria-label="הקראת תקציר הדוח"]') as HTMLElement;

describe('prep report — voice brief', () => {
  it('speaks the report content and stops on second press', async () => {
    const { spoken, synth } = stubSpeech();
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(playBtn(), 'a play control renders in the report').toBeTruthy());

    fireEvent.click(playBtn());
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]).toContain('דנה לוי');
    expect(spoken[0]).toContain('סקירה מהירה');
    expect(spoken[0]).toContain('סיכום הפגישה הקודמת');
    expect(spoken[0]).toContain('מטרות לפגישה הקרובה');

    const stop = document.querySelector('[aria-label="עצירת ההקראה"]') as HTMLElement;
    expect(stop, 'flips to a labelled stop toggle while speaking').toBeTruthy();
    expect(stop.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(stop);
    expect(synth.cancel).toHaveBeenCalled();
    await waitFor(() => expect(playBtn()).toBeTruthy());
  });

  it('says so plainly when the browser has no speech synthesis', async () => {
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('תקציר קולי מהיר'));
    expect(playBtn(), 'no dead play button without TTS support').toBeFalsy();
    expect(document.body.textContent).toContain('הקראה קולית אינה נתמכת בדפדפן זה');
  });

  it('stops speaking when the report moves to another patient', async () => {
    const { synth } = stubSpeech();
    mount({ view: 'app', route: 'report', patientId: 'p1' });
    await settle();
    await waitFor(() => expect(playBtn()).toBeTruthy());
    fireEvent.click(playBtn());
    expect(synth.speak).toHaveBeenCalledTimes(1);
    // speak() cancels any previous utterance first, so only calls *after* this
    // point prove the patient switch is what stopped the speech.
    const cancelsBefore = synth.cancel.mock.calls.length;

    const picker = document.querySelector('select') as HTMLSelectElement;
    expect(picker, 'the report has a patient picker').toBeTruthy();
    const other = Array.from(picker.options).map((o) => o.value).find((v) => v !== 'דנה לוי')!;
    fireEvent.change(picker, { target: { value: other } });
    await settle();
    expect(synth.cancel.mock.calls.length, "another patient's report never narrates over the previous one").toBeGreaterThan(cancelsBefore);
    expect(synth.speak, 'switching patient does not start a new utterance on its own').toHaveBeenCalledTimes(1);
  });
});
