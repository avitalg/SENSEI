# Meeting Summary API Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Calendar's meeting dialog and the existing Summary page to the live `GET /meetings/{meeting_id}/summary` endpoint on senseiAPI, falling back to the current mock text whenever the API is not configured.

**Architecture:** The backend endpoint **already exists** (`~/Development/senseiAPI/summaries/router.py`) and needs no change — this is a frontend-only plan. A new leaf service (`src/services/summaries.ts`) owns the API type + fetch, a new leaf hook (`src/hooks/useMeetingSummary.ts`) owns fetch/poll/abort, and both the `calEvent` dialog and `SummaryPage` consume the hook. The mock→API switch reuses the project's existing flag, `isApiConfigured()` (true iff `VITE_API_BASE_URL` is set), combined with the existing `resolveCalendarEventApiId()` — a fixture event id like `evt-901` yields no API id, so demo events keep rendering demo text with zero network calls.

**Tech Stack:** React 18 · TypeScript · Vite · Vitest + @testing-library/react · existing `src/services/apiClient.ts` (`apiRequest`, `isApiConfigured`)

## Global Constraints

Every task's requirements implicitly include these (all CI-enforced — see `CLAUDE.md` / `CONTRIBUTING.md`):

- **Hebrew only, RTL, plural voice (לשון רבים). No emoji anywhere in UI source.**
- **Logical CSS properties only** — `marginInlineStart`, `insetInlineEnd`, `textAlign: 'start'|'end'`. `marginLeft`/`paddingRight`/`textAlign:'left'` are banned by `tests/canonical.test.ts`.
- **Colors come from `var(--token)` only** (`src/styles/tokens.css`). New hardcoded hex fails the ratchet guard (baseline 66, non-increasing).
- **Layering:** leaf modules (`utils/`, `data/`, `hooks/`, `nav/`, `services/`, `types/`) must **not** import from `pages/`, `components/`, or `store/`. Enforced by `tests/canonical.test.ts`.
- **Technical strings** (model name, ids, dates, times) are `dir="ltr"`.
- **Copy-integrity guard:** `src/components/layout/Dialogs.tsx` and `src/pages/SummaryPage.tsx` must contain no `ביומן הפעילות` and no `\d+\s*יום` retention claim.
- **Heading guard:** any `.tsx` using `<h3>` must also use `<h2>`; no `<h4>`–`<h6>`.
- **Version consistency:** `package.json` version === newest `CHANGELOG.md` heading === README `**Version:**` badge. Current is `1.0.80`; this feature ships as **`1.0.81`** — bump all three together in the final task.
- **Every command must stay green:** `npm run lint` (`--max-warnings=0`), `npm run typecheck`, `npm test`, `npm run build`.

## Backend Reference (read-only — do not modify senseiAPI)

`GET /meetings/{meeting_id}/summary` where `meeting_id` is a UUID.

| Situation | HTTP | Body |
|---|---|---|
| Summary row exists, `status` is `ready` or `failed` | `200` | `SummaryResponse` |
| Summary row exists, `status` is `pending` or `running` | `202` | `SummaryResponse` |
| No summary row for that meeting | `404` | `{"detail": "no summary for meeting <uuid>"}` |

`SummaryResponse` (from `summaries/schemas.py`):

```json
{
  "meeting_id": "3f2b1c00-0000-4000-8000-000000000001",
  "status": "ready",
  "text": "…סיכום…",
  "model": "qwen2.5:7b",
  "error": null
}
```

`status` is one of `"pending" | "running" | "ready" | "failed"`. On `failed`, `text` is `null` and `error` holds the reason. Note `apiRequest` treats `202` as success (`res.ok`), and throws `ApiError` with `status: 404` for the not-found case.

## File Structure

| File | Responsibility |
|---|---|
| **Create** `src/services/summaries.ts` | Canonical home for the summary API contract: `MeetingSummary` type, `SUMMARY_STATUS_LABEL` Hebrew map, `fetchMeetingSummary()`. Leaf module — imports only `./apiClient`. |
| **Create** `src/hooks/useMeetingSummary.ts` | Canonical home for the fetch/poll/abort lifecycle. Pure React hook taking a meeting id, returning a discriminated state. Leaf module — imports only `react` + `../services/*`. |
| **Modify** `src/data/seed.ts` | Add `summaryMeetingId: null` to `initialState`. |
| **Modify** `src/store/AppStore.tsx` | Persist `summaryMeetingId`; `navigate()` resets it from the patch so a stale meeting id can never leak across routes. |
| **Modify** `src/components/layout/Dialogs.tsx` | `calEvent` dialog: summary status row + "צפייה בסיכום" button that navigates to `summary` carrying `summaryMeetingId`. |
| **Modify** `src/pages/SummaryPage.tsx` | Use the API summary text as the AI base when the hook resolves; keep the existing demo text as the fallback; render pending / failed / missing / error states. |
| **Modify** `tests/canonical.test.ts` | Register `SUMMARY_STATUS_LABEL` and `useMeetingSummary` in the single-source-of-truth map. |
| **Create** `tests/summariesService.test.ts` | Unit: URL shape, 404→null, status passthrough, no-API guard. |
| **Create** `tests/meetingSummary.test.tsx` | Behavior: SummaryPage API text / pending / failed / missing; mock mode fires zero fetches; dialog button navigates with the meeting id. |
| **Modify** `CHANGELOG.md`, `package.json`, `README.md` | Version bump to 1.0.81. |

---

### Task 1: Summary API service

**Files:**
- Create: `src/services/summaries.ts`
- Test: `tests/summariesService.test.ts`

**Interfaces:**
- Consumes: `apiRequest`, `isApiConfigured`, `ApiError` from `src/services/apiClient.ts`; `resolveCalendarEventApiId` from `src/services/calendar.ts`.
- Produces:
  - `type MeetingSummaryStatus = 'pending' | 'running' | 'ready' | 'failed'`
  - `interface MeetingSummary { meeting_id: string; status: MeetingSummaryStatus; text: string | null; model: string | null; error: string | null }`
  - `const SUMMARY_STATUS_LABEL: Record<MeetingSummaryStatus, string>`
  - `function isSummaryInProgress(status: MeetingSummaryStatus): boolean`
  - `function meetingSummaryApiId(eventId: string | null | undefined): string | null`
  - `async function fetchMeetingSummary(meetingId: string, signal?: AbortSignal): Promise<MeetingSummary | null>` — resolves `null` for HTTP 404 (no summary row), throws `ApiError` for every other failure.

- [ ] **Step 1: Write the failing test**

Create `tests/summariesService.test.ts`:

