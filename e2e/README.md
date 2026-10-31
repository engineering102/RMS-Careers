# Browser tests (Playwright)

Separate from the Vitest tiers: `pnpm test` / `pnpm test:int` never see these files, and these commands never run Vitest.

| Command | What it runs |
|---|---|
| `pnpm test:e2e:install` | one-time: download Chromium (`%LOCALAPPDATA%\ms-playwright`) |
| `pnpm test:e2e` | local suite (`tooling` + `local-student` projects), headless |
| `E2E_TUTOR_BASE_URL=http://localhost:3003 pnpm test:e2e --project=local-tutor` | public behaviour of a locally running tutor app (`pnpm dev:tutor`); the project exists only while `E2E_TUTOR_BASE_URL` is set (loopback only) |
| `pnpm test:e2e:headed` / `:ui` | same, visible browser / Playwright UI mode |
| `pnpm test:e2e:prod` | **read-only** smoke of `https://student.rms-careers.com` |
| `pnpm test:e2e:report` | open the last local HTML report |

Add `--project=tooling` to run only the checks that need no application.

## Layout

```
e2e/
  playwright.local.config.ts       local suite (loopback targets only)
  playwright.production.config.ts  production smoke (fixed origin, GET only)
  support/                         diagnostics fixture, redaction, target allow-lists, report lifecycle
  tests/tooling/                   prove browser + diagnostics + guards; no app, no network
  tests/local/                     public behaviour of a locally running student app
  tests/local-tutor/               public behaviour of a locally running tutor app (opt-in)
  tests/production/                read-only production smoke
  reports/<suite>/                 SUMMARY.md + per-test JSON   (git-ignored, regenerated every run)
  test-results/, playwright-report/                              (git-ignored)
```

## Safety rules (enforced in code, not by convention)

- **Read-only.** `support/diagnostics.ts` aborts every request that is not GET/HEAD, in both suites. Tests never sign in, fill forms or click submit. Aborted requests (for example Cloudflare's `POST /cdn-cgi/rum` beacon) are listed in the report and excluded from console-error counts.
- **Production target is fixed** to `https://student.rms-careers.com` (`support/targets.ts`); there is no env override. The production suite has no credentials and the repo has none to give it.
- **Local target is loopback-only** (`E2E_STUDENT_BASE_URL`, default `http://localhost:3002`); any other host makes the config throw.
- **Database safety.** The local config never starts the app and never reads `.env*`. You start the student app yourself, against a database you have verified (see `docs/development/testing.md` §2). The guard in `packages/db/src/guard.ts` classifies databases for Vitest and seeds only; it does **not** protect a running app, which is why these tests are unauthenticated and GET-only. Authenticated flows should wait for a harness that starts the app against the pinned NonProd `test` branch (`TEST_DATABASE_URL` + `TEST_DATABASE_ENDPOINT`, endpoint-verified) and seeds it with `pnpm student:seed:test`.
- **Nothing sensitive is recorded**: no headers (except a sanitized redirect `Location`), cookies, storage or bodies; URLs are reduced to origin + path; tokens/JWTs/connection strings are redacted from console text.
  Playwright **traces** (kept on failure) do contain request/response headers. The suites are unauthenticated, so there are no session tokens in them, but do not publish traces. Authenticated suites would have to switch traces off or scrub them.

## Reading results

Every test attaches `diagnostics.md` / `diagnostics.json` (also in `reports/<suite>/`; `SUMMARY.md` merges them). Pass/fail is deliberately narrow: **fails** on an application-exception marker (Next.js "Application error…", error-boundary text, `html#__next_error__`), an uncaught page error, a 5xx main document, or a failed first-party script/stylesheet. **Reported, not failed**: console errors/warnings, other failed requests, 3xx/4xx responses (status and redirect chain are recorded; HTTP 200 is never assumed). A green run still deserves a glance at the report.

A green production smoke only means the **public, signed-out** pages are healthy. Post-login failures need an authenticated test, which is out of scope for production.

## CI integration proposal (not implemented; no workflow was changed)

1. **Local suite, PR-time, no secrets.** New job `e2e` in `ci.yml` (or a separate `e2e.yml`): `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm test:e2e:install`, build the student app with the existing guarded `cf:build`, run it in local workerd the way `artifact-poc-app.yml` already does (`wrangler dev --local`, 127.0.0.1, placeholder variables), then `E2E_STUDENT_BASE_URL=http://127.0.0.1:<port> pnpm test:e2e --project=local-student`. Only the public, unauthenticated tests run, so no database credentials are needed. Upload `e2e/playwright-report/` on failure. Add the job to `ci-gate`'s `needs` only after it has been stable for a while.
2. **Authenticated local suite (later).** Add a second job in the `integration` secret scope (`TEST_DATABASE_URL`/`TEST_DATABASE_ENDPOINT` only), start the app with `POSTGRES_URL` pointed at the verified NonProd test branch, seed with `pnpm student:seed:test`. Never any production secret; skipped on Dependabot PRs like `integration`.
3. **Production smoke, scheduled and manual only.** A separate `production-smoke.yml` with `on: schedule` + `workflow_dispatch`, `permissions: contents: read`, no `needs` from or to any deploy job, no secrets, no environment. It runs `pnpm test:e2e:prod` and uploads the report. Because it is read-only and credential-free it cannot deploy or change anything; a failure should notify, not block or roll back automatically. Optionally call it from the future deploy workflow *after* a deploy as an advisory post-deploy check, never as a gate that triggers `rollback.yml` without a human.
4. **Path classifier.** `scripts/ci/affected.mjs` fails closed on unknown paths, so a top-level `e2e/` (non-`.md`) currently classifies as "unknown" and widens CI to every app. When this is adopted, add `e2e/**` to the non-deploy list there (with its unit test in `scripts/ci/__tests__`) so e2e-only changes do not mark apps deployable.
5. Pin `@playwright/test` (already in the lockfile) and cache `~/.cache/ms-playwright` keyed on its version.

## Authenticated production run (student, owner-authorized test account only)

`pnpm test:e2e:prod:auth` (or `:headed`) runs `tests/production-auth/` via `playwright.production-auth.config.ts`. It is never part of `test:e2e:prod`.

- **Credentials**: `E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD` in the environment, or in the untracked `e2e/.env.production.local` (git-ignored; only those two keys are parsed, never logged or attached). With none configured every step reports BLOCKED and the test fails loudly. There is no admin equivalent until the owner supplies an authorized admin test account.
- **Guard**: still read-only. `diag.permitOne(label, path)` arms ONE single-use POST that must be a Server Action (`next-action` header) to the exact path on the project's own fixed origin. It is used for sign-in (`/login`) and sign-out only; anything else (a second POST, another path, another origin, the Cloudflare beacon) stays blocked and is listed in the report. `tests/tooling/auth-guard.spec.ts` covers the decision logic and, against a local **stub**, the end-to-end mechanics.
- **Scope**: view and navigate only. It never opens a content item, starts or submits a quiz/assessment/practice problem, edits the profile, switches cohort or marks notifications read; those can persist progress, XP or streaks and need explicit approval.
- **Artifacts**: traces are off (they record cookies). Page text is omitted from the diagnostics. Failure screenshots may show the test student's name: inspect them, keep them local. `reports/production-auth/*.md` holds the PASS / FAIL / BLOCKED / NOT IMPLEMENTED step table.
- `pnpm test:e2e:prod` now also smoke-tests the signed-out **admin** portal (`https://admin.rms-careers.com`, from `apps/admin/wrangler.jsonc`).
