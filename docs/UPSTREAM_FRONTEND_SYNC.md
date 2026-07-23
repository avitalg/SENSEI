# Upstream frontend synchronization

Last verified: 2026-07-23
Upstream: `avitalg/SENSEI`
Branch: `main`
Revision: `44eef959bc76f8567f4ba2691f77d3fc2ed28794`

## Scope

The comparison covers frontend source, public assets, UI and responsive styles,
client routing, client state, frontend services and API adapters, Vite/TypeScript/
ESLint configuration, dependency manifests, tests, and frontend documentation.

Backend implementations, API contracts, database schemas, infrastructure, and
server-side logic are outside the synchronization scope and were not modified.

## Reconciliation policy

- Upstream bug fixes and hygiene changes are carried forward.
- Existing local functionality newer than upstream is preserved when it does not
  conflict with an upstream contract.
- API boundaries, route compatibility, persistence keys, permissions, analytics,
  and clinical-data integrity behavior remain unchanged.
- Dependency versions match the upstream manifests; local scripts may extend the
  manifest for frontend data verification.

## Local frontend extensions retained

- Unified desktop/mobile dynamic layouts and shared workspace components.
- Production mock-patient repository integration and integrity verification.
- Contextual session recording and recording handoff.
- Expanded responsive, accessibility, security, routing, and data-integrity tests.
- Mobile sheet, safe-area, touch-target, and keyboard/autofill hardening.

## Production gate

Run:

```sh
npm run check
```

This executes linting, the complete Vitest suite, TypeScript checking, and the
optimized Vite production build.