```ts
// Summary service — GET /meetings/{id}/summary matches senseiapi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'https://api.test.example';
const MID = '3f2b1c00-0000-4000-8000-000000000001';

function loadSummaries(base: string = BASE) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', base);
  return import('../src/services/summaries');
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('summaries service — GET /meetings/{id}/summary', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('requests the canonical path and returns the ready summary', async () => {
    fetchMock.mockResolvedValue(respond(200, {
      meeting_id: MID, status: 'ready', text: 'סיכום הפגישה', model: 'qwen2.5:7b', error: null,
    }));
    const { fetchMeetingSummary } = await loadSummaries();

    const summary = await fetchMeetingSummary(MID);

    expect(String(fetchMock.mock.calls[0][0])).toBe(BASE + '/meetings/' + MID + '/summary');
    expect(summary).toEqual({
      meeting_id: MID, status: 'ready', text: 'סיכום הפגישה', model: 'qwen2.5:7b', error: null,
    });
  });

  it('returns the in-progress summary body on 202', async () => {
    fetchMock.mockResolvedValue(respond(202, {
      meeting_id: MID, status: 'running', text: null, model: null, error: null,
    }));
    const { fetchMeetingSummary } = await loadSummaries();

    const summary = await fetchMeetingSummary(MID);

    expect(summary?.status).toBe('running');
  });

  it('returns null when the meeting has no summary row (404)', async () => {
    fetchMock.mockResolvedValue(respond(404, { detail: 'no summary for meeting ' + MID }));
    const { fetchMeetingSummary } = await loadSummaries();

    await expect(fetchMeetingSummary(MID)).resolves.toBeNull();
  });

  it('propagates a server error (500) instead of swallowing it', async () => {
    fetchMock.mockResolvedValue(respond(500, { detail: 'boom' }));
    const { fetchMeetingSummary } = await loadSummaries();

    await expect(fetchMeetingSummary(MID)).rejects.toMatchObject({ status: 500 });
  });

  it('fires no request and throws NO_API when the base URL is unset', async () => {
    const { fetchMeetingSummary } = await loadSummaries('');

    await expect(fetchMeetingSummary(MID)).rejects.toMatchObject({ code: 'NO_API' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('summaries service — meeting id resolution', () => {
  it('maps a db- prefixed calendar event id to its API uuid', async () => {
    const { meetingSummaryApiId } = await loadSummaries();
    expect(meetingSummaryApiId('db-' + MID)).toBe(MID);
  });

  it('accepts a bare uuid', async () => {
    const { meetingSummaryApiId } = await loadSummaries();
    expect(meetingSummaryApiId(MID)).toBe(MID);
  });

  it('returns null for a demo fixture event id — a fixture meeting has no summary to fetch', async () => {
    const { meetingSummaryApiId } = await loadSummaries();
    expect(meetingSummaryApiId('evt-901')).toBeNull();
    expect(meetingSummaryApiId(null)).toBeNull();
  });

  it('returns null when the API is not configured, whatever the id', async () => {
    const { meetingSummaryApiId } = await loadSummaries('');
    expect(meetingSummaryApiId('db-' + MID)).toBeNull();
  });
});

describe('summaries service — status vocabulary', () => {
  it('labels every backend status in Hebrew', async () => {
    const { SUMMARY_STATUS_LABEL } = await loadSummaries();
    expect(Object.keys(SUMMARY_STATUS_LABEL).sort()).toEqual(['failed', 'pending', 'ready', 'running']);
    expect(SUMMARY_STATUS_LABEL.ready).toBe('סיכום מוכן');
  });

  it('treats only pending and running as in progress', async () => {
    const { isSummaryInProgress } = await loadSummaries();
    expect(isSummaryInProgress('pending')).toBe(true);
    expect(isSummaryInProgress('running')).toBe(true);
    expect(isSummaryInProgress('ready')).toBe(false);
    expect(isSummaryInProgress('failed')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/summariesService.test.ts`
Expected: FAIL — `Failed to resolve import "../src/services/summaries"`.

- [ ] **Step 3: Write the implementation**

Create `src/services/summaries.ts`:

```ts
// Summary service — senseiapi `GET /meetings/{meeting_id}/summary`.
//
// The summary is generated in the background from the meeting's transcript, so a
// request can legitimately land on a row that is not finished yet (202) or on a
// meeting that was never summarised at all (404). Both are normal states the
// therapist's client renders — neither is an error.
import { apiRequest, isApiConfigured } from './apiClient';
import { resolveCalendarEventApiId } from './calendar';

export type MeetingSummaryStatus = 'pending' | 'running' | 'ready' | 'failed'

export interface MeetingSummary {
  meeting_id: string
  status: MeetingSummaryStatus
  text: string | null
  model: string | null
  error: string | null
}

/** Single source of truth for the Hebrew status vocabulary (dialog + summary page). */
export const SUMMARY_STATUS_LABEL: Record<MeetingSummaryStatus, string> = {
  pending: 'הסיכום בהכנה',
  running: 'הסיכום בהכנה',
  ready: 'סיכום מוכן',
  failed: 'הפקת הסיכום נכשלה',
};

export function isSummaryInProgress(status: MeetingSummaryStatus): boolean {
  return status === 'pending' || status === 'running';
}

/**
 * The API id of the meeting behind a calendar event, or `null` when there is
 * nothing to fetch — either the API is unconfigured, or this is a demo fixture
 * event (`evt-901`), which exists only in the client and has no summary row.
 */
export function meetingSummaryApiId(eventId: string | null | undefined): string | null {
  if (!isApiConfigured() || !eventId) return null;
  return resolveCalendarEventApiId(eventId);
}

/** Fetch a meeting's summary. `null` means the meeting has no summary row (404). */
export async function fetchMeetingSummary(
  meetingId: string,
  signal?: AbortSignal,
): Promise<MeetingSummary | null> {
  try {
    return await apiRequest<MeetingSummary>(
      '/meetings/' + encodeURIComponent(meetingId) + '/summary',
      { signal, timeoutMs: 8000 },
    );
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/summariesService.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0, no warnings.

- [ ] **Step 6: Commit**

```bash
git add src/services/summaries.ts tests/summariesService.test.ts
git commit -m "feat(summaries): add GET /meetings/{id}/summary service"
```

---

### Task 2: The `useMeetingSummary` hook (fetch · poll · abort)

**Files:**
- Create: `src/hooks/useMeetingSummary.ts`
- Modify: `tests/canonical.test.ts` (register the two new canonical symbols)
- Test: covered by `tests/meetingSummary.test.tsx` in Task 4 (the hook is exercised through the two components that use it — testing it twice would be duplication the `.jscpd.json` duplication gate also dislikes)

**Interfaces:**
- Consumes: `MeetingSummary`, `MeetingSummaryStatus`, `fetchMeetingSummary`, `isSummaryInProgress` from Task 1.
- Produces:
  - `type MeetingSummaryState = 'idle' | 'loading' | 'ready' | 'pending' | 'failed' | 'missing' | 'error'`
  - `interface UseMeetingSummary { state: MeetingSummaryState; summary: MeetingSummary | null; errorMsg: string; reload: () => void }`
  - `function useMeetingSummary(meetingId: string | null): UseMeetingSummary`

State meanings — the callers switch on exactly these:

| `state` | Meaning | What the caller renders |
|---|---|---|
| `idle` | No meeting id (API unconfigured, or a demo fixture event) | The existing mock/demo text — **unchanged behavior** |
| `loading` | First request in flight | Skeleton |
| `pending` | Row exists, `pending`/`running`; hook is polling every 3s | "הסיכום בהכנה" + spinner |
| `ready` | `summary.text` is available | The API text |
| `failed` | Backend recorded a generation failure; `errorMsg` = `summary.error` | Failure banner |
| `missing` | 404 — this meeting was never summarised | Empty state |
| `error` | Network/timeout/HTTP failure; `errorMsg` set | Error + retry |

- [ ] **Step 1: Write the implementation**

This task has no test of its own (Task 4 covers it end-to-end through both consumers), so it starts at the implementation step. Create `src/hooks/useMeetingSummary.ts`:

```ts
// Meeting-summary lifecycle — the one place that fetches, polls, and aborts.
//
// The backend generates a summary in a background task and answers 202 while it
// runs, so a client that fetched once would show "בהכנה" forever. This polls until
// the row reaches a terminal state (ready/failed), then stops.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMeetingSummary,
  isSummaryInProgress,
  type MeetingSummary,
} from '../services/summaries';

