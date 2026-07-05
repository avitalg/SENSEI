# Changelog — Sensei React App

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.53] — 2026-07-04

### Added — tests for the accessibility-preference appliers (no UI change)

Coverage pass targeting the last clearly-untested core feature: the **user accessibility preferences**. The
a11y suite already covers axe + keyboard combobox, but the preference *appliers* — a real WCAG feature — had
no test.

- **`tests/a11yPrefs.test.tsx` (4)** — `setA11y` / `resetA11y` write to the document root: safe defaults on
  mount, each preference toggling its `data-a11y-*` attribute (contrast/motion/focus/reading/underline), the
  text-size setting mapping to `<html>` zoom (small .9 / large 1.15 / xlarge 1.3), and `resetA11y` restoring
  every default. Drives the real store via the `useApp()` context (the `pager.test` probe pattern); no DOM
  mocks.

Confirmed the global ⌘K palette shortcut is already exercised (a11y suite dispatches the keydown), so no
redundant shortcut tests were added. Documented `patientsSearch` + `a11yPrefs` in TESTING.md and refreshed
counts. Lint 0, typecheck 0, **24→25 files / 215 tests** (3 consecutive green runs), build clean, no
backend/network/UI change.

---

## [1.0.52] — 2026-07-04

### Changed — patients-list search highlights matches (search consistency)

