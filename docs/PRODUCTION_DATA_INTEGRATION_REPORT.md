# Production Data Integration Report

## Canonical source

- Repository: `https://github.com/thaler10/sensei-patients`
- Directory: `mock_patients`
- Verified commit: `259a4c34c08ca263ea9fb8585db701a28245803f`
- Local mirror: `src/data/mock_patients`
- Discovery: recursive `import.meta.glob`, with no patient-folder allowlist

## Imported structure

- Patient folders: 11
- Source Markdown files: 22
- Parsed sessions: 55
- Extracted follow-up tasks: 60
- Currently open latest-session tasks: 3
- Parser issues: 0

Patient folders discovered:

`aladdin`, `bruce_wayne`, `dumbo`, `elsa`, `forrest_gump`, `harry_potter`,
`marlin`, `moana`, `mulan`, `rapunzel`, `simba`

## Canonical layer

`src/data/mockPatientsRepo.ts` owns recursive discovery, Markdown parsing,
validation, normalization, patient/session mapping, unknown-section retention,
task extraction, fail-soft recovery, and module-level caching.

No UI component reads Markdown directly. `src/data/mockPatients.ts` is a domain
adapter over the canonical repository layer; it does not contain a separate
patient roster or clinical dataset.

Every source document retains its byte-equivalent raw Markdown and a safe,
non-HTML structural representation covering headings, paragraphs, lists,
blockquotes, tables, and fenced code. Future sections therefore remain available
without silently discarding content.

## UI integration

Repository-backed data is consumed by:

- Dashboard and today/next-meeting views
- Patient roster, archive, and patient profile
- Patient overview, notes, documents, and meeting tabs
- Meeting history and session detail
- Transcript and structured summary views
- Meeting-preparation report
- Follow-up tasks and risk indicators
- Search, filtering, navigation, and patient cross-links
- Demo AI answers and quick-overview content

## Placeholder removal

The retired `p1`–`p7` seed identities are migration markers only. Returning
browser sessions are reconciled onto repository identities without restoring
archived or permanently deleted records. Clinical fallbacks are neutral empty
states; missing repository fields are not fabricated.

The repository does not define future appointments or notification events.
Accordingly, the production seed contains neither. Calendar and notification
screens show honest empty states until real API data or user-created records are
available. Persisted-state migration removes old `mock-appt-*` projections while
preserving genuine user-created appointments.

## Integrity and reliability

- Source files are mirrored verbatim and checked against the recorded upstream commit.
- Sessions are assembled from the union of recording and summary files.
- Duplicate session numbers retain the first record and emit a parse issue.
- Unknown introductory fields, unknown summary sections, and future source files are retained.
- One malformed patient cannot prevent the remaining repository from loading.
- Tasks originate only from explicit `לתשומת לב` and forward-looking session text.
- Due dates remain `null` because the repository does not provide them.

## Repeatable validation

- `npm run patients:verify` verifies file content and provenance against GitHub.
- `npm run patients:report` reports domain totals and fails when parser issues exist.
- The automated test suite covers discovery, isolation, parsing, ordering, tasks,
  navigation, search, responsive behavior, RTL, accessibility, and repository integrity.

## Remaining limitations

- The application mirrors the remote repository at build time; it does not fetch
  GitHub content in the browser.
- The local mirror is a build input, not a parallel normalized dataset:
  `patients:verify` byte-compares every file and its manifest against the pinned
  upstream commit.
- New upstream content requires syncing the mirror and rebuilding the application.
- Future file types are retained losslessly but need an explicit mapper before
  their fields can appear as structured UI.
- The upstream corpus does not provide contact details, future appointments,
  notification events, or task due dates; the frontend deliberately leaves these
  absent instead of inventing values.