export type MeetingSummaryState =
  | 'idle' | 'loading' | 'ready' | 'pending' | 'failed' | 'missing' | 'error'

export interface UseMeetingSummary {
  state: MeetingSummaryState
  summary: MeetingSummary | null
  errorMsg: string
  reload: () => void
}

const POLL_MS = 3000;

export function useMeetingSummary(meetingId: string | null): UseMeetingSummary {
  const [state, setState] = useState<MeetingSummaryState>(meetingId ? 'loading' : 'idle');
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!meetingId) {
      setState('idle');
      setSummary(null);
      setErrorMsg('');
      // `return undefined`, not a bare `return` — tsconfig sets noImplicitReturns,
      // and the other path returns a cleanup function.
      return undefined;
    }

    let alive = true;
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    setState('loading');
    setErrorMsg('');

    const tick = async () => {
      try {
        const next = await fetchMeetingSummary(meetingId, ac?.signal);
        if (!alive) return;
        if (next === null) {
          setSummary(null);
          setState('missing');
          return;
        }
        setSummary(next);
        if (isSummaryInProgress(next.status)) {
          setState('pending');
          timerRef.current = setTimeout(tick, POLL_MS);
          return;
        }
        if (next.status === 'failed') {
          setErrorMsg(next.error || 'הפקת הסיכום נכשלה');
          setState('failed');
          return;
        }
        setState('ready');
      } catch (e: any) {
        if (!alive || e?.name === 'AbortError') return;
        setErrorMsg(e?.message || 'שגיאת רשת');
        setState('error');
      }
    };

    tick();

    return () => {
      alive = false;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (ac) { try { ac.abort(); } catch { /* ignore */ } }
    };
  }, [meetingId, nonce]);

  return { state, summary, errorMsg, reload };
}
```

- [ ] **Step 2: Register the canonical symbols**

The single-source-of-truth guard must know these have exactly one home, so a second copy fails CI. In `tests/canonical.test.ts`, inside the `CANONICAL` map, add two entries after the `navConfig` / `routeToHash` lines:

```ts
    navConfig: 'src/nav/navConfig.ts', ROUTE_TITLES: 'src/nav/navConfig.ts',
    routeToHash: 'src/nav/urlHash.ts', parseHash: 'src/nav/urlHash.ts',
    // meeting-summary API vocabulary + lifecycle
    SUMMARY_STATUS_LABEL: 'src/services/summaries.ts',
    useMeetingSummary: 'src/hooks/useMeetingSummary.ts',
```

(The guard's regex is `^(?:export\s+)?(?:function|const)\s+NAME\b`, which matches `export const SUMMARY_STATUS_LABEL` and `export function useMeetingSummary`. Do **not** add `fetchMeetingSummary` — it is declared `export async function`, which that regex does not match.)

- [ ] **Step 3: Run the canonical + architecture guards**

Run: `npx vitest run tests/canonical.test.ts`
Expected: PASS — including `SUMMARY_STATUS_LABEL — one definition, in src/services/summaries.ts`, `useMeetingSummary — one definition, in src/hooks/useMeetingSummary.ts`, and the leaf-layering guard (the hook imports only `react` + `../services/summaries`, never `pages/`/`components/`/`store/`).

- [ ] **Step 4: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMeetingSummary.ts tests/canonical.test.ts
git commit -m "feat(summaries): add useMeetingSummary fetch/poll hook"
```

---

### Task 3: Carry the meeting id into the summary route

**Files:**
- Modify: `src/data/seed.ts:87` (the `summaryEdits` line — add the new key next to it)
- Modify: `src/store/AppStore.tsx:19-28` (`PERSIST_KEYS`) and `src/store/AppStore.tsx:116-128` (`navigate`)
- Test: `tests/meetingSummary.test.tsx` (Task 4) asserts the navigation carries and resets the id

**Interfaces:**
- Produces: store key `S.summaryMeetingId: string | null` — the calendar event id (e.g. `db-<uuid>`) whose summary the Summary page should show. `null` means "no meeting context" → the page uses its demo text.
- Consumed by: `src/pages/SummaryPage.tsx` (Task 5) and set by `src/components/layout/Dialogs.tsx` (Task 4).

Why a store key rather than a URL param: `src/nav/urlHash.ts` mirrors only `route` + `patientId` + `sessionNum`, and per `CLAUDE.md` a deep link must never grow new powers. Persisting the key keeps a refresh on `#/summary` on the same meeting; resetting it inside `navigate()` guarantees the seven other `navigate('summary', …)` call sites (`TranscriptPage`, `UploadPage`, `SessionDetailPage`, `LetterPage`, `SearchPage`, `utils/patientSessions.ts`) cannot inherit a stale meeting from a previous visit.

- [ ] **Step 1: Add the key to the seed state**

In `src/data/seed.ts`, line 87 currently reads:

```ts
    summaryEdits: {}, summaryDrafts: {}, notesDrafts: {},
```

Change it to:

```ts
    summaryEdits: {}, summaryDrafts: {}, notesDrafts: {},
    // Calendar event whose API summary the Summary page shows (null = demo text).
    summaryMeetingId: null,
```

- [ ] **Step 2: Persist it**

In `src/store/AppStore.tsx`, line 24 currently reads:

```ts
  'summaryEdits', 'summaryDrafts', 'notesDrafts',
```

Change it to:

```ts
  'summaryEdits', 'summaryDrafts', 'notesDrafts', 'summaryMeetingId',
```

- [ ] **Step 3: Reset it on every navigation**

In `src/store/AppStore.tsx`, the `navigate` callback (line ~116) currently builds `next` like this:

```ts
    set((s: any) => {
      const next: Record<string, any> = {
        route, ...patch, loading: needsLoad, transcriptSearch: '', navOpen: false,
        editingSummary: false, editingNotes: false, editingSessionNote: null,
      };
      if (route !== 'session') next.sessionNum = null;
```