The patients list filtered on search but did not highlight the matched term — the same gap just fixed for
the transcript. Five list pages share this (patients, sessions, documents, resources, tasks); patients is
the highest-traffic and its search matches by **topic/focus** as well as name, so a highlight makes it
obvious *why* each patient matched (e.g. searching "חרדה" shows which patients' focus contains it).

- `PatientsPage` now renders the patient **name and focus** through the app's canonical `hlParts`
  highlighter — the same one the global search, ⌘K palette, search page, and transcript use — so search
  reads consistently across the app. Filtering, sorting, and all other behaviour are unchanged; the
  highlight uses the existing `--selection` token (no new styles/logic).
- Verified live (dark mode): searching "חרדה" highlights the term in the matched patient's focus line;
  name searches highlight the name; clearing the query removes highlighting.
- Added `tests/patientsSearch.test.tsx` (2): topic match highlights the focus, name match highlights and
  clears.

Lint 0, typecheck 0, **23→24 files / 211 tests** (3 consecutive green runs), build clean, no other change.
(The four remaining list searches — sessions/documents/resources/tasks — can adopt the same helper later;
left for a focused follow-up rather than a broad sweep.)

---

## [1.0.51] — 2026-07-04

### Added — behavioural tests for the upload flow and theme application (no UI change)

Another coverage pass targeting the remaining untested critical journeys. Two new deterministic suites; no
redundant tests, no UI/UX/logic changes, no new dependencies, no live APIs.

- **`tests/upload.test.tsx` (2)** — the audio-upload state machine (previously only `validateFile` unit +
  demo-gating): an unsupported file dropped on the zone shows the "אינו נתמך" format error (MP3/WAV/M4A),
  and a supported file leaves the idle drop zone for the processing pipeline. Drives the real `S.upload`
  store via a `drop` event; asserts the immediate state transition, not the simulated progress timer.
- **`tests/theme.test.tsx` (2)** — theme application to the document (`resolveTheme` is unit-tested pure;
  this covers the DOM side effect): the persisted preference is applied to `<html data-theme>` on load, and
  the app-bar theme control toggles light → dark.
- Also documented `transcript`/`upload`/`theme` in TESTING.md and refreshed suite counts.

Verified: lint 0, typecheck 0, production build clean, **21→23 files / 209 tests**, four consecutive green
runs (deterministic), no backend touched, no network in tests, no visual/behavioural change to the app.

---

## [1.0.50] — 2026-07-04

### Changed — transcript search now highlights matches (canonical highlighter, consistency fix)

A review of the recording/transcription module (a client-side *simulated* pipeline — no live mic/API, so
capture/permission/waveform items are N/A by design) found the module already canonical (`validateFile`,
`sessions` data, and `S.upload` state are each single-sourced; no duplication). One genuine inconsistency:
the **transcript in-viewer search only filtered lines — it did not highlight the matched term**, while the
global search, ⌘K palette, and search page all highlight via the shared `hlParts` helper.

- `TranscriptPage` now renders matched lines through the **existing canonical `hlParts`** highlighter
  (no new logic), so the matched term is bolded on the `--selection` token — identical to search everywhere
  else in the app. Filtering behaviour is unchanged. Verified live (dark mode): searching "הצגה" filters to
  the 3 matching lines and highlights the term in each, at ~7:1 contrast.
- Added `tests/transcript.test.tsx` (3): two-sided transcript renders (speaker labels + timestamps), a query
  filters *and* highlights, and clearing restores all lines with no highlight.

No other change: the module's UX, states (idle/uploading/success/error, skeleton-loading, no-results), copy,
and design-system usage were verified consistent and left intact. Lint 0, typecheck 0, **20→21 files /
205 tests**, build clean.

---

## [1.0.49] — 2026-07-04

### Fixed — public-release privacy/secrets audit: removed developer traces (no product change)

A strict pre-publish privacy/PII/secrets audit of the whole repo found no exposed secrets, credentials, or
real PII, but three developer-machine traces and one release-safety gap — all fixed. Product behavior,
UI, UX, and demo data are unchanged.

- **Local machine paths + username removed.** `.claude/launch.json` carried `"cwd":
  "/Users/lital/Desktop/sensei-app-2026"` twice, and `PORTING_GUIDE.md` embedded a
  `/private/tmp/.../-Users-lital/...` scratch path — both leaked a local username. Dropped the redundant
  `cwd` (the runner defaults to the project root) and replaced the doc path with a neutral placeholder.
- **Landing URL dropped** from a `tokens.css` comment (`https://sensei-say.netlify.app/`) — a stray deploy
  reference, comment-only, no behavior impact.
- **`.gitignore` hardened** to prevent accidental secret/local-file commits: `.env` / `.env.*` are now
  ignored while `.env.example` (the safe, empty template) stays tracked; also `.vite` and `*.log`.

Verified clean: no `lital`/local-path/secret/`netlify` references remain in tracked files (excluding the
required Heebo `OFL.txt` font license and standard `package-lock` sponsor URLs). Seed demo data (therapist
`ד״ר רותם שגב`, patients) is fictional/placeholder — intentional and left intact. Lint 0, typecheck 0,
202 tests, build clean.

---

## [1.0.48] — 2026-07-04

### Added — behavioural tests for three untested critical flows + a flaky-test fix (no UI change)

A second coverage pass over the already-mature suite (17 files / 194 tests) targeted the remaining
behavioural gaps that static guards and smoke tests did not exercise. Three new deterministic suites, no
redundant tests, no UI/UX/logic changes, no new dependencies, no live APIs.

- **`tests/routing.test.tsx` (2)** — the state-driven router's safety net: an unknown/stale `route` key
  falls back to the dashboard (no crash, no blank, not the error card), while known routes still render
  their own screen. Guards the `PAGES[route] || PAGES.dashboard` fallback.
- **`tests/globalSearch.test.tsx` (3)** — the app-bar search journey end to end: a matching query opens the
  results listbox with a selectable option, a no-match query shows the "לא נמצאו תוצאות" empty state (not a
  broken panel), and clearing the query closes it. Exercises real store + ranking.
- **`tests/patientLifecycle.test.tsx` (3)** — the highest-risk destructive flow: deleting a patient requires
  confirmation, removes the record on confirm, offers a working undo that restores it, and keeps the record
  when cancelled. The patient name is read from the confirmation dialog, so assertions hold regardless of
  list sort/pagination.
- **Flaky-test fix.** Adding three more full-`App` suites raised parallel load and exposed a latent race in
  the existing `formValidation` focus assertion (fixed 80 ms delay vs. an asynchronously-applied focus). Made
  it deterministic with `waitFor` (poll until focus lands) — the root cause, not a skip. Full suite verified
  green on three consecutive runs.

Verified: lint 0, typecheck 0, production build clean, **20 files / 202 tests**, no backend touched, no
network in tests, no visual/behavioural change to the app.

---

## [1.0.47] — 2026-07-04

### Removed — Professional Development (CPD / "התפתחות מקצועית") feature, in full

Per product decision, the Professional Development feature was removed. Footprint mapped first, then
removed with no dangling references.

- **Page & style deleted:** `CpdPage.tsx` (CPD-hours ring, license-renewal card, course cards) and `cpd.css`.
- **Navigation/routing:** the `cpd` destination removed from `navConfig` and `ROUTE_TITLES`, and from the
  lazy `PAGES` map — sidebar now **13** destinations; the "ידע ומשאבים" group keeps ספריית משאבים + מסמכים
  (non-empty, no gap). Palette + global search drop it automatically (shared `navConfig`). Content routes
  24 → **23**.
- **State:** the exclusive keys `cpdCourse` / `cpdLogged` removed from the seed and from `PERSIST_KEYS`.
  No shared state touched (`profile` etc. untouched).
- **Tests & docs:** `navConfig` contract updated (13 destinations, 23 routes; no-orphan + distinct-icon
  guards still hold); route-smoke and axe suites auto-adjusted; README, ARCHITECTURE, CONTRIBUTING, and
  TESTING route counts synced to 23.

Verified: lint 0, typecheck 0, production build clean (no broken imports), **no console errors** on a fresh
server, remaining app renders and navigates unchanged. Suite: 17 files, **194 tests**.

---

## [1.0.46] — 2026-07-04

### Added — test coverage for three real gaps + a TESTING.md guide (no UI/UX change)

A coverage review of the existing suite (15 files / 180 tests, ~87% logic-layer) found three genuine,
high-value behavioural gaps and one missing doc. Filled only those — no redundant tests for already-covered
areas, no UI/UX/logic changes, no new dependencies, no live-API calls.

- **`tests/hebrewGrammar.test.ts` (11 tests)** — the gendered-Hebrew microcopy engine (`hg` / `hgTerm`),
  which decides the grammatical gender of nearly every Hebrew string in the app, had no direct unit test.
  Now covers `[[masc|fem|neutral]]` resolution by Hebrew gender code, inline substitution, multi-token
  templates, unmarked-masculine and neutral fallbacks, liberal gender inputs, the definite-article form,
  unknown-term fallback, and graceful degradation when `window.HG` is absent. Exercises the real resolver
  (loaded by `tests/setup.ts`), not a mock.
- **`tests/authFlow.test.tsx` (5 tests)** — the login screen's client-side validation and logout teardown
  were only smoke-rendered. Now covers: malformed-email rejection (announced via `role="alert"`, fields
  `aria-invalid`), too-short-password message, valid credentials entering the loading submit state
  (button `disabled` + `aria-busy`), Enter-key submission, and logout returning to the login screen while
  closing open overlays. Timers are asserted (loading state), never advanced — deterministic, non-flaky.
- **`TESTING.md`** — the required testing guide: stack, run commands, folder structure, suite map, mocking
  strategy (why no MSW — the API layer is dormant; `fetch` is stubbed in `apiClient.test`), coverage
  expectations (logic-layer-scoped, presentational via smoke/axe), TDD workflow, and honest known
  limitations (no E2E/Playwright, no visual-regression). Linked from README; complements — does not
  duplicate — CONTRIBUTING's enforcement contract.

Verified: lint 0, typecheck 0, production build clean, **17 files / 196 tests** (was 15 / 180), no backend
files touched, no network in tests.

---

## [1.0.45] — 2026-07-04

### Fixed — documentation drift + dead code (frontend documentation audit)

A frontend documentation-accuracy audit (every doc claim verified against source) found two real drifts
and one duplicated source of truth; all resolved. No BLOCKERs — no critical behavior was undocumented or
unverifiable.

- **Dead MUI theme removed.** `src/theme/sensei-theme.js` was a MUI `createTheme` object that mirrored
  `tokens.css` and claimed to "power the authenticated system" — but it was **never imported** (verified),
  the app uses no MUI (deps are `react`/`react-dom` only), and it duplicated the color source of truth.
  Deleted the file (and the now-empty `src/theme/`), and removed the "MUI theme mirror" references from
  README and ARCHITECTURE plus the stale "MUI-palette aligned" comment in `tokens.css`. The stack is now
  internally consistent: `tokens.css` is the single, sole source of truth for color.
- **Route-count drift corrected.** After the Clinic-Management removal (1.0.44) two stragglers still read
  "26" — `ARCHITECTURE.md` ("26 lazy-loaded pages") and `README.md` ("route smoke (all 26)") — now **24**,
  matching `ROUTE_TITLES` / `ALL_ROUTES`.

Verified: lint 0, typecheck 0, production build clean (dead file removal broke nothing), 180 tests. Docs
now match the implementation; Storybook remains absent (documented debt, not claimed to exist — no drift).

---

## [1.0.44] — 2026-07-04

### Removed — Clinic Management ("המרפאה") section, in full

Per product decision, the entire "המרפאה" (The Practice) section and all its Clinic-Management
functionality were removed. Scope was mapped first, then removed with no dangling references.

- **Pages & styles deleted:** `TeamPage.tsx` (צוות המרפאה), `SupervisionPage.tsx` (סופרוויז׳ן) and their
  `team.css` / `supervision.css`.
- **Navigation:** the `המרפאה` sidebar section and its two destinations removed from `navConfig` — the
  sidebar now shows **14** destinations in three groups + the pinned utility group (no empty header, no
  layout gap). Because sidebar, ⌘K palette and global search share `navConfig`, all three drop the routes
  together.
- **Routing:** `team` / `supervision` removed from the lazy `PAGES` map and from `ROUTE_TITLES` (content
  routes 26 → **24**). A stale persisted `team`/`supervision` route now resolves via the existing
  unknown-route fallback to the dashboard — verified live (no crash, no blank screen).
- **State:** the exclusive keys `teamSearch`, `teamRole`, `supTab`, `supCaseStatus` removed from the seed,
  and `supCaseStatus` dropped from `PERSIST_KEYS`. No shared state touched.
- **Tests & docs:** `navConfig` contract updated (14 destinations, 24 routes; the no-orphan and distinct-icon
  guards still hold); route-smoke and axe suites auto-adjusted; README + CONTRIBUTING route counts updated.

Verified: lint 0, typecheck 0, production build clean (no broken imports), **no console errors** on a fresh
server, and the remaining app renders and navigates unchanged. Suite: 15 files, 180 tests. *Note:* the
Reports feature still contains an unrelated report row titled "סיכום פעילות המרפאה" (a practice-activity
report, not part of the removed section) — left intact to avoid altering a separate feature; say the word to
remove it too.

---

## [1.0.43] — 2026-07-04

### Fixed — dark-mode readability & consistency (form controls + brand accent cards)

An empirical dark-mode contrast sweep (measuring computed colours against composited backdrops, both
themes) found the headline "black text on dark input" risk was already prevented by `color-scheme`, but
surfaced four genuine gaps and closed them. Avatar-initial "failures" were confirmed **false positives**
(≥6:1 once the 0.2-alpha chip is composited) and correctly left alone.

- **Form-control text tokenized.** The app never set input/textarea/select `color` itself — entered text
  was whatever the browser's `color-scheme` chose (pure white in dark, a UA colour elsewhere), not the
  design token. Pinned `input,textarea,select` to `var(--text)` so entered text, caret and selected value
  are AA and token-consistent in both themes (dark `#E9F0FB`, light `#0C1B3B`) instead of browser-decided.
- **Brand accent cards darken in dark mode.** Five cards (Help, CPD, Report, Dashboard banner, AI-assistant
  header) painted white/`--paper` text on `linear-gradient(--primary-darker,--primary)`. In dark mode
  `--primary` lightens to `#4D94F5`, dropping small white labels to **3.06:1**. Added tokenised gradient
  stops (`--accent-grad-1/2`) that equal the primary blues in light mode but **darken in dark mode**, plus
  a constant `--on-accent` text token — so light mode is pixel-identical and dark mode is comfortably AA.
- **CPD "register" button.** Hard-coded `#fff` on `--primary` (3.06:1 in dark) → `var(--paper)` like every
  other primary button (5.33:1), correct in both themes.
- **Support-email pill.** White pill with `var(--primary)` text fell to 3.06:1 in dark (the lightened
  primary on white) → `var(--primary-darker)` (4.85:1 dark, ~10:1 light).

Net effect: every measured text node across the audited screens now meets WCAG AA in dark mode, and three
hard-coded `#fff` literals were replaced by tokens (hex-ratchet 66 → 63). Guarded in `tests/canonical.test.ts`
(form-control colour pinned; accent-gradient tokens defined and darkened for dark mode). Suite: 15 files,
184 tests.

---

## [1.0.42] — 2026-07-04

### Fixed — Settings & Help stay reachable as the sidebar grows (pinned utility group)

- Measuring the reorganized 16-item sidebar (1.0.41) on a **1366×768 laptop** — one of the most common
  resolutions — found the destination list overflows the viewport: the nav scrolled, and **Settings and
  Help were clipped 288px below the fold**, reachable only if the user discovered the sidebar scrolls. Two
  everyday utility destinations were effectively hidden, and it would worsen with every new feature.
- Introduced a **pinned utility group**: sections flagged `pinned` in `navConfig` (currently "כללי" →
  Settings + Help) render in a fixed block at the bottom of the nav, outside the scrolling area, so they
  are **always visible** above the profile footer while the content categories scroll in the middle. This
  is the standard "settings pinned to the bottom" pattern and it makes the nav scale — new categories grow
  the scrollable middle without ever pushing the utility items off-screen.
- Kept everything inside the single `<nav>` landmark (scrollable main list + pinned block), so no
  destination leaves the navigation landmark — no accessibility regression. Verified live: at 1366×768 the
  middle scrolls while Settings + Help sit pinned and fully visible (87px above the sidebar bottom); the
  mobile nav drawer shows the same pinned group. Guarded in `tests/navConfig.test.ts` (exactly one pinned
  section, holding settings + help). Suite: 15 files, 182 tests.

---

## [1.0.41] — 2026-07-04

### Changed — sidebar navigation reorganized; five stranded features made reachable

- A navigation/IA review found **five fully-built top-level pages had no entry point anywhere in the app** —
  `analytics` (תובנות), `reports` (דוחות), `team` (צוות המרפאה), `supervision` (סופרוויז׳ן) and `cpd`
  (התפתחות מקצועית) were lazy-loaded, titled and route-smoke-tested, yet unreachable: absent from the sidebar,
  the ⌘K palette and global search (all three derive from `navConfig`), with no link from any page. Real
  functionality, invisible to users.
- Reorganized the sidebar from two loose groups into a clear, scannable hierarchy, and folded the stranded
  pages into the category each belongs to:
  - **Primary workspace** (no header): דף הבית · מטופלים · יומן · הקלטות ותמלולים · הודעות · משימות — the daily drivers.
  - **ניתוח ומדדים** (Analysis & Metrics): מדדי תוצאה · **תובנות** · **דוחות**.
  - **ידע ומשאבים** (Knowledge & Resources): ספריית משאבים · מסמכים · **התפתחות מקצועית**.
  - **המרפאה** (The Practice): **צוות המרפאה** · **סופרוויז׳ן**.
  - **כללי** (General): הגדרות · עזרה ותמיכה.
  This replaces the previous "טיפול קליני" group, which incoherently mixed outcome measures with the resource
  library and documents. Because sidebar + palette + search share `navConfig`, all five now surface in **all
  three** at once. Each new item has a distinct icon (guarded). The maintenance-only `dedup` tool stays
  contextual off Patients rather than cluttering the rail.
- Scales cleanly: new features slot into an existing category instead of extending a flat list. Guarded by a
  new `tests/navConfig.test.ts` assertion that **every navigable top-level route has a sidebar entry** (no
  orphaned routes can regress in), plus the updated 16-destination contract. Verified live: the structure
  renders in five groups and the formerly-unreachable Team page now opens from the sidebar. Suite: 15 files,
  181 tests.

---

## [1.0.40] — 2026-07-04

### Fixed — "מטופלים אחרונים" in the command palette is now genuinely recent

- A feature-gap review against the product standard found the ⌘K palette shows a section labelled
  **"מטופלים אחרונים" (Recent Patients)** on an empty query — but the data was **`S.patients.slice(0, 4)`**,
  i.e. the first four patients in seed order, never the ones the therapist actually just opened. The label
  made a promise the data didn't keep, and a returning user got no zero-effort way to jump back to the file
  they were last in (search requires typing a name; this is instant recall).
- Made the label true with a small, deterministic tracking layer — no new screen, nav item, or dependency:
  - **`pushRecent(list, id, cap)`** (in `utils`) — a pure most-recent-first, de-duplicated, capped list op.
    Re-viewing the patient already at the head is a no-op, so it is safe to call on every navigation.
  - **`store.navigate`** records the engaged patient into `recentPatientIds` whenever a `patientId` is
    carried (opening a file, summary, timeline, letter…). The key is added to `PERSIST_KEYS`, so recency
    survives reloads — consistent with the app's multi-device-continuity model.
  - **Command palette** derives the section from `recentPatientIds`, falling back to the first few only on a
    fresh session so the list is never empty. Verified live: after viewing p5 then p3, the section shows
    `[p3, p5]` most-recent-first — including p5, which the old first-four slice could never surface.
- Guarded by `pushRecent` unit tests (move-to-front, dedup, cap, idempotency, empty/undefined input) and a
  `tests/canonical.test.ts` assertion that the palette reads tracked history and the store records it. Suite:
  15 files, 180 tests.

---

## [1.0.39] — 2026-07-04

### Changed — the dedup engine now owns confidence + canonical selection (single source of truth)

- A deduplication/canonicalization review found the clustering engine (`buildDupClusters`) returned only
  raw members + per-signal scores, while **two derived facts the whole flow depends on — the cluster's
  confidence and which record is canonical — were re-derived in the UI**: `DedupPage` computed confidence
  from the meta scores and picked the surviving record by session count, and the merge dialog fell back to
  a *different* default (`members[0]`, i.e. seed order). Same concept, three places, one latent
  inconsistency.
- Made the engine the authority. Each cluster now carries two deterministic, first-class fields:
  - **`confidence`** — the cluster's strongest member score (0–99).
  - **`canonicalId`** — the proposed surviving record: most complete first (highest session count), ties
    broken by lowest id, so the same input always yields the same canonical pick.
  `DedupPage` and the merge dialog now **read these instead of re-deriving them**, so the confidence shown,
  the "רשומה ראשית מוצעת" (proposed primary) badge, and the merge's default survivor can never drift apart.
- **No change to clustering behaviour** — the weighted signals (phone 60 / surname 25 / first-name 15 /
  email 12) and the ≥ 60 threshold are untouched; these fields are pure functions of an existing cluster.
  For the seed's intentional `{p2, p9}` fixture the values are identical to before (confidence 99, canonical
  `p2`). Locked by three assertions in `tests/dedup.test.ts` (confidence, canonical pick, deterministic
  tie-break). Suite: 15 files, 180 tests.

