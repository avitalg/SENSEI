# Summary deep links — keep the meeting in the URL

**Date:** 2026-07-25
**Status:** approved, ready for planning

## Problem

Opening a live summary works only for as long as the tab lives. `S.meetingId`
is held in memory: it is absent from `PERSIST_KEYS` (`src/store/AppStore.tsx:29-40`)
and absent from the URL, because `routeToHash` emits at most
`#/<route>/<patientId>` (`src/nav/urlHash.ts:18-27`) and `parseHash` rejects a
third segment for every route except `session` (`:38-41`).

So on a hard refresh, or when the URL is copied into a new tab,
`SummaryPage.tsx:26-28` finds no `S.meetingId`. It falls back to
`transcriptsByPatient[pid].meetingId`, which exists only if this browser
performed the upload, and otherwise `useApi` goes false and the page renders
seeded demo copy under a real patient's name.

A second, related defect is already latent in the same code. `navigate('summary',
{ patientId })` carries no `meetingId`, and the store leaves the previous value
in place, so moving from patient A's summary to patient B's can render A's
meeting under B's URL. Every patient-only entry point does this:
`src/utils/patientSessions.ts:63`, `SearchPage`, `LetterPage`, and
`TranscriptPage`.

The fix has a precedent in the same module: `#/session/<pid>/<num>` is already a
three-segment route (`urlHash.ts:20-22`), and `ID_RE` (`[A-Za-z0-9_-]{1,64}`)
already matches a UUID.

## Scope

The `summary` route only.

`report` has the same in-memory shape (`S.reportMeetingId`) but degrades
gracefully — without it, the prep report falls back to the patient-level live
report, which is still server data, not demo copy. `transcript` has no live
per-meeting fetch at all today (`TranscriptPage` reads the persisted upload),
so giving it a deep link would mean new fetch wiring. Both stay out.

## Design

### 1. Routing — a meeting segment for `summary`

`src/nav/urlHash.ts`:

```ts
const MEETING_ROUTES = ['summary'];

routeToHash(route, patientId?, sessionNum?, meetingId?)
  → '#/summary/<pid>/<meetingId>'  when route ∈ MEETING_ROUTES
                                   && both ids pass ID_RE
parseHash('#/summary/<pid>/<mid>') → { route, patientId, meetingId }
```

`ID_RE` is unchanged — a UUID is 36 chars of `[a-f0-9-]`. The `session` branch
is unchanged. Every other route still rejects a third segment.

`src/store/AppStore.tsx` carries `meetingId` through the four places that
already handle `sessionNum`:

- the `navigate` mirror (`:168`)
- the mount deep-link restore (`:426-428`)
- the normalize `replaceState` (`:438`)
- the `hashchange` handler (`:495`, `:499-512`), which gains a `sameMeeting`
  comparison alongside `sameRoute` / `samePatient` / `sameSession`

`meetingId` is deliberately **not** added to `PERSIST_KEYS`. The URL becomes its
single source of truth. Persisting it would reintroduce exactly the stale-value
bug this spec removes.

### 2. The latent stale-meeting bug

On a navigation to `summary`, a `meetingId` absent from the patch is treated as
an explicit `null`. This is the rule the store already applies to `patientId` at
`:167`, for the same reason: a bare `||` fallback resurrects the previous value.

After this, `navigate('summary', { patientId })` always means "this patient's
latest summary", never "whatever meeting I happened to view last".

### 3. Resolving a patient-only link

New leaf hook, `src/hooks/useLatestMeetingId.ts`:

```ts
useLatestMeetingId(patientId: string, enabled: boolean)
  → useQuery(queryKeys.patientPast(patientId), loadPatientPastEvents)
  → events[0]                                    // service sorts newest-first (calendar.ts:548)
  → resolveCalendarEventApiId(id) || dbEventApiId(id)
  → { meetingId: string, loading: boolean }
```

It reuses `queryKeys.patientPast`, the key `usePatientMeetingHistory` already
populates, so arriving from the patient screen hits cache instead of refetching.
Layering holds: `hooks/` imports `services/` and nothing upward.

`SummaryPage` resolves in order: `S.meetingId` → `transcriptsByPatient[pid].meetingId`
→ the hook's result. The hook is enabled only when `isApiConfigured() && !meetingId`.

Once resolved, the URL must become copyable, so the store exposes
`setMeetingId(id)`: `set({ meetingId: id })` plus
`history.replaceState(null, '', routeToHash('summary', pid, undefined, id))`.
`replaceState`, not a hash write — resolving "latest" is not a navigation and
must not add a back entry. Routing knowledge stays in the store, which already
owns every other `routeToHash` call.

### 4. Nothing to show

`SummaryPage:250-275` already renders a "לא ניתן להציג את הסיכום" panel with
תמלול / נסו שוב actions. It becomes the single surface for every unavailable
case: `showError` widens to `showUnavailable`, and the message and action pair
come from the case.

| Case | Condition | Message | Actions |
| --- | --- | --- | --- |
| Unknown meeting in the URL | live, poll rejects with status 404 | `הפגישה לא נמצאה · ייתכן שהקישור אינו עדכני` | היסטוריית פגישות · תיק מטופל |
| No past meetings to resolve | live, patient-only URL, resolver returns none | `לא נמצאו פגישות קודמות למטופל` | העלאת הקלטה · תיק מטופל |
| No network | live, `!S.online` or `ApiError.code === 'NETWORK'` | `אין חיבור לרשת · הסיכום ייטען כשהחיבור יחזור` | נסו שוב |
| Generation failed | live, `status === 'failed'` | server error text, unchanged | צפייה בתמלול · נסו שוב |

The only new plumbing is the 404 mapping: `SummaryPage`'s catch already reads
`e?.details?.detail` and `e?.message`, and gains an `e?.status === 404` branch
ahead of them.

Demo mode is untouched. With no API configured the page renders seeded copy
exactly as today — the documented client-only behavior. In live mode, demo copy
is never shown again.

## Testing

- `tests/urlHash.test.ts` — `#/summary/<pid>/<uuid>` round-trips; a third
  segment is still rejected for non-meeting routes; a malformed meeting id is
  rejected.
- New `tests/summaryDeepLink.test.tsx` — mounting at `#/summary/<pid>/<uuid>` in
  live mode polls that meeting id and renders no seeded copy; a patient-only URL
  resolves the newest meeting and rewrites the hash to include it; navigating
  from patient A's summary to patient B's drops A's meeting id.
- `tests/summaryErrorRecovery.test.tsx` — extended with the 404, no-meetings,
  and offline cases.
- Existing summary and routing tests stay green untouched; they are the
  regression guard for demo mode.
- `CHANGELOG.md` entry plus a version bump to **1.62.4** in `package.json`,
  `CHANGELOG.md`, and the README badge.

## Verification

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all pass.

Manual check with a backend: open a patient's meeting summary, copy the URL into
a new tab — the same meeting's server summary loads. Refresh — unchanged. Strip
the meeting segment — the newest meeting resolves and the URL rewrites to name
it.