Change it to:

```ts
    set((s: any) => {
      const next: Record<string, any> = {
        route, ...patch, loading: needsLoad, transcriptSearch: '', navOpen: false,
        editingSummary: false, editingNotes: false, editingSessionNote: null,
      };
      if (route !== 'session') next.sessionNum = null;
      // The meeting context belongs to the navigation that set it. Without this
      // reset, opening a meeting's summary and then reaching the summary page from
      // anywhere else (patient list, search, upload) would silently show the old
      // meeting's text under the new patient's name.
      next.summaryMeetingId = (patch.summaryMeetingId as string | null) ?? null;
```

- [ ] **Step 4: Run the store + routing suites**

Run: `npx vitest run tests/routing.test.tsx tests/routes.test.tsx tests/summaryDraftRecovery.test.tsx`
Expected: PASS — the new key is additive; nothing existing reads it yet.

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/data/seed.ts src/store/AppStore.tsx
git commit -m "feat(summaries): carry summaryMeetingId through navigation"
```

---

### Task 4: Calendar event dialog — summary status + entry point

**Files:**
- Modify: `src/components/layout/Dialogs.tsx` (imports at line ~10; the `calEvent` view-model block at line ~388; the `isCalEvent` render block)
- Test: `tests/meetingSummary.test.tsx` (created here)

**Interfaces:**
- Consumes: `useMeetingSummary` (Task 2), `meetingSummaryApiId` + `SUMMARY_STATUS_LABEL` (Task 1), `S.calEventDetail` (existing: `{ id, title, description, location, allDay, start, end, statusLabel, guestName, patientId }`), `navigate` from `useApp()`.
- Produces: nothing consumed downstream — this is a UI leaf. It navigates with `navigate('summary', { patientId, summaryMeetingId })`.

Behavior: when the open calendar event maps to an API meeting id, the dialog fetches that meeting's summary and shows a status row. The "צפייה בסיכום" button appears only when the summary is `ready` and the event has a `patientId` (the Summary page is patient-scoped — it needs a patient to render). A demo fixture event yields `state: 'idle'` — the dialog renders exactly as it does today, and no request is made.

- [ ] **Step 1: Write the failing test**

Create `tests/meetingSummary.test.tsx`. (This file also covers the SummaryPage cases in Task 5; write the whole file now — the dialog tests pass at the end of this task, the page tests at the end of Task 5.)

```tsx
// Meeting summary — the calendar dialog and the summary page read the live
// GET /meetings/{id}/summary when VITE_API_BASE_URL is set, and the demo text when it is not.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const BASE = 'https://api.test.example';
const MID = '3f2b1c00-0000-4000-8000-000000000001';
const PID = '22222222-2222-2222-2222-222222222222';
const API_TEXT = 'הפגישה עסקה בוויסות רגשי ובחיזוק תחושת המסוגלות.';