---

## [1.0.38] — 2026-07-04

### Added — Help is reachable from anywhere, with minimal effort

- A UX review found the Help page (FAQ, keyboard-shortcut catalog, support contact + hours, and the
  onboarding-guide/tutorial restore) was **rich but hard to reach**: `help` was a real route yet was
  **absent from `navConfig`**, so it never appeared in the sidebar, the ⌘K palette (from navConfig), or
  global search. The only paths to it were ⌘K (a keyboard shortcut a non-technical therapist won't
  know) and two contextual links (Upload, Settings). On mobile — where ⌘K isn't available — there was
  effectively no discoverable route to help.
- Made Help a **first-class destination**, reachable from every screen with one interaction:
  - **`navConfig`** now lists `help` under the "כללי" (General) section. Because the sidebar, the ⌘K
    command palette, and global search all derive from `navConfig`, Help now appears in **all three
    from a single source** — persistent in the sidebar rail on desktop and in the nav drawer on mobile.
  - **App bar** gains an always-visible **"?" help button** (the top-bar convention) — zero-click
    visible, one-click to Help, on every route. It's hidden on the tight phone app bar (≤560px), where
    Help lives in the nav drawer instead, so no mobile control is crowded off-screen.
  - **Removed the now-redundant** one-off static "עזרה ותמיכה" command from the palette — it flows from
    `navConfig` now, so the palette shows it exactly once (verified). Net result is *less* special-case
    code, not more.
- No new page, content, or dependency — this is pure discoverability for an existing capability.
  Guarded in `tests/canonical.test.ts` (Help must stay a navConfig destination + carry an app-bar
  affordance, and must not be double-listed in the palette) and `tests/navConfig.test.ts` (the SSOT
  destination contract now expects 11 destinations). Suite: 15 files, 174 tests.

