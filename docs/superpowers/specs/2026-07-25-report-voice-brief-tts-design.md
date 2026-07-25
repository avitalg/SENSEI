# Voice brief on the prep report — real speech instead of a mock player

**Date:** 2026-07-25
**Status:** approved, not yet implemented

## Problem

`ReportPage`'s "תקציר קולי מהיר" card plays nothing. `ReportPage.tsx:236-248`
runs a `setInterval` that raises `S.briefProgress` by 2 every 120ms, fills 32
sine-wave bars, and counts up to a hardcoded "1:48". No audio exists. The
therapist presses play and hears silence.

`DashboardPage`'s "סיכום יומי" already solves this correctly: `useTts()` — the
Web Speech API wrapper in `src/hooks/useTts.ts` — speaks generated Hebrew text
(`dailyRecapText`, `DashboardPage.tsx:150`), the button is gated on
`tts.supported`, carries `aria-pressed`, and flips its icon and label to
"עצירה" while speaking. `PatientPage.tsx:47` and `Dialogs.tsx:100` follow the
same pattern.

This spec brings the report card onto that pattern and makes it speak the
report's own content.

## Scope

In: `ReportPage`'s voice-brief card, a progress extension to `useTts`, a new
pure text builder, tests, changelog.

Out: `MobilePrepReport` (has no brief card today), any backend audio, any
change to the three existing TTS consumers.

## Design

### 1. `useTts` gains progress

```ts
interface TtsController {
  supported: boolean
  speaking: boolean
  progress: number            // 0-100; 0 when idle
  boundarySupported: boolean  // true once onboundary fires for the current utterance
  speak: (text: string) => void
  stop: () => void
  toggle: (text: string) => void
}
```

`speak()` resets `progress` to 0 and `boundarySupported` to false, then attaches
`u.onboundary = (e) => { setBoundarySupported(true); setProgress(Math.min(100,
(e.charIndex / text.length) * 100)) }`. `onend` sets `progress` to 100;
`stop()` returns it to 0.

The hook stays the single speech implementation in the codebase. A second hook
would duplicate the cancel/lifecycle/`he-IL` logic and trip the CI duplication
guard. The three existing consumers read neither new field and are untouched.

Browsers differ on `onboundary`: some fire word boundaries, some never fire it.
`boundarySupported` makes that difference visible to the UI instead of leaving a
progress bar frozen at zero during playback.

### 2. `src/data/reportBrief.ts` — pure leaf module

```ts
export interface ReportBriefInput {
  patientName: string
  nextMeetingWhen?: string
  intro: string
  lastSummary: string
  followUps: string[]
  goals: string[]
  questions: string[]
}
export function buildReportBriefText(input: ReportBriefInput): string
export function estimateSpeechSeconds(text: string): number
```

`buildReportBriefText` emits labeled Hebrew sections in the page's own order —
סקירה מהירה, סיכום הפגישה הקודמת, נקודות למעקב, מטרות לפגישה הקרובה, שאלות
מוצעות למפגש — and **skips any section whose data is empty**, so a live report
without follow-ups never announces "נקודות למעקב" into silence. What the page
shows is what the card speaks.

Shape:

> תקציר הכנה לפגישה עם {name}. הפגישה הבאה: {when}. סקירה מהירה. {intro} סיכום
> הפגישה הקודמת. {lastSummary} נקודות למעקב. {a}. {b}. …

The spoken date is `nextWhenHint` (`formatMeetingWhen`, e.g. "יום שני, 6 ביולי"),
never the `06.07.2026` chip — he-IL speech synthesis reads the numeric form as
disconnected digits. With no next meeting the sentence is dropped.

`estimateSpeechSeconds` returns `Math.ceil(words / 2.5)` — roughly 150 wpm, the
Web Speech default at `rate: 1`. It is an estimate and is labeled as one.

Both functions are pure, so they unit-test on plain strings without a jsdom
speech stub, and `MobilePrepReport` can adopt them later without touching
`ReportPage`. As a leaf module under `data/`, it must not import from `pages/`,
`components/`, or `store/`.

### 3. The card

Removed: `bTimer`, the interval inside `toggleBrief`, `secs`/`briefCur`, and
the `briefPlaying` / `briefProgress` keys in `src/data/seed.ts:49`. Nothing else
in the codebase reads those two keys.

Added: `const tts = useTts()` and a `briefText` memo built from the memos the
page already computes — `reportIntro`, `lastSummary`, `followUpPoints`,
`sessionGoals`, `suggestedQuestions`, `cpView.name`, `nextWhenHint`.

The card keeps its frame and its "תקציר קולי מהיר" heading in all three states:

| State | UI |
| --- | --- |
| `!tts.supported` | Heading plus "הקראה קולית אינה נתמכת בדפדפן זה". No button, no bars. |
| Speaking, boundaries firing | Play icon becomes pause; bars fill by `tts.progress`; counter reads `{elapsed} / כ-{est}`, where `elapsed = Math.round(progress / 100 * est)`. |
| Speaking, no boundaries | Bars pulse (CSS in `report.css`; the global `prefers-reduced-motion` rule in `tokens.css:117` flattens it). The counter row is hidden — no number the page cannot back up. |

The button carries `aria-pressed={tts.speaking}` and an `aria-label` that flips
between "הקראת תקציר הדוח" and "עצירת ההקראה", matching the Dashboard wording.
The subtitle becomes `הקשבה מהירה בין פגישות · כ-{est} דקות`.

Two lifecycle guards:

- A `useEffect` on `cp.id` calls `tts.stop()`, so patient A's report is not
  narrated over patient B's page.
- `onRegenerate` stops speech before refetching — the text is about to change
  underneath the utterance.

### Error handling

`useTts` already clears `speaking` on `onerror` and cancels in-flight speech on
unmount; progress resets through the same paths. A live report that fails still
renders the demo body (existing `liveFailed` behavior), and the brief speaks
that demo content — consistent with what the page displays.

## Tests

Follow the mock-`speechSynthesis` pattern already established in
`tests/tts.test.ts`, `tests/patientRecapTts.test.tsx`, and
`tests/sessionRecapTts.test.tsx`. Do not introduce a second stub.

1. **`tests/reportBrief.test.ts`** (new, pure) — the text includes the patient
   name and the intro; an empty follow-ups or questions list drops that section
   heading entirely; no `nextMeetingWhen` drops the date sentence;
   `estimateSpeechSeconds` is positive and grows with length.
2. **`tests/tts.test.ts`** (extended) — an `onboundary` event at a known
   `charIndex` yields the matching `progress`; `boundarySupported` is false
   until the first boundary; `stop()` zeroes `progress`.
3. **`tests/reportBriefTts.test.tsx`** (new, page) — unsupported renders the
   honest message and no button; supported speaks text containing the patient
   name and a follow-up point; a second click stops; switching patient stops
   speech.
4. **`tests/reportNav.test.tsx`** — unchanged; the heading still renders.

## Docs

`CHANGELOG.md` gains a `## [1.63.0]` section (Changed: real narration replaces
the mock player). `package.json` and the README badge bump with it — the
version-consistency guard in `tests/canonical.test.ts` requires all three to
match. `docs/ADR.md` records why the card uses boundary progress and an
estimated duration rather than a real audio file: no backend, no new dependency.

Gate: `npm run lint && npm run typecheck && npm test && npm run build`.
