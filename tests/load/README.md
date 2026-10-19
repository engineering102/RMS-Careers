# Load tests (k6)

HTTP load tests for the web, student and admin apps. Design, route inventory, thresholds and the capacity
assessment live in [docs/audits/load-testing-2026-10.md](../../docs/audits/load-testing-2026-10.md). Fill in
[REPORT-TEMPLATE.md](./REPORT-TEMPLATE.md) after a run.

## Safety first

- **Never production.** `lib/config.js` refuses any `*.rms-careers.com` target before k6 sends a request. The only
  exception is the public-web smoke (GET-only, signed out, `smoke` profile, ≤ 5 VUs) with
  `LOAD_ALLOW_PRODUCTION=read-only-public-smoke`, and only with the owner's approval. No other scenario can reach production.
  The production Workers' `workers.dev` hostnames (`rms-web`, `rms-student`, `rms-admin`, `rms-tutor` and their
  version previews) count as production too: name a staging Worker differently (e.g. `rms-student-staging`).
- **No shape overrides.** k6 CLI flags such as `--vus` / `--duration` replace a script's scenarios; every scenario's
  `setup()` aborts such a run (exit 108) before the first iteration. Use `LOAD_PROFILE` / `LOAD_VUS` / `LOAD_RAMP` / `LOAD_HOLD`.
- **Target = a non-production deployment on the NonProd `test` database branch** (or a local build pointed at it).
  The k6 scripts cannot see which database a deployment uses: verifying that is your job (see
  `docs/development/testing.md` §2). There is **no staging Cloudflare deployment today**; see the audit doc §2.
- **Synthetic accounts only**, on the reserved `loadtest.rms-careers.test` domain, created and removed by a guarded
  seeder that accepts `--target=test|development` and never production.
- **Writes** (practice quiz, formal assessment) need `LOAD_ALLOW_WRITES=1` as well.
- **No secrets in output.** Passwords come from the environment; session cookies stay in VU memory. Never run k6 with
  `--http-debug=full` (it prints cookies and bodies). `results/` holds metrics only.

## One-time setup

1. Install k6 (>= 0.52): Windows `winget install k6 --source winget`, macOS `brew install k6`, Debian/Ubuntu via
   Grafana's signed apt repo (see `.github/workflows/load-test.yml`), or set `K6_BIN`.
2. Demo dataset on the test DB (batches, content, quizzes): `pnpm student:seed:test`.
3. Synthetic students (count ≥ the peak VUs you will run):
   ```bash
   LOAD_TEST_STUDENT_PASSWORD=<long random value> pnpm --filter @rms/student load:seed:test -- --count=1000
   ```
   Writes `tests/load/fixtures/students.local.json` (git-ignored; emails and ids only). Re-running is idempotent and
   resets the password. Remove everything with `pnpm --filter @rms/student load:cleanup:test` (cascades).
4. `cp tests/load/.env.example tests/load/.env.load.local` and fill in the targets and the same password.
5. For `admin-read`: an admin that exists only in the test DB (`pnpm admin:seed:test`), in `LOAD_ADMIN_USERNAME/PASSWORD`.
6. For write scenarios: Server Action ids from the exact build the target runs:
   ```bash
   node tests/load/scripts/extract-action-ids.mjs apps/student/.open-next --out=tests/load/fixtures/action-ids.local.json
   ```

## Running

All commands from the repository root. `run.mjs` validates the target first, records generator CPU/memory, and
writes `results/<run id>.summary.{md,json}` and `<run id>.generator.json`.

```bash
# Validate configuration and print the plan; sends nothing
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --profile=baseline --dry-run

# Smoke (3 VUs, ~45 s), then baseline (50 VUs, ~4.5 min)
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --profile=smoke
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --profile=baseline

# Staged climb smoke -> baseline -> intermediate -> peak; stops at the first failing stage or saturated generator
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --staged --to=peak

# Target (1,000 VUs) only after peak passed; explicit, never automatic
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --staged --from=target --to=target

# Soak (300 VUs, 45 min hold) and spike (50 -> 1,000 in 1 min)
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --profile=soak
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --profile=spike

# Bursts: every VU acts once inside LOAD_BURST_WINDOW_S (default 180 s)
node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=auth-burst --profile=baseline
LOAD_ALLOW_WRITES=1 node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=formal-assessment --profile=baseline
```

Plain k6 also works (pass absolute paths): `k6 run -e LOAD_PROFILE=smoke -e LOAD_FIXTURE=$PWD/tests/load/fixtures/students.local.json tests/load/scenarios/student-browse.js`.

Exit codes: `0` passed, `99` thresholds failed, `108` aborted (e.g. refused shape override), `3` generator saturated, `2` refused/bad usage.

## Scenarios

| Script | What it models | Writes | Shape |
|---|---|---|---|
| `public-web` | Anonymous visitor: home, programs, a program, curriculum, learn, DSA sheets | no | ramping VUs |
| `auth-burst` | Lab start: each student signs in once within the window, then opens the overview | session only | once per VU |
| `student-browse` | Signed-in student moving between overview, batch workspace, lectures, My Library, leaderboard, assessments, notifications | no | ramping VUs |
| `authz-boundaries` | Anonymous redirect, foreign-college batch and content hidden, under load | no | ramping VUs |
| `practice-quiz` | Open a practice check, answer, submit, retake (real Server Action) | yes | ramping VUs |
| `formal-assessment` | Deadline: start + submit one formal attempt per student | yes (one attempt each) | once per VU |
| `admin-read` | Up to 3 admins reading dashboards, batches, analytics, enrollments, content | no | ramping VUs (cap 3) |

## Reading the numbers

- **VUs are not people.** A VU waits 5–20 s between pages (configurable), so 1,000 VUs ≈ 80 page views/s. Compare
  runs by request rate (in the summary), not by VU count.
- **HTTP only.** k6 measures server response time from the generator. It is not browser navigation time (no JS,
  hydration, or static assets) and not Worker CPU or Neon query time: take those from Cloudflare and Neon dashboards
  for the same time window (audit doc §5).
- **One source IP.** All VUs share the generator's IP, like a campus NAT. Per-IP sign-in limits (60/min) therefore
  apply; `rms_rate_limited > 0` in `auth-burst` is a measured finding, not a script bug.
- **Generator saturation** (`results/*.generator.json`, warning in the log) makes latency numbers invalid. A laptop or
  a 2-vCPU CI runner saturates somewhere in the low hundreds of VUs; use a larger machine or k6 distributed runs.
- Thresholds in `lib/thresholds.js` are **provisional engineering targets**, not requirements.

## Layout

```
tests/load/
  run.mjs                    runner: validate -> k6 -> generator stats; staged climb with stop-on-failure
  lib/config.js              target safety rules (pure, unit-tested)
  lib/profiles.js            smoke/baseline/intermediate/peak/target/soak/spike (pure)
  lib/thresholds.js          provisional thresholds (pure)
  lib/html.js                "right page" checks, Server Action result parsing (pure)
  lib/summary-format.js      Markdown summary (pure)
  lib/{options,session,fixtures,metrics,summary}.js   k6 runtime helpers
  scenarios/*.js             one file per scenario
  scripts/extract-action-ids.mjs   Server Action ids from a build
  fixtures/, results/        git-ignored
```

Unit tests for the pure modules: `node --test scripts/ci/__tests__/load-test-lib.test.mjs` (also part of
`pnpm test:ci-scripts`). CI: `.github/workflows/load-test.yml`, manual dispatch only.