---

## [1.0.37] — 2026-07-04

### Added — print stylesheet so the clinical letter prints as a document, not the app

- A product/UX review of existing-but-unfinished capabilities found `LetterPage` ships a working
  **"הדפסה"** button (`window.print()`), but the app defined **no `@media print` rule anywhere** — so
  printing a formal clinical referral letter (for a patient file / insurer / referring clinician) also
  printed the entire app chrome: sidebar, app bar, search, the floating AI button, and the page's own
  action buttons. The output was unusable as a professional document. Added a single `@media print`
  block in `global.css` that hides all app chrome and anything tagged `.no-print`, whitens the page,
  and neutralizes shadows/padding on `#main-content`, so only the letter reaches paper/PDF. Tagged the
  `LetterPage` breadcrumb row and action buttons `.no-print`. **On-screen appearance is unchanged**;
  no new dependency, no logic change. Guarded by an assertion in `tests/canonical.test.ts`.
- Verified the print result on-screen by emulating the rules live (app bar + sidebar collapse to
  hidden, the letter document remains) and confirmed the `@media print` block ships in the built CSS
  bundle. Final paper output is best confirmed once with the browser's Print preview (Ctrl/⌘-P).

---

## [1.0.36] — 2026-07-04

### Added — error observability (the ErrorBoundary no longer swallows errors silently)

- A production-readiness review found the page-level `ErrorBoundary` caught render errors (showing a
  recoverable card) but **logged nothing** — a caught crash left zero operator trace, violating "if it
  runs in production it must be observable." Added `componentDidCatch` that logs the error, the failing
  route, and the component stack via `console.error`. This surfaces caught errors in the console / any
  log capture and is the **single documented hook** to wire a real error reporter (e.g. Sentry) later,
  without touching the recovery UI. Guarded by an assertion in `tests/errorBoundary.test.tsx`.
- The rest of the reliability review was re-verified robust and needed no change: `localStorage` load
  **and** save are both `try/catch`-guarded (corrupted state / quota errors degrade gracefully), and an
  unknown/stale persisted route falls back to the dashboard (`PAGES[route] || PAGES.dashboard`) under
  the ErrorBoundary + Suspense. Suite: 15 files, 172 tests.

---

## [1.0.35] — 2026-07-04

### Fixed — placeholder text contrast (WCAG 1.4.3), app-wide

- A UX/contrast audit found the app defined **no `::placeholder` style**, so all 32 placeholder
  inputs fell back to the browser-default gray (`#757575` ≈ **4.05:1** in light mode) — just below
  AA. Added one global rule pinning placeholders to `var(--text-muted)` (`opacity:1` to stop Firefox
  dimming). Verified live: **light 4.63:1, dark 4.58:1** — AA in both themes. Guarded in
  `tests/canonical.test.ts`.
- The rest of the audit (navigation, IA, forms, empty/loading/error states, keyboard operability,
  copy, responsiveness, trust messaging) was re-verified and clean; several sweep flags (sidebar nav,
  agenda text) were confirmed to be measurement artifacts on precise re-inspection (5.5–17:1). Suite:
  15 files, 172 tests.

---

## [1.0.34] — 2026-07-04

### Fixed — two dark-mode contrast failures (WCAG 1.4.3), found by empirical measurement

