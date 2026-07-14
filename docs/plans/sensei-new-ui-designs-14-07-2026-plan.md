# Plan — Implement the "SENSI — READY FOR PROD" designs (web + mobile) on `new-ui`

> Saved retroactively per CLAUDE.md rule 6 / plan-guidelines Phase 1. Branching
> strategy **B — current branch** (`new-ui`, a user-created side branch). One PR
> at the end (via `pr-mr-prepare`).

## Context

The user built prototypes in a Claude Design project ("SENSI — READY FOR PROD",
`7b53a63d-7b15-4cfa-bb32-d54eeb2d7f02`) and wants them implemented in the real
Sensei SPA, reusing the existing stack (React 18 + TS + Vite, no router,
`AppStore` context, vanilla CSS + tokens, Hebrew RTL). No new deps, no backend.

Reading the two design-canvas sources: the **web** prototype reused the existing
pages verbatim except a new **Google-Calendar-style week-view home**; the
**mobile** prototype is a new touch-first flow (day view → prep report → patient
→ recording + insight/attach sheets).

Confirmed decisions: (1) client-only wiring to store/services/demo data; (2)
dedicated mobile screens, viewport-gated; (3) replace the dashboard with the
calendar week view.

## Binding constraints (CI-enforced)
- Hebrew only, RTL, plural voice, **no emoji** (inline SVG icons instead).
- Colors via `var(--token)` only; **no hardcoded hex in .ts/.tsx** (ratchet 8).
- Logical CSS only; technical strings `dir="ltr"`.
- Every user-visible change → CHANGELOG + version + README badge in sync.
- Leaf modules (`utils/ data/ hooks/ nav/`) must not import `pages/ components/ store/`.

## Milestones & status

- **M0 — Foundation** `[DONE]` — session-category + `--now-line` tokens (light+dark,
  AA-verified in `tests/contrast.test.ts`); `src/hooks/useIsMobile.ts`
  (`tests/useIsMobile.test.tsx`); eslint ignores design-sync artefact dirs.
- **M1 — Desktop CalendarHome** `[DONE]` — `src/pages/DashboardPage.tsx` +
  `dashboard.css` rewritten as the week grid (now-line, category events,
  mini-month, legend, week nav, schedule dialog CTA) sourced from
  `useWeekEvents`. `tests/dashboardCalendar.test.tsx`; a11y/routing updated.
- **M2 — Mobile shell + day view** `[DONE]` — `App.tsx` viewport branch →
  `components/mobile/MobileApp.tsx`; `MobileDayView.tsx` (strip + month picker +
  expandable actions + insight/attach sheets); `icons.tsx`, `mobile.css`,
  `shared/PageFallback.tsx`. `tests/mobileDayView.test.tsx`.
- **M3 — Mobile prep/patient/recording** `[DONE]` — `MobilePrepReport.tsx`,
  `MobilePatient.tsx`, `MobileRecording.tsx` (on `useAudioRecorder`, extended
  with pause/resume); shared `data/sessionCategories.ts`, `data/reportContent.ts`.
  `tests/mobileScreens.test.tsx`.
- **M4 — Polish, a11y, CI green** `[DONE]` — `tests/mobileA11y.test.tsx` (axe);
  reduced-motion covered globally; full gate green.

## Key decisions / deviations
- **Multi-hue category colors** kept (calendar readability) but tokenized + AA-verified,
  a deliberate deviation from the app's blue-only identity — approved via the plan.
- **Emoji → SVG** and **hex → token** conversions are mandatory (CI guards), so mobile
  screens are visually faithful, not byte-identical to the prototype.
- Mobile reaches non-designed routes via the existing **Sidebar as a drawer**; the
  prototype's hardcoded roster was dropped in favor of the store's real data.
- **Pre-existing bug fixed** (user-directed): `loadPatientUpcomingEvents` no longer
  injects the generic calendar fixture into a patient's upcoming list (was a
  date-dependent off-by-one that failed `tests/patientUpcomingMeetings.test.tsx`).

## Verification results
- `npm run check` (lint + test + build): **353 tests pass**, build clean.
- Coverage (logic layer): **86.1% stmts / 81.3% branches / 73.8% funcs / 86.1% lines** (≥70%).
- Duplication (jscpd): **1.99%** (< 5%).
- Mobile + desktop axe (structural WCAG): clean.
- **Gate A** (per-file code review): 6 parallel reviewers; findings fixed (see
  `docs/code-review/sensei-new-ui-14-07-2026-code-review.md`).
- **Gate B** (holistic) + **QA handover**: see below (in progress at time of writing).

## QA verdict
_(appended after `qa-engineer` acceptance pass — pending.)_
