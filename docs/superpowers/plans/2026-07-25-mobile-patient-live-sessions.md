# Mobile Patient — Live Recent Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile patient screen's "פגישות אחרונות" list read backend data when the API is configured, using the same `isApiConfigured()` gate the desktop patient page uses, while leaving the offline demo list exactly as it is.

**Architecture:** `src/components/mobile/MobilePatient.tsx` gains an explicit `isApiConfigured()` check. The live branch reads `usePatientMeetingHistory` — the same hook `src/pages/PatientPage.tsx` uses, which loads past events from `/calendar` and per-meeting recaps from `/meetings/{id}/summary`. The offline branch keeps the existing `SESSION_DATES` / `sessionSummaries` / `demoSessionCount` code untouched. No service, store, CSS, or dependency changes.

**Tech Stack:** React 18 + TypeScript (Vite), Vitest + @testing-library/react, `@tanstack/react-query` (already wired — `QueryClientProvider` lives in `src/store/AppStore.tsx:688`).

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

**Known pre-existing failure:** `tests/canonical.test.ts` fails on `main` today — `package.json` is 1.62.1 while the newest CHANGELOG heading is 1.62.2 (commit 3df5f30 bumped one and not the other). Task 3 repairs it. Until Task 3, expect exactly this one failure from `npm test` and no other.

---

### Task 1: Live session rows behind the API flag

**Files:**
- Modify: `src/components/mobile/MobilePatient.tsx:1-33` (imports, data derivation) and `:61-74` (row list)
- Test: `tests/mobileScreens.test.tsx`

**Interfaces:**
- Consumes: `usePatientMeetingHistory(opts?: { enrichLimit?: number })` from `src/components/patient/usePatientMeetingHistory.ts`. Returns `{ cp, patientId, useApi, sessions, loading, error, latestSummaryText, totalCount }`. Each entry of `sessions` carries `{ num: number; key: string; date: string; duration: string; summary: string; onOpen: () => void; onSummary: () => void; onTranscript: () => void; onDelete: (e?) => void; hasNote: boolean; riskChips; topRiskLabel; topRiskColor; topRiskBg }`. Live `onOpen` navigates to `summary` with the real `meetingId`; offline `onOpen` navigates to `session` with `sessionNum`.
- Consumes: `isApiConfigured(): boolean` from `src/services/apiClient.ts`.
- Produces: a local `sessions` array of `{ key: string; num: number; date: string; summary: string; onOpen: () => void }` consumed by the row list in this same file and extended by Task 2's states.

- [ ] **Step 1: Add the service mocks the live tests need**

`tests/mobileScreens.test.tsx` currently mocks only `apiClient` and `nextMeetingReport`. Replace the `vi.hoisted` block at lines 11-15 with this, and add the three new `vi.mock` calls directly after the existing `nextMeetingReport` mock (which ends at line 23):

```tsx
const {
  isApiConfiguredMock,
  pollMock,
  regenMock,
  loadPatientPastEvents,
  loadPatientUpcomingEvents,
  fetchMeetingSummary,
  listPatients,
} = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => false),
  pollMock: vi.fn(),
  regenMock: vi.fn(),
  loadPatientPastEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  loadPatientUpcomingEvents: vi.fn(async () => [] as CalendarUiEvent[]),
  fetchMeetingSummary: vi.fn(async () => ({ meeting_id: '', status: 'ready' as const, text: '' as string | null })),
  listPatients: vi.fn(async () => [] as Array<{ id: string; name: string; phone: string; email: string | null; created_at: string; archived?: boolean }>),
}));
```

```tsx
vi.mock('../src/services/calendar', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/calendar')>();
  return { ...actual, loadPatientPastEvents, loadPatientUpcomingEvents };
});
vi.mock('../src/services/meetingSummary', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/meetingSummary')>();
  return { ...actual, fetchMeetingSummary };
});
vi.mock('../src/services/patients', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/patients')>();
  return { ...actual, listPatients };
});
```

Add these imports to the top of the file, alongside the existing ones:

```tsx
import type { CalendarUiEvent } from '../src/services/calendar';
import { fmtDate } from '../src/utils/dates';
```