Measuring *actual rendered* contrast (the token-based test can't see composited/on-accent colors)
surfaced two real dark-mode failures, both fixed with light mode left identical:

- **Skip link** was `#fff` on `var(--primary)` = **3.06:1**. In dark mode `--primary` lightens
  (`#4D94F5`), so white text fails AA. Switched to `var(--paper)` (the on-accent contract) →
  **5.33:1** dark / ~5.5:1 light. Guarded in `tests/canonical.test.ts`.
- **Patient-avatar initials** used a same-hue tint bg + saturated text, which collapsed to
  **1.46–2.63:1** in dark mode (the darkest hue nearly invisible). `avatarColors` is now theme-aware:
  in dark mode it deepens the tint and lifts the initials toward white (keeping each patient's hue) →
  **6.07–6.88:1**, verified live. Light mode unchanged. A new `utils.test.ts` case proves AA with the
  WCAG math.

Other element types measured (text, buttons, chips, nav, inputs, disabled) passed; the earlier flags
(sidebar, avatar "1.0" ratios) were measurement artifacts, confirmed clean on precise re-inspection.
Suite: 15 files, 171 tests.

---

## [1.0.33] — 2026-07-04

### Changed — enabled safe stricter TS checks + removed dead code they surfaced

Full `strict` (null/any) stays deferred (it needs the larger migration), but the **independent**
compiler safety checks that pass clean are now on — hardening the codebase against whole bug classes
at zero runtime cost:

- `noUnusedLocals` / `noUnusedParameters`, `noImplicitReturns`, `noImplicitOverride`,
  `forceConsistentCasingInFileNames`.
- Fixing what they surfaced (15 issues, all compile-time, no behavior change): **removed 10 unused
  `React` imports** (dead code the ESLint config missed — unnecessary under the `react-jsx`
  transform); added `override` to the 3 `ErrorBoundary` members that override `React.Component`; made
  two early `return` paths in `useFocusTrap` explicit (`return undefined`).

The compiler now catches unused code, missing returns, accidental non-overrides, and cross-platform
casing mismatches on every build. Verified: typecheck 0 · lint 0 · 169 tests · build clean.

---

## [1.0.32] — 2026-07-04

### Added — explicit cache-control (cache-safety): immutable assets, revalidated HTML

- A cache-safety audit found the deploy configs set security headers but **no `Cache-Control`**,
  leaving cache behavior to implicit host defaults — the classic stale-UI trap (a returning user gets
  cached HTML pointing at old/purged asset hashes → dead chunks). Made it explicit in both
  `vercel.json` and `public/_headers`:
  - `/assets/*` (Vite content-hashed) → `public, max-age=31536000, immutable`
  - HTML (`index.html` + SPA routes) → `public, max-age=0, must-revalidate`
  So HTML always revalidates and pulls the current asset hashes, while hashed assets cache forever.
  Config-only; no code, UI, or behavior change. Guarded in `tests/canonical.test.ts`.
- **Intentionally not added** (would be feature additions the caching split already makes unnecessary):
  a Service Worker (none exists — nothing to keep in sync), a runtime "new version available" toast
  (with `max-age=0` HTML the next navigation/reload already serves the latest), and chunk-load-error
  auto-reload (risks reload loops; near-impossible here since the host retains immutable assets).

Suite: 15 files, 169 tests.

---

## [1.0.31] — 2026-07-04

### Optimized — removed 1.1 MB of dead image assets (production build 2.6 MB → 1.5 MB)

- A production-optimization pass measured `public/assets/` and found two brand PNGs referenced
  **nowhere** in source: `sensei-enso.png` (928 KB) and `sensei-write.png` (158 KB). Everything under
  `public/` ships as-is, so these were dead weight in every deployment. Removed both after confirming
  zero references (static and dynamic). **Production build dropped 2.6 MB → 1.5 MB (−1.1 MB, ~42%)**,
  with no functional or visual change. Verified live: no broken images, the FAB logo loads.
- Added an **asset guard** (`tests/canonical.test.ts`): every image in `public/assets/` must be
  referenced in source, so dead media can't accumulate again.
- **Intentionally left:** the three in-use images (`sensei-mark` logo, `sensei-fan` / `sensei-scroll`
  empty-state art) are somewhat larger than their display size; re-encoding them is a follow-up that
  needs image tooling and visual-fidelity checks, out of scope for a minimal, no-visual-change pass.
  The JS bundle (~78 KB gzip main, 29 lazy route chunks) and font (115 KB variable, `font-display:swap`)
  were already optimized. Suite: 15 files, 168 tests.

---

## [1.0.30] — 2026-07-04

### Changed — removed em dashes from all Hebrew copy (house-style / anti-AI-tell)

- Per an explicit copy directive, replaced **47 em dashes ("—")** across ~25 files with
  context-correct punctuation: **·** for inline label chains (`PTSD · קיפאון בטיפול`), **:** for a
  label then its detail (`סיכום הדרכה: טכניקות`), and a **period or comma** to split an action from
  its follow-up (`הבקשה נשלחה. נחזור אליכם`). Covers page subheadings, toasts, empty states,
  supervision/report titles, help text, and seed copy. Meaning preserved; no layout change.
- The standalone `—` empty-value placeholder (`phone: '—'`) is kept — it is a data indicator, not
  prose. Hebrew prefix hyphens (`ב־`, `ל־`) and technical values stay (grammatically required).
- Added a CI guard (`tests/canonical.test.ts`) that flags any em dash adjacent to Hebrew text, and
  documented the rule in [CONTENT_GUIDE.md](CONTENT_GUIDE.md). Verified live (Tasks subheading now
  uses a comma; no Hebrew-adjacent em dash renders). Suite: 15 files, 167 tests.

---

## [1.0.29] — 2026-07-04

### Added — tests that prove the deduplication engine's properties

The dedup dry-run has been requested repeatedly with an unchanged dataset — its result (one cluster,
`p2`/`p9`, confidence 99, deterministic + idempotent) is stable by design. Rather than keep
re-asserting that in prose, those properties are now **proven automatically**:

- **`tests/dedup.test.ts`** (7 tests) exercises `buildDupClusters` directly: weighted scoring capped at
  99 with the four expected signals; **determinism + idempotency** (same input → byte-identical output
  every run); phone-format normalization; the 60-point threshold (name+email similarity alone, 52,
  does not cluster); **no false positives** for distinct patients; the real seed yields exactly the one
  intentional cluster `{p2, p9}`; and the canonical (de-duplicated) set yields **zero** clusters —
  encoding the "no duplicates remain after merge" success criterion.

No source or data change — the engine and the intentional demo duplicate are unchanged; this locks
the behavior the dry-run keeps confirming. Suite: 15 files, 166 tests.

---

## [1.0.28] — 2026-07-04

### Fixed — demo state-preview links showed on the production login page

- The auth screen rendered a *"מצבי מסך (הדגמה)"* ("Screen states — demo") block with links to jump to
  the expired-session and unauthorized screens — a dev/design-review tool that shipped to real users on
  the login page (same class as the 1.0.26 upload demo-link fix). Since `demoMode` is always false
  pre-auth, the correct gate here is build-time: the block is now wrapped in `import.meta.env.DEV`, so
  Vite **tree-shakes it out of the production build** (verified: the label is absent from `dist/`) while
  it stays visible under `npm run dev` for design review.
- Extended the frontend security guard's env allowlist to permit Vite's non-secret build-time built-ins
  (`DEV`/`PROD`/`MODE`/`SSR`/`BASE_URL`) alongside `VITE_API_BASE_URL` — these are compile-time flags,
  never secrets. Added a guard (`tests/canonical.test.ts`) asserting the demo block stays DEV-gated;
  proven to fail if the gate is removed.

---

## [1.0.27] — 2026-07-04

### Fixed — upload "choose patient" select silently discarded the user's choice

- The upload page's *"בחירת מטופל להעלאה"* (choose patient for this recording) dropdown listed every
  patient but had **no `value`/`onChange`** — the selection was ignored, and "צפייה בסיכום" always
  navigated to the globally-current patient. So picking patient A and viewing the summary showed
  patient B's — a silent, misleading no-op. (A console-warning sweep across 10 routes + overlays came
  back clean; this was the one real defect.)
- Wired the existing control: options now carry the patient **id** (robust against duplicate names),
  the select is controlled and defaults to the current patient, and `goSummaryFromUpload` navigates to
  the **selected** patient. No new feature — an existing control now honors its input. Verified live
  (select round-trips; summary follows the choice) + a regression test in `tests/demoGating.test.tsx`.

The other selects across the app (filters, appointment, timeline, tasks, settings) were confirmed
already wired.

---

## [1.0.26] — 2026-07-04

### Fixed — a demo-only control leaked into the real production UI

- The upload page rendered a *"הדגמת שגיאת פורמט"* ("demo a format error") link **unconditionally** —
  a design-reference device that triggers a fake format error. A real therapist would find it
  confusing, and it violates the "no demo controls in production" standard. It's now gated behind
  `demoMode` (the same flag that drives the demo banner): visible in the design-reference demo, hidden
  in a real session. Verified live (hidden when not in demo mode) and guarded by a new test
  (`tests/demoGating.test.tsx`, both directions). No other ungated demo affordances remain — the auth
  "enter demo" button is the intended, legitimate demo entry point.

---

## [1.0.25] — 2026-07-04

### Added — tests for form validation & error-state accessibility

A feedback-states audit (validation, errors, loading, empty, success, destructive-action, RTL copy)
came back **already complete and well-built** — the notable finding was a *test* gap, not a UX gap:

- **`tests/formValidation.test.tsx`** (3 tests) covers the add-patient form's previously-untested
  validation path — empty submit shows an **announced** error (`role="alert"`) that is programmatically
  wired to the field (`aria-invalid` + `aria-describedby` → the real element) with **focus moved to the
  errored field** (WCAG 3.3.1 / 2.4.3); an out-of-range age is rejected with its specific message and
  the dialog stays open; a valid submission adds the patient and closes the dialog.

No source change — the validation, aria wiring, focus management, and gendered success toast were
already implemented correctly; this locks them against regression. Suite: 13 files, 155 tests.

---

## [1.0.24] — 2026-07-04

### Added — tests for the pager algorithm (biggest coverage gap) + documented TDD workflow

A coverage audit found the logic layer well-tested (~100% of utils/data/hooks/nav/services) **except
the store**: `AppStore.tsx` was at 45% function / 60% branch coverage, and its lowest-covered piece
was `pager()` — the pagination view-model behind the patients / sessions / documents tables, a real
algorithm (slicing, current-page clamping, range labels, prev/next disabled state, and a page-number
sequence with ellipses) with **no tests**.

- **Added `tests/pager.test.tsx`** (6 tests) covering `pager()` edge cases — page slicing + range
  label, out-of-range page clamping, the hide-when-≤6 rule, first-page disabled state, no-ellipsis at
  ≤7 pages, and two-sided ellipsis collapse at many pages — plus the pure `resolveTheme`. Lifted
  overall branch coverage **72% → 78%** and store branch coverage **60% → 72%**.
- **Documented the TDD workflow** in [CONTRIBUTING.md](CONTRIBUTING.md): Red → Green → Refactor for
  new work, the test-layer layout, determinism/isolation conventions, mocking policy, and the
  coverage-quality-over-percentage stance.

Tests + docs only; no behavior change. Suite: 12 files, 152 tests.

---

## [1.0.23] — 2026-07-04

### Fixed — AI assistant panel didn't focus its input on open (keyboard/UX)

- An overlay focus-management audit found the shell's overlays consistent **except** the "שאל את סנסיי"
  AI panel: it opened without moving focus to its message input, so a keyboard user had to Tab into the
  panel before typing (the command palette already auto-focuses its input). The panel is **non-modal**
  (no backdrop / `aria-modal`), so a focus trap would be wrong — the fix is just to focus the input on
  open and let focus flow normally otherwise. Escape already closes it via the store's global Escape
  cascade. Verified live (input focused on open; Escape closes) + a new regression test in
  `tests/a11y.test.tsx`.
- Confirmed the other overlays are already correct: modal dialogs and the ⌘K palette trap focus
  (`useFocusTrap`) and restore it; all overlays close via the global Escape cascade.

---

## [1.0.22] — 2026-07-04

### Fixed — documentation drift (stale test count) + accuracy audit

A documentation-completeness audit found the doc set accurate and well-scoped except one stale figure:

- **README cited "138 tests" in two places; the suite is 145.** Rather than hardcode a number that
  drifts on every added test, the README now describes the suite by its stable **categories** (unit ·
  route smoke · a11y · canonical guards) and lists the current guard set (copy-integrity, heading-order,
  emoji, version-consistency). The historical "138 / 35 tests" figures inside older CHANGELOG entries are
  left intact — they're an accurate record of their versions.
- Verified the rest is synchronized: ARCHITECTURE, CONTRIBUTING, CONTENT_GUIDE, and the README doc-index
  match the current implementation; PORTING_GUIDE is marked historical; each topic has one canonical
  owner. Docs-only change; no behavior change.

---

## [1.0.21] — 2026-07-04

### Added — Content & Voice guide + emoji governance; removed 2 emojis from UI content

A content-design audit against the real app came back consistent (single canonical term "מטופל" across
116 uses, no placeholder/lorem/dev text, truthful action copy) with one concrete violation:

- **Removed two 🙏 emojis** from product-authored message strings (`data/seed.ts` demo thread,
  `MessagesPage` canned reply) — both violated the product's "no emoji in UI" convention (emojis render
  inconsistently across platforms, degrade screen-reader output, don't localize). Verified live on fresh
  state: messages render emoji-free.
- **Added an emoji guard** (`tests/canonical.test.ts`): no `.ts`/`.tsx` source may contain an emoji
  (U+1F000–1FAFF). Functional glyphs (↑↓ ↺ →) are intentionally allowed.
- **Added [CONTENT_GUIDE.md](CONTENT_GUIDE.md)** — one consolidated source of truth for voice, the
  terminology dictionary, microcopy/empty/error/success patterns, Hebrew-RTL rules, the truthfulness
  rule, and content governance. Proportional to a single-product app (not 20 separate documents), and it
  explicitly marks what's N/A here (no emails/SMS/push, no presentations, Hebrew-only so no i18n layer, no
  Storybook/Figma). Referenced from README + CONTRIBUTING.

