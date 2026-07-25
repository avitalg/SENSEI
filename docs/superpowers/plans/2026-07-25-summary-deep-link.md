# Summary Deep Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a live summary URL reopen the same meeting after a hard refresh or when copied into a new tab, instead of falling back to seeded demo copy.

**Architecture:** `meetingId` moves from memory-only state into the URL fragment as a third segment, `#/summary/<patientId>/<meetingId>`, following the `#/session/<pid>/<num>` precedent already in `src/nav/urlHash.ts`. The store carries it through the four places that already handle `sessionNum`. A patient-only URL resolves the patient's newest past meeting through a new leaf hook and rewrites the fragment in place. `meetingId` is never persisted to `localStorage` — the URL is its single source of truth.

**Tech Stack:** React 18 + TypeScript (Vite), Vitest + @testing-library/react, `@tanstack/react-query`.

## Global Constraints

Every task's requirements implicitly include these. All are CI-enforced.

- Hebrew only, RTL throughout, plural voice (לשון רבים). No emoji in UI.
- Logical CSS properties only (`marginInline*`, `insetInline*`, `textAlign: 'start'/'end'`). Physical props are guard-banned.
- Colors come from `var(--token)` (`src/styles/tokens.css`). Hardcoded hex is ratchet-guarded at baseline 66, non-increasing.
- Single source of truth — reuse before adding. Duplication fails CI.
- Layering: leaf modules (`utils/`, `data/`, `hooks/`, `nav/`) must not import from `pages/`, `components/`, or `store/`. Pages must not import pages.
- Technical strings (phone, email, date, license, time) are `dir="ltr"`.
- New behavior ships with a test. Every user-visible change updates `CHANGELOG.md`.
- `package.json` version === newest `CHANGELOG.md` heading === README badge (guarded in `tests/canonical.test.ts`).
- No new dependencies. No backend, no real auth, no secrets.
- Full verification before done: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

**Starting state:** the tree is at 1.62.3 and fully green. This work is independent of the mobile session-history change in PR #13, so branch from `main`:

```bash
git checkout main && git pull && git checkout -b feat/summary-deep-link
```

**Constraint discovered while planning — do not break it.** `tests/summaryErrorRecovery.test.tsx:44` already rejects the summary poll with `{ code: 'NOT_FOUND', status: 404 }` and asserts the panel offers `צפייה בתמלול`, `נסו שוב`, and `מחיקה והעלאה מחדש`. Those cases mount **with a stored transcript**. So the 404 action pair from the spec (`היסטוריית פגישות · תיק מטופל`) applies only when there is **no** stored transcript; with one, the existing actions stay exactly as they are.

---

### Task 1: A meeting segment in the URL contract

**Files:**
- Modify: `src/nav/urlHash.ts:11` (route lists), `:18-27` (`routeToHash`), `:29-46` (`parseHash`)
- Test: `tests/urlHash.test.ts`

**Interfaces:**
- Produces: `MEETING_ROUTES: string[]` exported from `src/nav/urlHash.ts`.
- Produces: `routeToHash(route: string, patientId?: string, sessionNum?: number, meetingId?: string): string` — a fourth optional parameter. Existing three-argument callers are unaffected.
- Produces: `parseHash(hash: string): { route: string; patientId?: string; sessionNum?: number; meetingId?: string } | null`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/urlHash.test.ts`. Put the constant just below the existing imports:

```ts
const MID = '11111111-1111-4111-8111-111111111111';
```

Add these three cases inside `describe('urlHash — routeToHash', ...)`:

```ts
  it('summary carries the meeting id when one is known', () => {
    expect(routeToHash('summary', 'p3', undefined, MID)).toBe(`#/summary/p3/${MID}`);
    expect(parseHash(`#/summary/p3/${MID}`)).toEqual({ route: 'summary', patientId: 'p3', meetingId: MID });
  });
  it('summary without a meeting id stays a two-segment fragment', () => {
    expect(routeToHash('summary', 'p3')).toBe('#/summary/p3');
    expect(parseHash('#/summary/p3')).toEqual({ route: 'summary', patientId: 'p3' });
  });
  it('a malformed meeting id is dropped rather than serialized', () => {
    expect(routeToHash('summary', 'p3', undefined, '<img src=x>')).toBe('#/summary/p3');
    expect(routeToHash('summary', 'p3', undefined, 'x'.repeat(65))).toBe('#/summary/p3');
  });