Extend the existing `beforeEach` (currently lines 41-44) so live mocks reset between tests:

```tsx
beforeEach(() => {
  setMobile();
  isApiConfiguredMock.mockReturnValue(false);
  loadPatientPastEvents.mockResolvedValue([]);
  loadPatientUpcomingEvents.mockResolvedValue([]);
  fetchMeetingSummary.mockResolvedValue({ meeting_id: '', status: 'ready', text: '' });
  listPatients.mockResolvedValue([]);
});
```

- [ ] **Step 2: Add the live-mode fixtures**

Add below the `mount` helper (after line 39):

```tsx
const LIVE_PID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LIVE_MEETING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function pastUiEvent(patientId: string): CalendarUiEvent {
  const end = new Date();
  end.setDate(end.getDate() - 3);
  end.setHours(12, 0, 0, 0);
  const start = new Date(end.getTime() - 50 * 60_000);
  return {
    id: 'db-' + LIVE_MEETING_ID,
    title: 'פגישה',
    description: '',
    location: '',
    htmlLink: '',
    meetLink: '',
    allDay: false,
    start,
    end,
    status: 'confirmed',
    attendees: [{ name: 'Live Patient', email: '', self: false, response: 'accepted' }],
    source: 'db',
    patientId,
  };
}

const LIVE_PATIENT = {
  id: LIVE_PID,
  name: 'Live Patient',
  phone: '050-0000000',
  email: null as string | null,
  created_at: '2026-01-01T00:00:00Z',
  archived: false,
};
```

- [ ] **Step 3: Write the failing tests**

Add these two cases inside the existing `describe('mobile patient profile', ...)` block, after the current offline test:

```tsx
  it('API mode: recent sessions come from the calendar, not the seeded demo list', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    const event = pastUiEvent(LIVE_PID);
    loadPatientPastEvents.mockResolvedValue([event]);
    fetchMeetingSummary.mockResolvedValue({
      meeting_id: LIVE_MEETING_ID,
      status: 'ready',
      text: 'סיכום אמיתי מהשרת על התקדמות בטיפול.',
    });
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    await waitFor(() => expect(container.querySelector('.mob-sess-row')).toBeTruthy());
    expect(container.textContent).toContain(fmtDate(event.start));
    expect(container.textContent).toContain('סיכום אמיתי מהשרת');
    // the seeded demo history must not leak into a live patient's file
    expect(container.textContent).not.toContain('22/06/26');
    expect(loadPatientPastEvents).toHaveBeenCalled();
  });

  it('API mode: tapping a session opens the summary with the real meeting, not the demo session page', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    loadPatientPastEvents.mockResolvedValue([pastUiEvent(LIVE_PID)]);
    fetchMeetingSummary.mockResolvedValue({
      meeting_id: LIVE_MEETING_ID,
      status: 'ready',
      text: 'סיכום אמיתי מהשרת.',
    });
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    await waitFor(() => expect(container.querySelector('.mob-sess-row')).toBeTruthy());
    fireEvent.click(container.querySelector('.mob-sess-row') as HTMLElement);
    await waitFor(() => expect(window.location.hash.startsWith('#/summary/')).toBe(true));
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run tests/mobileScreens.test.tsx -t 'API mode'`

Expected: the two new cases FAIL. The first fails on `expect(container.textContent).not.toContain('22/06/26')` — the seeded date renders. The second fails waiting for the hash, which stays `#/patient/...` because the row still calls `navigate('session', ...)`. The existing prep-report `API mode` case must still PASS; if it regressed, the new `vi.mock('../src/services/calendar', ...)` dropped a real export — check the `...actual` spread.

- [ ] **Step 5: Wire the flag branch in MobilePatient**

In `src/components/mobile/MobilePatient.tsx`, add two imports:

```tsx
import { isApiConfigured } from '../../services/apiClient';
import { usePatientMeetingHistory } from '../patient/usePatientMeetingHistory';
```

Replace the body from `const { navigate } = useApp();` through the `const sessions = ...` block (lines 17-33) with:

```tsx
  const { navigate } = useApp();
  const { cp, upcomingMeetings } = usePatientUpcomingMeetings();
  // Recent sessions follow the same gate as the desktop PatientPage: live rows
  // from /calendar past events + per-meeting summaries, seeded demo rows
  // otherwise. The hook is called unconditionally (rules of hooks) but is inert
  // offline — its query is `enabled: useApi` and its demo memo returns [].
  const useApi = isApiConfigured();
  const history = usePatientMeetingHistory({ enrichLimit: RECENT_COUNT });
  const av = avatarColors(patientAvatarColor(cp.id));

  const next = upcomingMeetings[0];
  const nextLabel = next ? formatMeetingWhen(new Date(next.start)) : 'טרם נקבעה';

  const summaries = sessionSummaries(cp);
  // Use the canonical per-patient session count (same as SessionDetailPage /
  // buildPatientSessions), so the newest session number is real and tapping a
  // row navigates to a session that exists.
  const total = demoSessionCount(cp);
  const demoRows = SESSION_DATES.slice(0, RECENT_COUNT).map((date, i) => ({
    key: 'demo-' + (total - i),
    num: total - i,
    date,
    summary: summaries[i % summaries.length],
    onOpen: () => navigate('session', { patientId: cp.id, sessionNum: total - i }),
  }));
  const liveRows = history.sessions.slice(0, RECENT_COUNT).map((s) => ({
    key: s.key,
    num: s.num,
    date: s.date,
    summary: s.summary,
    onOpen: s.onOpen,
  }));
  const sessions = useApi ? liveRows : demoRows;
```

- [ ] **Step 6: Point the row list at the new shape**

Still in `src/components/mobile/MobilePatient.tsx`, the rows currently key on `s.num` and hard-code the tap target. Replace the `sessions.map(...)` block (lines 61-74) with:

```tsx
          {sessions.map((s) => (
            <button
              key={s.key}
              type="button"
              className="mob-sess-row"
              onClick={s.onOpen}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span dir="ltr" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--primary)' }}>{s.date}</span>
                <span className="mob-badge">פגישה {s.num}</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', textAlign: 'start' }}>{s.summary}</div>
            </button>
          ))}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run tests/mobileScreens.test.tsx`

Expected: PASS, all cases — including the pre-existing offline `renders the patient header, next meeting, and recent sessions`, which is the regression guard for the demo path.

- [ ] **Step 8: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: both clean, zero warnings. If lint flags an unused import, the demo branch lost a reference — `SESSION_DATES`, `sessionSummaries`, and `demoSessionCount` must all still be used.

- [ ] **Step 9: Commit**

```bash
git add src/components/mobile/MobilePatient.tsx tests/mobileScreens.test.tsx
git commit -m "fix(mobile): source patient session history from the backend when configured

The mobile patient screen built its recent-sessions list straight from the
seeded SESSION_DATES/sessionSummaries constants, so a live patient's file
showed fabricated dates and summaries, and tapping a row dead-ended on the
demo-only SessionDetailPage. It now branches on isApiConfigured() and reads
usePatientMeetingHistory in live mode, matching the desktop PatientPage. The
offline demo rows are unchanged."
```

---

### Task 2: Loading, error, and empty states for the live branch

**Files:**
- Modify: `src/components/mobile/MobilePatient.tsx` (the recent-sessions section)
- Test: `tests/mobileScreens.test.tsx`

**Interfaces:**
- Consumes: `history.loading: boolean` and `history.error: string` from Task 1's `usePatientMeetingHistory` call, plus Task 1's local `sessions` array.
- Produces: nothing consumed by later tasks.

These three states apply to the live branch only. Offline, `sessions` is always four demo rows, so none of them render and the demo path is untouched. They are mutually exclusive, following `src/components/mobile/MobilePrepReport.tsx:124-159`, so demo copy is never shown as if it were live data.

- [ ] **Step 1: Write the failing tests**

Add these three cases inside `describe('mobile patient profile', ...)`, after Task 1's cases:

```tsx
  it('API mode: shows a loading status while the meeting history is in flight', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    let release: (v: CalendarUiEvent[]) => void = () => {};
    loadPatientPastEvents.mockReturnValue(new Promise<CalendarUiEvent[]>((resolve) => { release = resolve; }));
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    await waitFor(() => expect(container.querySelector('[role="status"]')).toBeTruthy());
    expect(container.textContent).toContain('טוענים את היסטוריית הפגישות…');
    expect(container.textContent).not.toContain('22/06/26');

    await act(async () => { release([]); });
  });

  it('API mode: shows an error card when the meeting history fails to load', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    loadPatientPastEvents.mockRejectedValue(new Error('לא ניתן לטעון את היסטוריית הפגישות'));
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    await waitFor(() => expect(container.querySelector('[role="alert"]')).toBeTruthy());
    expect(container.textContent).toContain('לא ניתן לטעון את היסטוריית הפגישות');
    expect(container.querySelectorAll('.mob-sess-row').length).toBe(0);
    expect(container.textContent).not.toContain('22/06/26');
  });

  it('API mode: shows the empty state when the patient has no past meetings', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    loadPatientPastEvents.mockResolvedValue([]);
    listPatients.mockResolvedValue([LIVE_PATIENT]);

    const { container } = mount({ route: 'patient', patientId: LIVE_PID, patients: [LIVE_PATIENT] });

    await waitFor(() => expect(container.textContent).toContain('אין פגישות קודמות'));
    expect(container.querySelectorAll('.mob-sess-row').length).toBe(0);
    expect(container.textContent).not.toContain('22/06/26');
  });
```

The error test relies on React Query surfacing the rejection. `usePatientMeetingHistory` maps it to `error: (pastQuery.error as Error)?.message || 'לא ניתן לטעון את היסטוריית הפגישות'`, so the thrown message and the fallback are the same string either way.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/mobileScreens.test.tsx -t 'API mode'`

Expected: the three new cases FAIL — no `[role="status"]`, no `[role="alert"]`, and no `אין פגישות קודמות` in the DOM, because the section renders an unconditional `sessions.map`. Task 1's two cases must still PASS.

- [ ] **Step 3: Render the three states**

In `src/components/mobile/MobilePatient.tsx`, wrap the rows. Replace the row-list container (the `<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>` holding `sessions.map(...)`, immediately after the `פגישות אחרונות` heading) with:

```tsx
        {useApi && history.loading && (
          <div className="mob-card" role="status" aria-live="polite">
            <div className="skeleton" style={{ height: 13, width: '45%', borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 11, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '80%', borderRadius: 6 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>טוענים את היסטוריית הפגישות…</div>
          </div>
        )}
        {useApi && !history.loading && history.error && (
          <div className="mob-card" role="alert">
            <div className="mob-card-title">לא ניתן לטעון את היסטוריית הפגישות</div>
            <div className="mob-card-body" style={{ color: 'var(--error)' }}>{history.error}</div>
          </div>
        )}
        {useApi && !history.loading && !history.error && sessions.length === 0 && (
          <div className="mob-card">
            <div className="mob-card-body" style={{ color: 'var(--text-muted)' }}>אין פגישות קודמות</div>
          </div>
        )}
        {(!useApi || (!history.loading && !history.error)) && sessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map((s) => (
              <button
                key={s.key}
                type="button"
                className="mob-sess-row"
                onClick={s.onOpen}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span dir="ltr" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--primary)' }}>{s.date}</span>
                  <span className="mob-badge">פגישה {s.num}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', textAlign: 'start' }}>{s.summary}</div>
              </button>
            ))}
          </div>
        )}
```

`.mob-card`, `.mob-card-title`, `.mob-card-body`, and `.skeleton` all already exist — `.mob-*` in `src/components/mobile/mobile.css`, `.skeleton` in `src/styles/global.css:23`. Add no CSS. The error card copy mirrors `MobilePrepReport.tsx:132-136`; the empty copy matches `src/components/patient/PatientSessionList.tsx:18`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/mobileScreens.test.tsx`

Expected: PASS, all cases.

- [ ] **Step 5: Run the a11y and mobile suites**

Run: `npx vitest run tests/mobileA11y.test.tsx tests/mobileScreens.test.tsx tests/mobileDayView.test.tsx tests/mobileTabBar.test.tsx tests/a11y.test.tsx`