No behavior change; copy/content + docs only.

---

## [1.0.20] — 2026-07-04

### Fixed — heading-order skips on empty states (WCAG 1.3.1 / heading hierarchy)

- A frontend-completeness audit found six views jumping straight from `<h1>` to `<h3>` with no
  `<h2>` — five empty-state headings (Patients "אין מטופלים עדיין" / "לא נמצאו…", Dedup, Documents,
  Tasks) and the notifications-popover title. Screen-reader users navigating by heading level hit a
  gap. Changed those to `<h2>`; since each carries an explicit inline font-size, **appearance is
  unchanged** — the fix is purely semantic.
- Added a heading-order guard (`tests/canonical.test.ts`, documented in CONTRIBUTING) — any `.tsx`
  using `<h3>` must also use `<h2>`, and no `<h4>`–`<h6>`. axe couldn't catch these because empty
  states don't render in the route tests.

The rest of the audit came back clean and is documented in the review summary: 26 routes with no
broken/placeholder screens, empty/loading/error states present, dup <5%, bundle ~78 kB gzip main,
all 26 pages self-constrain content width (no large-desktop stretch), no runtime console errors,
axe clean, keyboard-operable search + palette. No other changes were warranted.

---

## [1.0.19] — 2026-07-04

### Fixed — command palette (⌘K) now announces the active option to screen readers (WCAG 4.1.2)

- Following the 1.0.18 global-search combobox work, the ⌘K palette was already keyboard-navigable
  (ArrowUp/Down, Enter, `role="listbox"`/`option`, `aria-selected`) — but its input lacked
  `role="combobox"` + `aria-activedescendant`, so a screen-reader user pressing arrows saw the
  highlight move **silently**: the active option was never announced.
