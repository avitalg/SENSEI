# Production release runbook

Canonical release process for the Sensei frontend. A release is complete only
when the local branch, GitHub branch, Vercel deployment, and production ZIP all
identify the same commit.

## Preconditions

- Node.js 20 (the version used by CI).
- Clean `main` branch tracking `origin/main`.
- Vercel CLI authenticated to the intended account and linked to project
  `sensei-hackathon-app`.
- No real secrets in the repository or in `VITE_*` variables. The only supported
  frontend variable is the public `VITE_API_BASE_URL`.

## 1. Verify source

```bash
git fetch origin --prune
git status --short --branch
npm ci
npm run check
npm run test:coverage
npm run dup
npm audit --omit=dev --audit-level=high
```

`npm run check` runs lint, validates the canonical Markdown patient dataset,
runs the complete Vitest suite, type-checks, and builds the production bundle.
The additional commands mirror the remaining CI gates.

Review `git diff`, scan for credentials, and confirm that `.env`, `node_modules`,
`dist`, coverage, caches, logs, local host folders, and archives are ignored.

## 2. Commit and synchronize GitHub

```bash
git add -- <intentional-files>
git diff --cached --check
git diff --cached --name-status
git commit -m "<verified release message>"
git push origin main
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
```

The three SHAs must match. Never force-push or rewrite release history.

## 3. Deploy the exact commit to Vercel

From a clean checkout of the verified SHA:

```bash
npx vercel@latest link --project sensei-hackathon-app
npx vercel@latest env ls
npx vercel@latest deploy --prod
```

Do not set `VITE_API_BASE_URL` unless the production API is intentionally in
scope. Vite variables are public and are compiled into the bundle.

Record the deployment URL and inspect it:

```bash
npx vercel@latest inspect <deployment-url>
```

Validate `/`, hash routes, hashed assets, security/cache headers, Hebrew
`lang="he"` and `dir="rtl"`, authentication/demo entry, dashboard, calendar,
patient file, preparation report, recording/upload entry, settings, Help,
responsive layouts, keyboard focus, and browser console/network failures.

There is no CMS or analytics integration in this repository. Their production
check is confirmation that no unexpected CMS/analytics requests or scripts are
present.

## 4. Build the canonical production ZIP

Create the archive from the deployed commit, never from the working directory:

```bash
git archive --format=zip --output sensei-v1.91.2-production.zip HEAD
```

Extract to an empty directory and run:

```bash
npm ci
npm run check
```

The extracted `git archive` has no `.git` directory by design and is ready to
open directly in Claude Code. Start with `CLAUDE.md`, then `README.md`.

## Rollback

Deploy the last known-good Git SHA from a clean checkout. Do not alter Git
history. Vercel may also promote a previous verified deployment while the
repository remains unchanged.
