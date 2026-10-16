# Load testing: architecture audit, test design, first measurements, capacity assessment — 2026-10-16

Branch `feat/student-apple-phase1` (HEAD `f5a297f` + this work). Builds on `scale-and-security-audit-2026-10.md`
(static capacity model, S-1..S-7), which this document starts replacing with measurements.

**Bottom line.** The k6 suite (`tests/load/`) is implemented, and every student and public scenario has run green
functionally at smoke scale against a local production build on the NonProd test database. **No 1,000-user
test has been run**, because there is no non-production Cloudflare deployment to run it against (§2). The
highest verified load is 80 concurrent sign-ins on a single local Node process, so **production capacity for
1,000 students is not established**. What the runs do establish, with numbers: every student page makes **10–32
DB round-trips**, mostly sequential, at **~94 ms each** to the test database's region. Each sign-in costs **~435 ms
of CPU** for bcrypt. Those two facts drive the latency and the next tests (§7).

---

## 1. Architecture as verified (Phase A)

| Area | What the repository actually does | Load-relevant consequence |
|---|---|---|
| Hosting | 3 Workers via OpenNext (`rms-web`, `rms-student`, `rms-admin`), custom domains in each `wrangler.jsonc`; `observability.enabled`; no `placement` (Smart Placement off); admin sets `limits.cpu_ms: 300000`, student/web use the plan default | Workers run at the PoP nearest the user, and the DB sits in one region. Every query pays the PoP→DB round-trip |
| DB driver | `@rms/db` = `drizzle-orm/neon-http` (one HTTPS request per query, no connection held); `@rms/db/tx` = one WebSocket `Client` per interactive transaction (formal-assessment start/submit, XP ledger) | Reads don't hold connections. Bursts of transactions open one Neon connection each (S-2) |
| Test DB | NonProd project, `test` branch, **`ap-southeast-1`, pooled (`-pooler`) host** (measured, §4) | Production's region and compute size are **unknown to this audit** (no Neon access) |
| Auth | Auth.js v5 beta.25, JWT sessions (no session table). Credentials → `/api/auth/callback/credentials` (the login form's Server Action calls the same `signIn`). bcryptjs cost 12. Per-account 5/min + per-IP 60/min (`cf-connecting-ip` only), via Workers Rate Limiting bindings with an in-memory fallback | Sign-in is CPU-bound. The per-IP limit applies to a whole campus behind one NAT (S-1) |
| Session check per page | Middleware verifies the JWT (no DB). Then `requireStudentEntitlement()` does 5 sequential queries (user + revocation, roles, profile, enrollments) in the **layout and again in every page** | Duplicate DB work per page (S-4: fixed here, §6) |
| Student writes | Server Actions only (`lib/actions/*`), e.g. `submitPracticeQuizAttempt`, `start/submitFormalAssessment`, `markLectureWatched`. No REST API | Write tests must call Server Actions with **per-build action ids** (`tests/load/scripts/extract-action-ids.mjs`) |
| Rendering | All dashboard pages are dynamic. `loading.tsx` on most routes, so the shell streams first and `notFound()`/`redirect()` arrive **inside the stream with HTTP 200** | Status codes alone can't validate responses. The suite checks content (§3) |
| Public site | `apps/web` home, `/programs`, `/programs/[code]` are `force-dynamic` (S-6 still open) | Every anonymous hit is rendered, and the program pages query the DB |
| CI | `ci.yml` is path-aware, never deploys, and its only DB secrets are `TEST_DATABASE_*`. `repo-hardening.test.mjs` forbids `environment:` and Cloudflare credentials outside deploy/rollback and requires SHA-pinned actions | The load workflow follows the same rules (§8) |
| Existing tests | Vitest unit (674 student tests) / integration tiers, guarded seeds, Playwright (local public, production read-only, production-auth read-only) | Reused: the seed guard (`prepareSeedTarget`), the Playwright diagnostics/guard model |

## 2. Environment and safety constraints

- **No staging deployment exists** (`docs/plans/phase-4-production-deployment-spec.md`: "Non-production Cloudflare
  infrastructure: none known"). Creating one is an owner decision (§9).
- **Neon and Cloudflare telemetry were not accessible** from this session. No Worker CPU, Worker duration, or Neon
  compute/connection numbers are reported. Everything below is client-side (k6) or process-side (local Node).
- The only safe targets used: a local `next build` + `next start` of `apps/student` and `apps/web`, with
  `POSTGRES_URL` set in-process to the endpoint-pinned `TEST_DATABASE_URL` (the same URL the guarded seeder
  validated), and email disabled (`RESEND_API_KEY` blank).
- Production was never contacted by any load script. `tests/load/lib/config.js` refuses `*.rms-careers.com`
  (unit-tested), except a ≤ 5-VU, GET-only public smoke behind an explicit acknowledgement string, which was **not used**.
- Hardened after review: the production Workers' `workers.dev` hostnames (and version previews) are refused like the
  custom domains, and every scenario's `setup()` re-checks the shape k6 actually runs, so CLI flags (`--vus`,
  `--duration`, …) cannot bypass the profile or the production VU cap (verified: exit 108 before any iteration).
  Seeder cleanup now validates every matched email before deleting, and deletes by id.

## 3. Test design (Phase B)

**Scenarios** (`tests/load/scenarios/`). Routes are the real ones from `apps/*/app`. Request contracts are the
real Auth.js and Server Action protocols.

| # | Scenario | Journey | Correctness checks | Writes |
|---|---|---|---|---|
| 1 | `public-web` | `/`, `/programs`, a program, `/curriculum`, `/learn`, `/learn/dsa`, a sheet | 200, HTML, no error boundary | no |
| 2 | `auth-burst` | csrf → credentials callback → `/overview`, once per student inside a window | session cookie issued, not rate-limited, overview shows **this** student | session |
| 3–6, 9 | `student-browse` | overview 25%, batch workspace 20%, lecture/resource 25%, My Library 10%, leaderboard 10%, assessments 7%, notifications 3% | own name in the visible shell; no error / not-found / login / streamed redirect. A different synthetic name **aborts the test** (crossed sessions) | no |
| — | `authz-boundaries` | anonymous `/overview`; other college's batch; random content in that batch | redirect to `/login`; streamed 404 (`NEXT_HTTP_ERROR_FALLBACK;404`); must hold **100%** | no |
| 7 | `practice-quiz` | runner → answer 30–90 s → `submitPracticeQuizAttempt` → retake | structured `{ success: true }`; the same action **without a session is refused** | yes |
| 8 | `formal-assessment` | runner → `startFormalAssessmentAttempt` → `submitFormalAssessment`, once per student, deadline window | both actions `{ success: true }`; product error codes reported | yes (1 attempt) |
| 10 | `admin-read` | dashboard, programs, colleges, batches, batch, analytics, enrollments, content (≤ 3 VUs, staggered sign-ins) | not login page, no error; anonymous redirected | no |

Not automated: admin writes (bulk import sends email and runs as one long request, S-3; needs Resend test mode
first), project submission and profile edits (low volume), DSA progress, cohort switching, notification reads.
They are all Server Actions and can be added with the same `Session.action()` helper.

**Isolation.** Each VU owns one synthetic account for the whole run (`assertEnoughAccounts` refuses to start
otherwise), so no two VUs share a session, a per-account rate-limit bucket, or a quiz attempt. Sessions are
established once per VU and reused, re-established only if the app redirects to `/login` (`rms_session_lost`).

**Metrics.** `kind` ∈ {public, auth, page, action, authz} and `name` = a route template (`/content/:id`), so
cardinality is bounded. Custom: `rms_login_duration/_success`, `rms_rate_limited`, `rms_page_correct`,
`rms_action_duration/_success`, `rms_authz_enforced`, `rms_session_lost`. The runner also samples the generator's
CPU and memory, and flags a run as untrustworthy at ≥ 80% CPU for 15 s.

**Profiles** (`lib/profiles.js`): smoke 3 VUs / 30 s, baseline 50 / 3 m, intermediate 250 / 5 m, peak 500 / 10 m,
target 1,000 / 10 m (10 m ramp), soak 300 / 45 m, spike 50 → 1,000 in 1 m. `run.mjs --staged` climbs
smoke → … → `--to` and **stops at the first failed or saturated stage**. The default `--to` is baseline, so 1,000
VUs must always be requested explicitly.

**Interpreting VUs.** Think time is 5–20 s (mean 12.5 s), so N VUs ≈ N/12.5 page views/s. 1,000 VUs ≈ 80 pages/s
≈ 1,000–2,500 DB queries/s at the round-trip counts in §4. Compare runs by request rate, not VU count.

**Provisional thresholds** (`lib/thresholds.js`). These are engineering starting points, **not requirements and not
results**: HTTP failures < 1% (abort at 10%), checks > 99%, public p95 < 800 ms, authenticated page p95 < 1.5 s /
p99 < 3 s, sign-in p95 < 2 s, actions p95 < 2 s (formal < 3 s), authz enforced = 100%.

## 4. Measurements (Phase D) — local build, NonProd test DB

Environment: Windows 11, 22 cores. Single `next start` process per app (Node 22, Next 15.5.27). Test DB Neon
`ap-southeast-1` via the pooler, from India. Generator peak CPU ≤ 30% in every run (valid). **None of this is
Workers or production.**

**Database round-trip** (15 sequential `select 1` over neon-http): first 391 ms (cold TLS), then **p50 116 ms,
p90 124 ms, min 74 ms**. Inside the app, all 500 DB fetches across the per-page probe: p50 94 ms, p90 146 ms.

**DB round-trips per page.** One signed-in student, each page 3×, counted by a preload that records only the
timing of each `*.neon.tech` fetch:

| Page | Round-trips before | after S-4 fix | DB critical path (ms, med) | Page total (ms, med) | HTML |
|---|---|---|---|---|---|
| `/overview` | 32 | 28 | 1,036 → 1,134 | 1,154 → 1,375 | 120 KB |
| `/batches/:id` | 21 | 17 | 1,167 → 1,202 | 1,283 → 1,386 | 153 KB |
| `/content/:id` (lecture) | 17 | 13 | 947 → 989 | 1,051 → 1,069 | 47 KB |
| `/library` | 14 | 10 | 721 → 821 | 843 → 919 | 142 KB |
| `/leaderboards` | 14 | 10 | 708 → 842 | 818 → 941 | 131 KB |
| `/assessments` | 24 | 20 | 1,008 → 952 | 1,098 → 1,097 | 116 KB |
| `/notifications` | 14 | 10 | 690 → 817 | 744 → 903 | 36 KB |
| `/assessments/:id` (practice runner) | 29 | 21 | 1,229 → 1,228 | 1,304 → 1,283 | 58 KB |
| sign-in | 5 | 5 | 866 → 989 | 1,993 → 2,001 | — |

All correct for the student in both runs. Total DB fetches: 500 → 392 (−22%). The latency changes are within
run-to-run noise (one run each; the DB round-trip itself varies 74–146 ms).

**k6 runs** (summaries in `tests/load/results/`, git-ignored):

| Run | VUs | Result | Key numbers |
|---|---|---|---|
| `student-browse` smoke | 3 | functional PASS (100% correct pages, 0 lost sessions, sign-in 100%); latency target **FAIL** | page p50 1.12 s, p95 1.87 s, TTFB p95 1.47 s |
| `authz-boundaries` smoke | 3 | **PASS**: authz 81/81 enforced | anonymous redirect p95 23 ms; foreign batch/content p95 0.8–0.9 s |
| `practice-quiz` smoke (writes) | 3 | functional PASS (4/4 submissions graded, 3/3 anonymous calls refused); action p95 target **FAIL** | submit p50 3.3 s, p95 3.6 s; runner page p95 2.4 s |
| `formal-assessment` smoke (writes) | 3 | **PASS**: 3/3 started and submitted once | start p95 2.9 s, submit p95 2.7 s |
| `auth-burst`, 80 students, one IP, 30 s window | 80 | functional PASS (80/80 signed in and saw their own overview, 0 rate-limited); sign-in latency **FAIL** | sign-in p50 13 s, **p95 42.7 s**; credentials callback p50 33.9 s |
| `public-web` smoke | 3 | **PASS** | `/programs` p95 460 ms, `/` p95 158 ms; `/programs/:code` not exercised (test DB has no active public program) |
| `admin-read` | — | **not executed** (no test-DB admin credentials configured; admin local-cookie caveat in `local-workerd-testing-recipe`) | — |

**bcrypt cost** (bcryptjs, cost 12, `compareSync`, 8 runs, this machine): median **435 ms CPU**, min 422, max 607.

## 5. Findings (ranked)

| # | Sev. | Finding | Evidence | Status |
|---|---|---|---|---|
| F-1 | High | **Page latency is dominated by sequential DB round-trips.** 10–32 queries per page, DB critical path ≈ 75–95% of page time. With ~100 ms per round-trip, the chains are 7–12 deep. This is a latency floor that load can only raise | §4 per-page table | **Measured** (local Node, test region). How much the production PoP→DB distance changes it is a **hypothesis** until measured on a Worker |
| F-2 | High | **Sign-in is CPU-bound and serialises.** 435 ms CPU per bcrypt verify. 80 simultaneous sign-ins on one process queued to p95 42.7 s (80 × 0.435 s ≈ 35 s) | §4 auth-burst + bcrypt timing | **Measured** for one Node process. On Workers, requests spread over isolates, but CPU per sign-in stays and is billed. The queueing behaviour at 1,000 sign-ins / 3 min **must be measured on a Worker** |
| F-3 | Medium | **Duplicate entitlement resolution** (S-4): layout + page each ran the 5-query guard (practice runner: 3×) | round-trips −4 to −8 per page after the fix | **Measured and fixed** (§6). It reduces DB load by ~22%. It did **not** reduce single-user latency, because layout and page render concurrently |
| F-4 | Medium | **Server Action writes are slow**: practice submit p95 3.6 s, formal start 2.9 s, at 3 VUs. Each re-renders revalidated paths after the write | §4 | **Measured**. Breakdown (grading vs XP transaction vs revalidation) not yet profiled: **hypothesis** |
| F-5 | Medium | **Per-IP sign-in limit cannot be exercised off Cloudflare.** Without `cf-connecting-ip` the per-IP key is null and skipped (`trustedClientIp`), so 80 sign-ins from one IP were not limited locally. On Workers the limit is 60/min per IP. A 1,000-student campus behind one NAT needs ≥ 17 min to sign in (S-1) | code + local run | S-1 remains a **hypothesis until measured behind Cloudflare** |
| F-6 | Low | Large HTML documents: 116–153 KB for overview, batch, library and leaderboard, a large share inline Flight data (every page also embeds the not-found boundary) | §4 | **Measured**. Bandwidth only; not a server bottleneck at this size |
| F-7 | Low | Streamed `notFound()` and `redirect()` return HTTP 200 (because of `loading.tsx`) | authz diagnostics | **Measured**. Correct product behaviour. Monitoring must not rely on 404 counts |
| F-8 | Info | 3 pre-existing unit-test failures in `apps/student/lib/__tests__/assessments.test.ts`: date-dependent fixtures ("expected 'closed' to be 'available'"). They fail identically without this change | `vitest run` | **Measured**, unrelated to load testing, not fixed here |

Still open from the static audit and not re-measured: S-2 (pooled URL / compute in **production**), S-3 (bulk
import in one request), S-5 (waterfalls: now quantified by F-1), S-6 (`force-dynamic` web pages), S-7 (leaderboard aggregation).

## 6. Change made (Phase F) and its validation

`apps/student/lib/db/queries/entitlements.ts`: `requireStudentEntitlement` is wrapped in React `cache()`.

- **Why it is safe:** no arguments, so identity comes only from the current request's session. React `cache()`
  memoizes within one server request, so results cannot be shared across users, batches or institutions. A
  `redirect()` thrown inside is re-thrown on the second call (same outcome). In Server Actions, outside a React
  render, `cache()` does not memoize, so action authorization is unchanged. Session revocation (`users.updated_at`)
  is still checked once per request.
- **Validated:** student typecheck clean; student unit tests 674 pass / 3 pre-existing failures (F-8; fixed separately on branch `claude/trusting-thompson-17b44b`); all smokes
  in §4 (run after the fix) show 100% correct pages and 100% authz enforcement; before/after round-trip counts in §4.
- **Not done** (needs a design decision, F-1): collapsing the query chains (`db.batch()` / `Promise.all` for
  independent queries, one joined entitlement query), Smart Placement or region co-location, caching. No cache that
  could cross users was introduced.

## 7. Capacity assessment

- **Highest verified passing load:** functional correctness holds at 80 concurrent sign-ins and at 3-VU steady
  browsing / writes on a **single local Node process**. No stage above smoke has been run for browsing. No run was on
  Workers.
- **1,000 students: not verified.** No claim either way is supported yet. From the measured inputs alone: 1,000
  VUs ≈ 80 pages/s ≈ ~1,500–2,000 DB queries/s after the S-4 fix (pages average ~16 round-trips). That is Neon load
  to size and observe (S-2), not something the Workers themselves are expected to limit.
- **Next bottleneck to investigate:** (1) sign-in at lab start on a real Worker: CPU per sign-in, queueing, and the
  per-IP limit (F-2, F-5), then (2) Neon CPU and connections at 250 → 500 VUs of `student-browse` with production
  compute settings (F-1, S-2).

## 8. CI integration

- `.github/workflows/load-test.yml`: **manual dispatch only**. Preflight (helper unit tests + target dry run) →
  seed synthetic accounts on the NonProd test DB → one scenario/profile → job summary + results artifact (30 days).
  Concurrency group `load-test` (one at a time, never cancelled mid-run). No `environment:`, no Cloudflare
  credentials, never sets `LOAD_ALLOW_PRODUCTION`, so it cannot target production. Passes `repo-hardening.test.mjs`.
  Requires repository secrets `LOAD_STUDENT_BASE_URL` / `LOAD_WEB_BASE_URL` / `LOAD_ADMIN_BASE_URL` (a
  non-production deployment), `LOAD_TEST_STUDENT_PASSWORD`, optional `LOAD_ADMIN_*` and `LOAD_ACTION_IDS_JSON`.
  **Never run on GitHub yet.**
- **No PR-time load smoke was added.** Ordinary CI has no non-production target to hit, and starting the app in CI
  against the shared test DB on every PR would make CI depend on that database's latency. Revisit once a
  staging Worker exists.
- `scripts/ci/affected.mjs`: `tests/load/**` classified as non-build (no app rebuild/deploy). Pure helpers are
  tested by `scripts/ci/__tests__/load-test-lib.test.mjs` (19 tests, part of `pnpm test:ci-scripts`).

## 9. Browser (Playwright) verification plan

k6 proves HTTP behaviour only. Browser checks are a separate, smaller layer, built on the existing `e2e/` harness
(diagnostics fixture, request guard, redaction):

1. **Authenticated local suite** (the README's "later" item 2): start the student app against the pinned test DB,
   sign in as one synthetic account, visit overview → batch → lecture → library → leaderboard → assessments.
   Record Navigation Timing (TTFB, DOMContentLoaded, LCP) per page, and fail on hydration errors (React #418 is a
   known open item), page errors, or 5xx.
2. **Under load:** run that journey while `student-browse` runs at baseline/intermediate, to compare browser
   navigation time with k6 server time (the gap is JS, hydration and static assets, which k6 does not fetch).
3. **Practice quiz in the browser** (test DB only): answer and submit through the UI once, to confirm the Server
   Action contract k6 uses matches what the client sends.
4. Traces off (they contain cookies), as in the existing production-auth suite.

Not implemented in this change.

## 10. Status

| Category | Items |
|---|---|
| **Implemented and tested** | k6 suite (7 scenarios, profiles, thresholds, runner with stage gating and generator monitoring); guarded synthetic-account seeder/cleanup (6 unit tests, cleanup validates before deleting); action-id extractor; 21 helper unit tests (incl. workers.dev and CLI-override guards); 2 entitlement regression tests (no memoization across calls/users outside a render; mutation-tested against a process-wide memo); CI path rule + test; manual workflow (static tests only); S-4 fix. **Executed:** student-browse, authz-boundaries, practice-quiz, formal-assessment, auth-burst (80), public-web, all against local builds on the NonProd test DB |
| **Implemented, not executed** | `admin-read`; profiles above smoke for browsing (baseline … target, soak, spike); `load-test.yml` on GitHub Actions; any run against Workers |
| **Blocked** | No non-production Cloudflare deployment. No Neon/Cloudflare telemetry access. No test-DB admin credentials for `admin-read`. No active public program in the test DB (`/programs/:code`) |
| **Hypotheses needing evidence** | F-2 queueing on Workers; F-5 / S-1 per-IP limit at campus scale; F-1 magnitude from production PoPs; F-4 breakdown; Neon saturation point |
| **Needs explicit approval** | A staging Worker set (separate account or `*-staging` Workers) with its own Neon branch at production compute; repository secrets for `load-test.yml`; any change to the sign-in cost (bcrypt work factor or algorithm: auth area, CLAUDE.md §5.1); per-IP limit / Turnstile changes (S-1); Smart Placement (`wrangler.jsonc`, CODEOWNERS path); Neon production settings (S-2) |

Report template for future runs: `tests/load/REPORT-TEMPLATE.md`. How to run: `tests/load/README.md`.
