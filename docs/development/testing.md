# Testing Strategy & Execution

This document details the automated test suites, frameworks, and execution commands across the monorepo.

---

## 1. Testing Framework

- **Test Runner**: Vitest v2.0.0
- **Environment**: Node.js / edge-compatible simulated environments
- **Assertion Library**: Chai/Jest-compatible Vitest matchers

---

## 2. Database Environments (read this first)

Three databases, three separate credentials. They must never be mixed.

| Environment | Neon project / branch / database | Where its URL lives | Used by |
|---|---|---|---|
| **Development** | a separate dev database named `rms_dev*` | `apps/<app>/.env.local` → `POSTGRES_URL` | `pnpm dev:*`, `pnpm *:seed` (`--target=development`) |
| **Test** | `RMS-Careers-NonProd` / `test` / `neondb` | `TEST_DATABASE_URL` + `TEST_DATABASE_ENDPOINT` (shell / CI secrets / untracked `<repo>/.env.test.local`) | `pnpm test:int`, `*:seed:test`, `pnpm test:db:bootstrap` |
| **Production** | `RMS-Careers` / `production` / `neondb` | Cloudflare secrets / wrangler only | the deployed apps, deliberate `db:migrate` |

Production and test databases are **both named `neondb`**, so the database name is never trusted.

Tests **never** read `.env.local` and never fall back to `POSTGRES_URL`.

### How production is kept out of tests (fail-closed guard)

Implemented in `packages/db/src/guard.ts` and `guard-env.ts`:

- A database is identified by its **Neon endpoint id** (the `ep-xxxx` part of the host; every Neon branch has its own). A URL is a test target only if its endpoint equals the pinned `TEST_DATABASE_ENDPOINT` on a `*.neon.tech` host, is not listed in `RMS_PRODUCTION_DB_HOSTS`, and shares no endpoint with any `POSTGRES_URL`/`DATABASE_URL` found in the shell or in local env files (`.env.local`, `.dev.vars`, …; parsed, never loaded). A missing or malformed URL, a missing pin, an external host, or an unpinned Neon endpoint is rejected. `NODE_ENV` is not used. Development seeds accept only a database named `rms_dev*`.
- **Unit tier** (`pnpm test`): `setup-unit.ts` deletes every database URL from the process. Both db clients (`packages/db/src/index.ts`, `tx.ts`) additionally refuse, while Vitest runs, any host that is not local/reserved or exactly the validated `TEST_DATABASE_URL`. So even a `POSTGRES_URL` exported in your shell cannot be reached from a test.
- **Integration tier** (`pnpm test:int`): `setup-int.ts` validates `TEST_DATABASE_URL`, then, after a connection, checks that Neon's own `neon.endpoint_id` equals the pin and that the sentinel table `_rms_test_sentinel` exists, and only then points `POSTGRES_URL` at it, in-process. Anything else aborts the run.
- **Seeds** require an explicit `--target=test|development` (or `RMS_DB_TARGET`); there is no default and **no production target**. The resolved database must classify as that target.
- Repo safeguard: `packages/db/src/__tests__/test-config-scan.test.ts` fails if any vitest config or test file loads env files (`loadEnvFile`, `dotenv`, `.env.local`).

Errors never print connection strings or credentials.

### One-time test database setup

1. The test database is the `test` branch of the separate Neon project `RMS-Careers-NonProd` (schema-only, no production data).
2. Put its URL in `TEST_DATABASE_URL` and its endpoint id in `TEST_DATABASE_ENDPOINT` (shell, or `<repo>/.env.test.local`, which is git-ignored).
3. `pnpm test:db:bootstrap`: applies the migrations to the empty database and creates the sentinel (refuses a non-empty database that has no sentinel, or an endpoint that does not match the pin).

---

## 3. Test Execution Commands

```bash
# Unit tier: mocks only, cannot open a database connection
pnpm test

# Integration tier (*.int.test.ts): needs TEST_DATABASE_URL, aborts otherwise
pnpm test:int

# Both
pnpm test:all

# Seeds: the target is always explicit; production is not a target
pnpm admin:seed            # --target=development (rms_dev* only)
pnpm student:seed          # --target=development
pnpm admin:seed:test       # --target=test
pnpm student:seed:test     # --target=test

# Watch / coverage (unit tier)
pnpm --filter @rms/admin test:watch
pnpm --filter @rms/web test:watch
pnpm --filter @rms/admin test:coverage
```

Integration suites are named `*.int.test.ts` (currently `admin`: `batch-management`, `batch-curriculum`, `content-library`, `multi-batch-import`; `student`: `multi-batch-schema`). They create and delete their own uniquely-prefixed rows.

### CI

