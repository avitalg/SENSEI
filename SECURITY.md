# Security — Sensei Frontend

Security posture, threat model, and reporting process for this repository. This is the
canonical home for **security posture**; the hosting header values themselves live in
`vercel.json` + `public/_headers` (code is canonical), and the enforcement rules that keep
them true live in [CONTRIBUTING.md](CONTRIBUTING.md).

## 1. What this application is (scope of risk)

Sensei is a **client-only** Hebrew/RTL single-page app. It has **no backend, no database,
no authentication server, and no network calls** in its default configuration:

- All state lives in the browser (`localStorage`, key `sensei_session_react_v1`).
- All clinical content shown in the demo is **fictional** — it is parsed at build time from
  the `src/data/mock_patients/` markdown mirror (Disney/comic characters). **No real patient
  data, PHI, or PII is present in this repository or in the build.**
- The typed API layer (`src/services/`) is **dormant** until `VITE_API_BASE_URL` is set.
- The AI assistant panel is the one optional network consumer: with a base URL configured it
  streams from the senseiapi `/assistant/chat` endpoint; unset, it serves canned demo replies.

Consequence: the realistic threat surface today is **client-side** (XSS, supply chain, header
misconfiguration, secret leakage into the bundle), not server-side.

## 2. Secrets policy

- **Never commit a `.env` file.** `.gitignore` excludes `.env` and `.env.*`, with an explicit
  exception for the tracked template `.env.example`.
- **`VITE_`-prefixed variables are inlined into the browser bundle by Vite** and are therefore
  public. Never place a secret, signing key, database URL, or private token in a `VITE_` var.
- The only variable the app reads is `VITE_API_BASE_URL` (plus Vite built-ins). This is
  asserted by `tests/security.test.ts`, which fails CI if any other env var is read.
- Backend secrets belong to the backend and its host secret store — never to this repo.

## 3. Enforced client-side invariants

`tests/securitySource.test.ts` is a static guard over the source tree; each item below fails
CI if reintroduced:

| Invariant | Rationale |
|---|---|
| No `dangerouslySetInnerHTML` / `innerHTML` | removes the primary XSS sink; all markdown/dataset text renders as React text nodes |
| No `eval` / `new Function` | no dynamic code execution paths |
| No `javascript:` URIs | blocks scheme-based script injection |
| `window.open` always with `noopener` | prevents reverse-tabnabbing |
| No hardcoded secrets | keeps credentials out of the shipped bundle |
| No production source maps | avoids shipping readable source to the client |

## 4. Transport & browser hardening (hosting layer)

Identical headers ship for both supported hosts — Vercel (`vercel.json`) and Netlify
(`public/_headers`). Parity between the two is guarded by `tests/securityHeaders.test.ts`.

- **Content-Security-Policy:** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  - `style-src 'unsafe-inline'` is required by React inline styles; **script** is never inline.
  - `connect-src 'self'` means a configured backend on another origin must be added here explicitly.
- **Strict-Transport-Security:** `max-age=63072000; includeSubDomains; preload`
- **X-Content-Type-Options:** `nosniff` · **X-Frame-Options:** `DENY` (with `frame-ancestors 'none'`)
- **Referrer-Policy:** `strict-origin-when-cross-origin`
- **Permissions-Policy:** `geolocation=(), camera=(), microphone=(self), payment=(), usb=()` —
  `microphone=(self)` is deliberate: the in-browser session recording flow needs it. Everything
  else is denied.

Headers are a hosting-layer concern: **verify them live after each deploy** (they are not
exercised by the dev server).

## 5. Privacy characteristics

- **No analytics, telemetry, trackers, or third-party scripts** — by design, and `connect-src 'self'`
  would block them anyway.
- Session audio recorded in-browser stays on the device and is handed to the upload pipeline
  in-memory; nothing is transmitted while the app is client-only.
- Share actions (WhatsApp / mailto) never auto-fill a recipient and never include patient
  identifiers — asserted by `tests/share.test.ts`.

## 6. Dependency supply chain

- Runtime dependencies are deliberately minimal: React, React DOM, TanStack Query, and the
  AI SDK packages (`ai`, `@ai-sdk/react`) used by the assistant panel.
- CI runs a **production-dependency audit** on every push/PR (`.github/workflows/ci.yml`).
- Installs must use the committed `package-lock.json` (`npm ci`) so builds are reproducible.

## 7. Known, accepted risks

- `src/services/apiAuth.ts` stores its bearer token in web storage. This is acceptable **while
  the layer is dormant** (no backend, strict CSP, no XSS sinks). Before wiring a real backend,
  move to httpOnly cookies or explicitly accept and document the tradeoff.
- `localStorage` state is not encrypted. It holds only fictional demo data today; storing real
  clinical data would require re-evaluating this entirely.
- This build is a **demo/design reference, not a live clinical system**. Handling real patient
  data would additionally require the backend controls in `docs/PRODUCT.md` §10 (authn/authz,
  RBAC, encrypted storage, audit logging, retention) and a legal/regulatory review.

## 8. Reporting a vulnerability

Please report suspected vulnerabilities **privately** — do not open a public issue:

1. Open a private security advisory on the repository
   (<https://github.com/avitalg/SENSEI> → **Security** → *Report a vulnerability*), or
2. Contact the repository owner directly through GitHub.

Include affected version/commit, reproduction steps, and impact. As a client-only demo without
production patient data, there is no formal SLA; reports are triaged on a best-effort basis.

## 9. Verifying the posture locally

```bash
npm ci                                  # reproducible install from the lockfile
npm test                                # includes security, securitySource, securityHeaders
npm audit --omit=dev                    # production dependency audit (as CI runs it)
npm run build                           # confirms no source maps are emitted
```
