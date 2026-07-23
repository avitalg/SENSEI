# CLAUDE.md — working guidance for Sensei

Orientation for an AI/human contributor. Read this first, then `README.md` (run +
scope), `ARCHITECTURE.md` (layers + single-source-of-truth map), `CONTRIBUTING.md`
(the full enforcement table), and `TESTING.md` (suite map).

**Documentation map:** every topic has one canonical home, indexed in
[`docs/INDEX.md`](docs/INDEX.md) — product/PRD/journeys in `docs/PRODUCT.md`,
design tokens/components/interaction-states in `docs/DESIGN_SYSTEM.md`, decision
records (incl. the shipped answers to the spec's open questions) in `docs/ADR.md`,
copy/voice in `CONTENT_GUIDE.md`, version history in `CHANGELOG.md`. Keep docs in
sync with code — the version-consistency guard in `tests/canonical.test.ts`
enforces `package.json` === newest `CHANGELOG.md` heading === README badge.

## What this is

Sensei is a **Hebrew-only, RTL, client-only** React 18 + TypeScript (Vite) SPA —
a production frontend for an AI-assisted therapist practice-management tool. It
runs entirely on **seeded demo data + `localStorage`**; there is **no backend**.
A typed API layer (`src/services/`) exists but is **dormant** until
`VITE_API_BASE_URL` is set. Treat it as a production-ready *demo/design
reference*, not a live clinical system.

> **Exception — live AI chat.** The "שאל את סנסיי" panel
> (`components/layout/AiAssistant.tsx`) is the one feature that talks to a real
> backend when configured: it streams from the senseiapi `/assistant/chat` endpoint
> via `@ai-sdk/react`'s `useChat` (deps `ai` + `@ai-sdk/react` — the only runtime
> deps beyond React). With `VITE_API_BASE_URL` unset it falls back to the original
> canned demo answers, so the client-only default is unchanged. Mode is chosen once
> at mount.

- 17 routes (state-driven, mirrored to `location.hash` — see below), 5 auth states,
  light/dark themes. Node ≥ 18.

## Commands (all must stay green)

```bash
npm install
npm run dev         # Vite dev server on http://localhost:3110
npm run lint        # eslint, flat config, --max-warnings=0
npm run typecheck   # tsc --noEmit
npm test            # vitest suite (unit · route smoke · a11y · canonical guards)
npm run build       # typecheck + production bundle
npm run preview     # serve the production build (port 3110)
```

Run lint + typecheck + `npm test` + build before considering any change done.
CI (`.github/workflows/ci.yml`) additionally runs coverage + duplication +
a prod-dependency audit.

## Binding conventions (all CI-enforced — do not break)

- **Hebrew only, RTL throughout.** Plural voice (לשון רבים). **No emoji in UI.**
- **Logical CSS properties only** (`marginInline*`, `insetInline*`, `textAlign:
  'start'/'end'`). Physical props (`marginLeft`, `textAlign:'left'`…) are banned
  by a guard — they don't flip for RTL.
- **Colors come from `var(--token)`** (`src/styles/tokens.css`, light + dark).
  Hardcoded hex is ratchet-guarded (baseline 66, non-increasing).
- **Single source of truth.** Every shared symbol/catalog/style has one canonical
  home (see the map in `ARCHITECTURE.md`); duplication fails CI. Reuse before
  adding.
- **Layering.** Leaf modules (`utils/`, `data/`, `hooks/`, `nav/`) must not import
  from `pages/`, `components/`, or `store/`. Pages must not import pages.
- **Technical strings** (phone, email, date, license, time) are `dir="ltr"`.
- **New behavior ships with a test**, and every user-visible change updates
  `CHANGELOG.md`. `package.json` version === newest CHANGELOG heading === README
  badge (guarded — bump all three together).

## Architecture in one breath

`main.tsx → App.tsx` → `components/layout/*` (AppShell/Sidebar/AppBar/overlays) +
`pages/*` (one lazy file per route) → `store/AppStore.tsx` (global state,
`localStorage` persistence, theme, a11y, keyboard shortcuts) → leaf modules
(`nav/`, `utils/`, `data/`) + `styles/tokens.css`.

**Routing:** state-driven `route` key (no router lib) mirrored into `location.hash`
by `src/nav/urlHash.ts` (`#/analytics`, `#/patient/p3`) for deep links, bookmarks,
refresh-safety, and the browser Back button. Auth screens, dialogs, the command
palette, and overlays stay state-driven by decision; a deep link sets the route
only (never the view), so a URL cannot bypass sign-in.

**Desktop / mobile shells:** `App.tsx` branches on `useIsMobile()` (`src/hooks/`,
`max-width:767px`). Desktop → `components/layout/AppShell`; the home (`dashboard`)
is a Google-Calendar-style **week view** (`pages/DashboardPage`). Phone-width →
`components/mobile/MobileApp` (touch-first shell reusing the Sidebar as a drawer)
with bespoke screens — day view → patient → recording overlay — and
falls back to the shared route page otherwise. Both shells read the SAME
store/services; week events come from `hooks/useWeekEvents`, session-category
labels/tokens from `data/sessionCategories`. No new deps, still client-only.

## Guardrails when changing things

- Don't add a backend, real auth, or secrets — `VITE_*` vars are client-inlined
  and must never hold secrets (only `VITE_API_BASE_URL` + Vite built-ins are read).
- Don't introduce features/redesigns; prefer minimal, reversible, tested changes
  that preserve existing UX and business logic.
- Keep demo data isolated and labeled. Preserve accessibility (WCAG 2.2 AA:
  keyboard, focus-visible, contrast in both themes, reduced-motion, skip link).