Expected: PASS. The new `role="status"` / `role="alert"` nodes are the same pattern the prep report already ships, so no new a11y findings.

- [ ] **Step 6: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/mobile/MobilePatient.tsx tests/mobileScreens.test.tsx
git commit -m "feat(mobile): add loading, error, and empty states to live session history

Mirrors MobilePrepReport: the three states are mutually exclusive, so seeded
demo rows can never be shown while live data is pending or failed. Offline
rendering is unaffected."
```

---

### Task 3: Changelog, version bump, and full verification

**Files:**
- Modify: `CHANGELOG.md`, `package.json`, `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

This also repairs the pre-existing guard failure on `main` (`package.json` 1.62.1 vs newest CHANGELOG heading 1.62.2).

- [ ] **Step 1: Confirm the guard fails first**

Run: `npx vitest run tests/canonical.test.ts`

Expected: FAIL with `newest CHANGELOG heading must match package.json version: expected '1.62.2' to be '1.62.1'`.

- [ ] **Step 2: Add the changelog entry**

Insert above the `## [1.62.2] — 2026-07-25` heading in `CHANGELOG.md`:

```markdown
## [1.62.3] — 2026-07-25

### Fixed
- **מובייל · היסטוריית פגישות מהשרת.** מסך המטופל בנייד בנה את רשימת
  "פגישות אחרונות" מנתוני ההדגמה בלבד, ולכן הוצגו תאריכים וסיכומים מומצאים גם
  כשהוגדר שרת. המסך בודק כעת `isApiConfigured()` כמו מסך המטופל בדסקטופ, וטוען
  את הפגישות הקודמות ואת הסיכומים מהשרת. הקשה על שורה בפגישה חיה נפתחת בסיכום
  הפגישה האמיתית במקום בעמוד ההדגמה. במצב לא מקוון ההתנהגות לא השתנתה.
- **התאמת גרסאות.** `package.json` נותר על 1.62.1 בעוד ה-CHANGELOG כבר עודכן
  ל-1.62.2, ולכן שומר עקביות הגרסאות נכשל. שלוש המקורות מסונכרנים שוב.

### Added
- מצבי טעינה, שגיאה וריק להיסטוריית הפגישות בנייד, במתכונת דוח ההכנה.
```

- [ ] **Step 3: Bump package.json**

In `package.json`, change `"version": "1.62.1"` to `"version": "1.62.3"`.

- [ ] **Step 4: Bump the README badge**

`README.md:3` reads:

```markdown
**Version:** 1.62.1 · **Stack:** Vite · React 18 · TypeScript · Hebrew RTL
```

Change it to:

```markdown
**Version:** 1.62.3 · **Stack:** Vite · React 18 · TypeScript · Hebrew RTL
```

- [ ] **Step 5: Run the guard to verify it passes**

Run: `npx vitest run tests/canonical.test.ts`

Expected: PASS, all cases.

- [ ] **Step 6: Full verification**

Run: `npm run lint && npm run typecheck && npm test && npm run build`

Expected: all four green. `npm test` must now be fully clean — the canonical failure documented in Global Constraints is fixed by this task, so any remaining failure is a real regression, not the known one.

- [ ] **Step 7: Commit**

```bash
git add CHANGELOG.md package.json README.md
git commit -m "chore(release): 1.62.3

Documents the mobile live session-history fix and resyncs package.json with
the CHANGELOG and README badge, repairing the version-consistency guard."
```

---

## Verification Summary

After Task 3, all of the following pass:

```bash
npm run lint       # eslint, flat config, --max-warnings=0
npm run typecheck  # tsc --noEmit
npm test           # vitest — unit, route smoke, a11y, canonical guards
npm run build      # typecheck + production bundle
```

Manual check (optional, needs a backend): `VITE_API_BASE_URL=<url> npm run dev`, open at phone width, navigate to a patient. "פגישות אחרונות" shows real meeting dates and server summaries; tapping a row opens that meeting's summary. With `VITE_API_BASE_URL` unset, the screen is byte-for-byte what it was before.
