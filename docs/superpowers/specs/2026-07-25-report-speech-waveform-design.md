# Voice-brief waveform synced to speech — design

**Date:** 2026-07-25
**Scope:** `ReportPage` (desktop) + `MobilePrepReport` (mobile), voice brief.

## Problem

Commit `d2b969c` replaced the prep report's fake audio brief — 32 sine-height
bars, a hardcoded `1:48` duration, and a `setInterval` that advanced
`S.briefProgress` — with a real browser-TTS control (`useMeetingReportSpeech` →
`useTts`). The graph was deleted because it described audio that never existed.

Bring the graph back, this time driven by the speech that actually plays: the
fill sweeps across the bars over the estimated reading time and empties when the
voice stops.

## Decisions

| Question | Decision |
| --- | --- |
| Sync fidelity | Estimated duration animated with `requestAnimationFrame`; no `onboundary` word-sync (unreliable across engines, flakier for Hebrew) |
| Bar behavior | Progress fill only — fixed-height bars, filled up to the playhead. No equalizer bounce |
| Timer | Dropped. Elapsed/total would publish a derived estimate as if it were fact |
| Progress owner | `useMeetingReportSpeech`. `useTts` stays unchanged, so its four other consumers (`Dialogs`, `PatientPage`, `DashboardPage`) are untouched |
| Shells | Both desktop and mobile |

## Hook — `src/hooks/useMeetingReportSpeech.ts`

Contract grows one field:

```ts
interface MeetingReportSpeechController {
  supported: boolean
  speaking: boolean
  progress: number   // 0–100
  toggle: () => void
}
```

- `estimateSpeechSeconds(text)` is exported from the same file:
  `text.length / CHARS_PER_SEC`, floored at 3 seconds. `CHARS_PER_SEC ≈ 14`
  approximates Hebrew at the default speech rate. One constant, one home.
- An effect watches `speaking`. On `false → true` it snapshots
  `performance.now()` plus the estimate and starts an rAF loop that sets
  `progress = min(99, elapsed / estimate * 100)`. On `true → false` — speech
  ended or the user stopped it — it cancels the loop and resets `progress` to 0.
- The 99 cap keeps the bars from reading "done" mid-sentence; the real `onend`
  is what empties them.
- The estimate is frozen at start, so text changing mid-read cannot make the
  fill jump.
- `cancelAnimationFrame` on unmount.

## Component — `src/components/shared/SpeechWaveform.tsx`

Props `{ progress: number, bars?: number }`, `bars` defaulting to 32.

- `aria-hidden="true"`. The bars are decorative: playback state is already
  announced by the button's `aria-pressed` and the "מקריאים עכשיו…" label.
- Bar height reuses the original formula, `10 + |sin(i * 1.3)| * 22`, but
  normalized to a **percentage** of the container:
  `(10 + |sin(i * 1.3)| * 22) / 32 * 100` → roughly 31%–100%. Container height
  comes from CSS, so one formula serves both shells at different sizes.
- Fill: `i / bars * 100 <= progress ? var(--primary) : var(--primary-border)`.
  Tokens only, no hex.
- The document is RTL, so index 0 renders at the start (right) edge and the
  sweep runs in reading order — the same direction as the original graph.
- No CSS transition on the bars: each step is ~3% of the width, so the motion is
  already discrete and needs no reduced-motion special case.

## Integration

- **`ReportPage`** — the waveform returns to the voice-brief card, under the
  title row, always visible. Idle renders every bar muted. The timer and the
  `1:48` string stay gone.
- **`MobilePrepReport`** — a compact wave (`bars={20}`, ~16px tall via a
  `.mob-speech-wave` rule in `src/components/mobile/mobile.css`) sits beside the
  speech button and renders **only while `speaking`**; the header has no room
  for an idle graph.

## Tests

- `tests/useMeetingReportSpeech.test.ts` — `progress` is 0 while idle, advances
  under fake timers/rAF, caps at 99, and resets to 0 both on manual stop and on
  the utterance's `onend`.
- `tests/meetingReportSpeech.test.tsx` — the desktop card renders 32 bars and
  the filled count tracks `progress`; the mobile wave is absent when idle and
  present while speaking.

## Docs and version

`CHANGELOG.md` gains an entry for the user-visible change, and
`package.json` (currently 1.62.5) plus the README badge are bumped to match —
the canonical guard in `tests/canonical.test.ts` requires all three to agree.

## Out of scope

Word-level `onboundary` sync, per-word highlighting of the report text, audio
scrubbing, and any change to `useTts` or its other consumers.
