# Testing — Sensei Frontend

How the frontend is tested, how to run the suite, and where the boundaries are. This is
the developer guide; the **enforcement contract** (per-guard owner / verify command /
failure condition / rollback) lives in [CONTRIBUTING.md](CONTRIBUTING.md) § Enforcement.

## Stack

| Concern | Tool |
|---|---|
| Runner | **Vitest** (`vitest run`) |
| DOM environment | **jsdom** |
| Component rendering | **@testing-library/react** (`render`, `fireEvent`, `waitFor`, `act`) |
| Interaction | `fireEvent` (the project's default); `@testing-library/user-event` is available for higher-fidelity input sequences |
| Accessibility assertions | **vitest-axe** + **axe-core** |
| Coverage | **@vitest/coverage-v8** |

No Jest, no MSW, no Playwright/Cypress — see **Known limitations** for why.

## Running

```bash
npm test               # full suite (vitest run) — the current file/test count is whatever this prints; don't hardcode it in docs
npm run test:watch     # watch mode
npm run test:coverage  # + v8 coverage over the logic layer (thresholds 75%)
```

The suite is fully offline and deterministic: no network, no real timers advanced, no
backend. CI runs `npm test` as a required gate (`.github/workflows/ci.yml`).

## Folder structure & naming

- All tests live in `tests/` as `*.test.ts` (logic) or `*.test.tsx` (component/integration).
- `tests/setup.ts` runs before every file: it loads the real `public/hebrew-grammar.js`
  into `window.HG` so gendered-Hebrew code paths execute against the real resolver, not a
  stub.
- One file per concern; the filename names the concern (`authFlow`, `hebrewGrammar`, `tableCanonical`…).

## What the suites cover

| Suite | Covers |
|---|---|
| `utils`, `searchUtils` | pure logic: risk/avatar/file-validation/recent-patient/initials helpers, search ranking |
| `hebrewGrammar` | `hg` / `hgTerm` gendered microcopy (masc/fem/neutral, definite article, liberal gender input, absent-layer fallback) |
| `navConfig` | navigation SSOT: destination set, no orphaned routes, distinct icons, pinned utility group |
| `urlHash` | URL-hash routing (`nav/urlHash`): round-trip of all 17 routes, patient-id deep links, unknown-route/malformed-id/injection rejection, missing-slash tolerance |
| `apiClient` | the dormant typed API client: success / empty / error / unauthorized shapes (mocked `fetch`, never a live call) |
| `formValidation` | add-patient dialog: required-field + range validation, announced errors wired to fields, focus move, valid submit |
| `authFlow` | login validation (bad email, short password, valid→loading, Enter-key submit) + logout session teardown |
| `patientLifecycle` | delete/archive flow: confirmation required, removal on confirm, undo restores, cancel keeps the record |
| `searchSessions` | unified search returns SESSION matches, not just patients (regression lock on the shared `buildSessions` projection) |
| `routing` | unknown/stale `route` key falls back to the dashboard (no crash/blank); known routes still render |
| `upload` | audio-upload flow: unsupported file → format error; supported file → leaves idle drop zone for the pipeline (real `S.upload` state machine, no timers awaited) |
| `theme` | persisted preference applied to `<html data-theme>` on load; app-bar control toggles light → dark |
| `a11yPrefs` | accessibility preferences apply to `<html>`: `data-a11y-*` for contrast/motion/focus/reading/underline + text-size zoom; `resetA11y` restores defaults |
| `patientsSearchSort` | patients roster inline search + sort control: filtering and reordering from the page itself |
| `highlight` | shared `Highlight` renderer wraps the matched substring in `<mark>`, no-op on an empty query — consistent with the `hlParts` SSOT |
| `share` | share utilities: WhatsApp (`wa.me`) + `mailto` URL building, UTF-8 percent-encoding (Hebrew/English/mixed/numbers round-trip), sanitization (control chars stripped, CRLF normalized), recipient never auto-filled (no PII) |
| `shareMenu` | `ShareMenu` component: stays collapsed until opened, opens (click or ArrowDown) into an ARIA menu offering WhatsApp + Email, roves focus with ArrowUp/ArrowDown (wrapping) + Home/End, returns focus to the trigger on Escape and closes on Tab, disabled when there's nothing to share, sensitive-content note when passed, WhatsApp opened via a safe `noopener` window with the text URL-encoded |
| `clipboard` | copy-to-clipboard (navigator.clipboard mocked) writes the text and shows the Snackbar toast; toast dismisses |
| `notifications` | notifications page: unread/active summary, mark-all-read, unread/archive filters |
| `commandPalette` | ⌘K palette: type → filter to a matching option → select navigates; Escape closes |
| `editPatient` | edit-patient dialog opens pre-filled, renaming saves and updates the list |
| `sessionRecording` | session recording → upload handoff: stash/take is get-and-clear (consumed exactly once), a stashed recording advances the upload pipeline on mount, and the patient-file "הוספת מפגש" button opens the capture dialog (graceful unsupported message under jsdom) |
| `mockPatientsRepo` | the canonical demo-data layer (`data/mockPatientsRepo.ts`): recursive discovery of every `mock_patients/<folder>` with no hardcoded roster, markdown parsing, domain mapping (patient · sessions · risk buckets), patient isolation, session ordering/dedup, task extraction with no invented values, and unknown-field preservation |
| `dataIntegrity` | offline-roster reconciliation: archived/deleted patients are never resurrected, deleted meetings stay deleted, retired seed ids are dropped, and dashboard stats ignore orphaned appointments |
| `patientSessionContent`, `patientOverview` | per-patient demo content projected from the repository: every discovered patient has its own session arc (titles/summaries/insights + real dates) and a Patient Overview derived from the file's רקע קליני / גישה טיפולית; ids outside the repository fall back to the neutral set; no em-dash-adjacent-to-Hebrew in any copy |
| `capturePairing` | unified capture (screen spec): one "הוספת מפגש" action per surface opens the shared dialog with exactly two tabs (הקלטה · העלאת קובץ), the upload tab hands off to the upload screen keeping the patient context, and the upload screen still offers a record alternative |
| `mobileScreens`, `mobileDayView`, `mobileSpecParity` | the phone shell: bespoke day view + patient file, day-strip selection, per-appointment quick actions, the standing next-meeting hero (quick review + prep report), the "פתיחת יום" recap control, no global capture FAB on home, desktop-parity workspace tabs (פגישות · סקירה · הערות · מסמכים) with "השמעת תקציר", and the patient-fixed capture dialog |
| `todayAgenda`, `meetingDetails` | the home agenda table (patient · start · end · type · location · status + row actions) and the appointment-details dialog (recap, capture, open-file, edit, delete) |
| `tableCanonical` | canonical table contract: Patients is the SSOT, Archive + Meeting-History directory reuse the same `PatientIdentity`, `TableSearch` and `TableEmptyState` (query-empty recovery), differing only by data/actions |
| `pagerInteraction` | patients roster renders every active patient at once — locks the pagination-free table design (no page controls) |
| `transcript` | two-sided transcript renders (speakers + timestamps); query filters *and* highlights via canonical `hlParts`; clearing restores |
| `nextMeetingReport` | prep-report screen: sidebar navigation, dataset-verified body (insight/summary/topics/next-focus verbatim), patient switching, deep link |
| `routes` | every one of the 17 routes renders without throwing (smoke) |
| `a11y` | axe clean across all routes + overlays; keyboard combobox for search/palette |
| `contrast`, `focusTrap`, `errorBoundary` | WCAG contrast, modal focus trap + restore, error-boundary recovery + logging |
| `demoGating`, `security` | demo-mode isolation; env-var secret-safety (only `VITE_API_BASE_URL` + Vite built-ins) |
| `securityHeaders` | hosting-header parity across Vercel (`vercel.json`) + Netlify (`public/_headers`): strict CSP, HSTS, nosniff, and `Permissions-Policy` with `microphone=(self)` (so in-browser recording works while every other feature stays denied) |
| `securitySource` | static client-side security invariants: no raw-HTML sinks (`dangerouslySetInnerHTML`/`innerHTML`), no `eval`/`new Function`, no `javascript:` URIs, `window.open` always `noopener`, no hardcoded secrets, no production source maps |
| `canonical` | static-analysis guards: single source of truth, one-way layer imports, RTL logical-props, hex ratchet, version consistency, print/help/dark-mode invariants |

## Mocking strategy

- **No runtime API exists.** The app runs on seeded data + `localStorage`; the typed
  `src/services/` layer is dormant until `VITE_API_BASE_URL` is set. `apiClient.test.ts`
  therefore stubs the global `fetch` to assert the client's response handling
  (ok / empty / non-2xx) without any network. MSW would add a dependency for a network
  layer that isn't wired — it is intentionally not used.
- **Component/integration tests** mount the real app
  (`render(<AppStoreProvider><App/></AppStoreProvider>)`) with `localStorage` seeded to a
  starting state, then drive it through real events. This exercises the true store +
  component behavior rather than mocking internals.
- **Grammar layer** is the real script (`tests/setup.ts`), not a mock.

## Coverage expectations

Coverage is scoped to the **logic layer** (`src/utils`, `store`, `hooks`, `nav`, `data`,
`services` — the API contract layer) with a **75%** CI-enforced threshold across
statements/branches/functions/lines (currently ~81% lines / ~82% branches).
Presentational pages/components are **not line-covered**; they are verified by the route
smoke suite (renders without throwing) and the axe a11y suite. This is deliberate — line
coverage of JSX rewards shallow render tests; behavior coverage of the logic + a11y/smoke
of the views catches real regressions.

## TDD workflow

1. Write/adjust the test for the intended user-visible behavior first.
2. Make the minimal change to pass it.
3. Refactor under green; re-run `npm test`.
4. A behavior guarded by a `canonical` invariant (SSOT, RTL, contrast, version) must keep
   that guard green — the guard is the executable spec.

## Known limitations

- **No end-to-end tests (Playwright/Cypress).** Critical flows are covered by
  integration tests that mount the full `App` in jsdom (auth, forms, navigation). A real
  browser E2E layer is tracked debt, not present.
- **No visual-regression / Storybook.** Documented debt in [README](README.md) § Known debt.
- **No cross-browser matrix.** jsdom only; manual verification covers real browsers.
- **Timers are asserted, not advanced.** The login success path starts an 850 ms timer;
  tests assert the deterministic loading state and rely on unmount cleanup rather than
  advancing timers, to stay non-flaky.