```

Add these two cases inside `describe('urlHash — parseHash (hand-edited URLs can never inject state)', ...)`:

```ts
  it('rejects a meeting segment on routes that do not carry one', () => {
    expect(parseHash(`#/patient/p3/${MID}`)).toBeNull();
    expect(parseHash(`#/transcript/p3/${MID}`)).toBeNull();
    expect(parseHash(`#/report/p3/${MID}`)).toBeNull();
  });
  it('rejects a malformed meeting segment on summary', () => {
    expect(parseHash('#/summary/p3/<script>')).toBeNull();
    expect(parseHash('#/summary/p3/' + 'x'.repeat(65))).toBeNull();
    expect(parseHash(`#/summary/p3/${MID}/extra`)).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/urlHash.test.ts`

Expected: the five new cases FAIL. `routeToHash` currently ignores a fourth argument and returns `#/summary/p3`; `parseHash` returns `null` for any three-segment non-`session` fragment, so the round-trip assertions fail. The pre-existing cases must all still PASS.

- [ ] **Step 3: Add the meeting segment to urlHash**

In `src/nav/urlHash.ts`, add below the existing `PATIENT_ROUTES` declaration (line 11):

```ts
// Routes that additionally carry a meeting id — `#/summary/<pid>/<meetingId>`.
// The meeting is part of the deep link so a copied URL or a hard refresh
// reopens the SAME meeting instead of falling back to demo copy. `meetingId` is
// deliberately not persisted anywhere else; the URL is its single source.
export const MEETING_ROUTES = ['summary'];
```

Replace `routeToHash` (lines 18-27) with:

```ts
export function routeToHash(route: string, patientId?: string, sessionNum?: number, meetingId?: string): string {
  if (!ALL_ROUTES.includes(route)) return '#/dashboard';
  if (route === 'session' && patientId && ID_RE.test(patientId) && sessionNum != null && sessionNum > 0) {
    return `#/session/${patientId}/${sessionNum}`;
  }
  if (MEETING_ROUTES.includes(route) && patientId && ID_RE.test(patientId) && meetingId && ID_RE.test(meetingId)) {
    return `#/${route}/${patientId}/${meetingId}`;
  }
  if (PATIENT_ROUTES.includes(route) && patientId && ID_RE.test(patientId)) {
    return `#/${route}/${patientId}`;
  }
  return `#/${route}`;
}
```

Replace `parseHash` (lines 29-46) with:

```ts
export function parseHash(hash: string): { route: string; patientId?: string; sessionNum?: number; meetingId?: string } | null {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const route = parts[0];
  if (!ALL_ROUTES.includes(route)) return null;
  if (route === 'session') {
    if (parts.length !== 3 || !ID_RE.test(parts[1]) || !SESSION_NUM_RE.test(parts[2])) return null;
    return { route, patientId: parts[1], sessionNum: parseInt(parts[2], 10) };
  }
  if (parts.length === 3) {
    if (!MEETING_ROUTES.includes(route) || !ID_RE.test(parts[1]) || !ID_RE.test(parts[2])) return null;
    return { route, patientId: parts[1], meetingId: parts[2] };
  }
  if (parts.length === 2) {
    if (!PATIENT_ROUTES.includes(route) || !ID_RE.test(parts[1])) return null;
    return { route, patientId: parts[1] };
  }
  if (parts.length > 3) return null;
  return { route };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/urlHash.test.ts tests/routing.test.tsx tests/routes.test.tsx`

Expected: PASS, all cases in all three files.

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/nav/urlHash.ts tests/urlHash.test.ts
git commit -m "feat(nav): carry the meeting id in the summary fragment

#/summary/<pid>/<meetingId> follows the existing #/session/<pid>/<num>
precedent, so a summary link names the meeting it opens. ID_RE already
matches a UUID; every other route still rejects a third segment."
```

---

### Task 2: Carry the meeting through the store, and stop resurrecting a stale one

**Files:**
- Modify: `src/store/AppStore.tsx:141-148` (navigate's state patch), `:167-173` (the hash mirror), `:426-428` (mount deep-link restore), `:438` (normalize `replaceState`), `:493-512` (hashchange handler)
- Test: `tests/summaryDeepLink.test.tsx` (create)

**Interfaces:**
- Consumes: `routeToHash(route, patientId?, sessionNum?, meetingId?)` and `parseHash` from Task 1.
- Produces: navigating to `summary` without a `meetingId` in the patch sets `S.meetingId` to `null`.
- Produces: `#/summary/<pid>/<mid>` at mount or via `hashchange` sets `S.meetingId` to that id.

The stale-meeting defect this fixes: `navigate('summary', { patientId })` carries no meeting, and the store keeps the previous `S.meetingId`, so patient A's meeting can render under patient B's URL. `src/utils/patientSessions.ts:63`, `SearchPage`, `LetterPage`, and `TranscriptPage` all navigate that way. The fix mirrors the rule the store already applies to `patientId` at `:167`.

- [ ] **Step 1: Write the failing tests**

Create `tests/summaryDeepLink.test.tsx`:

```tsx
// Summary deep links — the meeting lives in the URL, so a copied link or a hard
// refresh reopens the SAME meeting instead of falling back to seeded copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MID = '11111111-1111-4111-8111-111111111111';
const OTHER_PID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const { isApiConfiguredMock, pollMock, listPatientsMock, loadPatientsWithFallback } = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => true),
  pollMock: vi.fn(),
  listPatientsMock: vi.fn(),
  loadPatientsWithFallback: vi.fn(async (current: Array<{ id: string; name: string }>) => ({ patients: current })),
}));

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
});
vi.mock('../src/services/meetingSummary', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/meetingSummary')>();
  return { ...actual, pollMeetingSummary: pollMock };
});
vi.mock('../src/services/patients', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/patients')>();
  return { ...actual, loadPatientsWithFallback, listPatients: listPatientsMock };
});

const PATIENTS = [
  { id: PID, name: 'Live Patient', phone: '050-0000000', email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: OTHER_PID, name: 'Other Patient', phone: '050-1111111', email: null, created_at: '2026-01-01T00:00:00Z' },
];

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '';
  vi.clearAllMocks();
});
beforeEach(() => {
  isApiConfiguredMock.mockReturnValue(true);
  listPatientsMock.mockResolvedValue(PATIENTS);
  loadPatientsWithFallback.mockImplementation(async () => ({ patients: PATIENTS }));
  pollMock.mockResolvedValue({
    meeting_id: MID,
    status: 'ready',
    text: 'סיכום אמיתי מהשרת לפגישה שבקישור.',
    summary: null,
  });
});

describe('summary deep link — the meeting is in the URL', () => {
  it('a copied #/summary/<pid>/<mid> link polls that meeting, with no seeded copy', async () => {
    window.location.hash = `#/summary/${PID}/${MID}`;
    mount({ route: 'dashboard', patients: PATIENTS });
    await settle();

    await waitFor(() => expect(pollMock).toHaveBeenCalled());
    expect(pollMock.mock.calls[0][0]).toBe(MID);
    await waitFor(() => expect(document.body.textContent).toContain('סיכום אמיתי מהשרת'));
    expect(document.body.textContent).not.toContain('תוכן הדגמה');
  });

  it('navigating to another patient drops the previous meeting id', async () => {
    window.location.hash = `#/summary/${PID}/${MID}`;
    mount({ route: 'dashboard', patients: PATIENTS });
    await settle();
    await waitFor(() => expect(window.location.hash).toBe(`#/summary/${PID}/${MID}`));

    window.location.hash = `#/summary/${OTHER_PID}`;
    await settle();

    await waitFor(() => expect(window.location.hash).toBe(`#/summary/${OTHER_PID}`));
    expect(window.location.hash).not.toContain(MID);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/summaryDeepLink.test.tsx`

Expected: both FAIL. The first because `parseHash` now returns a `meetingId` that the store discards, so `S.meetingId` stays empty and `SummaryPage` never polls. The second because the store keeps the previous `S.meetingId` and re-mirrors it into the fragment.

- [ ] **Step 3: Clear a stale meeting on summary navigation**

In `src/store/AppStore.tsx`, inside `navigate`'s `set` reducer (the block at `:141-148` that already contains `if (route !== 'session') next.sessionNum = null;`), add directly after that line:

```ts
      // A summary navigation without an explicit meeting means "this patient's
      // latest", never "whatever meeting was open before". Keeping the old value
      // rendered patient A's meeting under patient B's URL (patientSessions.ts:63,
      // SearchPage, LetterPage, TranscriptPage all navigate patient-only).
      if (route === 'summary' && !('meetingId' in patch)) next.meetingId = null;
```

- [ ] **Step 4: Mirror the meeting into the fragment**

Still in `navigate`, replace the `const h = routeToHash(...)` call at `:168-172` with:

```ts
    const mirroredMeetingId = 'meetingId' in patch
      ? ((patch.meetingId as string | null) ?? undefined)
      : (route === 'summary' ? (sRef.current.meetingId as string | undefined) : undefined);
    const h = routeToHash(
      route,
      mirroredPid,
      (patch.sessionNum as number) ?? sRef.current.sessionNum,
      mirroredMeetingId,
    );
```

Note the asymmetry with Step 3 is intentional: Step 3 nulls the state when the patch omits the meeting, so `sRef.current.meetingId` is only read here for the re-render path where state already holds the right value.

- [ ] **Step 5: Restore the meeting from a deep link at mount**

In the mount deep-link block, after the existing `if (deep.sessionNum != null) dp.sessionNum = deep.sessionNum;` (`:428`), add:

```ts
        if (deep.meetingId) dp.meetingId = deep.meetingId;
```

Then update the normalize `replaceState` at `:438` to pass the meeting:

```ts
    if (st0.view !== 'auth') window.history.replaceState(null, '', routeToHash(st0.route, st0.patientId, st0.sessionNum, st0.meetingId));
```

- [ ] **Step 6: Handle the meeting in the hashchange listener**

In `onHash`, update the invalid-fragment normalize (`:495`):

```ts
        window.history.replaceState(null, '', routeToHash(st.route, st.patientId, st.sessionNum, st.meetingId));
```

Add a `sameMeeting` comparison beside the existing ones and include it in the early return:

```ts
      const sameMeeting = (p.meetingId ?? null) === (st.meetingId ?? null);
      if (sameRoute && samePatient && sameSession && sameMeeting) return;
```

Forward the meeting in the navigate patch at the end of `onHash`:

```ts
      navigate(p.route, {
        ...(p.patientId ? { patientId: p.patientId } : {}),
        ...(p.sessionNum != null ? { sessionNum: p.sessionNum } : {}),
        ...(p.route === 'summary' ? { meetingId: p.meetingId ?? null } : {}),
      });
```

The explicit `null` matters: a URL that drops the meeting segment must clear the stored one, which is what makes the second test pass.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run tests/summaryDeepLink.test.tsx tests/routing.test.tsx tests/urlHash.test.ts tests/summaryErrorRecovery.test.tsx`

Expected: PASS, all four files.

- [ ] **Step 8: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: both clean.

- [ ] **Step 9: Commit**

```bash
git add src/store/AppStore.tsx tests/summaryDeepLink.test.tsx
git commit -m "fix(store): carry the summary meeting through the URL, not memory

A deep link now restores S.meetingId at mount and through hashchange, so a
refresh or a copied link reopens the same meeting. A summary navigation with
no meeting in the patch clears the stored one instead of resurrecting it,
which previously rendered one patient's meeting under another's URL."
```

---

### Task 3: Resolve the newest meeting for a patient-only link

**Files:**
- Create: `src/hooks/useLatestMeetingId.ts`
- Modify: `src/store/AppStore.tsx:55-71` (`AppStoreValue`), `:681-683` (context value), plus the new callback
- Modify: `src/pages/SummaryPage.tsx:20-33` (meeting resolution)
- Test: `tests/summaryDeepLink.test.tsx`

**Interfaces:**
- Produces: `useLatestMeetingId(patientId: string, patientName: string, enabled: boolean): { meetingId: string; loading: boolean }` from `src/hooks/useLatestMeetingId.ts`.
- Produces: `setMeetingId(meetingId: string): void` on the `useApp()` value.
- Consumes: `loadPatientPastEvents({ patientId, patientName, signal })` and `resolveCalendarEventApiId(id) / dbEventApiId(id)` from `src/services/calendar.ts`; `queryKeys.patientPast(patientId)` from `src/query/keys.ts`.

The hook takes `patientName` because `loadPatientPastEvents` requires it for the fixture-matching path (`calendar.ts:519-548`) — one parameter more than the spec sketched.

- [ ] **Step 1: Write the failing test**

Add to `tests/summaryDeepLink.test.tsx`. First extend the hoisted mocks and add the calendar mock — replace the existing `vi.hoisted` block with:

```tsx
const {
  isApiConfiguredMock, pollMock, listPatientsMock, loadPatientsWithFallback, loadPatientPastEvents,
} = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => true),
  pollMock: vi.fn(),
  listPatientsMock: vi.fn(),
  loadPatientsWithFallback: vi.fn(async (current: Array<{ id: string; name: string }>) => ({ patients: current })),
  loadPatientPastEvents: vi.fn(async () => [] as any[]),
}));
```

and add this mock below the others:

```tsx
vi.mock('../src/services/calendar', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/calendar')>();
  return { ...actual, loadPatientPastEvents };
});
```

Add to `beforeEach`:

```tsx
  loadPatientPastEvents.mockResolvedValue([]);
```

Add the fixture below `PATIENTS`:

```tsx
function pastEvent() {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  end.setHours(11, 0, 0, 0);
  return {
    id: 'db-' + MID,
    title: 'פגישה',
    description: '',
    location: '',
    htmlLink: '',
    meetLink: '',
    allDay: false,
    start: new Date(end.getTime() - 50 * 60_000),
    end,
    status: 'confirmed',
    attendees: [{ name: 'Live Patient', email: '', self: false, response: 'accepted' }],
    source: 'db' as const,
    patientId: PID,
  };
}
```

Add the case inside the existing `describe`:

```tsx
  it('a patient-only link resolves the newest meeting and rewrites the URL to name it', async () => {
    loadPatientPastEvents.mockResolvedValue([pastEvent()]);
    window.location.hash = `#/summary/${PID}`;
    mount({ route: 'dashboard', patients: PATIENTS });
    await settle();

    await waitFor(() => expect(pollMock).toHaveBeenCalled());
    expect(pollMock.mock.calls[0][0]).toBe(MID);
    await waitFor(() => expect(window.location.hash).toBe(`#/summary/${PID}/${MID}`));
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/summaryDeepLink.test.tsx -t 'patient-only link'`

Expected: FAIL waiting on `pollMock` — with no meeting id, `SummaryPage`'s `useApi` is false and it renders demo copy without polling.

- [ ] **Step 3: Create the hook**

Create `src/hooks/useLatestMeetingId.ts`:

```ts
// Newest past meeting for a patient. Lets `#/summary/<pid>` — a link that names
// no meeting, which is what most in-app navigations produce — resolve to that
// patient's latest meeting instead of falling back to demo copy. Shares
// queryKeys.patientPast with usePatientMeetingHistory, so arriving from the
// patient screen hits cache rather than refetching.
import { useQuery } from '@tanstack/react-query';
import {
  dbEventApiId,
  loadPatientPastEvents,
  resolveCalendarEventApiId,
} from '../services/calendar';
import { queryKeys } from '../query/keys';

export function useLatestMeetingId(
  patientId: string,
  patientName: string,
  enabled: boolean,
): { meetingId: string; loading: boolean } {
  const query = useQuery({
    queryKey: queryKeys.patientPast(patientId),
    queryFn: ({ signal }) => loadPatientPastEvents({ patientId, patientName, signal }),
    enabled: enabled && !!patientId,
  });
  // The service sorts newest-first (calendar.ts:548), so [0] is the latest.
  const newest = query.data?.[0];
  const meetingId = newest ? (resolveCalendarEventApiId(newest.id) || dbEventApiId(newest.id)) : '';
  return { meetingId, loading: enabled && query.isLoading };
}
```

- [ ] **Step 4: Add setMeetingId to the store**

In `src/store/AppStore.tsx`, add to the `AppStoreValue` interface (after `navigate`, `:58`):

```ts
  setMeetingId: (meetingId: string) => void
```

Add the callback next to `navigate` (immediately after the `navigate` `useCallback` closes at `:174`):

```ts
  // Resolving "the patient's latest meeting" is not a navigation: rewrite the
  // fragment in place so the URL stays copyable without adding a history entry.
  const setMeetingId = useCallback((meetingId: string) => {
    const st = sRef.current;
    set({ meetingId });
    if (st.view !== 'app') return;
    const h = routeToHash(st.route, st.patientId, st.sessionNum, meetingId);
    if (window.location.hash !== h) window.history.replaceState(null, '', h);
  }, [set]);
```

Add it to the context value at `:681-683`:

```ts
  const value = useMemo<AppStoreValue>(() => ({
    S, set, navigate, setMeetingId, toast, copyToClipboard, applyThemePref, setA11y, resetA11y, pager, logout, deleteAccount, login,
  }), [S, set, navigate, setMeetingId, toast, copyToClipboard, applyThemePref, setA11y, resetA11y, pager, logout, deleteAccount, login]);
```

- [ ] **Step 5: Resolve in SummaryPage**

In `src/pages/SummaryPage.tsx`, add the imports:

```tsx
import { useLatestMeetingId } from '../hooks/useLatestMeetingId';
```

Replace the meeting derivation at `:21-28` (from `const { S, set, navigate, toast } = useApp();` through `const useApi = ...`) with:

```tsx
  const { S, set, navigate, toast, setMeetingId } = useApp();

  const cp = getPatient(S.patients, S.patientId, S.archivedPatients || []);
  const stored = (S.transcriptsByPatient && S.transcriptsByPatient[cp.id]) || null;
  // Prefer the meeting named by the URL/store, then the last upload's. A link
  // that names neither resolves the patient's newest meeting below, so a shared
  // `#/summary/<pid>` is live data rather than demo copy.
  const urlMeetingId = (S.meetingId && String(S.meetingId))
    || (stored?.meetingId ? String(stored.meetingId) : '');
  const apiOn = isApiConfigured();
  const latest = useLatestMeetingId(cp.id, cp.name, apiOn && !urlMeetingId);
  const meetingId = urlMeetingId || latest.meetingId;
  const useApi = apiOn && !!meetingId;

  // Name the resolved meeting in the URL so the address bar is copyable.
  useEffect(() => {
    if (!apiOn || urlMeetingId || !latest.meetingId) return;
    setMeetingId(latest.meetingId);
  }, [apiOn, urlMeetingId, latest.meetingId, setMeetingId]);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/summaryDeepLink.test.tsx tests/summaryErrorRecovery.test.tsx tests/summaryStructured.test.tsx tests/summaryHierarchy.test.tsx`

Expected: PASS, all four files.

- [ ] **Step 7: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useLatestMeetingId.ts src/store/AppStore.tsx src/pages/SummaryPage.tsx tests/summaryDeepLink.test.tsx
git commit -m "feat(summary): resolve the newest meeting for a patient-only link

A #/summary/<pid> link — what most in-app navigations produce — now loads the
patient's latest meeting from /calendar and rewrites the fragment to name it,
instead of falling through to seeded copy. The resolver shares
queryKeys.patientPast, so arriving from the patient screen hits cache."
```

---

### Task 4: One honest surface when there is nothing to show

**Files:**
- Modify: `src/pages/SummaryPage.tsx` (poll catch, `showError` derivation at `:171`, error panel at `:250-275`)
- Test: `tests/summaryErrorRecovery.test.tsx`

**Interfaces:**
- Consumes: `latest.meetingId` / `latest.loading` and `apiOn` from Task 3; `S.online` (`AppStore.tsx:451`).
- Produces: nothing consumed by later tasks.

Four cases render through the one existing panel. Per the constraint in Global Constraints, the action pair changes only when there is **no** stored transcript.

| Case | Condition | Body copy |
| --- | --- | --- |
| Unknown meeting in the URL | `apiErrorCode === 'NOT_FOUND'`, no stored transcript | `הפגישה לא נמצאה · ייתכן שהקישור אינו עדכני` |
| No past meetings | `apiOn && !urlMeetingId && !latest.loading && !latest.meetingId` | `לא נמצאו פגישות קודמות למטופל` |
| No network | `S.online === false \|\| apiErrorCode === 'NETWORK'` | `אין חיבור לרשת · הסיכום ייטען כשהחיבור יחזור` |
| Generation failed | existing `apiError` / `status === 'failed'` | server text, unchanged |

- [ ] **Step 1: Write the failing tests**

Add to `tests/summaryErrorRecovery.test.tsx`. It already mocks `apiClient`, `meetingSummary`, and `patients`; add the calendar mock so the resolver is controllable — extend the hoisted block:

```tsx
const {
  isApiConfiguredMock, pollMock, listPatientsMock, loadPatientsWithFallback, loadPatientPastEvents,
} = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => true),
  pollMock: vi.fn(),
  listPatientsMock: vi.fn(),
  loadPatientsWithFallback: vi.fn(async (current: Array<{ id: string; name: string }>) => ({ patients: current })),
  loadPatientPastEvents: vi.fn(async () => [] as any[]),
}));

vi.mock('../src/services/calendar', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/calendar')>();
  return { ...actual, loadPatientPastEvents };
});
```

Add to `beforeEach`:

```tsx
  loadPatientPastEvents.mockResolvedValue([]);
```

Add a new describe block at the end of the file:

```tsx
describe('summary page — nothing to show', () => {
  it('a 404 on a link with no local transcript points at the history, not the transcript', async () => {
    pollMock.mockRejectedValue(Object.assign(new Error('missing'), { code: 'NOT_FOUND', status: 404 }));
    mount({ view: 'app', route: 'summary', patientId: 'p1', meetingId: MID, patients: MOCK_PATIENTS });
    await settle();

    await waitFor(() => expect(document.body.textContent).toContain('הפגישה לא נמצאה'));
    expect(document.body.textContent).toContain('היסטוריית פגישות');
    expect(document.body.textContent).not.toContain('צפייה בתמלול');
  });

  it('says so when the patient has no past meetings to resolve', async () => {
    loadPatientPastEvents.mockResolvedValue([]);
    mount({ view: 'app', route: 'summary', patientId: 'p1', patients: MOCK_PATIENTS });
    await settle();

    await waitFor(() => expect(document.body.textContent).toContain('לא נמצאו פגישות קודמות למטופל'));
    expect(document.body.textContent).toContain('העלאת הקלטה');
  });

  it('reports a lost connection instead of a generic failure', async () => {
    pollMock.mockRejectedValue(Object.assign(new Error('Network error'), { code: 'NETWORK' }));
    mount({ view: 'app', route: 'summary', patientId: 'p1', meetingId: MID, patients: MOCK_PATIENTS });
    await settle();

    await waitFor(() => expect(document.body.textContent).toContain('אין חיבור לרשת'));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/summaryErrorRecovery.test.tsx`

Expected: the three new cases FAIL — the panel currently shows the raw error message and always the transcript/upload actions, and the no-meetings case renders demo copy with no panel at all. The two pre-existing cases must still PASS.

- [ ] **Step 3: Capture the error code**

In `src/pages/SummaryPage.tsx`, add beside the existing `apiError` state (`:32`):

```tsx
  const [apiErrorCode, setApiErrorCode] = useState('');
```

The effect at `:34-67` clears `apiError` in two places; clear the code alongside each. In the early-return branch:

```tsx
    if (!useApi) {
      setApiSummary(null);
      setApiError('');
      setApiErrorCode('');
      setApiLoading(false);
      return undefined;
    }
```

and before the poll starts:

```tsx
    setApiLoading(true);
    setApiError('');
    setApiErrorCode('');
    setApiSummary(null);
```

Then set it in the poll's `.catch`, as the first statement after the abort guard:

```tsx
      .catch((e: any) => {
        if (e?.name === 'AbortError' || ac.signal.aborted) return;
        setApiErrorCode(e?.status === 404 ? 'NOT_FOUND' : (e?.code === 'NETWORK' ? 'NETWORK' : ''));
        setApiError(
          (typeof e?.details?.detail === 'string' && e.details.detail)
          || e?.message
          || 'לא ניתן לטעון את הסיכום',
        );
      })
```

- [ ] **Step 4: Derive the four cases**

Replace the `showError` line (`:171`) with:

```tsx
  const hasStoredTranscript = !!(stored && typeof stored.text === 'string' && stored.text.trim());
  const noMeetings = apiOn && !urlMeetingId && !latest.loading && !latest.meetingId;
  const offlineNow = S.online === false || apiErrorCode === 'NETWORK';
  const showError = noMeetings
    || (useApi && !apiLoading && (!!apiError || apiSummary?.status === 'failed'));
  const unavailableBody = noMeetings
    ? 'לא נמצאו פגישות קודמות למטופל'
    : offlineNow
      ? 'אין חיבור לרשת · הסיכום ייטען כשהחיבור יחזור'
      : (apiErrorCode === 'NOT_FOUND' && !hasStoredTranscript)
        ? 'הפגישה לא נמצאה · ייתכן שהקישור אינו עדכני'
        : (apiError || apiSummary?.error || 'יצירת הסיכום נכשלה');
```

Also update `showSkeleton` (`:169-170`) so the resolver's own fetch shows the skeleton rather than a flash of the panel:

```tsx
  const showSkeleton = (!useApi && !apiOn && S.loading)
    || latest.loading
    || (useApi && (apiLoading || apiSummary?.status === 'pending' || apiSummary?.status === 'running'));
```

Add the history action beside the existing `goTranscript` / `goUploadAgain` (`:182-190`):

```tsx
  const goHistory = () => navigate('meetingHistory', { patientId: cp.id });
```

- [ ] **Step 5: Render the case-specific body and actions**

In the error panel (`:250-275`), replace the message paragraph's contents with `{unavailableBody}`:

```tsx
          <p style={{ margin: '0 0 16px', fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {unavailableBody}
          </p>
```

Then wrap the action buttons so the transcript pair shows only when a local transcript exists. Replace the actions `<div>` (`:256-273`) with:

```tsx
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {hasStoredTranscript ? (
              <>
                <button
                  type="button"
                  onClick={goTranscript}
                  className="sum-primary-btn"
                  style={{ height: 40, padding: '0 18px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  צפייה בתמלול
                </button>
                <button
                  type="button"
                  onClick={goUploadAgain}
                  className="sum-outline-btn"
                  style={{ height: 40, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  נסו שוב
                </button>
              </>
            ) : noMeetings ? (
              <>
                <button
                  type="button"
                  onClick={goUploadAgain}
                  className="sum-primary-btn"
                  style={{ height: 40, padding: '0 18px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  העלאת הקלטה
                </button>
                <button
                  type="button"
                  onClick={goPatientFromSub}
                  className="sum-outline-btn"
                  style={{ height: 40, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  תיק מטופל
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={goHistory}
                  className="sum-primary-btn"
                  style={{ height: 40, padding: '0 18px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  היסטוריית פגישות
                </button>
                <button
                  type="button"
                  onClick={goPatientFromSub}
                  className="sum-outline-btn"
                  style={{ height: 40, padding: '0 18px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  תיק מטופל
                </button>
              </>
            )}
          </div>
```

`goPatientFromSub` already exists at `:69`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/summaryErrorRecovery.test.tsx tests/summaryDeepLink.test.tsx`

Expected: PASS, both files — including the two pre-existing recovery cases, which mount with a stored transcript and therefore keep the `צפייה בתמלול` / `נסו שוב` / `מחיקה והעלאה מחדש` actions.

- [ ] **Step 7: Run the summary and a11y suites**

Run: `npx vitest run tests/summaryHierarchy.test.tsx tests/summaryStructured.test.tsx tests/summaryDraftRecovery.test.tsx tests/a11y.test.tsx tests/uxTier1.test.tsx tests/uxTier2.test.tsx`

Expected: PASS.

- [ ] **Step 8: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: both clean.

- [ ] **Step 9: Commit**

```bash
git add src/pages/SummaryPage.tsx tests/summaryErrorRecovery.test.tsx
git commit -m "feat(summary): one honest panel for every unavailable case

A stale link, a patient with no past meetings, and a lost connection each get
their own message instead of a generic failure or seeded copy. The transcript
actions still show when this browser holds the transcript; otherwise the panel
points at the meeting history."
```

---

### Task 5: Changelog, version bump, and full verification

**Files:**
- Modify: `CHANGELOG.md`, `package.json`, `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Add the changelog entry**

Insert above the `## [1.62.3] — 2026-07-25` heading in `CHANGELOG.md`:

```markdown
## [1.62.4] — 2026-07-25

### Fixed
- **קישור לסיכום פגישה נשמר ברענון ובלשונית חדשה.** מזהה הפגישה נשמר עד כה
  בזיכרון בלבד, ולכן רענון או העתקת הכתובת ללשונית אחרת החזירו את הסיכום לתוכן
  הדגמה. הכתובת כוללת כעת את הפגישה — `#/summary/<מטופל>/<פגישה>` — באותה מתכונת
  של `#/session`, והמזהה משוחזר מהקישור.
- **סיכום של מטופל אחר לא מוצג יותר תחת קישור שגוי.** מעבר לסיכום ללא ציון פגישה
  שמר את הפגישה הקודמת, ולכן פגישה של מטופל א׳ יכלה להופיע בכתובת של מטופל ב׳.

### Added
- קישור שמציין מטופל בלבד נפתר לפגישה האחרונה שלו, והכתובת מתעדכנת כך שתציין
  אותה.
- מסך הסיכום מציג הודעה ייעודית לכל מצב שבו אין מה להציג: קישור שאינו עדכני,
  מטופל ללא פגישות קודמות, וניתוק מהרשת.
```

- [ ] **Step 2: Bump package.json**

In `package.json`, change `"version": "1.62.3"` to `"version": "1.62.4"`.

- [ ] **Step 3: Bump the README badge**

`README.md:3` reads:

```markdown
**Version:** 1.62.3 · **Stack:** Vite · React 18 · TypeScript · Hebrew RTL
```

Change it to:

```markdown
**Version:** 1.62.4 · **Stack:** Vite · React 18 · TypeScript · Hebrew RTL
```

- [ ] **Step 4: Run the guard**

Run: `npx vitest run tests/canonical.test.ts`

Expected: PASS, all cases.

- [ ] **Step 5: Full verification**

Run: `npm run lint && npm run typecheck && npm test && npm run build`

Expected: all four green, with no failures at all — the tree was fully green before this work started.

- [ ] **Step 6: Commit**

```bash
git add CHANGELOG.md package.json README.md
git commit -m "chore(release): 1.62.4

Documents the summary deep-link fix, the stale-meeting fix, and the new
unavailable states."
```

---

## Verification Summary

After Task 5, all of the following pass:

```bash
npm run lint       # eslint, flat config, --max-warnings=0
npm run typecheck  # tsc --noEmit
npm test           # vitest — unit, route smoke, a11y, canonical guards
npm run build      # typecheck + production bundle
```

Manual check (needs a backend): `VITE_API_BASE_URL=<url> npm run dev`. Open a patient's meeting summary, copy the URL into a new tab — the same meeting's server summary loads. Refresh — unchanged. Strip the meeting segment — the newest meeting resolves and the URL rewrites to name it. Point the meeting segment at a nonexistent id — the panel says the meeting was not found and offers the history. With `VITE_API_BASE_URL` unset, the page is exactly what it was before.
