# Architecture — Sensei

Client-only React 18 + TypeScript (Vite) SPA. Hebrew RTL. State-driven routing
(no router lib): one `route` string in a global store drives 23 lazy-loaded
pages. A thin **URL-hash layer** (`src/nav/urlHash.ts`) mirrors that route into
`location.hash` (`#/analytics`, `#/patient/p3`), so every app screen is
deep-linkable, bookmarkable, refresh-safe, and reachable by the browser Back
button — with no router dependency and no server-rewrite config. Auth screens,
dialogs, the command palette, and overlays stay purely state-driven by decision
(transient UI earns no URL); a deep link sets the route only, never the view, so
a URL cannot bypass the sign-in gate.

## Layers (import direction is one-way, top → bottom)

```
main.tsx → App.tsx
  components/layout/*   (AppShell, Sidebar, AppBar, overlays)   ← UI chrome
  pages/*               (one file per route, lazy)              ← screens
        ↓ may import ↓
  store/AppStore.tsx    (global state, persistence, theme, a11y, shortcuts)
  hooks/*               (useFocusTrap)
        ↓ may import ↓
  nav/, utils/, data/   (LEAF modules — pure, import nothing from UI/state)
  styles/               (tokens.css = canonical design tokens)
```

**Rule:** leaf modules (`utils/`, `data/`, `hooks/`, `nav/`) must not import from
`pages/`, `components/`, or `store/`. Pages must not import other pages. Enforced by
`tests/canonical.test.ts`.

## Single Source of Truth (canonical map)

| Concept | Canonical owner |
|---|---|
| Design tokens (color/space/type, light+dark) | `src/styles/tokens.css` |
| Navigation destinations + route titles | `src/nav/navConfig.ts` |
| URL-hash ↔ route mapping (`routeToHash`/`parseHash`) | `src/nav/urlHash.ts` |
| Seeded demo state | `src/data/seed.ts` |
| Catalogs (documents / resources / notifications) | `src/data/catalogs.ts` |
| Session seed (dates / topics / summaries / risk) | `src/data/sessions.ts` |
| Keyboard shortcuts reference | `src/data/shortcuts.ts` |
| Search ranking + highlight (`scoreP`/`hlParts`/`normHe`) | `src/utils/search.ts` |
| Relative-time formatting (`relTime`) | `src/utils/format.ts` |
| Duplicate-patient clustering (`buildDupClusters`) | `src/utils/dedup.ts` |
| Shared inline styles (`CARD_SHADOW`/`labelStyle`/`thStyle`/`tdStyle`) | `src/utils/styles.ts` |
| Theme-toggle icons (`SUN`/`MOON`/`MONITOR`) | `src/utils/themeIcons.ts` |
| Share-target building (`buildWhatsAppUrl`/`buildMailtoUrl`/`sanitizeShareText`/`canShare`) | `src/utils/share.ts` |
| `riskMeta`/`avatarColors`/`validateFile`/`getPatient`/`hg`/`hgTerm` | `src/utils/index.ts` |
| Gendered Hebrew microcopy engine (`window.HG`) | `public/hebrew-grammar.js` |
| Global state / persistence / theme / a11y / shortcuts | `src/store/AppStore.tsx` |

Adding a concept? Give it one home above and import it — do not re-declare it in a page.

## Known intentional divergence (not duplication)

`buildSessions` (4 pages) and `nMeta`/`routeFor`/`resCatMeta`/`tagMeta` are similarly-named
but **behaviorally different** per screen; they share the seed/catalog data but keep their own
projections. Merging them would change behavior, so they are intentionally not consolidated.

## Backend integration (client-ready, currently dormant)

There is **no backend today** — the app runs on `data/seed.ts` + localStorage. A canonical,
typed API layer is in place but inert so a backend can be wired later without a rewrite:

| Piece | File |
|---|---|
| Typed fetch client (base URL, Bearer via pluggable provider, timeout, typed errors) | `src/services/apiClient.ts` |
| Generic REST `ApiService<T>` (list/get/create/update/remove) | `src/services/crud.ts` |
| Service instances + auth service + barrel | `src/services/index.ts` |
| Mock authentication — users, credentials, sessions, reset (the frontend-only auth seam) | `src/services/mockAuth.ts` |
| Avatar color scale (the only sanctioned raw hex outside tokens.css — needed for tint/lighten math) | `AVATAR_PALETTE` in `src/utils/index.ts` |
| Email-format validation (one strict regex for login/signup/reset/profile) | `EMAIL_RE` in `src/utils/index.ts` |
| Domain model types (the API contract) | `src/types/index.ts` |

**It is dormant unless `VITE_API_BASE_URL` is set** (`isApiConfigured()` gates every call);
no runtime code imports it, so it's tree-shaken from the build and all current flows are unchanged.

### Wiring a real backend (future work)

1. Set `VITE_API_BASE_URL` (see `.env.example`).
2. Reconcile `src/types/index.ts` with the backend's actual response schemas.
3. Provide the auth token via `setAuthTokenProvider(...)` (prefer an httpOnly session cookie
   set by the server over client-readable storage).
4. Replace the store's seed/localStorage reads with the matching `*Api` calls, screen by screen,
   keeping the existing loading/empty/error states.

Rule: all backend access goes through `src/services/` — never scatter raw `fetch`/`axios`.

## Non-goals (by design, for a client-only demo)

No backend/API layer, no auth server, no database, no i18n framework (Hebrew-only), no
Storybook, no component library (screens are inline-styled, faithful to the design spec).