`.github/workflows/ci.yml` is path-aware. `detect` runs `scripts/ci/affected.mjs` (pnpm workspace graph plus path rules) and only the needed jobs run: `check` (typecheck + unit tests of affected workspaces), `integration` (only when admin/student/db/auth/infra changed), `build` (`cf:build` per app whose bundle changed; never deployed), `workflow-lint` (only when workflow files change), and `ci-gate`, the single required status check (`scripts/ci/gate.mjs`). Docs-only changes run nothing but `detect` and `ci-gate`. Run the CI script tests with `pnpm test:ci-scripts`, and preview a decision with `pnpm ci:affected --base <sha> --head <sha> --pretty`. The only database secrets are `TEST_DATABASE_URL` and the `TEST_DATABASE_ENDPOINT` pin (the NonProd `test` branch, `integration` job only). `POSTGRES_URL`/`DATABASE_URL` are blanked, no production or Cloudflare secret is configured, nothing is deployed, and CI never reads a developer's `.env.local`. **Dependabot policy (deliberate trade-off):** Dependabot PRs cannot read Actions secrets, and the test-database credentials are intentionally NOT copied into Dependabot secrets. On those PRs `integration` is skipped on purpose (typecheck, unit tests, builds and workflow lint still run), `ci-gate` tolerates exactly that skip, and the full integration tier runs on the push to `main` after merge and on all trusted same-repository PRs. Treat a failing post-merge integration run on `main` as a revert signal for the dependency bump. Add both secrets under *Settings → Secrets and variables → Actions*. Make `ci-gate` the required check in branch protection.

### Artifact proof of concept (Phase 3; not a deployment, not yet run on GitHub)

`.github/workflows/artifact-poc.yml` is manually triggered (`workflow_dispatch`) and **does not deploy**. It calls the reusable `artifact-poc-app.yml` once each for `web`, `admin` and `student`, so every app has its own `build` and `verify` jobs and its own job output (no matrix, hence no shared output map). The `build` job runs the guarded `cf:build`, packages `.open-next` plus `wrangler.jsonc`, `package.json` and `open-next.config.ts` with `scripts/ci/artifact.mjs package` (symlinks are archived as symlinks, never dereferenced), uploads one artifact and publishes `digest=<app>:<sha256 of manifest.json>` as its job output. A separate `verify` job on a fresh checkout, with no build, downloads the artifact and requires that hand-off to be present, well formed, labelled for the same app and equal to the manifest, plus the expected commit SHA and run id (any missing or mismatched value is a hard failure). It then extracts into the app directory, bound to the inventory, re-scans the tree, proves every symlink target resolves, runs negative tests (corrupted archive, forged or edited manifest, unlisted file, injected file, missing symlink target) then runs the extracted artifact in local workerd (`wrangler dev --local` on 127.0.0.1 with placeholder variables, no credentials) and smoke-tests it with `scripts/ci/smoke.mjs`, and finally `wrangler deploy --dry-run` with no credentials (the script refuses to run if any `CLOUDFLARE_*`, `CF_*` or `WRANGLER_*` variable is set).

**Evidence so far.** The workflow file has **never run on GitHub Actions**: real artifact upload/download, the per-app job-output hand-off between matrix jobs and the digest check of `download-artifact` are unverified. What has been run is the same `artifact.mjs` flow on real Linux builds of web, admin and student inside an isolated WSL copy of the repository, plus the unit tests (`pnpm test:ci-scripts`, which also statically asserts that the workflow has no secrets, environments, write permissions or deploy commands). The dry run proves the artifact bundles; it does not prove the Worker runs or that Cloudflare accepts it.

---

## 4. Test Suites Inventory

Currently, **22 test files containing 275 passing tests** are active:

### `apps/admin` (15 test files, 218 tests)
- `admin-auth.test.ts`: Password authentication, status checks, role verification.
- `bulk-import-actions.test.ts`: Server action processing, bulk student creation, deduplication.
- `csv-parser.test.ts`: CSV parsing, header validation, malformed row detection.
- `excel-parser.test.ts`: Multi-sheet Excel workbook parsing and buffer safety.
- `email.test.ts`: Resend payload construction, mock dispatch, missing key resilience.
- `enrollment-lifecycle.test.ts`: State machine transitions (`pending` → `confirmed` → `active`).
- `student-institution.test.ts`: Student-college linkages and roll number uniqueness.
- `tokens-service.test.ts`: SHA-256 token hashing and single-use expiration.
- `batches.test.ts`, `colleges.test.ts`, `programs.test.ts`: Drizzle queries and mutations.

### `packages/auth` (3 test files, 39 tests)
- `passwords.test.ts`: Bcrypt hashing, verification, password complexity constraints.
- `tokens.test.ts`: Cryptographic random byte generation, SHA-256 digest determinism.
- `rbac.test.ts`: Role normalization, `hasRole`, `hasAdminPrivileges`, `assertRole`.

### `apps/web` (4 test files, 18 tests)
- `seo-and-sitemap.test.ts`: Canonical domain validation (`www.rms-careers.com`), sitemap generation, robots.txt directives.
- `anonymous-progress.test.ts`: Local storage problem completion, corruption tolerance, state isolation.
- `curriculum-and-dsa.test.ts`: DSA sheet metadata integrity, pattern indexing.
- `public-queries.test.ts`: Fallback behavior when `POSTGRES_URL` is omitted.