- Added `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete`, and
  `aria-activedescendant` (wired to the active option's `id`) — mirroring the global-search
  combobox so both share one canonical pattern. Verified live (ArrowDown → `aria-activedescendant`
  advances `cmdopt-0 → cmdopt-1 → cmdopt-2`, active row `aria-selected="true"`) and covered by a new
  regression test in `tests/a11y.test.tsx`. Purely additive ARIA; no behavior change.

---

## [1.0.18] — 2026-07-04

### Fixed — global search dropdown is now keyboard-operable (WCAG 2.1.1)

- The app-bar global search showed a rich results dropdown (matching patients + quick-nav routes),
  but it was **mouse-only**: `Enter` jumped to the full search page and the result rows were plain
  `<div onClick>` — unreachable by keyboard, violating the "full keyboard operability" standard.
- It is now a proper **combobox**: `ArrowDown`/`ArrowUp` move a highlighted option,
  `aria-activedescendant` tracks it (rows are `role="option"` in a `role="listbox"`), `Enter` opens
  the highlighted result (or falls back to full search when none is highlighted), and `Escape`
  closes. Mouse hover and keyboard share one active state, so behavior is consistent. The active row
  is highlighted with `var(--primary-surface)`.
- Verified live (ArrowDown highlights → `aria-activedescendant`; Enter navigates to the patient;
  Escape closes) and covered by a new regression test in `tests/a11y.test.tsx`. axe remains clean.

---

## [1.0.17] — 2026-07-04

### Changed — application name unified as "Sensei" (`סנסיי`) + richer metadata

The app name was already consistent in user-facing UI (19 × `סנסיי` — the Hebrew rendering of
Sensei — across the sidebar, auth wordmark, AI assistant, org name, and greeting) and in docs
(`Sensei`), with the per-route `document.title` prefixed `סנסיי ·`. This change tidies the two
remaining spots:

- **Package identifier** `sensei-app-2026` → `sensei`, so the technical name matches the app name.
  (The project folder and preview-server config keep their path for tooling continuity.)
- **HTML metadata** gained `application-name`, `apple-mobile-web-app-title`, `description`,
  `og:title`, and `og:description` — all carrying `סנסיי`, matching the `<title>` and UI brand.
  Verified live: `document.title = "סנסיי · מטופלים"`, `application-name = "סנסיי"`.

The user-facing wordmark is kept in Hebrew (`סנסיי`) to match the all-Hebrew RTL UI; switching it
to a Latin "Sensei" wordmark is a one-line branding change if preferred. No behavior change.

---

## [1.0.16] — 2026-07-04

### Added — regression guard for the 1.0.15 copy fixes + fixed stale doc baseline

- **Extended the copy-integrity guard** (`tests/canonical.test.ts`) to protect the 1.0.15 fixes, not
  just merge: the delete-patient / delete-session dialogs + toasts and the summary-approval status
  must promise no activity-log logging and no N-day retention (immediate undo only). Proven to fail
  CI on a re-added "30 יום" claim. Scoped to those action files, with a documented, principled
  exception: general capability/policy descriptions that represent the demo's audit feature
  (`HelpPage` privacy FAQ, `DocumentsPage` signature note — alongside the equally-represented
  RBAC/PII claims) are intentionally out of scope; only per-action confirmations must be literally
  true in this build.
- **Fixed stale documentation drift:** CONTRIBUTING cited the hardcoded-hex ratchet baseline as
  **82** in two places; the actual guard has used **66** since 1.0.9. Corrected. (The `82` in the
  historical CHANGELOG entry is left as an accurate record of that version.)

Both documented in [CONTRIBUTING.md](CONTRIBUTING.md) § "Enforcement rules". No dependencies; no
behavior change.

---

## [1.0.15] — 2026-07-04

### Fixed — delete/session/summary copy over-promised recovery & audit logging

Follow-through on the 1.0.13 truthfulness pass — the three same-class claims flagged there are now
corrected (verified against actual behavior first):

- **Patient delete** kept the record removable only via the immediate undo toast, but the dialog +
  toast promised *"kept in archive 30 days before final deletion."* Now: *"you can undo the action
  immediately after it's performed."*
- **Session delete** soft-removes to the persisted `deletedSessions` store with immediate undo, but
  claimed *"recoverable within 30 days"* (no expiry logic, no restore surface after the toast). Now
  the same immediate-undo wording.
- **SummaryPage** stated an approval was *"logged to the activity log"*; the Privacy "Audit Log" is a
  static fixture nothing writes to, so that clause is removed.

The true parts are preserved (immediate undo; the verified-on date). Copy-only, no behavior change.
Verified live: delete-patient dialog renders the corrected wording with no "30 days" claim. A sweep
confirms no fabricated retention/audit claims remain anywhere (the notification archive, which is
backed by a real persisted store, is unchanged).

---

## [1.0.14] — 2026-07-04

### Added — Phase 9.5 enforcement: two low-noise guards closing real drift gaps

Most Phase 9.5 enforcement already exists (jscpd duplication guard; single-source-of-truth,
architecture, RTL, hardcoded-hex, docs-exist guards in `tests/canonical.test.ts`; security, axe,
contrast, focus-trap suites; the CI release gate). Several spec areas are structurally N/A here
(no Storybook, no Design-System package, no i18n key system, no backend/API contracts, no
database/migrations). Two genuine gaps are now closed — both deterministic, scoped, and proven to
fail on regression:

- **Version-consistency guard** (`tests/canonical.test.ts`) — the docs guard proved required files
  *exist*; this proves they're not *stale*: `package.json` version must equal the newest CHANGELOG
  heading and the README version badge. A bump in one file that misses the others now fails CI.
- **Copy-integrity guard** (`tests/canonical.test.ts`) — regression protection for the 1.0.13 fix:
  the patient-merge copy must not re-introduce an "archived / restorable / logged to the activity
  log" promise that `confirmMerge` doesn't perform. Scoped to merge-flow lines only, so the
  legitimate notification archive and the separate delete flows are unaffected.

Both documented in [CONTRIBUTING.md](CONTRIBUTING.md) § "Enforcement rules" with owner, verify
command, failure condition, and rollback. No new dependencies; no behavior change.

---

## [1.0.13] — 2026-07-04

### Fixed — patient-merge copy claimed archival + audit logging the code never performs

- A dry-run deduplication scan of the seed dataset found exactly **one** genuine duplicate cluster
  (`p2` יוסי מזרחי / `p9` יוסף מזרחי — identical normalised phone `0527654321`, confidence 99),
  which is intentional demo content for the app's own duplicate-detection feature. No action taken
  on the data (default DRY RUN; the cluster is left in place to exercise the feature).
- **The merge feature's copy over-promised.** The merge dialog and toast (`Dialogs.tsx`) told the
  user the duplicate would be *"moved to archive and can be restored"* and *"logged to the activity
  log,"* but `confirmMerge` filters the record out of state permanently — there is no
  `archivedPatients` store and the Privacy "Audit Log" is a static fixture nothing writes to. The
  copy is now truthful: *"the duplicate record will be removed from the list; sessions merge into
  the primary."* Same unbacked *"logged to the activity log"* line removed from the delete-all-data
  dialog. Behaviour unchanged (copy-only). Verified live: merge dialog renders with no
  archive/audit claim.
- **Reported, not changed (await decision):** the patient-delete and session-delete flows carry the
  same *"recoverable within 30 days"* wording backed only by a transient undo toast, and
  `SummaryPage` states an approval was *"logged to the activity log."* Same class of gap in separate
  features — left for an explicit call rather than reworded unilaterally.

---

## [1.0.12] — 2026-07-04

### Fixed — notifications popover clipped off-screen on phones (same class as 1.0.11)

- The notifications popover (opened from the app-bar bell that 1.0.10 made reachable on mobile)
  anchors to the small, off-centre bell with a 360px width. On phones it overran the viewport —
  at 375px its leading edge sat at **+30px past the right edge**, clipping the start of each
  notification row. Fixed with the same viewport-pinned treatment as the search dropdown: at
  ≤560px both app-bar popovers now share one rule (`.appbar-search-panel, .appbar-popover-panel`)
  that pins them to symmetric 16px insets. Verified live at 375px (panel 16→359px, no overflow)
  and 1024px (unchanged, 360px anchored to the bell). This clears the last fixed-width dropdown in
  the app shell — a codebase scan confirms only these two anchored popovers exist in the shell.

---

## [1.0.11] — 2026-07-04

### Fixed — global-search results dropdown clipped off-screen on phones

- The app-bar search-results dropdown has `min-width:360px` and anchors to the search box's
  trailing edge. With the search box narrow on phones (post-1.0.10), the 360px panel overran the
  viewport — at 375px its trailing edge sat at **-51px**, clipping the risk badge on every result
  row. At ≤560px the panel is now pinned to the viewport with symmetric 16px insets
  (`position:fixed; left/right:16px; width:auto`), so it fills the width cleanly with nothing cut
  off. Desktop keeps the anchored 360px dropdown (rule only fires ≤560px). Verified live at 375px
  (panel 16→359px, no overflow) and 1024px (unchanged, 360px anchored).

---

## [1.0.10] — 2026-07-04

### Fixed — mobile app-bar: unreachable controls + sub-24px touch targets (WCAG 2.2 §2.5.8)

- **Notifications and account controls were clipped off-screen on phones.** The app-bar
  search had `min-width:190px` plus a `flex:1` whitespace spacer, and on narrow widths
  (≤~400px) these squeezed the notifications bell and account/avatar button past the trailing
  edge — rendered at negative coordinates, clipped by the page's overflow guard, and
  **unreachable** (the account menu is also in the drawer, but the notifications panel is not).
  At ≤560px the spacer is now collapsed and the search min-width dropped, so every control stays
  on-screen at 320–560px while the search stays usable (~100px at 375–390px). Desktop layout is
  unchanged (the rule only fires ≤560px). Verified live at 320/375/390 px.
- **Two touch targets were below the 24×24px minimum.** The sidebar logout icon measured
  20×20px (now a 24×24px hit area via transparent padding; the glyph stays 20px), and the
  app-bar theme toggle shrank to 21px wide at mobile because it lacked `flex-shrink:0` (now
  holds its 38×38px). Both verified live at mobile width; no other sub-24px controls remain.

---

## [1.0.9] — 2026-07-04

### Fixed — dark-mode on-accent contrast (WCAG 1.4.3) + reduced hardcoded-hex debt

- On-accent text (filter chips, toggles, pager, message bubbles, gender selector) used a
  hardcoded `#fff`, which in dark mode is white on the lighter accent (`#4D94F5`) = **3.06:1**,
  below the 4.5:1 AA threshold for normal text. This was invisible to the token-based contrast
  test (it audits tokens, not hardcoded hex). Converted these 16 cases to `var(--paper)` (the
  on-accent color contract): **light mode is unchanged** (`--paper` = `#FFFFFF` = `#fff`), and
  **dark mode now measures 5.33:1** — verified live. Hardcoded-hex ratchet lowered 82 → 66.
- Data-driven avatar backgrounds and on-accent icon fills (pass the 3:1 graphics threshold) keep
  `#fff` intentionally.

---

## [1.0.8] — 2026-07-04

### Added — client-ready API layer (dormant; no backend exists yet)

There is no backend to connect to (verified: none on disk or on the linked GitHub account),
so instead of fabricating an integration, added a canonical, typed API layer that stays inert
until a backend is configured — all current flows (seed data + localStorage) are unchanged.

- `src/services/apiClient.ts` — single typed fetch client: base URL from `VITE_API_BASE_URL`,
  Bearer auth via a pluggable token provider (no token hardcoded/stored), timeout + AbortController,
  consistent typed `ApiError`, `isApiConfigured()` gate.
- `src/services/crud.ts` + `index.ts` — generic `ApiService<T>` (list/get/create/update/remove) +
  patients/tasks/documents/notifications/auth service instances.
- `src/types/index.ts` — domain model types (the API contract; mirrors the seed shape).
- **Dormant:** no runtime code imports the layer, so it is tree-shaken from the build.
- Tests: `tests/apiClient.test.ts` (6) — dormant-when-unconfigured, URL/query building, header +
  Bearer injection, error mapping, 204. Architecture guard now covers `services`/`types` as leaf
  modules. Security guard allows exactly `VITE_API_BASE_URL` (client-safe), flags any other env read.
- `.env.example` documents `VITE_API_BASE_URL`; ARCHITECTURE.md gains a "Wiring a backend" section.

Suite: 138 tests green.

---

## [1.0.7] — 2026-07-04

### Added — Phase 9.5: automated deduplication & consistency enforcement

- **Canonical/architecture/drift guards** (`tests/canonical.test.ts`, 35 tests): every canonical
  symbol must be defined exactly once in its stated home; leaf modules (`utils/data/hooks/nav`)
  may not import UI/state; no page→page imports; required docs must exist; hardcoded-hex ratchet
  (≤82 baseline, non-increasing).
- **Code-duplication guard**: `jscpd` (`npm run dup`, `.jscpd.json`) fails CI above 5% (current 3.19%,
  min-tokens 80). Verified it rejects when exceeded.
- **Docs**: added `ARCHITECTURE.md` (layer rules + single-source-of-truth map), `CONTRIBUTING.md`
  (enforcement table: owner · verify · failure · rollback · accepted exceptions), `.env.example`
  (honest: no runtime env vars).
- **CI**: `ci.yml` now also runs the duplication guard; the canonical suite runs via `npm test`.

Total suite: 131 tests green.

---

## [1.0.6] — 2026-07-04

### Fixed — TranscriptPage crash on missing grammar layer (+ closed a test blind spot)

- `TranscriptPage` called `window.HG.term()`/`.fill()` **unguarded**; if `hebrew-grammar.js`
  failed to load, the screen crashed (`Cannot read properties of undefined`). Now uses the
  guarded `hg()` + new `hgTerm()` utils (fall back to the raw term instead of throwing).
  Surfaced by the new coverage run.
- **Test blind spot closed:** the route-smoke + a11y suites passed even when a page crashed,
  because the error-boundary card renders inside `#main-content` and has its own `h1`. Tests now
  load `hebrew-grammar.js` (as `index.html` does) so HG-dependent code runs for real, and the
  route smoke test asserts the error-boundary fallback is **not** present.

### Added

- **Coverage** (`@vitest/coverage-v8`, `npm run test:coverage`) with 70% thresholds on the
  logic layer (utils/store/hooks/nav/data). Current: statements/lines **84.5%**, branches
  **71.5%**, functions **72%**. Wired into CI.
- **CI upgraded** (`.github/workflows/ci.yml`, replaces `security.yml`): now runs **lint** +
  **typecheck** + **tests with coverage** + **build** + **prod-dependency audit** on every push/PR.

---

## [1.0.5] — 2026-07-04

### Fixed — dark-mode color-contrast failure (WCAG 1.4.3)

- Dark-theme `--text-muted` (#7E90B6) on `--surface-2` was **4.26:1**, below the 4.5:1 AA
  threshold for normal text. Lightened to **#8496BA** (4.58:1 on surface-2, 5.47:1 on paper) —
  a barely-perceptible change. Updated both `tokens.css` and the `sensei-theme.js` mirror (parity).

### Added

- **Deterministic color-contrast audit** (`tests/contrast.test.ts`) computing WCAG contrast
  ratios from the design tokens for both themes — the one a11y rule axe/jsdom can't evaluate
  without layout. Covers body/label pairs (≥4.5:1) and large/UI pairs (≥3:1). 92 tests green.
  (The audit initially had a vacuous dark-theme parse — `color-scheme:dark` sits at the block
  start, not the end — which masked this very failure; fixed to parse the full block.)

---

## [1.0.4] — 2026-07-04

### Fixed — accessibility remediation across the app (found by expanded axe audit)

Expanding the axe suite from 7 screens to **all 26 routes + interactive overlays** surfaced 58
real WCAG violations the earlier assertion-based review missed. All fixed, behavior/visuals preserved:

- **`nested-interactive` (WCAG 4.1.2, serious)** — clickable rows containing action buttons
  (`.pat-row` on patients, `.notif-row` on notifications) restructured to the sibling-button
  pattern: the container is non-interactive, the primary click area is a reset-styled
  `<button>` that is a *sibling* of the action buttons. Full mouse + keyboard preserved;
  `stopPropagation` on the action buttons still works.
- **`aria-toggle-field-name` (12×)** — the avatar-color swatches (`role="radio"`) had no
  accessible name; added descriptive Hebrew `aria-label`s.
- **`heading-order`** — cards/sections jumping `h1 → h3` (resources, upload) corrected to
  `h2` (tag/level only; inline font styling unchanged).
- **`label`** — the upload date input gained an `aria-label` from its visible label.

### Tests

- Accessibility suite now covers **all 26 routes + auth + command palette + create dialog**
  (`tests/a11y.test.tsx`). Full suite: **88 tests green, stable.**

---

## [1.0.3] — 2026-07-04

### Fixed — real accessibility bug (found by automated axe audit)

- **`nested-interactive` (WCAG 4.1.2, serious)** on the dashboard's today's-schedule rows: the
  store's a11y auto-promotion wrapped a clickable row that contains an inner upload button in
  `role="button"`, nesting two interactive controls. The promotion now skips containers that
  hold (or sit inside) another interactive element. Row mouse-click behavior is preserved and
  the inner control stays keyboard-operable. (Previously claimed AA compliance was assertion-based;
  this was caught only once axe ran against real rendered content.)

### Added

- **Automated accessibility tests** (`tests/a11y.test.tsx`) — axe-core over 7 key screens
  (auth, dashboard, patients, settings, upload, tasks, notifications), 0 structural violations,
  wired into the suite. **66 tests green, stable across repeated full-suite runs.**

---

## [1.0.2] — 2026-07-04

### Changed — deduplication & canonicalization (behavior-preserving)

- **Single source of truth for shared logic + data.** Consolidated previously-duplicated
  per-file copies into canonical modules — net **−265 LOC**:
  - `src/utils/search.ts` — `normHe`, `scoreP` (unified `(p, q, tagsMap)` signature), `hlParts`
    (were duplicated across command palette, app-bar search, patients list, search page).
  - `src/utils/format.ts` — `relTime` (was in app bar + settings sync tab).
  - `src/utils/dedup.ts` — `buildDupClusters` (was in dedup page + merge dialog).
  - `src/data/catalogs.ts` — `RES` (with the `meta` superset that search previously dropped),
    `DOCS`, `NOTIFS` (removes a latent search↔page divergence bug).
  - `src/data/sessions.ts` — shared session seed (`SESSION_DATES`, `SESSION_TOPICS`,
    `sessionSummaries`, `sessionRisk`); the 5 per-screen session builders now derive from it
    while keeping their distinct projections.
- Removed dead code surfaced by the cleanup (unused `hg` imports) and fixed a `useEffect`
  ref-cleanup warning in the store.

### Added

- **ESLint** (flat config, `typescript-eslint` + `react-hooks`) + `npm run lint`
  (`--max-warnings=0`, passing). Focuses on real-bug rules; `any`/inline-styles allowed (ported debt).
- **CSP + security headers** for deployment: `vercel.json` and `public/_headers` (Netlify) —
  `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (React inline styles), `connect-src 'self'`,
  `frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy, Permissions-Policy. Verified
  compatible with the built output (no inline scripts).

### Tests

- Added `tests/searchUtils.test.ts` (normHe/scoreP/hlParts/relTime). Suite: 59 green.

---

## [1.0.1] — 2026-07-04

### Fixed — production-readiness pass

- **Added a page-level error boundary** (`src/components/shared/ErrorBoundary.tsx`) wrapping the
  route render in `App.tsx`. A render error in one screen now shows a recoverable Hebrew alert
  card instead of white-screening the whole app; it self-clears on navigation. Previously any
  page-render throw would crash the entire app.
- **Fixed horizontal overflow on mobile** (`src/styles/global.css`): the off-canvas nav drawer
  (`position:fixed; translateX(105%)`) created ~80px of phantom horizontal scroll in RTL.
  `html, body { overflow-x: hidden }` removes it; verified the sticky app bar, vertical scroll,
  and drawer open/close are unaffected across mobile/tablet/desktop.
- **Added `@types/node`** + `tsconfig` `types: ["node", …]` so `tsc` (and `npm run build`) pass
  with the Node-based security tests present.

### Tests

- Added `tests/errorBoundary.test.tsx` (3 tests: catches a throw, recovers on resetKey change,
  passes children through). Added 2 network/tabnabbing static guards to `tests/security.test.ts`.
  Suite: 50 tests green.

---

## [1.0.0] — 2026-07-04

### Added — initial production React port of prototype spec v2.2.0

- Vite + React 18 + TypeScript scaffold, RTL Hebrew (`<html lang="he" dir="rtl">`), port 3110.
- Canonical token CSS (58 tokens × light/dark) + base styles verbatim from the spec.
- Global store porting the prototype logic: state patches, debounced localStorage session
  persistence, theme (light/dark/system) + accessibility appliers, global keyboard
  shortcuts (Escape cascade, ⌘K, `?`, `/`, `N`, `G`), online/offline awareness.
- `navConfig()` single source of truth (sidebar + ⌘K palette + global search) per the
  v2.2.0 navigation contract; added the missing `documents` entry to `ROUTE_TITLES`.
- All 26 content routes ported as lazy-loaded pages + 5 auth states.
- App shell: sidebar (off-canvas drawer on mobile), appbar with global search, sync menu,
  notifications popover, theme toggle, upload CTA; overlays: keyboard-shortcuts dialog,
  command palette, AI assistant, action dialogs (create/edit/delete/merge/wipe/goal/
  schedule), snackbar.
- Shared `Pager` component (port of `Pager.dc.html`) used by patients/sessions/documents.
- Gendered-Hebrew microcopy layer (`hebrew-grammar.js`, window.HG) bundled and typed.
- Vitest suite: utils (100%), navConfig contract, route smoke renders for all 26 routes
  + auth view.
