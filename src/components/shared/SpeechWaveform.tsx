// Voice-brief waveform — fixed-height bars that fill up to the playback
// position while the browser reads a report aloud (useMeetingReportSpeech).
// Shared by the desktop ReportPage card and the mobile prep-report header so
// the bar shape and fill rule stay a single source of truth.
//
// Decorative by design: playback state is announced by the play/stop button
// (aria-pressed + label), so the bars are aria-hidden. Height comes from the
// container, letting the same component render large or compact.

// Deterministic pseudo-random skyline, normalized to a percentage of the
// container height (the original 10–32px shape over a 32px track).
const BAR_MIN_PX = 10;
const BAR_RANGE_PX = 22;
const BAR_TRACK_PX = 32;

function barHeightPct(i: number): number {
  return ((BAR_MIN_PX + Math.abs(Math.sin(i * 1.3)) * BAR_RANGE_PX) / BAR_TRACK_PX) * 100;
}

export default function SpeechWaveform({ progress, bars = 32 }: { progress: number, bars?: number }) {
  return (
    <div className="speech-wave" aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%', width: '100%' }}>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: barHeightPct(i) + '%',
            // No transition: each step is ~1/bars of the track, already discrete.
            background: (i / bars) * 100 <= progress ? 'var(--primary)' : 'var(--primary-border)',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
