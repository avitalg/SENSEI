// SpeechWaveform — the voice-brief bars. Fill tracks the playback position
// reported by useMeetingReportSpeech, so a bar is lit once the playhead has
// passed it. Decorative: the play/stop button carries the accessible state.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import SpeechWaveform from '../src/components/shared/SpeechWaveform';

afterEach(cleanup);

const bars = () => Array.from(document.querySelectorAll('.speech-wave > div')) as HTMLElement[];
const litCount = () => bars().filter((b) => b.style.background === 'var(--primary)').length;

describe('SpeechWaveform', () => {
  it('renders 32 bars by default and accepts a compact count', () => {
    render(<SpeechWaveform progress={0} />);
    expect(bars()).toHaveLength(32);
    cleanup();
    render(<SpeechWaveform progress={0} bars={20} />);
    expect(bars()).toHaveLength(20);
  });

  it('lights bars up to the playhead and leaves the rest muted', () => {
    render(<SpeechWaveform progress={50} bars={20} />);
    // Half the read → half the bars, plus the one the playhead sits on.
    expect(litCount()).toBe(11);
    expect(bars()[19].style.background).toBe('var(--primary-border)');
  });

  it('is empty at rest and full at the end of the read', () => {
    render(<SpeechWaveform progress={0} bars={20} />);
    expect(litCount(), 'only the leading bar at 0%').toBe(1);
    cleanup();
    render(<SpeechWaveform progress={100} bars={20} />);
    expect(litCount()).toBe(20);
  });

  it('is hidden from assistive tech — the play/stop button announces the state', () => {
    render(<SpeechWaveform progress={40} />);
    expect(document.querySelector('.speech-wave')?.getAttribute('aria-hidden')).toBe('true');
  });
});
