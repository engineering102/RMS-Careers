# Deployment Architecture & Domain Infrastructure

This document details the deployment targets, domain mapping, routing rules, and environment configurations for RMS Careers.

---

## 1. Canonical Domain Model

The platform enforces a standardized domain hierarchy:

```text
                  https://rms-careers.com (Apex)
                                │
                                ▼ (Conceptually redirects to www)
              ┌───────────────────────────────────┐
              │     https://www.rms-careers.com   │
              │     (Corporate Website / Public)  │
              └─────────────────┬─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
https://student.rms-careers.com  https://tutor.rms-careers.com  https://admin.rms-careers.com
  (Student Learning Portal)      (Tutor Academic Console)       (Admin Control Plane)
```

- **Domain Naming**: The hyphenated domain `rms-careers.com` is mandatory.
- **Apex Redirection**: `https://rms-careers.com` redirects to `https://www.rms-careers.com`.
- **Portal Separation**: Each subdomain points to its dedicated application deployment.

---

## 2. Target Deployment Architecture

- **Hosting Environment**: Cloudflare (Workers / Pages) or Vercel Next.js edge runtime.
- **Database**: Neon Serverless PostgreSQL over HTTP.
- **Object Storage**: Cloudflare R2 (for PDFs, slide decks, submission attachments).
- **Email**: Resend API over HTTPS.

---

## 3. Environment Variable Configuration

### `apps/admin`
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `POSTGRES_URL` | Neon PostgreSQL connection string | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_URL` | Application base URL | `http://localhost:3000` or `https://admin.rms-careers.com` |
| `AUTH_SECRET` | NextAuth session signing key | Random 32+ char secret |
| `AUTH_TRUST_HOST` | Trust request host header | `true` |
| `AUTH_GITHUB_ID` | Optional GitHub OAuth Client ID | `client_id` |
| `AUTH_GITHUB_SECRET` | Optional GitHub OAuth Client Secret | `client_secret` |
| `RESEND_API_KEY` | Resend API key for emails | `re_...` |
| `EMAIL_FROM` | Sender email address | `RMS Careers <noreply@rms-careers.com>` |
| `EMAIL_LOGO_URL` | Public logo URL for email templates | `https://www.rms-careers.com/rms-logo.jpg` |

### `apps/web`
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `POSTGRES_URL` | Neon PostgreSQL connection string | Optional (falls back gracefully to static state if omitted) |

### `apps/student` (Cloudflare Workers via OpenNext, `student.rms-careers.com`)
Config: `apps/student/wrangler.jsonc`, `open-next.config.ts`. Scripts: `pnpm --filter @rms/student preview` / `deploy` (OpenNext build, then local workerd preview / deploy). Build on Linux/WSL; OpenNext is not reliable on native Windows.
Secrets are set with `wrangler secret put <NAME>` (never committed). For local preview put them in `apps/student/.dev.vars` (gitignored; template: `.dev.vars.example`).

| Variable | Kind | Description | Production value |
| :--- | :--- | :--- | :--- |
| `POSTGRES_URL` | Secret (required) | Neon connection string; used by neon-http and the `@rms/db/tx` WebSocket client | Neon connection URL |
| `AUTH_SECRET` | Secret (required) | Auth.js JWT signing key; unique to Student, never shared with Admin/Tutor | Random 32+ bytes |
| `RESEND_API_KEY` | Secret (optional) | Without it, emails report `provider_not_configured` | `re_...` |
| `EMAIL_FROM` | Secret/var (optional) | Sender; falls back to `RMS Careers <notifications@rms-careers.com>` | Verified Resend sender |
| `STUDENT_APP_URL` | Var (in `wrangler.jsonc`) | Base URL for emailed activation/reset links | `https://student.rms-careers.com` |

Auth semantics are unchanged on Workers: `__Host-student-sess` cookie, `trustHost: true`, HTTPS-only. The bcryptjs (12 rounds, ~350 ms CPU) login path needs the Workers Paid CPU limit (default 30 s); the Free plan's 10 ms limit cannot run it.

### `apps/admin` (Cloudflare Workers via OpenNext, `admin.rms-careers.com`)
Config: `apps/admin/wrangler.jsonc`, `open-next.config.ts`. Scripts: `pnpm --filter @rms/admin preview` / `deploy`. Worker name `rms-admin`, flags `nodejs_compat` + `global_fetch_strictly_public`, `limits.cpu_ms = 300000` (Workers Paid; bcryptjs at 12 rounds is ~350 ms CPU per hash).

| Variable | Kind | Used by | Notes |
| :--- | :--- | :--- | :--- |
| `POSTGRES_URL` | Secret (required) | all DB queries, `@rms/db/tx` | neon-http for queries, per-call Neon `Client` for transactions |
| `AUTH_SECRET` | Secret (required) | Auth.js | Admin-only secret |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | Secrets (required) | GitHub OAuth | callback `https://admin.rms-careers.com/api/auth/callback/github` |
| `RESEND_API_KEY` | Secret (optional) | `lib/email` | fetch-based Resend API; skipped when unset |
| `EMAIL_FROM` | Secret/var (optional) | `lib/email` | falls back to a Resend sandbox sender |
| `EMAIL_LOGO_URL` | Var | email templates | `https://www.rms-careers.com/rms-logo.jpg` |
| `STUDENT_APP_URL` | Var | activation links | `https://student.rms-careers.com` |

Not used by code (do not set): `NEXTAUTH_URL`, `AUTH_URL`, `AUTH_TRUST_HOST` (`trustHost: true` is set in `lib/auth.config.ts`).

**Build-secret guard (all Cloudflare apps):** OpenNext inlines `.env`, `.env.<mode>`, `.env.local` and `.env.<mode>.local` (from the app directory **and** the monorepo root) into `.open-next/cloudflare/next-env.mjs`, which is bundled into the Worker. `scripts/check-cloudflare-build-env.mjs` is wired into each app's `cf:build` (and therefore `preview` / `deploy`): `pre` fails the build if any of those files has a non-empty value, `post` fails if `next-env.mjs` embeds any variable. It prints file names and variable names only. `.env.example`, `.dev.vars`, `.dev.vars.example` and empty-valued files are allowed. To build with a populated `.env.local`, rename it first (`mv .env.local .env.local.bak`) or use a clean checkout; `next dev`, `next build` and tests are unaffected. Never run `opennextjs-cloudflare build` directly for a deployable artifact.

**Preview:** run it over HTTPS (`wrangler dev --local-protocol https`). Over plain HTTP, Auth.js middleware and route handlers disagree on the cookie name (`authjs.` vs `__Secure-authjs.`) and sessions appear to drop; production is always HTTPS.

**Environments**
1. *Local development:* `.env.local`, Neon/Resend development resources, `next dev`.
2. *Temporary validation deployment:* intentionally uses the existing development Neon and Resend resources, set as Worker secrets. No real users or production data. Replace everything before launch.
3. *Final production:* fresh Neon production database and fresh Resend account; new `AUTH_SECRET`, new GitHub OAuth app credentials (or a rotated secret); secrets set via Wrangler only.