const summaryBody = (over: Record<string, unknown> = {}) => ({
  meeting_id: MID, status: 'ready', text: API_TEXT, model: 'qwen2.5:7b', error: null, ...over,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Answers /patients and /calendar with empty-but-valid payloads; the test controls /summary. */
function apiFetch(summaryResponse: () => Response) {
  return vi.fn(async (url: string | URL | Request) => {
    const path = String(url);
    if (path.includes('/summary')) return summaryResponse();
    if (path.includes('/patients')) {
      return json(200, [{
        id: PID, name: 'דנה לוי', phone: '050-1234567', email: null,
        created_at: '2026-06-17T12:00:00Z', archived: false,
      }]);
    }
    if (path.includes('/calendar')) return json(200, []);
    return json(200, {});
  });
}

/** Boot the app straight into a route with a preloaded session. */
async function boot(session: Record<string, unknown>) {
  vi.resetModules();
  const [{ default: App }, { AppStoreProvider }] = await Promise.all([
    import('../src/App'),
    import('../src/store/AppStore'),
  ]);
  localStorage.setItem('sensei_session_react_v1', JSON.stringify({ view: 'app', ...session }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

afterEach(() => {
  vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules();
  cleanup(); localStorage.clear();
});

describe('summary page — live API summary', () => {
  beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', BASE));

  const apiSession = (over: Record<string, unknown> = {}) => ({
    route: 'summary',
    patientId: PID,
    summaryMeetingId: 'db-' + MID,
    patients: [{ id: PID, name: 'דנה לוי', phone: '050-1234567', email: null, created_at: '2026-06-17T12:00:00Z' }],
    ...over,
  });

  it('renders the summary text returned by the API', async () => {
    vi.stubGlobal('fetch', apiFetch(() => json(200, summaryBody())));
    await boot(apiSession());

    await waitFor(() => expect(screen.getByText(API_TEXT)).toBeTruthy(), { timeout: 4000 });
  });

  it('shows the in-progress state while the backend answers 202', async () => {
    vi.stubGlobal('fetch', apiFetch(() => json(202, summaryBody({ status: 'running', text: null, model: null }))));
    await boot(apiSession());

    await waitFor(() => expect(screen.getByText('הסיכום בהכנה')).toBeTruthy(), { timeout: 4000 });
  });

  it('surfaces the backend failure reason instead of a summary', async () => {
    vi.stubGlobal('fetch', apiFetch(() => json(200, summaryBody({
      status: 'failed', text: null, error: 'no transcript for this meeting',
    }))));
    await boot(apiSession());

    await waitFor(() => expect(screen.getByText('הפקת הסיכום נכשלה')).toBeTruthy(), { timeout: 4000 });
    expect(screen.getByText(/no transcript for this meeting/)).toBeTruthy();
    expect(screen.queryByText(API_TEXT)).toBeNull();
  });

  it('shows an empty state — not the demo text — when the meeting has no summary (404)', async () => {
    vi.stubGlobal('fetch', apiFetch(() => json(404, { detail: 'no summary for meeting ' + MID })));
    await boot(apiSession());

    await waitFor(() => expect(screen.getByText('אין סיכום לפגישה זו')).toBeTruthy(), { timeout: 4000 });
  });
});

describe('summary page — client-only build', () => {
  it('renders the demo summary and fires zero requests when no API is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { container } = await boot({ route: 'summary', patientId: 'p1' });

    await waitFor(() => expect(container.textContent).toContain('סיכום פגישה'), { timeout: 4000 });
    await waitFor(() => expect(container.textContent).toMatch(/חרדת ביצוע/), { timeout: 4000 });
    expect(fetchSpy, 'the client-only summary page makes no network calls').not.toHaveBeenCalled();
  }, 15000);
});

describe('calendar event dialog — summary status', () => {
  beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', BASE));

  const dialogSession = (over: Record<string, unknown> = {}) => ({
    route: 'calendar',
    patientId: PID,
    patients: [{ id: PID, name: 'דנה לוי', phone: '050-1234567', email: null, created_at: '2026-06-17T12:00:00Z' }],
    dialog: 'calEvent',
    calEventDetail: {
      id: 'db-' + MID,
      title: 'פגישה שבועית · דנה לוי',
      description: '', location: '', allDay: false,
      start: '2026-07-13T09:00:00.000Z',
      end: '2026-07-13T09:50:00.000Z',
      statusLabel: 'מתוכננת',
      guestName: 'דנה לוי',
      patientId: PID,
    },
    ...over,
  });

  it('shows the summary status for the open meeting', async () => {
    vi.stubGlobal('fetch', apiFetch(() => json(200, summaryBody())));
    await boot(dialogSession());

    await waitFor(() => expect(screen.getByText('סיכום מוכן')).toBeTruthy(), { timeout: 4000 });
  });

  it('opens the summary page for that meeting when the summary is ready', async () => {
    vi.stubGlobal('fetch', apiFetch(() => json(200, summaryBody())));
    await boot(dialogSession());

    const open = await screen.findByRole('button', { name: 'צפייה בסיכום' }, { timeout: 4000 });
    await userEvent.click(open);

    await waitFor(() => expect(screen.getByText(API_TEXT)).toBeTruthy(), { timeout: 4000 });
  });

  it('offers no summary entry point for a demo fixture event, and fetches nothing for it', async () => {
    const fetchMock = apiFetch(() => json(200, summaryBody()));
    vi.stubGlobal('fetch', fetchMock);
    await boot(dialogSession({
      calEventDetail: { ...dialogSession().calEventDetail, id: 'evt-901' },
    }));

    await waitFor(() => expect(screen.getByText('פגישה שבועית · דנה לוי')).toBeTruthy(), { timeout: 4000 });
    expect(screen.queryByRole('button', { name: 'צפייה בסיכום' })).toBeNull();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/summary'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/meetingSummary.test.tsx`
Expected: FAIL — the dialog tests fail on `Unable to find role="button" and name "צפייה בסיכום"`; the API page tests fail because `SummaryPage` still renders the demo text. (The `client-only build` test may already pass — that is the behavior this whole plan must preserve.)

- [ ] **Step 3: Import the hook and service into Dialogs**

In `src/components/layout/Dialogs.tsx`, the import block at line ~10 currently reads:

```ts
import { buildAppointmentTimes, createCalendarEvent, dayKey, deleteCalendarEvent, resolveCalendarEventApiId } from '../../services/calendar';
import {
  createPatient, updatePatient, archivePatient, deletePatient, localPatient,
} from '../../services/patients';
import { isApiConfigured } from '../../services/apiClient';
import { SHORTCUTS } from '../../data/shortcuts';
```

Change it to:

```ts
import { buildAppointmentTimes, createCalendarEvent, dayKey, deleteCalendarEvent, resolveCalendarEventApiId } from '../../services/calendar';
import {
  createPatient, updatePatient, archivePatient, deletePatient, localPatient,
} from '../../services/patients';
import { isApiConfigured } from '../../services/apiClient';
import { SUMMARY_STATUS_LABEL, meetingSummaryApiId } from '../../services/summaries';
import { useMeetingSummary } from '../../hooks/useMeetingSummary';
import { SHORTCUTS } from '../../data/shortcuts';
```

- [ ] **Step 4a: Call the hook above the early return**

`ActionDialog` bails out with `if (!S.dialog) return null;` at line 73. A hook called after that line would run on some renders and not others, which breaks React's rules of hooks. So `useMeetingSummary` goes **above** it, and reads `S.calEventDetail` directly rather than the `calEvent` local (which is derived further down).

In `src/components/layout/Dialogs.tsx`, line 67 currently reads:

```ts
  const isCalEvent = S.dialog === 'calEvent';
```

Change it to:

```ts
  const isCalEvent = S.dialog === 'calEvent';
  // Summary of the open meeting. This must sit above the `if (!S.dialog) return null`
  // guard below, so the hook runs on every render. A null id — no dialog, a demo fixture
  // event, or an unconfigured API — keeps it idle and fires no request.
  const calEventSummaryId = isCalEvent ? meetingSummaryApiId(S.calEventDetail?.id) : null;
  const calSummary = useMeetingSummary(calEventSummaryId);
```

- [ ] **Step 4b: Add the summary view-model to the calEvent block**

These are plain derived values, not hooks, so they belong down in the calendar-event block. In `src/components/layout/Dialogs.tsx`, find the `openDeleteMeeting` handler at the end of the `// ===== calendar event details =====` block (line ~412):

```ts
  const openDeleteMeeting = () => {
    if (!calEvent) return;
    set({
      dialog: 'delMeeting',
      dialogMeetingId: calEvent.id,
      dialogMeetingLabel: calEvent.title + (calEventDateLabel ? ' · ' + calEventDateLabel : ''),
    });
  };
```

Insert this immediately after it:

```ts
  const calSummaryLabel = calSummary.summary
    ? SUMMARY_STATUS_LABEL[calSummary.summary.status]
    : calSummary.state === 'loading'
      ? 'בודקים סטטוס סיכום'
      : calSummary.state === 'missing'
        ? 'אין סיכום לפגישה זו'
        : calSummary.state === 'error'
          ? 'לא הצלחנו לבדוק את סטטוס הסיכום'
          : '';
  const calSummaryTone = calSummary.state === 'ready'
    ? { color: 'var(--success)', bg: 'var(--success-bg)' }
    : calSummary.state === 'failed' || calSummary.state === 'error'
      ? { color: 'var(--error)', bg: 'var(--error-bg)' }
      : { color: 'var(--text-secondary)', bg: 'var(--surface-2)' };
  const canOpenCalSummary = calSummary.state === 'ready' && !!calEvent?.patientId;
  const openCalEventSummary = () => {
    if (!calEvent?.patientId) return;
    set({ dialog: null, calEventDetail: null });
    navigate('summary', { patientId: calEvent.patientId, summaryMeetingId: calEvent.id });
  };
```

- [ ] **Step 5: Render the status row + button**

In `src/components/layout/Dialogs.tsx`, find the `{isCalEvent && (` render block. It ends with a footer row containing the existing buttons (patient link + delete). Add the status row just above that footer, and the button inside it. Locate the footer — it looks like this:

```tsx
            <div style={{ padding: '16px 26px', borderTop: '1px solid var(--bg)', display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
```

Immediately **before** that footer `<div>`, insert:

```tsx
            {calSummaryLabel && (
              <div style={{ padding: '0 26px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: calSummaryTone.bg, color: calSummaryTone.color, whiteSpace: 'nowrap' }}>{calSummaryLabel}</span>
                {calSummary.state === 'failed' && calSummary.errorMsg && (
                  <span dir="ltr" style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'start' }}>{calSummary.errorMsg}</span>
                )}
                {calSummary.summary?.model && calSummary.state === 'ready' && (
                  <span dir="ltr" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{calSummary.summary.model}</span>
                )}
              </div>
            )}
```

Then, inside the footer `<div>`, add the entry-point button as the **first** child (before the existing patient/delete buttons):

```tsx
              {canOpenCalSummary && (
                <button onClick={openCalEventSummary} style={btnPrimary}>צפייה בסיכום</button>
              )}
```

- [ ] **Step 6: Run the dialog tests**

Run: `npx vitest run tests/meetingSummary.test.tsx -t 'calendar event dialog'`
Expected: PASS — all 3 dialog tests. (The `summary page — live API summary` tests still fail; Task 5 fixes them.)

- [ ] **Step 7: Run the guards, lint, and typecheck**

Run: `npx vitest run tests/canonical.test.ts tests/a11y.test.tsx tests/calendarNoFetch.test.tsx && npm run lint && npm run typecheck`
Expected: PASS / exit 0. Specifically, `calendarNoFetch` must still assert **zero** fetches — the dialog is closed in that test, so `calEventSummaryId` is `null`.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/Dialogs.tsx tests/meetingSummary.test.tsx
git commit -m "feat(calendar): show meeting summary status and open it from the event dialog"
```

---

### Task 5: Summary page — render the API summary

**Files:**
- Modify: `src/pages/SummaryPage.tsx` (imports at line 3-6; the summary-text derivation at line 19-28; the render block at line 102-151)
- Test: `tests/meetingSummary.test.tsx` (already written in Task 4)

**Interfaces:**
- Consumes: `useMeetingSummary` (Task 2), `SUMMARY_STATUS_LABEL` (Task 1), `S.summaryMeetingId` (Task 3).
- Produces: nothing — this is the terminal consumer.

Behavior contract:

| Hook state | Page renders |
|---|---|
| `idle` | The existing `aiSummary` (transcript excerpt or `demoSummary`) — **byte-for-byte today's behavior**, including the editable card, topics, patterns, and risk flags. |
| `loading` | The existing skeleton. |
| `pending` | Status card: "הסיכום בהכנה" + explanation. No editable text (there is nothing to edit yet). |
| `ready` | `summary.text` as the AI base of the editable card. Therapist edits (`S.summaryEdits[cp.id]`) still layer on top, and "שחזור לגרסת ה-AI המקורית" restores the API text. |
| `failed` | Failure card: "הפקת הסיכום נכשלה" + `errorMsg` (`dir="ltr"` — it is a backend technical string). |
| `missing` | Empty state: "אין סיכום לפגישה זו". |
| `error` | Error card + "נסו שוב" wired to `reload()`. |

The topics / patterns / risk-flags cards are demo content with no API counterpart. They stay as they are in `idle` mode and are **hidden** whenever a meeting is in context (`state !== 'idle'`) — showing fabricated risk flags next to a real clinical summary would be inventing clinical content, which `CLAUDE.md` forbids.

- [ ] **Step 1: Run the failing page tests**

Run: `npx vitest run tests/meetingSummary.test.tsx -t 'live API summary'`
Expected: FAIL — 4 tests; the page renders the demo text, not `API_TEXT`.

- [ ] **Step 2: Import the hook**

In `src/pages/SummaryPage.tsx`, the import block (lines 3-6) currently reads:

```ts
import { useApp } from '../store/AppStore';
import { CARD_SHADOW } from '../utils/styles';
import { getPatient, hg } from '../utils';
import './summary.css';
```

Change it to:

```ts
import { useApp } from '../store/AppStore';
import { CARD_SHADOW } from '../utils/styles';
import { getPatient, hg } from '../utils';
import { SUMMARY_STATUS_LABEL, meetingSummaryApiId } from '../services/summaries';
import { useMeetingSummary } from '../hooks/useMeetingSummary';
import './summary.css';
```

- [ ] **Step 3: Derive the summary text from the API when a meeting is in context**

In `src/pages/SummaryPage.tsx`, lines 19-28 currently read:

```ts
  // ---- human-in-the-loop correction ----
  const transcriptExcerpt = stored && typeof stored.text === 'string'
    ? stored.text.trim().slice(0, 400)
    : '';
  const demoSummary = 'הפגישה התמקדה בהתמודדות עם חרדת ביצוע סביב אירוע משמעותי בעבודה. ' + cp.name.split(' ')[0] + hg(' [[תיאר|תיארה]] קושי בשינה בימים שקדמו לאירוע, לצד מחשבות קטסטרופליות לגבי כישלון אפשרי. במהלך הפגישה זוהתה התקדמות חשובה: שימוש עצמאי ומוצלח בטכניקת הנשימה הסרעפתית שנלמדה, שהוביל לתחושת מסוגלות וגאווה. עם זאת, עלה חשש מצבי עתידי. הומלץ על המשך חיזוק חוויות ההצלחה והרחבת החשיפה ההדרגתית.');
  const aiSummary = transcriptExcerpt
    ? ('מבוסס תמלול: ' + transcriptExcerpt + ((stored?.text?.trim().length || 0) > 400 ? '…' : ''))
    : demoSummary;
  const sumEdited = S.summaryEdits[cp.id];
  const summaryText = sumEdited != null ? sumEdited : aiSummary;
  const summaryEdited = sumEdited != null;
```

Change it to:

```ts
  // ---- live summary (senseiapi) ----
  // A meeting id reaches this page only from the calendar's event dialog, and only
  // when VITE_API_BASE_URL is set. Without one the hook stays idle and every line
  // below behaves exactly as it did in the client-only build.
  const meetingId = meetingSummaryApiId(S.summaryMeetingId);
  const meetingSummary = useMeetingSummary(meetingId);
  const isLiveSummary = meetingSummary.state !== 'idle';
  const liveLoading = meetingSummary.state === 'loading';
  const livePending = meetingSummary.state === 'pending';
  const liveFailed = meetingSummary.state === 'failed';
  const liveMissing = meetingSummary.state === 'missing';
  const liveError = meetingSummary.state === 'error';
  const liveReady = meetingSummary.state === 'ready';
  const liveStatusLabel = meetingSummary.summary
    ? SUMMARY_STATUS_LABEL[meetingSummary.summary.status]
    : '';
  const liveModel = liveReady ? (meetingSummary.summary?.model || '') : '';

  // ---- human-in-the-loop correction ----
  const transcriptExcerpt = stored && typeof stored.text === 'string'
    ? stored.text.trim().slice(0, 400)
    : '';
  const demoSummary = 'הפגישה התמקדה בהתמודדות עם חרדת ביצוע סביב אירוע משמעותי בעבודה. ' + cp.name.split(' ')[0] + hg(' [[תיאר|תיארה]] קושי בשינה בימים שקדמו לאירוע, לצד מחשבות קטסטרופליות לגבי כישלון אפשרי. במהלך הפגישה זוהתה התקדמות חשובה: שימוש עצמאי ומוצלח בטכניקת הנשימה הסרעפתית שנלמדה, שהוביל לתחושת מסוגלות וגאווה. עם זאת, עלה חשש מצבי עתידי. הומלץ על המשך חיזוק חוויות ההצלחה והרחבת החשיפה ההדרגתית.');
  // The AI base is the API's text when a real meeting is in context, and the demo
  // text otherwise. Therapist edits layer on top of whichever base is in play.
  const aiSummary = liveReady
    ? (meetingSummary.summary?.text || '')
    : transcriptExcerpt
      ? ('מבוסס תמלול: ' + transcriptExcerpt + ((stored?.text?.trim().length || 0) > 400 ? '…' : ''))
      : demoSummary;
  const sumEdited = S.summaryEdits[cp.id];
  const summaryText = sumEdited != null ? sumEdited : aiSummary;
  const summaryEdited = sumEdited != null;
```

- [ ] **Step 4: Gate the loading skeleton on the live fetch too**

In `src/pages/SummaryPage.tsx`, line 94 currently reads:

```tsx
      {S.loading && (
```

Change it to:

```tsx
      {(S.loading || liveLoading) && (
```

and line 102 currently reads:

```tsx
      {!S.loading && (
```

Change it to:

```tsx
      {!S.loading && !liveLoading && (
```

- [ ] **Step 5: Render the non-ready live states**

In `src/pages/SummaryPage.tsx`, inside the `{!S.loading && !liveLoading && (` block, the first child is the editable summary card:

```tsx
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* summary (editable) */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
```

Insert these state cards immediately after the opening `<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>` and **before** the `{/* summary (editable) */}` card:

```tsx
          {livePending && (
            <div role="status" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--primary)" aria-hidden="true" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }}><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" /></svg>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>{liveStatusLabel}</h2>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>הסיכום מופק כעת מתוך התמלול של הפגישה. העמוד יתעדכן מעצמו כשיהיה מוכן.</p>
              </div>
            </div>
          )}

          {liveFailed && (
            <div role="alert" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--error)" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{liveStatusLabel}</h2>
              </div>
              <p dir="ltr" style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'start' }}>{meetingSummary.errorMsg}</p>
              <button onClick={meetingSummary.reload} className="sum-primary-btn" style={{ height: 40, padding: '0 20px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>נסו שוב</button>
            </div>
          )}

          {liveMissing && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: '40px 24px', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>אין סיכום לפגישה זו</h2>
              <p style={{ margin: '0 auto', maxWidth: 420, fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>סיכום נוצר מתוך תמלול הפגישה. העלו את הקלטת הפגישה כדי שנפיק עבורכם סיכום.</p>
            </div>
          )}

          {liveError && (
            <div role="alert" style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>לא הצלחנו לטעון את הסיכום</h2>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>בדקו את החיבור ונסו שוב.</p>
              <button onClick={meetingSummary.reload} className="sum-primary-btn" style={{ height: 40, padding: '0 20px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>נסו שוב</button>
            </div>
          )}
```

- [ ] **Step 6: Show the editable card only when there is text to edit**

The editable card must not render for `pending` / `failed` / `missing` / `error` — there is no AI text in those states, and rendering the demo text there would silently present fabricated content as this meeting's summary.

In `src/pages/SummaryPage.tsx`, wrap the editable card. Change its opening line:

```tsx
          {/* summary (editable) */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
```

to:

```tsx
          {/* summary (editable) — only when an AI base text exists */}
          {(!isLiveSummary || liveReady) && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, boxShadow: CARD_SHADOW, padding: 24 }}>
```

and close it: find the card's closing `</div>` — it is the one immediately **before** `<div className="sum-grid2"` (line ~153 in the original). Change:

```tsx
          </div>

          <div className="sum-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
```

to:

```tsx
          </div>
          )}

          {!isLiveSummary && (
          <div className="sum-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
```

- [ ] **Step 7: Hide the demo topics / patterns / risk cards for a live meeting**

Continuing from Step 6, the `sum-grid2` block (topics + patterns) is now opened conditionally. Close it, and gate the risk-flags card the same way. Find:

```tsx
          </div>

          {/* risk flags */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, overflow: 'hidden' }}>
```

Change it to:

```tsx
          </div>
          )}

          {/* risk flags — demo content; no API counterpart, so never shown beside a live summary */}
          {!isLiveSummary && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--divider)', borderRadius: 10, overflow: 'hidden' }}>
```

and close it at the end of the risk-flags card. Find the tail of the render:

```tsx
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

Change it to:

```tsx
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Show the model that wrote the summary**

The therapist must be able to see which model produced the text. In `src/pages/SummaryPage.tsx`, the page subtitle (line ~86) currently reads:

```tsx
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>{cp.name} · 22.06.2026 · נוצר אוטומטית לאחר ניקוי PII</p>
```

Change it to:

```tsx
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14.5 }}>
            {cp.name} · 22.06.2026 · נוצר אוטומטית לאחר ניקוי PII
            {liveModel && (<> · <span dir="ltr">{liveModel}</span></>)}
          </p>
```

- [ ] **Step 9: Run the full meeting-summary suite**

Run: `npx vitest run tests/meetingSummary.test.tsx`
Expected: PASS — all 8 tests (4 live-API page, 1 client-only page, 3 dialog).

- [ ] **Step 10: Run the whole suite, lint, typecheck, and build**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: lint/typecheck exit 0; vitest reports **49 files / ~357 tests** passing, and the build succeeds.

Baseline note (measured, not assumed): the suite was **47 files / ~338 tests** before this feature. Task 1 added `tests/summariesService.test.ts` (→ 48 files / 349 tests, verified green at commit `ad64f82`), and Task 4 adds `tests/meetingSummary.test.tsx` (→ 49 files). **`CLAUDE.md` claims "52 files / 388 tests" — that number was already stale before this work began. Do not treat it as the baseline; trust the actual run.**

If `tests/a11y.test.tsx` or `tests/routes.test.tsx` fail, the cause is almost certainly the conditional render: `SummaryPage` in `idle` mode must be unchanged, and those suites boot it with no `summaryMeetingId`. Verify `S.summaryMeetingId` is `null` there.

- [ ] **Step 11: Commit**

```bash
git add src/pages/SummaryPage.tsx
git commit -m "feat(summary): render the live meeting summary from the API"
```

---

### Task 6: Documentation and version bump

**Files:**
- Modify: `package.json:3` (version)
- Modify: `CHANGELOG.md` (new top entry)
- Modify: `README.md:3` (version badge)
- Modify: `.env.example` (document that the summary flows are now live when the base URL is set)
- Modify: `ARCHITECTURE.md` (single-source-of-truth map: the two new leaf modules)

The version guard in `tests/canonical.test.ts` fails CI unless all three version sources agree, so these move together.

- [ ] **Step 1: Bump package.json**

In `package.json`, change:

```json
  "version": "1.0.80",
```

to:

```json
  "version": "1.0.81",
```

- [ ] **Step 2: Bump the README badge**

In `README.md`, line 3 currently reads:

```markdown
**Version:** 1.0.80 · **Stack:** Vite · React 18 · TypeScript · Hebrew RTL
```

Change it to:

```markdown
**Version:** 1.0.81 · **Stack:** Vite · React 18 · TypeScript · Hebrew RTL
```

- [ ] **Step 3: Add the CHANGELOG entry**

In `CHANGELOG.md`, insert this directly above the `## [1.0.80] — 2026-07-06` heading:

```markdown
## [1.0.81] — 2026-07-11

### Added — live meeting summaries from senseiapi

- The Summary page and the Calendar's meeting dialog now read the real summary for a meeting from
  `GET /meetings/{meeting_id}/summary` when `VITE_API_BASE_URL` is set. Until now the page showed
  demo text for every meeting, including meetings the backend had actually summarised.
- **New leaf modules.** `src/services/summaries.ts` owns the API contract (`MeetingSummary`, the
  Hebrew `SUMMARY_STATUS_LABEL` vocabulary, `fetchMeetingSummary`); `src/hooks/useMeetingSummary.ts`
  owns the fetch/poll/abort lifecycle, so the dialog and the page share one implementation.
- **Generation is asynchronous, so the client polls.** The backend answers `202` while a summary is
  `pending`/`running`; the hook re-checks every 3s until the row is `ready` or `failed`, then stops.
  A `404` (the meeting was never summarised) renders an empty state, not a fabricated summary.
- **The demo path is byte-for-byte unchanged.** With no `VITE_API_BASE_URL`, and for the calendar's
  demo fixture events (`evt-901`…), the meeting id resolves to `null`, the hook stays idle, and the
  page renders exactly the text it rendered before — with zero network requests.
- **No fabricated clinical content beside a real summary.** The demo topics, recurring patterns, and
  risk-flag cards have no API counterpart, so they are hidden whenever a live meeting is in context.

### Changed

- `navigate()` now resets `summaryMeetingId` from its patch, so a meeting opened from the calendar
  cannot leak its summary into a later visit to the Summary page from the patient list or search.
```

- [ ] **Step 4: Document the flag in .env.example**

In `.env.example`, the comment block currently ends with:

```
# Backend base URL. When set, src/services/apiClient.ts becomes active.
# Example: https://api.sensei.example.com
VITE_API_BASE_URL=
```

Change it to:

```
# Backend base URL. When set, src/services/apiClient.ts becomes active, and the
# calendar, patients, upload, and meeting-summary flows all read from senseiapi
# instead of the seeded demo data. Unset = client-only demo, zero network calls.
# Example: https://api.sensei.example.com
VITE_API_BASE_URL=
```

- [ ] **Step 5: Register the new modules in the architecture map**

Three edits in `ARCHITECTURE.md`.

**(a)** The layer diagram at line 21 currently reads:

```
  hooks/*               (useFocusTrap)
```

Change it to:

```
  hooks/*               (useFocusTrap, useMeetingSummary)
```

**(b)** The Single-Source-of-Truth table (line 33 onward, `| Concept | Canonical owner |`) ends with a `src/utils/themeIcons.ts` row around line 45. Add these two rows to that table:

```markdown
| Meeting-summary API contract (`MeetingSummary` / `SUMMARY_STATUS_LABEL`) | `src/services/summaries.ts` |
| Meeting-summary fetch/poll lifecycle (`useMeetingSummary`) | `src/hooks/useMeetingSummary.ts` |
```

**(c)** The services table (line 64 onward, `| Piece | File |`) and the sentence under it are now stale — the client is no longer used by `CalendarPage` alone. Add a row to that table after the `apiClient.ts` row:

```markdown
| Meeting summaries — `GET /meetings/{id}/summary`, status vocabulary, 404-as-empty | `src/services/summaries.ts` |
```

and change the sentence at lines 72-73:

```markdown
**It is dormant unless `VITE_API_BASE_URL` is set** (`isApiConfigured()` gates every call);
only `CalendarPage` and future integrations use the client today.
```

to:

```markdown
**It is dormant unless `VITE_API_BASE_URL` is set** (`isApiConfigured()` gates every call).
When it is set, the calendar, patients, upload, and meeting-summary flows read from senseiapi;
with it unset the app is client-only and makes no network request at all.
```

- [ ] **Step 6: Run everything**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all green. `tests/canonical.test.ts` → `package.json version === newest CHANGELOG entry === README version badge` passes at `1.0.81`.

- [ ] **Step 7: Commit**

```bash
git add package.json README.md CHANGELOG.md .env.example ARCHITECTURE.md
git commit -m "docs: release 1.0.81 — live meeting summaries"
```

---

## Manual Verification

The automated suite runs against a mocked `fetch`. Before calling this done, drive it against the real backend once.

- [ ] **Step 1: Bring up Postgres, then senseiAPI**

senseiAPI reads `DATABASE_URL=postgresql+asyncpg://sensei:sensei@localhost:5433/senseiapi`, so its Docker Postgres must be up first. **Docker Desktop must be running** — if the daemon is down, port 5433 still *looks* open (Docker's proxy holds it) but the Postgres handshake resets with `ConnectionResetError: [Errno 54]`, and the API exits with "Application startup failed".

```bash
cd ~/Development/senseiAPI && docker compose up -d
```

Then start the API. Note: `uv run uvicorn …` does **not** work in this repo — it fails with `No 'project' table found in pyproject.toml`. Use the venv directly:

```bash
cd ~/Development/senseiAPI && ./.venv/bin/python -m uvicorn main:app --reload --port 8000
```

Expected: `Uvicorn running on http://127.0.0.1:8000`. Confirm with `curl -s localhost:8000/ready` → `{"status":"ready","database":"ok"}`.

**Summary generation needs a model.** `SUMMARY_BACKEND=ollama` (the `.env` default) requires Ollama running with `qwen2.5:7b-instruct` pulled. To verify this feature without a 7B model, set `SUMMARY_BACKEND=mock` — it writes a real summary row to the real database, served through the real endpoint, which is all this feature's read path needs. The read path never constructs a model (`get_summary_reader` in `summaries/dependencies.py`), so an existing summary row is served fine even with Ollama down.

- [ ] **Step 2: Confirm the endpoint answers**

```bash
curl -i http://localhost:8000/meetings/00000000-0000-4000-8000-000000000000/summary
```

Expected: `HTTP/1.1 404 Not Found` with `{"detail":"no summary for meeting …"}` — proving the route is mounted. (A `422` means the id is not a valid UUID; a connection error means the server is not up.)

- [ ] **Step 3: Run Sensei against it**

`.env` already contains `VITE_API_BASE_URL=http://localhost:8000`.

```bash
cd ~/Development/SENSEI && npm run dev
```

Open `http://localhost:3110`, sign in, go to **יומן**, click a meeting that came from the database (its agenda row exists only when the backend returned it), and confirm: the dialog shows a summary status chip; if the summary is ready, "צפייה בסיכום" opens the Summary page with the backend's Hebrew text and the model name in the subtitle; if no summary exists, the page shows "אין סיכום לפגישה זו".

- [ ] **Step 4: Confirm the demo path still has zero network traffic**

```bash
cd ~/Development/SENSEI && VITE_API_BASE_URL= npm run dev
```

With the Network tab open, visit **יומן** → open a fixture meeting → the dialog shows no summary chip and no "צפייה בסיכום" button, and the Network tab stays empty.
