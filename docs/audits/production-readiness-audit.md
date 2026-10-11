# RMS Careers — Production Readiness Audit & Implementation Plan

**Date:** 2026-10-11 · **Repository:** `ci/phase-4-deploy-building-blocks` @ `917694b` + **139 uncommitted paths** (85 modified, 54 untracked; +1,507/−1,128 lines in tracked files) · **Auditor:** Claude Code (autonomous audit session)

**Relationship to earlier documents.** This report supersedes nothing; it builds on and re-verifies:
`docs/audits/v1-production-verification.md` (2026-10-08, static + unauthenticated) and `docs/plans/v1-production-hardening-and-remediation.md` (plan). The working tree contains a large, uncommitted remediation that references an "audit F-xx" numbering that is **not saved anywhere in the repository** (it appears to come from an earlier session). Defect IDs from the 10-08 audit (`D-xx`, `A-x`, `X-x`) are reused below where the same defect is meant; new findings use `PR-xx`.

**What was changed by this audit:** this file only. Additionally (all reversible, none in Git): (1) the local pnpm store was repaired with `pnpm install --frozen-lockfile` (lockfile byte-identical, verified with `cmp`); (2) disposable fixtures were written to the **NonProd test database** (the pinned NonProd test branch): the repo's demo dataset (`pnpm student:seed:test`) and one disposable super_admin `admin.audit@rms-careers.local`; (3) isolated build copies under the session scratchpad and WSL `~/rms-audit-20261011` (their `.dev.vars` files were deleted after use). Nothing was committed, pushed, deployed, migrated, or written to any production or old-production database. No production login was attempted.

### Evidence labels
| Label | Meaning |
|---|---|
| **[live]** | Observed against the public production hosts (GET/HEAD only, low volume, no credentials) |
| **[workerd]** | Reproduced in the real OpenNext/Cloudflare `workerd` runtime locally (WSL), against the NonProd **test** DB, with seeded disposable accounts |
| **[test]** | Automated test result (command given in §D) |
| **[code]** | Read from source; not executed |
| **[inferred]** | Conclusion from indirect evidence; confidence stated |
| **BLOCKED** | Could not be verified; the missing credential/permission is named |

---

## A. Executive summary

**Overall readiness: NOT READY for real student or institutional data.** The codebase is in substantially better shape than what is deployed, but production is running older code with three confirmed, user-facing failures, and the production database/secret state cannot be verified with the access available.

| Application | Usable today? | Basis |
|---|---|---|
| **Public website** (`www`) | **Yes**, with minor defects | [live] 19 page loads across all routes, desktop + 375 px: no app exceptions, no overflow, no broken images, no secrets in 15 client bundles |
| **Student portal** (`student`) | **No — sign-in is broken for the normal entry points** | [workerd] The committed code (which production matches — §C.3) crashes after every successful sign-in from `/login` or `/` with *"Application error: a client-side exception"*. Sign-out does not end the session. |
| **Admin portal** (`admin`) | **Unknown / BLOCKED** | No authorized admin account; local runtime shows a session-cookie-mode fragility (§E.3). Admin bootstrap for an empty DB is broken (§E.6). |

**Is it safe to begin onboarding real students?** **No.** Minimum bar before any real data: §G Phases 0–3 complete and the §H checklist green.

**Most important blockers (in priority order)**
1. **Plain HTTP is served on every host** (no redirect, no HSTS); admin even issues auth cookies without `Secure` over HTTP → credentials/sessions can travel in cleartext. *[live]* — P0, dashboard fix.
2. **Sign-out does not sign out** (student; admin very likely the same): the Auth.js middleware re-issues the session cookie in the same response that deletes it. *[workerd, confirmed on both committed and working-tree code]* — P0.
3. **Student sign-in crashes in production code** (Server Action redirect to a redirect-only page leaks `Location` into the action response). Fixed in the working tree, **not deployed**. *[workerd]* — P1.
4. **Production runs pre-hardening code**: no security headers, no rate limiting, `/login?callbackUrl=foo` → HTTP 500. The fixes exist only as uncommitted local changes. *[live + chunk-hash comparison]* — P1.
5. **No safe, working path to initialize the empty production DB**: `drizzle-kit migrate` is unguarded and implicitly reads `apps/admin/.env.local` (which points at a non-dev `neondb` in the old region); the migration path used by tests is different from the production one; the admin seed is broken and refuses production by design, so **there is no supported way to create the first production super_admin**. *[code + test]* — P1.
6. **Production DB identity, schema and Worker secrets are unverifiable** (no Cloudflare login, no production DB URL locally). The one prior production sign-in attempt (today, earlier that day, owner-authorized account) failed with the generic credentials message, which the code also shows for DB outages and missing schema. — BLOCKED.

**Highest-risk security / data-integrity concerns:** cleartext HTTP (P0), non-terminating sign-out on shared lab PCs (P0), developer `.env.local` pointing at a production-class database while `pnpm dev`/`db:migrate` have no target guard (P1), per-IP login limit of 10/min that will lock out a college lab behind one NAT on launch day once the working tree is deployed (P1), all DB errors during sign-in reported as "invalid credentials" (P2, blocks incident diagnosis).

---

## B. Application status matrix

Result key: **PASS · FAIL · PARTIAL · BLOCKED · NOT IMPLEMENTED**. "Prod" = deployed code; "WT" = uncommitted working tree.

### B.1 Public website (`apps/web`, `rms-web`)
| Feature / route | Expected | Observed | Result | Evidence | Likely root cause | Conf. |
|---|---|---|---|---|---|---|
| `/`, `/programs`, `/curriculum`, `/learn`, `/learn/dsa`, 3 sheet pages, `/login` | 200, no errors, responsive | 200; 0 app exceptions, 0 page errors, 0 overflow @375 px, 0 broken images, 0 unnamed controls | PASS | [live] crawl (§D.6) | — | High |
| Console errors | none from app | 5/page, **all caused by the audit's own write-blocking guard** (GA `/g/collect`, CF `/cdn-cgi/rum`) | PASS | [live] | — | High |
| Unknown DSA sheet | 404 | 404 + "Page Not Found" | PASS | [live] | — | High |
| Unknown program `/programs/<x>` | 404 | **200** "Program Not Available" (soft-404) | FAIL (P3) | [live] | page renders a card instead of `notFound()` | High |
| `/programs` listing | public programs | "No Public Programs Active Today"; sitemap has 0 program URLs | PARTIAL | [live] | DB empty **or** DB error — `getPublicPrograms()` swallows errors, indistinguishable | Med |
| Apex `rms-careers.com` | 301 → `www` | **200**, `index, follow`, served by the Worker (`x-opennext: 1`) | FAIL (P2) | [live] | apex attached to the Worker in the dashboard; no redirect rule | High |
| HTTP → HTTPS | 301 | **200 over HTTP** | FAIL (**P0**) | [live] | "Always Use HTTPS" off; no HSTS | High |
| Portal links on `/login` | live targets | `tutor.rms-careers.com` → **DNS ENOTFOUND** | FAIL (P3) | [live] | tutor app not built; link not marked "coming soon" | High |
| Secrets in client bundles | none | 0 matches in 15 bundles (postgres URLs, Neon endpoints, `npg_`, `re_`, private keys) | PASS | [live] | — | High |
| Security headers | CSP, HSTS, XFO… | **none** in prod; present in WT | FAIL (prod) / PASS (WT, code) | [live]/[code] | WT not deployed | High |
| Partner enquiry form (new in WT) | rate-limited, validated | unit-tested only | PARTIAL | [test] | needs `RESEND_API_KEY`, `EMAIL_FROM`, `PARTNER_ENQUIRY_TO` | Med |

### B.2 Student portal (`apps/student`, `rms-student`)
| Feature / route | Expected | Observed | Result | Evidence | Root cause | Conf. |
|---|---|---|---|---|---|---|
| Login page renders, required fields | 200, HTML5 `required` | yes | PASS | [live]/[workerd] | — | High |
| Wrong password | generic error, stays on `/login` | "Invalid email, password, or student account status." | PASS | [workerd] | — | High |
| **Sign-in from `/login` (default) or `/`** | land on `/overview` | **Prod code: 303 + leaked `Location: /overview` → client throws "An unexpected response was received from the server" → "Application error"** (session cookie *is* set). WT: lands on `/overview` cleanly | **FAIL (prod)** / PASS (WT) | [workerd] HEAD vs WT, 3 entry points each | redirect target `/dashboard` / `/` is itself a redirect (§E.1) | High |
| Deep link `/leaderboards` → login → back | land on deep link | yes (both) | PASS | [workerd] | — | High |
| `/login?callbackUrl=foo` | 200 | **prod 500**; WT 200 | FAIL (prod) / PASS (WT) | [live]/[workerd] | unguarded `new URL()` (D-07) | High |
| `?error=Configuration` message | accurate | "You do not have access…" for **any** error code — prod **and WT** | FAIL (P2) | [live]/[workerd] | D-08 not fixed | High |
| Session cookie | `__Host-`, HttpOnly, Secure, Lax, host-only | `__Host-student-sess`, all attributes correct, 30 days | PASS | [workerd] | — | High |
| Refresh / new tab | session kept | yes | PASS | [workerd] | — | High |
| **Sign-out** | session ended | **UI goes to `/login` but `/overview` still returns 200**; response deletes then **re-issues** the cookie | **FAIL (P0)** | [workerd] HEAD + WT | §E.2 | High (local); Med-High (prod) |
| Protected routes anonymous | 307 → `/login` | yes | PASS | [live] | — | High |
| Sections: overview, profile, batches, library, DSA, assessments, leaderboards, notifications | render | all render, no 5xx | PASS | [workerd] | — | High |
| Single-batch student `/batches` | auto-opens workspace | yes (documented behaviour) | PASS | [workerd] | — | High |
| Batch workspace + curriculum | renders | renders; **React #418 hydration mismatch** | PARTIAL (P2) | [workerd] | §E.5 | High |
| Foreign batch (other college / same college) by URL | not disclosed | not disclosed; HTTP **200** with not-found UI; server logs it as `ERROR` | PASS (authz) / P3 (status, log noise) | [workerd] | `notFound()` caught and logged by entitlement try/catch | High |
| Cohort cookie tampering | ignored | ignored | PASS | [workerd] | — | High |
| No-batch student / multi-batch student | empty state / switcher | not exercised in browser (seed has no such account); covered by `multi-batch-schema.int.test.ts` | PARTIAL | [test] | fixture gap | Med |
| Lecture "Mark as Watched" XP | +5 once | **+5 exactly once**; button gone after reload; no re-award | PASS | [workerd] | — | High |
| DSA solved XP, practice-quiz first pass XP | award once | not exercised via UI (audit selectors) — unit tests only | BLOCKED (harness) | [test] | — | — |
| Formal assessment timer / single attempt | server-enforced, race-safe | advisory lock + attempt-derived batch in WT; `assessment-concurrency.int.test.ts` **fails to load** | PARTIAL | [code]/[test] | §D.3 | Med |
| Project submission (confirmed students) | allowed | prod: only `active` (D-01); WT: uses `hasBatchAccess` | FAIL (prod) / PASS (WT, unit) | [code]/[test] | — | High |
| Leaderboard | renders, student ranked | renders | PASS | [workerd] | — | Med |
| Notifications list | renders | renders | PASS | [workerd] | — | High |
| Login rate limit | effective, NAT-safe | prod: none. WT: 10/min **per IP and per account** (Workers binding, in-memory fallback) | FAIL (prod) / PARTIAL (WT, P1 NAT risk) | [code] | §F PR-08 | High |
| Activation / forgot / reset / resend | work, email sent | pages render [live]; email not tested (no sandbox) | BLOCKED | — | needs Resend sandbox | — |
| Assignment row inserted during page render | no writes on GET | still present (`queries/projects.ts:157`) | FAIL (P2) | [code] | D-11 | High |

### B.3 Admin portal (`apps/admin`, `rms-admin`)
| Feature | Expected | Observed | Result | Evidence | Root cause | Conf. |
|---|---|---|---|---|---|---|
| Anonymous access | 307 → `/login` | yes | PASS | [live]/[workerd] | — | High |
| Student credentials on admin | rejected | rejected (`CredentialsSignin`) | PASS | [workerd] | — | High |
| Admin sign-in Server Action | lands on `/programs` | lands; **from `/` fails on prod code** (same redirect-target bug); WT fixes it | FAIL (prod) / PASS (WT) | [workerd] | §E.1 | High |
| **Admin session after sign-in** | persists | **lost on next request in local workerd (http and https, both builds)**; route handler accepts token over http, middleware never does | BLOCKED (prod) / FAIL (local) | [workerd] | §E.3 cookie-mode mismatch | Med |
| Programs, batches, colleges, enrollments, import, content, quiz, batch sub-pages | functional | not reachable locally (above); **508 unit + 36 integration tests pass** | BLOCKED (browser) / PASS (tests) | [test] | — | Med |
| Server-side authz (DB-revalidated admin sessions, GitHub super_admin role) | enforced | implemented in WT (`session-validation.ts`, `auth.ts`), unit-tested | PASS (WT, unit) | [test] | A-1/A-2 fixed in WT | Med |
| Enrollment → batch assignment | admin can place | **no action exists** | NOT IMPLEMENTED (D-02) | [code] | — | High |
| Public `/enroll/<code>` | rate-limited, no enumeration | WT: per-IP + per-email limit, indistinguishable outcomes, timing equalisation; **no bot challenge**; unknown code → 200 soft-404 | PARTIAL | [code]/[test] | — | Med |
| Admin bootstrap (`pnpm admin:seed[:test]`) | creates first super_admin | **crashes**: `server-only` throws under `tsx`; works only with `--conditions=react-server` | FAIL (P1) | [test] | §E.6 | High |
| Branding | RMS Careers | "Academy Enrollment" in 13 places incl. public form | FAIL (P3) | [live]/[code] | — | High |

### B.4 Platform / infrastructure
| Item | Result | Evidence |
|---|---|---|
| Worker ↔ domain mapping | PARTIAL: `www`, `student`, `admin` → `rms-web`/`rms-student`/`rms-admin` per `wrangler.jsonc`; **apex also served by a Worker but not declared in repo** | [code]/[live] |
| Deployed version = repo | **FAIL**: student shared chunks byte-identical to `HEAD` build; login/main-app chunks differ; nothing from WT deployed | [workerd]/[live] |
| Production DB identity, schema, migrations | BLOCKED (no Cloudflare login, no prod URL) | — |
| Worker secrets present | BLOCKED | — |
| Email delivery (Resend) | BLOCKED | — |
| Deploy pipeline | NOT IMPLEMENTED (`deploy.yml` absent by design; rollback workflow unrun) | [code] |
| Local build of Workers on Windows | FAIL (platform): `sharp` win32 `.node` bundled; **WSL build passes 4/4** | [test] |

---

## C. Environment and deployment findings

### C.1 Repository baseline
* pnpm monorepo, `packageManager: pnpm@9.15.4`, Node v22.12.0 (Windows) / v22.23.3 (WSL). Apps: `web` (3001), `student` (3002), `admin` (3000); packages `@rms/db`, `@rms/auth`. Next 15.5.27, Auth.js `5.0.0-beta.25`, OpenNext Cloudflare 1.20.8, wrangler 4.147.0.
* Test tiers already exist and are well-guarded: unit (no DB possible), integration (`*.int.test.ts`, pinned NonProd endpoint + sentinel), Playwright (`e2e/`: local public, production read-only, production-auth single-account), CI-script tests. Path-aware CI with a single `ci-gate`.
* **Uncommitted work is the main asset and the main risk.** 139 paths on a CI branch, including security headers, rate limiting, DB-revalidated admin sessions, session revocation, access-lifecycle policy, XP ledger, formal-assessment hardening, CSV-injection escaping, partner-enquiry form, rollback workflow, the Playwright harness. It is green locally (§D) but **not committed, not reviewed, not deployed**, and mixes unrelated concerns on `ci/phase-4-deploy-building-blocks`.

### C.2 Database topology (verified locally, values never printed)
| Location | Host (redacted) | DB | Note |
|---|---|---|---|
| `apps/admin/.env.local`, `apps/student/.env.local` | `<old production-class Neon host; redacted>` | `neondb` | **Not `rms_dev*`** → violates `testing.md` §2. Per the 10-08 audit this held real data (real enrollments) — i.e. it is (or was) production-class. Used implicitly by `pnpm dev:*` and by `drizzle.config.ts`. |
| `.env.test.local` | `<NonProd test branch host; redacted>` | `neondb` | NonProd `test` branch; guard + sentinel accepted it. |
| New production DB | unknown | unknown | Lives only in Cloudflare secrets. **BLOCKED.** |

Latency evidence *[live, inferred, medium confidence]*: from India via Cloudflare `SIN`, DB-backed pages add **~300–700 ms median** over static pages (`/programs` median 926 ms vs `/curriculum` 238 ms; spikes 2.4–2.8 s). One query adding that much is consistent with a database far from Singapore (e.g. the old region) and/or Neon compute cold starts — **not** with an the target region database. This hints the deployed Workers may still point at the the old region database; it must be verified (§I action 2).

### C.3 Deployed version
Method: Next.js chunk filenames are content hashes. Production student `/login` references `webpack-4e3d6219286b67da.js`, `1a09f8d9-d8f16abb5bf1084e.js`, `4878-b16dfc78473046ff.js`, `4028-8c2cdae29dab43fc.js` — **identical to a fresh Linux build of `HEAD`**; the WT build shares none of them. `main-app` and the login page chunk differ from `HEAD` → production is **HEAD-era (pre-hardening) code from an unknown exact commit**, deployed from a developer machine. Consistent with live behaviour (no headers, `callbackUrl=foo` 500, no rate-limit binding).

### C.4 Configuration discrepancies
* Apex served by a Worker but absent from all `wrangler.jsonc` (dashboard-only state; a redeploy will not reproduce it).
* WT adds `ratelimits` bindings (namespace ids 1101/1201/1202/1301) and makes `RESEND_API_KEY`/`EMAIL_FROM` (+`PARTNER_ENQUIRY_TO` for web) **required** secrets → the first WT deploy fails or degrades unless these exist.
* `apps/admin/.env.local` contains `NEXTAUTH_URL` and `AUTH_TRUST_HOST` (legacy names); harmless locally, but note `AUTH_URL` changes Auth.js URL resolution (§E.3).
* CSP in WT does not allow `static.cloudflareinsights.com` → Cloudflare Web Analytics beacon will be blocked after deploy (P3).

### C.5 Unknowns (need owner access)
Cloudflare plan (Paid is implied by admin `cpu_ms: 300000`), Worker versions/deploy history, secret presence/values, which Neon project/branch/region production uses, whether its schema exists, Resend domain verification, WAF/rate-limit rules, DNS for `tutor.`.

---

## D. Test results (exact commands)

| # | Command | Result |
|---|---|---|
| D.1 | `pnpm typecheck` (initial) | **FAIL** — 64 TS errors, all `Cannot find module 'next' / '@opennextjs/cloudflare'`. Cause: pnpm virtual store pruned at 02:14 UTC when `@playwright/test` was added (peer-suffix change); `apps/*/node_modules/next` were dangling symlinks. **Environment, not code.** |
| — | `pnpm install --frozen-lockfile` | restored 4 packages; `pnpm-lock.yaml` byte-identical (`cmp`) |
| D.2 | `pnpm typecheck` | **PASS** 5/5 workspaces |
| D.3 | `pnpm -r --no-bail test` (unit tier) | **PASS 1,135/1,135** — db 131, auth 39, web 62, admin 508, student 395 (82 files) |
| D.4 | `pnpm test:ci-scripts` | **PASS 269/269** |
| D.5 | `pnpm -r --no-bail test:int` (NonProd test DB) | admin **36/36 PASS** (4 files); student **14/14 PASS** (2 files) + **1 file fails to load**: `assessment-concurrency.int.test.ts` → `entitlements.ts` → `@/lib/auth` → `next-auth` → `next/server` not resolvable under Vitest ESM (harness gap; needs `vi.mock('@/lib/auth')` or `server.deps.inline`). The formal-assessment concurrency guarantee is therefore **untested at integration level**. |
| D.6 | `pnpm -r --filter "./apps/*" build` (`next build`) | **PASS** ×3 |
| D.7 | `pnpm --filter @rms/<app> cf:build` on Windows (clean copy, no env files) | **FAIL** (student, admin): esbuild cannot bundle `@img/sharp-win32-x64` `.node`. Platform limitation. |
| D.8 | same in WSL Ubuntu, for `HEAD` and WT, student + admin | **PASS 4/4**; post-guard "next-env.mjs contains no embedded environment variables" |
| D.9 | `pnpm test:e2e:prod` (existing read-only suite) | **PASS 6/6** (student `/`, `/login`, `/forgot-password`, `/overview`; admin `/login`, protected redirect). Covers signed-out pages only. |
| D.10 | Website crawl (scratch Playwright, GET-only guard) | 19 page loads, 14 links: 0 app exceptions, 0 overflow, 0 broken images, 0 bundle secrets; failures: tutor DNS, soft-404, apex/HTTP (§B.1) |
| D.11 | Student journeys in local workerd ([workerd]) | WT: auth 19/20 PASS (1 = test expectation), lecture XP PASS, leaderboard PASS, **sign-out FAIL**, DSA/quiz not exercised. HEAD: **3/3 sign-in entry points FAIL** (redirect crash) |
| D.12 | Admin journeys in local workerd | anonymous redirect PASS, student-rejected PASS, sign-in action PASS from `/login`; **session lost on next request (both builds, http and https)** → sections BLOCKED |
| D.13 | Production authenticated journey (`pnpm test:e2e:prod:auth`, run earlier today earlier that day by a previous session — not re-run here) | FAIL at step 2: "Invalid email, password, or student account status." (§E.4) |

Not run (and why): production sign-in (single prior failure; retrying would not discriminate causes and the brief forbids repeated attempts); any production write; load tests; email sends (no sandbox recipient configured); lint (no lint script exists in the repo).

---

## E. Root-cause analysis

### E.1 Student (and admin) sign-in crashes after valid credentials — **CONFIRMED** (prod code), FIXED in WT
* **Symptom:** after submitting valid credentials the page shows "Application error: a client-side exception has occurred"; console: "An unexpected response was received from the server."
* **Reproduce:** `HEAD` build in workerd → open `/login` (hidden `callbackUrl=/dashboard`) or `/` (middleware sets `callbackUrl=/`) → sign in.
* **Evidence:** action response `303 text/x-component`, `x-action-redirect: …/dashboard;push`, **plus `Location: /overview`**. Production's login form posts `callbackUrl=/dashboard` *[live]*. Next.js fetches the redirect target internally and copies its headers onto the action response; `/dashboard` and `/` are `redirect('/overview')` pages, so a `Location` leaks, the browser follows it, receives HTML, and the Flight client throws. The session cookie **is** set (reloading `/overview` works), so users are signed in but see a crash.
* **Fix (already in WT):** `lib/auth/callback-url.ts` `toPostLoginTarget()` maps redirect-only routes to a rendering page; admin `lib/auth-redirect.ts` does the same (`/` → `/programs`). Tests: `post-login-target.test.ts`, `callback-url.test.ts`.
* **Regression test to add:** a workerd-level Playwright test of sign-in from `/login`, `/`, `/dashboard` (the reproduction script exists — §F PR-20).

### E.2 Sign-out does not end the session — **CONFIRMED** (local, both builds)
* **Evidence:** sign-out action response headers *[workerd]*: `__Host-student-sess=; Max-Age=0; Secure; HttpOnly; SameSite=lax` **followed by** `__Host-student-sess=<new JWT>; Expires=+30d; HttpOnly; Secure; SameSite=Lax`. Afterwards `GET /overview` → 200.
* **Cause (high confidence):** the second cookie uses a different serializer (NextResponse casing) → it is the Auth.js **middleware** (`export { auth as middleware }`) refreshing the sliding session on the same `POST /overview` that carries the `signOutAction`; it runs with the still-valid incoming cookie and its `Set-Cookie` is appended after the action's deletion. Last header wins.
* **Production impact:** same code path and same middleware → **very likely identical** (not verified: no account). Admin uses the same pattern (`signOut` in a Server Action + `auth` middleware) → likely affected too.
* **Fix:** perform sign-out in a route handler outside the middleware matcher (e.g. `POST /api/logout` that clears `__Host-student-sess` with matching attributes and redirects), or exclude Server-Action POSTs from session refresh. Add the WT's session-revocation stamp on sign-out so a stolen pre-logout token also dies.
* **Regression test:** after sign-out, `GET /overview` with the browser's cookie jar must be 307 → `/login`; assert no `Set-Cookie` re-issues the session on the sign-out response.

### E.3 Admin session cookie mode mismatch — **CONFIRMED locally; production impact UNVERIFIED**
* **Evidence:** over https locally, `GET /login` sets `__Host-authjs.csrf-token`/`__Secure-authjs.callback-url` (secure mode) but the sign-in Server Action sets **`authjs.session-token` without `Secure`** (insecure mode). Middleware (secure mode) never sees a session → 307. Over http the route handler accepts the cookie but the middleware still rejects it.
* **Mechanism:** inside a Server Action `@auth/core` `createActionURL()` takes the protocol from `x-forwarded-proto` (Next/OpenNext set it to `http` for the internal request when the client request lacks it), while middleware uses the real request URL. Setting `AUTH_URL` locally did not change the outcome, so another path also decides the mode (not fully isolated).
* **Production:** probably works *if* Cloudflare forwards `x-forwarded-proto: https`; this is an implicit dependency. The student app is immune because it pins its cookie name and `secure: true`.
* **Fix (needs approval — `auth.config.ts` is a guarded file):** pin admin cookie names/options (`__Secure-`/`__Host-`, `secure: true`) in the shared `authConfig` used by both middleware and `auth.ts`, mirroring the student portal. Verify with one authorized production admin sign-in.

### E.4 The earlier that day production sign-in failure — **UNRESOLVED (competing hypotheses)**
The page showed "Invalid email, password, or student account status." `authenticateStudent()` returns `null` — rendered as exactly that message — for **all** of:
H1 the account does not exist in the DB the Worker uses (e.g. Worker now points at the new, empty DB);
H2 the DB has no schema (unmigrated) → query throws → swallowed;
H3 `POSTGRES_URL` secret missing/wrong → swallowed;
H4 wrong password / inactive / missing `student` role.
Note E.1 is *not* the cause here (that bug happens after `authorize()` succeeds and shows a different error).
**Evidence needed:** `wrangler tail rms-student` during **one** attempt (logs would show nothing because errors are swallowed — hence also fix D-08), or a read-only query by the owner on the production DB for that user row and `information_schema.tables`. **Fix:** log classified errors in `authenticateStudent` / entitlement lookup (no PII, no URLs) and map `?error=` codes (D-08).

### E.5 Hydration mismatches (React #418) — **CONFIRMED** (local)
On `/content/*`, `/dsa`, `/batches/[id]`. Client components render dates with `toLocaleDateString('en-US', …)` / `toLocaleDateString()` **without `timeZone`** (e.g. `curriculum-item-row.tsx:110,217`, `problem-row.tsx:94`, `completion-button.tsx:56`, `batch-header.tsx:40`). Workers render in UTC; Indian browsers render IST → text differs → React discards server HTML (perf cost, flicker) and dates near midnight can show the wrong day during SSR. **Fix:** one shared formatter with `timeZone: 'Asia/Kolkata'` and fixed locale.

### E.6 No working bootstrap for an empty production DB — **CONFIRMED**
* `pnpm admin:seed[:test]` → `Error: This module cannot be imported from a Client Component module` (`@rms/db/index.ts` imports `server-only`). Works with `tsx --conditions=react-server`.
* The seed guard rejects production by design; no alternative production bootstrap exists.
* `drizzle.config.ts` silently loads `apps/admin/.env.local` (the old region `neondb`) if `POSTGRES_URL` is not exported; `db:migrate`/`db:push` have no target guard.
* `pnpm test:db:bootstrap` applies raw SQL statements (split on `--> statement-breakpoint`), **not** `drizzle-kit migrate`, and creates no `__drizzle_migrations` journal → the production migration path has never been rehearsed on an empty database. (Migrations 0001/0004 add enum values without using them in the same file — compatible with a single-transaction run, but unproven.)

### E.7 Broken local dependency store — **CONFIRMED, resolved**
See D.1. Prevention: run `pnpm install --frozen-lockfile` after any manifest change; CI already does.

---

## F. Prioritized implementation backlog

Effort: XS ≤ 2 h · S ≤ 1 d · M ≤ 3 d · L ≤ 1–2 wk · XL > 2 wk.

| ID | Title | Pri | Impact | Root cause | Files / owner | Implementation | Depends | Acceptance criteria | Tests | Data / deploy | Effort | Risk / rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PR-01 | Force HTTPS on all hosts | **P0** | Cleartext credentials/sessions | Cloudflare "Always Use HTTPS" off | **Owner**, Cloudflare dashboard (SSL/TLS → Edge Certificates) | Enable Always Use HTTPS; after a week enable HSTS (or rely on WT header) | — | `http://{www,student,admin,apex}` → 301 https | Add to `scripts/ci/smoke.mjs` + `e2e` prod smoke | none | XS | Low; toggle off |
| PR-02 | Sign-out must terminate the session (student, then admin) | **P0** | Next user on a shared PC inherits the session | E.2 | `apps/student/lib/actions/auth.ts`, new `app/api/logout/route.ts`, header/empty-enrollment forms; admin equivalents (admin is guarded → approval) | Route-handler logout outside matcher; clear cookie with identical attributes; stamp revocation | approval | After sign-out, protected GET → 307; no re-issued cookie | workerd Playwright + unit for cookie attrs | student deploy | S | Low; revert |
| PR-03 | Commit and review the working tree in slices | P1 | Work can be lost; cannot deploy reproducibly | 139 uncommitted paths on a CI branch | repo | Split into PRs: (a) security headers, (b) auth/login fixes, (c) rate limits, (d) access policy, (e) XP ledger, (f) formal assessments, (g) admin hardening, (h) web partner form, (i) CI/rollback, (j) e2e harness | owner decision on branch strategy | Each PR green in CI; reviewed | existing suites | none | M | Low |
| PR-04 | Deploy the fixed code (student first) | P1 | Restores sign-in, headers, `callbackUrl` fix | prod is HEAD-era | WSL/clean-worktree `cf:build` + guarded deploy (or Phase-4 pipeline) | Bootstrap deploy one app at a time with recorded Worker version ids; then smoke | PR-03, PR-06, PR-09, owner approval | Auth smoke (§H) green | prod smoke + authorized auth journey | **required secrets must exist first** (C.4) | M | Med; `wrangler rollback <version>` |
| PR-05 | Verify production DB identity & state (read-only) | P1 | Everything else depends on knowing the target | BLOCKED | **Owner** + Neon console / `wrangler tail` | Record project/branch/region/endpoint used by each Worker; check schema & `__drizzle_migrations` | Cloudflare + Neon access | Documented in `docs/development/deployment.md` | — | none | XS | none |
| PR-06 | Safe DB initialization runbook + tooling | P1 | Cannot create schema/first admin safely | E.6 | `packages/db/drizzle.config.ts`, `apps/admin/scripts/seed-admin.ts`, new `packages/db/scripts/prod-bootstrap.ts` | (1) drizzle config: no implicit `.env.local`, require explicit `--target`, classify via existing guard; (2) fix admin seed (`--conditions=react-server` in script or import `@rms/db/schema` + local client); (3) guarded, interactive production bootstrap for first super_admin (typed confirmation of endpoint id); (4) rehearse `drizzle-kit migrate` on a fresh empty Neon branch, then production | PR-05 | Fresh branch migrates via `drizzle-kit migrate`; journal has 5 rows; bootstrap creates exactly one super_admin; seeds still refuse production | unit tests for target classification; rehearsal log | **schema creation on prod (approval)** | M | Med; Neon restore point / new branch |
| PR-07 | Separate dev database | P1 | `pnpm dev` / tools write to a production-class DB | `.env.local` → the old region `neondb` | developer env, docs | Create `rms_dev` DB/branch; repoint `.env.local`; add the the old region host to `RMS_PRODUCTION_DB_HOSTS` | owner | `.env.local` DB name matches `rms_dev*` | guard unit tests | none | XS | none |
| PR-08 | NAT-safe login rate limiting | P1 | A lab of 30+ students on one IP gets locked out at class start | WT: 10/min per IP **and** per account | `apps/student/lib/security/request-limits.ts`, `wrangler.jsonc` | Per-account strict (e.g. 10/15 min); per-IP generous (e.g. 300/min) or Turnstile after N failures | PR-03 | 60 distinct accounts from one IP can sign in within a minute; 11th bad password on one account throttled | unit (policy table) + workerd test | config change | S | Low |
| PR-09 | Honest auth errors & logging | P2 (P1 for ops) | Outages look like bad passwords (E.4) | D-08; swallowed catches | `apps/student/lib/db/student-identity.ts`, `entitlements.ts`, `app/login/page.tsx` | Classify errors; `console.error` structured (no PII/URLs); map Auth.js codes | — | DB outage → "service unavailable, ref …"; logs visible in `wrangler tail` | unit with throwing DB stub | none | S | Low |
| PR-10 | Pin admin Auth.js cookie mode | P1 (verify) | Admin may not stay signed in behind some proxies | E.3 | `apps/admin/lib/auth.config.ts` (**guarded — approval**) | Explicit `cookies` + `useSecureCookies: true` in production, shared by middleware and server | approval | Local https workerd admin journey passes; prod admin sign-in passes | workerd admin journey | admin deploy | S | Med; revert |
| PR-11 | Email delivery configured & verified | P1 | Activation/reset/enrollment emails silently skipped | secrets unknown | **Owner** (Resend domain + secrets) | Verify sending domain; set `RESEND_API_KEY`, `EMAIL_FROM` (+`PARTNER_ENQUIRY_TO`) | — | Test activation email to an owner-controlled inbox | manual + log check | secrets | S | Low |
| PR-12 | Authorized test accounts for production smoke | P1 | Cannot verify prod auth | none exist/known | **Owner** | Create one student and one admin test account in the new prod DB (after PR-06), store in password manager; never real PII | PR-06 | `pnpm test:e2e:prod:auth` green; admin equivalent added | — | test rows in prod (remove at launch or keep flagged) | XS | Low |
| PR-13 | Admin enrollment → batch assignment | P2 (P1 if public form is used) | Students "confirmed" without a cohort | D-02 | admin enrollments queries/actions/UI | Assign/transfer action with validation (plan Slice 1b) | PR-03 | Pending/confirmed enrollment can be placed; invalid combos rejected | integration | none | M | Med |
| PR-14 | Hydration-safe date formatting | P2 | Flicker, wrong day near midnight | E.5 | `apps/student/components/**` | shared `formatIstDate()` | — | No #418 on journeys | workerd journey asserts no page errors | none | S | Low |
| PR-15 | Fix integration harness for formal-assessment concurrency | P2 | Race protection untested | D.5 | `apps/student/vitest.int.config.ts` or the test | `vi.mock('@/lib/auth')` / `server.deps.inline: ['next-auth']` | — | file loads and passes | itself | none | XS | none |
| PR-16 | No writes on student GET (assignment rows) | P2 | Unique-violation race; side effects on read | D-11 | `apps/student/lib/db/queries/projects.ts`; admin authoring | Create assignment row at authoring time | PR-03 | Student render issues zero INSERTs | integration | backfill no-op script | M | Low |
| PR-17 | Apex → www redirect; tutor link; soft-404s | P2/P3 | SEO duplication, dead link | dashboard + `apps/web` | Owner redirect rule; mark tutor "coming soon"; `notFound()` for unknown program and admin `/enroll/<bad>` | — | apex 301; 404 statuses | smoke | none | XS | Low |
| PR-18 | Performance: DB proximity & round trips | P2 | 0.3–0.7 s per DB page, multi-second overview | C.2 | infra + `overview` queries | Confirm prod DB region; co-locate with users (ap-south-1/the target region) or enable Smart Placement; batch overview queries; keep Neon compute warm during class hours | PR-05 | p50 DB page < 400 ms from India; overview < 1.5 s | browser timings (§D) | possible DB move (approval) | M | Med |
| PR-19 | Bot protection on public forms | P2 | Spam/email abuse once links are shared | no challenge | admin enroll, web partner form | Turnstile (fail-closed with friendly message) | owner keys | Form rejects missing token | unit + workerd | secrets | S | Low |
| PR-20 | Promote audit scripts into `e2e/` | P2 | Re-runnable evidence | scratch-only today | `e2e/tests/local-workerd/*`, `e2e/tests/production/web-smoke.spec.ts` | Website crawl (GET-only), student/admin workerd journeys, sign-out and redirect regressions; WSL/CI workerd runner | PR-03 | runs in CI against workerd + test DB | itself | none | M | Low |
| PR-21 | Allow Cloudflare RUM in CSP or disable RUM | P3 | Analytics silently stop | C.4 | three `security-headers.ts` | add `static.cloudflareinsights.com` / `cloudflareinsights.com` | PR-03 | no CSP violations | header unit tests | none | XS | Low |
| PR-22 | Minor hardening | P3 | — | various | — | `GET /api/session/revoked` → POST (logout CSRF); seed stops printing passwords; entitlement 404 not logged as ERROR; return 404 status for foreign batch; "Academy Enrollment" branding | — | — | unit | none | S | Low |
| PR-23 | Product decisions still open (from remediation plan §4) | P1–P2 | Determines enrollment, inactive-college, XP rules | — | **Owner** | Decide PD-1 (enrollment lifecycle), PD-2 (batch links), PD-3 (WT already implements an inactive-college rule — confirm it), PD-5 (XP values), PD-13 (abuse infra) | — | recorded in `docs/decisions/` | — | — | XS each | — |

---

## G. Recommended implementation sequence

```
Phase 0 (owner, hours)      PR-01 HTTPS ─┬─ PR-05 DB identity ── PR-07 dev DB
                                         └─ PR-11 email secrets, PR-23 decisions
Phase 1 (eng, 1–2 d)        PR-03 commit/review in slices  ∥  PR-02 sign-out  ∥  PR-08 limits  ∥  PR-09 errors  ∥  PR-15
Phase 2 (eng+owner, 1–2 d)  PR-06 DB runbook → rehearsal on empty branch → apply to new prod → bootstrap super_admin → PR-12 test accounts
Phase 3 (deploy, 1 d)       PR-04 deploy student → smoke → admin (+PR-10) → smoke → web → smoke
Phase 4 (core workflows)    PR-13 batch assignment, PR-16 no-write GET, PR-19 Turnstile
Phase 5 (quality/perf)      PR-14 hydration, PR-18 performance, PR-20 e2e in CI, PR-17, PR-21, PR-22
Phase 6 (launch gate)       §H checklist end-to-end with test accounts; remove/flag test data
```
*Independent:* PR-01, PR-05, PR-07, PR-11 (owner) run in parallel with Phase 1. PR-02/08/09/15 touch different files and can be parallel PRs. *Serial:* PR-06 before any production data; PR-03 before PR-04; PR-12 after PR-06; PR-10 needs approval and should ship with the admin deploy.

| Phase | Exit criteria (measurable) |
|---|---|
| 0 | All four hosts redirect HTTP→HTTPS (301); production DB endpoint/region recorded; `.env.local` targets `rms_dev*`; Resend domain verified |
| 1 | WT committed in reviewed PRs; CI `ci-gate` green; sign-out regression test passes in workerd; 60-accounts-one-IP test passes; DB outage renders a distinct error |
| 2 | `drizzle-kit migrate` succeeds on a fresh empty branch and then on prod; journal has 5 entries; exactly one production super_admin; seeds still refuse production |
| 3 | `pnpm test:e2e:prod` green; authorized student journey green (sign-in from `/login` and `/`, navigate, sign-out → protected 307); admin sign-in/navigate/sign-out green; security headers present on all hosts; `/login?callbackUrl=foo` = 200 |
| 4 | Admin can place an enrollment in a batch; student GETs perform no writes (integration test) |
| 5 | Zero page errors on workerd journeys; DB page p50 < 400 ms from India; e2e workerd suite in CI |
| 6 | §H fully ticked |

---

## H. Launch checklist (before any real student/institutional data)

**Infrastructure & secrets**
- [ ] HTTP→HTTPS 301 on `www`, apex, `student`, `admin`; apex → `www` 301; HSTS observed
- [ ] Each Worker: `POSTGRES_URL` points at the verified new production endpoint (record endpoint id, not URL); `AUTH_SECRET` distinct per portal; admin GitHub OAuth secrets; `RESEND_API_KEY`, `EMAIL_FROM` (+`PARTNER_ENQUIRY_TO`); rate-limit bindings exist
- [ ] Deployed Worker version ids recorded (rollback anchors); deployed commit SHA recorded
- [ ] Workers Paid plan confirmed (admin `cpu_ms`)

**Database**
- [ ] Neon restore point / branch taken before initialization
- [ ] Schema applied with `drizzle-kit migrate` (rehearsed first on an empty branch); `__drizzle_migrations` has 5 rows; FKs/unique/partial-unique indexes present (compare with `schema.ts`)
- [ ] First super_admin created via guarded bootstrap; GitHub admin sign-in maps to the correct role
- [ ] Old the old region DB untouched and listed in `RMS_PRODUCTION_DB_HOSTS`; developers on `rms_dev*`
- [ ] Backups/PITR window confirmed in Neon; restore procedure documented and rehearsed once on a branch

**Authentication & authorization (production, authorized test accounts)**
- [ ] Student sign-in from `/login`, `/`, and a deep link lands without errors
- [ ] Refresh/new tab keep the session; **sign-out → protected route 307**
- [ ] Wrong password generic; 11 rapid bad attempts on one account throttled; a class-size burst from one IP not throttled
- [ ] Student cannot access admin; foreign batch URLs not disclosed; suspended student cut off on next request
- [ ] Admin sign-in/sign-out; suspended/demoted admin rejected on next action

**Core workflows (with test college/program/batch)**
- [ ] Admin creates college → program → batch → imports 2 test students → confirms → activation email received at an owner inbox → student activates and signs in → sees exactly that batch
- [ ] Lecture/DSA/quiz XP awarded once; leaderboard reflects it; project submission works for `confirmed` students

**Observability & operations**
- [ ] Workers observability on; `wrangler tail` shows structured auth/DB errors (PR-09)
- [ ] Post-deploy smoke (`pnpm test:e2e:prod`, `scripts/ci/smoke.mjs`) green; scheduled production smoke enabled
- [ ] Rollback procedure dry-run done (`rollback.yml` `dry_run` or documented `wrangler rollback`)

**Data hygiene at go-live**
- [ ] Production test accounts removed or flagged and excluded from leaderboards; no demo/seed data in production
- [ ] No fabricated counts/testimonials; no pricing on the public site (guardrails §5)

---

## I. Immediate next actions

| # | Action | Owner | Prerequisite | Expected outcome |
|---|---|---|---|---|
| 1 | Enable **Always Use HTTPS** for `rms-careers.com` (and add the apex→www redirect rule) | Owner (Cloudflare dashboard) | Dashboard access | Closes the P0 cleartext exposure in minutes |
| 2 | Identify the production database: in Neon, note which project/branch/region/endpoint the Workers' `POSTGRES_URL` uses and whether its schema exists; optionally `npx wrangler tail rms-student --format pretty` during one sign-in attempt | Owner | `wrangler login`, Neon console | Unblocks E.4, PR-05, PR-06; tells us whether "new empty prod" is actually wired in |
| 3 | Approve the code changes: PR-02 (sign-out), PR-08 (NAT-safe limits), PR-09 (error logging), PR-10 (admin cookie mode — guarded file), and the branch strategy for committing the working tree (PR-03) | Owner → Engineering | Decision | Fixes ship in reviewable PRs |
| 4 | Execute PR-06: guard `drizzle.config.ts`, fix admin seed, add production bootstrap, rehearse `drizzle-kit migrate` on an empty Neon branch | Engineering (+ owner approval for the production run) | Action 2 | A safe, repeatable initialization of the new production DB |
| 5 | Deploy student → admin → web from a clean WSL/worktree build (PR-04) with recorded version ids, then run the authorized authenticated smoke | Engineering + Owner approval | Actions 1–4, secrets (PR-11), test accounts (PR-12) | Production matches reviewed code; sign-in/sign-out verified live |

---

### Appendix — reproducibility notes
* Local Worker runs: WSL Ubuntu, `pnpm cf:build` from env-free copies, `wrangler dev --local --local-upstream 127.0.0.1:<port>`, `.dev.vars` with the **test** DB URL and a random `AUTH_SECRET`, empty `RESEND_API_KEY`. **Pin `--local-upstream`**: without it wrangler emulates the production custom-domain host, and Next's internal Server-Action redirect fetch then goes to the real production hostname (observed once during this audit: one GET carrying a locally-signed test cookie that production treats as anonymous; no data exposure).
* Use one hostname (`localhost`) per run: the app's redirects can switch between `127.0.0.1` and `localhost`, which are separate cookie jars.
* Admin journeys locally need the cookie-mode fix (E.3) before they can pass.
* Test fixtures left in the NonProd test DB: demo dataset (5 `*.demo@rms-careers.local` students, 3 batches, content) and `admin.audit@rms-careers.local` (super_admin). Remove with a guarded script if unwanted.


---
---

# Remediation release R1 — critical production blockers (2026-10-11, second session)

**Status: READY FOR REVIEW** — all R1 code changes are implemented, unit/integration-tested and verified end-to-end in the real Cloudflare `workerd` runtime against the NonProd test database. **Deployment and every production check that needs credentials remain BLOCKED on owner actions** (§R6). Nothing was committed, pushed, deployed, migrated or written to any production database; no Cloudflare setting or secret was changed; `admin-test-creds.env` was not read.

**Owner decisions recorded for this release (asked and answered in-session):**
1. Approved: edit `apps/admin/lib/auth.config.ts` (CLAUDE.md §5 approval file) to pin the admin session cookie.
2. Sign-out semantics: **sign out all devices** (server-side revocation through `users.updated_at`, no schema change).
3. Approved: local credential-free migration rehearsal (Docker Hub pull failed with a CDN reset; the rehearsal used PGlite — real PostgreSQL 16.4 compiled to WASM — instead, ~3 MB from npm, installed only in the session scratchpad).

Approval-required files identified before editing (CLAUDE.md §5): `packages/auth/**` (not touched), `apps/admin/lib/auth.config.ts` (touched, approved), `packages/db/src/schema.ts` and `packages/db/drizzle/**` migrations (not touched). The admin app is a "protected working surface": only the changes listed in §R2 were made there.

## R1. Root causes and evidence

| # | Finding | Root cause (confirmed) | Evidence |
|---|---|---|---|
| R1.1 | HTTP served without redirect (audit P0) | Cloudflare "Always Use HTTPS" was off | **Now resolved at the edge**: `http://` → `301 https://` on apex, `www`, `student`, `admin` *[live, re-checked today]*. All four hostnames are in **one** zone, `rms-careers.com` (identical SOA `lady.ns.cloudflare.com` serial 2417168987, no NS delegation for subdomains), so the single zone setting covers them. **HSTS is still absent** in production (the header ships with this release). Apex still serves 200 instead of redirecting to `www`. |
| R1.2 | Student sign-out did not end the session | Sign-out was a Server Action = a POST to the current page; the Auth.js middleware ran on that request with the still-valid cookie and appended a refreshed session cookie **after** the action's deletion (last header wins) | Audit E.2 headers: `__Host-student-sess=; Max-Age=0` followed by `__Host-student-sess=<JWT>; Expires=+30d`. Admin used the same pattern (`signOut()` Server Action in `user.tsx`). |
| R1.3 | Admin session lost after sign-in (local), fragile in production | Auth.js chooses cookie names/`Secure` per request from the detected protocol; inside a Server Action `@auth/core` reads `x-forwarded-proto`, which Next/OpenNext set to `http` for the internal request, while the middleware saw `https://` → sign-in wrote `authjs.session-token`, middleware read `__Secure-authjs.session-token` | Audit E.3 cookie listing; `@auth/core/lib/utils/env.js:createActionURL` (`x-forwarded-proto ?? protocol`) |
| R1.4 | `drizzle-kit migrate` cannot initialize an empty DB | drizzle's migrator runs **all pending migrations in one transaction** (`drizzle-orm/pg-core/dialect.js:54`); `0001` adds enum values with `ALTER TYPE … ADD VALUE`, `0002` uses `'active'` in an index predicate before that commits | **Reproduced on PostgreSQL 16.4**: single transaction → `0002_unique_active_enrollment_idx: unsafe use of new value "active" of enum type enrollment_status`; one transaction per file → OK (22 tables, 10 enum labels); re-applying without a journal → `0001: enum label "active" already exists` |
| R1.5 | Migrations could silently target the wrong DB | `drizzle.config.ts` loaded `.env.local`, then `apps/admin/.env.local` (the old region `neondb`, production-class), then `.env`; `db:migrate`/`db:push` had no target guard | source; audit C.2 |
| R1.6 | No first-admin path; admin seed crashed | `seed-admin.ts` imported `@rms/db` (client module → `import 'server-only'` throws outside Next); production intentionally not a seed target and no alternative existed; seed accepted the password as a CLI argument | `pnpm admin:seed:test` → `This module cannot be imported from a Client Component module` (reproduced) |
| R1.7 | Shared-IP lockout | one 10/min rule applied to both the per-IP and per-account key on login **and** to activation/reset by IP — a lab behind one NAT is locked out on onboarding day | WT `request-limits.ts`, `wrangler.jsonc` |
| R1.8 | Account enumeration by timing (new) | unknown email returned before any bcrypt work (≈0 ms vs ≈300 ms) in both apps | source (`authenticateStudent`, `authenticateAdmin`) |
| R1.9 | Credentials in logs (new) | admin `getUserByEmail`/`createAdminUser`/`authenticateAdmin` and the seed logged raw driver errors (can contain the connection string) | new unit test reproduced `postgres://…` in the log line before the fix |
| R1.10 | Outage shown as "no access" (D-08) | login page rendered one message for every `?error=` code; `authenticateStudent` swallowed DB errors silently | source; audit E.4 |
| R1.11 | Formal-assessment concurrency test never ran | `assessment-concurrency.int.test.ts` → `entitlements.ts` → `next-auth` → `next/server` unresolvable under Vitest ESM | `test:int` load error |

## R2. Files changed and why (this release only; pre-existing working-tree changes preserved)

**Sign-out (R1.2) — both apps**
* `apps/student/app/api/session/sign-out/route.ts` (new), `apps/student/lib/auth/sign-out.ts` (new), `apps/student/lib/db/session-store.ts` (new), `apps/student/lib/constants/session.ts` (new): `POST /api/session/sign-out` — outside the middleware matcher (`api` excluded), same-origin check (`Sec-Fetch-Site`/`Origin`, fail-closed → 403), server-side revocation (`users.updated_at = now` from the Worker clock), deletion-only `Set-Cookie` with `__Host-` attributes, `303 → /login`, `Cache-Control: no-store`. Revocation failure still clears the cookie and logs only the error class.
* `apps/student/components/shell/{header,sidebar,mobile-nav,empty-enrollment}.tsx`: forms now `POST` to the route (works without JS). `apps/student/lib/actions/auth.ts` **deleted** (the faulty Server Action).
* `apps/admin/app/api/session/sign-out/route.ts`, `apps/admin/lib/sign-out.ts`, `apps/admin/lib/session-cookies.ts`, `apps/admin/lib/db/queries/session-store.ts` (new); `apps/admin/app/(admin)/user.tsx` (form posts to the route); `apps/admin/app/api/session/revoked/route.ts` (also clears the pinned cookie, via the shared helper).
* Comments updated: `apps/student/lib/auth/session-revocation.ts`, `apps/admin/lib/session-validation.ts` (`updated_at` is now also written on sign-out).

**Admin cookie mode (R1.3) — owner-approved**
* `apps/admin/lib/auth.config.ts`: `useSecureCookies: true` and pinned `sessionToken` `__Host-rms-admin-sess` (`HttpOnly; Secure; SameSite=Lax; Path=/`, no Domain), shared by middleware and server instance. **Every admin must sign in once after deploy.**

**Rate limiting and login hardening (R1.7–R1.10)**
* `apps/{student,admin,web}/lib/security/request-limits.ts` (kept identical): `AUTH_ACCOUNT_LIMIT` 5/min per account + `AUTH_CLIENT_LIMIT` 60/min per client IP, `enforceAuthLimits()` (client rule first, so an abusive IP cannot burn victims' per-account allowance). Call sites: student `lib/auth.ts`, `app/{activate,forgot-password,resend-activation,reset-password}/actions.ts`; admin `lib/auth.ts`.
* `apps/student/wrangler.jsonc`, `apps/admin/wrangler.jsonc`: bindings `AUTH_ACCOUNT_RATE_LIMITER` (5/60 s) and `AUTH_CLIENT_RATE_LIMITER` (60/60 s), unique namespace ids (student 1301/1302, admin 1201/1203).
* `apps/student/lib/db/student-identity.ts`, `apps/admin/lib/db/queries/users.ts`: exactly one bcrypt comparison on every rejection path (cached equalization hash); errors logged by class only.
* `apps/student/lib/auth/login-errors.ts` (new), `apps/student/app/login/page.tsx`: distinct messages per Auth.js code; unknown codes neutral; input never echoed.

**Database initialization safety (R1.4–R1.6)**
* `packages/db/src/migration-runner.ts` (new, pure): one transaction per migration, drizzle-compatible journal (`drizzle.__drizzle_migrations`, `created_at` = journal `when`, line-ending-independent hash; accepts rows written earlier by drizzle-kit), session advisory lock, refusals (tables without journal, modified/missing/out-of-order migrations), plan mode, `verifyLiveIdentity()` (Neon `endpoint_id`, `current_database()`, test sentinel).
* `packages/db/src/guard-env.ts`: `resolveMigrationTarget()` — explicit `--target=development|test|rehearsal|production`; development = shell `POSTGRES_URL` only and `rms_dev*`; test = pinned `TEST_DATABASE_URL`; rehearsal = `REHEARSAL_DATABASE_URL` + `REHEARSAL_DATABASE_ENDPOINT` (must not be test/prod/any app DB); production = `PRODUCTION_DATABASE_URL` + `RMS_PRODUCTION_DB_ENDPOINT` + `--confirm-production=<endpoint>`, refused in CI and when the endpoint appears in any local env file or app URL variable. `packages/db/src/guard.ts`: operations `dev-migrate`, `test-migrate`.
* `packages/db/src/node-tooling.ts` (new, Node-only): single WebSocket connection executor, `readMigrationFiles`, hidden/visible TTY prompts.
* `packages/db/scripts/migrate.ts` (new) and `packages/db/package.json`: `db:migrate` = guarded runner (plan by default, `--apply`, typed confirmation for production); exports `./migration-runner`, `./node-tooling`.
* `packages/db/drizzle.config.ts`: no env-file loading; `generate`/`check` offline; `migrate` disabled with a pointer to the runner; `push`/`studio`/`pull` require `RMS_DB_TARGET=development` + an `rms_dev*` URL from the shell.
* `packages/db/scripts/test-db-bootstrap.ts`: uses the same runner/journal, so every fresh test DB rehearses the production path.
* `apps/admin/scripts/seed-admin.ts`: imports `@rms/db/schema` (fixes the crash); password only from `ADMIN_INITIAL_PASSWORD` or a hidden prompt (argv refused); min 12 chars; `--name=`; error log redacted.
* `apps/admin/scripts/bootstrap-first-admin.ts`, `apps/admin/scripts/lib/first-admin.ts` (new), `apps/admin/package.json` (`admin:bootstrap-first-admin`), `apps/admin/tsconfig.json` (path mappings for `@rms/db/schema|migration-runner|node-tooling`).

**Tests / harness**
* `apps/student/lib/__tests__/assessment-concurrency.int.test.ts`: mocks `@/lib/auth` so the file loads (R1.11).
* `e2e/support/diagnostics.ts` (`form-post` permit kind), `e2e/support/student-journey.ts` (sign-out permit → `/api/session/sign-out`), `e2e/support/stub-student.ts`, `e2e/tests/tooling/auth-guard.spec.ts`.

## R3. Tests added and verification results

**New/changed automated tests**
| File | Covers |
|---|---|
| `apps/student/lib/__tests__/sign-out.test.ts` (22) | matcher excludes the route; CSRF matrix; deletion-only `__Host-` headers; revocation call; failure path; post-revocation session invalid / later sign-in valid; route POST 303/403/no-store; no component uses a Server Action for sign-out |
| `apps/admin/lib/__tests__/sign-out.test.ts` (13) | pinned cookie config shared by middleware and server; matcher; CSRF; legacy + pinned cookie clearing; DB-revalidation after revocation; route |
| `apps/admin/lib/__tests__/session-revoked-route.test.ts` (+1) | revoked route clears the pinned cookie with Secure |
| `apps/{student,admin,web}/lib/__tests__/request-limits.test.ts` (+5 each) | 60 students on one IP pass, 61st refused; 6th attempt on one account from different IPs refused; client-first ordering; binding names |
| `apps/{student,admin}/lib/__tests__/rate-limit-bindings.test.ts` (3 each) | `wrangler.jsonc` limits equal the in-code fallback; unique namespace ids |
| `apps/student/lib/__tests__/login-rate-limit.test.ts`, `apps/admin/lib/__tests__/session-revocation.test.ts` (updated) | old 10/min expectations → new policy |
| `apps/{student,admin}/lib/__tests__/auth-timing.test.ts` (5 each) | one bcrypt comparison for unknown/inactive/wrong-role/wrong-password; logs never contain the URL, driver text or email |
| `apps/student/lib/__tests__/login-errors.test.ts` (6) | error-code mapping, no echo, prototype keys |
| `packages/db/src/__tests__/migration-runner.test.ts` (15) | per-migration transactions with journal row inside; enum commit ordering; idempotence; rollback of only the failing migration and resume; no SQL detail in errors; tables-without-journal / modified / ahead / out-of-order / duplicate refusals; CRLF/LF hash compatibility; live identity |
| `packages/db/src/__tests__/migration-target.test.ts` (21) | target matrix incl. "development never reads the admin env file", production pins/confirmation/CI/retired-DB refusals, rehearsal isolation, no URL in errors; `drizzle.config.ts` loads no env file; `db:migrate` is the runner |
| `apps/admin/lib/__tests__/first-admin.test.ts` (7) | one locked transaction; refuses if any admin exists; refuses existing email; input validation; CLI never reads the password from argv/env; seed imports the schema entry |
| `e2e/tests/tooling/auth-guard.spec.ts` (+1) | `form-post` permit allows exactly one POST to the exact path |

**Runs (exact commands, final state of the working tree)**
| Command | Result |
|---|---|
| `pnpm typecheck` | PASS 5/5 workspaces |
| `pnpm -r --no-bail --if-present test` | db **177**, auth **39**, web **67**, admin **542**, student **435/436** — the one failure was `db-transaction-guard.test.ts` timing out at 5 s on a cold dynamic import under load; it passes in isolation (2/2 runs) and `pnpm --filter @rms/student test` re-run = **436/436**. Pre-existing, flaky (§R4) |
| `pnpm test:ci-scripts` | PASS 269/269 |
| `pnpm -r --no-bail --if-present test:int` (pinned NonProd test DB) | PASS admin **36/36**, student **17/17** (3 files; the concurrency file now runs: 3/3) |
| `cf:build` in WSL from an env-free copy (student, admin, web) | PASS 3/3; post-guard "next-env.mjs contains no embedded environment variables" (repo `.next` folders untouched) |
| PGlite (PostgreSQL 16.4) rehearsal of the **real** runner + first-admin code on the repo migrations | PASS: plan creates nothing; apply on empty DB → 5 migrations, 22 tables; journal `created_at` and hashes **identical to drizzle's `readMigrationFiles`**; re-run no-op; `createFirstAdmin` creates one active super_admin and refuses a second run; pre-existing schema without journal refused; injected failure in 0003 rolls back only 0003 (journal 3 rows, no 0003 tables). One rehearsal-script expectation was wrong (PGlite's DB is `template1`), which the identity check correctly refused |
| Local workerd journeys (`wrangler dev --local --local-upstream`, test DB, disposable accounts) — student | **9/9**: sign-in from `/login` and `/` → `/overview`; `__Host-student-sess` HttpOnly/Secure/Lax/host-only; refresh + new tab; sign-out `303 → /login` with `__Host-student-sess=<empty>; Max-Age=0` only; afterwards direct/refresh/new tab/Back+reload → `/login`, cookie gone; **replayed pre-sign-out token → `/login?error=Unauthorized` while the current token (control) reaches `/overview`**; re-login works; cross-site sign-out 403; error-code messages |
| — direct Auth.js endpoint | **2/2**: `POST /api/auth/callback/credentials` without CSRF → `302 /login?error=MissingCSRF`, no session; with CSRF, wrong passwords for one account → `credentials ×5, rate_limited` on the 6th |
| — admin (fresh disposable super_admin, password generated in memory, seeded via the fixed `admin:seed:test` env path) | **20/20**: student creds rejected; sign-in from `/login` and `/` → `/programs` and the **session now persists** (`__Host-rms-admin-sess` HttpOnly/Secure/Lax); all sections + 5 batch sub-pages 200; anonymous `/enroll/DEMO-PROG-CS-2026` submission → visible as pending in `/enrollments`; sign-out `303 → /login` deletion-only; afterwards direct/refresh/new tab → `/login`; old token replay never reaches a page (`/programs` → 307 → `/api/session/revoked`); cross-site sign-out 403; re-login works |
| `pnpm test:e2e --project=tooling` | PASS 13/13 |
| `pnpm test:e2e:prod` (read-only production smoke) | PASS 6/6 |
| Seed behaviour | `pnpm admin:seed:test` (no args) prints usage instead of crashing; `seed-admin.ts --target=test a@x.test secretpass` → refused ("Do not pass the password on the command line"); no TTY and no env password → refused |

## R4. Remaining risks and blocked checks

| Item | Status | Notes / owner |
|---|---|---|
| Production deploy of R1 + all prior working-tree fixes | **BLOCKED** (not authorized in this task) | Production still runs HEAD-era code: no headers, `callbackUrl` 500, sign-in crash, sign-out bug. |
| Production DB identity / schema / secrets | **BLOCKED** | No Cloudflare login, no production DB URL locally. |
| Real Neon rehearsal branch for `db:migrate --target=rehearsal` | **BLOCKED** | No Neon access; PGlite rehearsal proves SQL/transaction behaviour, not Neon connectivity, `neon.endpoint_id` reporting or WebSocket transport (the same transport is used by `dbTx` in production today). |
| Production authenticated journeys (student/admin) | **BLOCKED** | Need an authorized test account per app in the new production DB (created after initialization). |
| HSTS | open | Ships with the security headers in this release; consider enabling HSTS in the Cloudflare zone too. |
| Apex → `www` redirect | open (owner, dashboard) | Apex still serves the site with 200. |
| "Sign out all devices" side effect | accepted (owner decision) | A student signing out on a lab PC also ends their phone session. Per-session revocation would need a schema change. |
| Rate-limit binding semantics | risk | Workers rate limiting is per Cloudflare location and eventually consistent; it bounds abuse, it is not an exact counter. Add a WAF rate rule / managed challenge on `POST /login`, `/api/auth/*`, `/enroll/*` and Turnstile after repeated failures (owner, dashboard + keys). |
| Per-account limit as a lock-out lever | risk (bounded) | Anyone can spend a victim's 5/min allowance; impact is a 1-minute delay per window, and the client-first ordering prevents a single IP from doing it beyond its own limit. Turnstile is the proper mitigation. |
| Replay of a revoked admin token by a non-browser client | cosmetic | It never reaches a page, but because it ignores the cookie deletion it bounces `/login` ↔ `/programs` ↔ `/api/session/revoked`. Browsers drop the cookie on the first hop. |
| React #418 hydration mismatches (student `/content`, `/dsa`, `/batches/[id]`; admin `/colleges`, `/enrollments`, `/enrollments/import`) | open, P2 | Dates formatted without `timeZone` (audit E.5). Not changed in R1. |
| Flaky `db-transaction-guard.test.ts` (5 s timeout under load) | open, P3 | Give that test an explicit timeout. |
| `e2e/` has no standalone typecheck (no `@types/node` at the root) | pre-existing | Playwright transpiles it; consider adding `@types/node` and a script. |
| Admin users must sign in again after deploy; students too (pre-existing `authTime` rule) | expected | Communicate before deploy. |
| Prior audit items not in R1 (D-02 batch assignment, D-11 GET-write, PR-17…PR-22) | open | See backlog §F. |
| Test fixtures created in the NonProd test DB | disposable | `admin.e2e.<timestamp>@rms-careers.local` (super_admin), `e2e.enroll.<timestamp>@rms-careers.local` (pending enrollment + student), +5 XP and lecture completion on `student.demo`, `users.updated_at` bumps from sign-out tests; earlier `admin.audit@rms-careers.local`. |

## R5. Runbook — database migration and first production admin

**Preconditions:** R1 merged; operator machine with an interactive terminal; **no** production URL in any repo env file (the guard refuses it); `apps/*/.env.local` moved to an `rms_dev*` database (audit PR-07) or at least not exported; Neon console access; a Neon restore point policy known.

1. **Identify the target (read-only).** In the Neon console, record for the *new* production database: project, branch, region, endpoint id (`ep-…`), database name. Confirm it is the database whose URL is (or will be) set as `POSTGRES_URL` on `rms-student`, `rms-admin`, `rms-web`. Never use the the old region database referenced by `apps/*/.env.local`.
2. **Rehearse on a fresh branch.** Create an *empty* branch (a new branch from an empty parent, or a new project/branch with no schema). Then:
   ```bash
   export REHEARSAL_DATABASE_URL='<rehearsal url>'           # shell only, never a file in the repo
   export REHEARSAL_DATABASE_ENDPOINT='ep-xxxx'
   pnpm --filter @rms/db db:migrate --target=rehearsal          # plan: expect 5 pending
   pnpm --filter @rms/db db:migrate --target=rehearsal --apply  # expect: applied 0000 … 0004
   pnpm --filter @rms/db db:migrate --target=rehearsal          # expect: pending none
   pnpm --filter @rms/admin admin:bootstrap-first-admin --target=rehearsal --email=<ops email>   # optional rehearsal of step 5
   ```
   Exit criteria: no error; `select count(*) from drizzle.__drizzle_migrations` = 5; 22 tables in `public`. Delete the branch afterwards.
3. **Protect production.** Create a Neon restore point / branch snapshot of the production branch (even when empty) and note its time.
4. **Migrate production.**
   ```bash
   export PRODUCTION_DATABASE_URL='<production url>'          # shell only
   export RMS_PRODUCTION_DB_ENDPOINT='ep-yyyy'
   pnpm --filter @rms/db db:migrate --target=production --confirm-production=ep-yyyy          # plan
   pnpm --filter @rms/db db:migrate --target=production --confirm-production=ep-yyyy --apply  # type the endpoint id when asked
   ```
   The runner verifies the live `neon.endpoint_id` and database name, refuses the test sentinel, takes an advisory lock, and applies each migration in its own transaction.
5. **Create the first super_admin (once).** Choose one:
   * password: `pnpm --filter @rms/admin admin:bootstrap-first-admin --target=production --confirm-production=ep-yyyy --email=<ops email> --name="<name>"` → type the endpoint id, then a password of ≥14 characters twice (hidden; generate it in a password manager). Only the bcrypt hash is stored; the secret never touches argv, env, logs or disk.
   * GitHub only: add `--auth=github`; the account gets the hash of a discarded random secret and can sign in only through GitHub OAuth with that email (requires `AUTH_GITHUB_ID/SECRET` on `rms-admin`).
   The command refuses if the schema is not fully migrated, if any admin already exists, or if the email already has an account.
6. **Unset** `PRODUCTION_DATABASE_URL` and close the terminal. Record endpoint, time, migration list and the created user id (not the password) in the deployment log.
7. **Failure recovery.** A failed migration is rolled back on its own; earlier migrations stay applied and recorded, and re-running resumes at the failed one after the cause is fixed. If the database is left in an unexpected state, restore from the step-3 restore point. Never use `drizzle-kit migrate`/`push` against production (both are disabled by `drizzle.config.ts`). A database that already has tables but no journal is refused: baselining it is a deliberate manual decision, not a runner flag.

## R6. Deployment checklist and rollback plan

**Before deploying**
- [ ] Review and merge R1 together with the rest of the working tree, in reviewable slices (audit PR-03).
- [ ] Cloudflare (owner): confirm Always Use HTTPS stays on for the `rms-careers.com` zone; add apex → `https://www.rms-careers.com/$1` 301 redirect rule; optionally enable zone HSTS after one stable week; WAF rate rule / managed challenge on `POST /login`, `/api/auth/*`, `/enroll/*`.
- [ ] Worker secrets (owner): `POSTGRES_URL` (verified new production endpoint) on all three Workers; distinct `AUTH_SECRET` for student and admin; `AUTH_GITHUB_ID/SECRET` (admin); `RESEND_API_KEY`, `EMAIL_FROM` (student, admin) and `PARTNER_ENQUIRY_TO` (web) — now `secrets.required` in `wrangler.jsonc`.
- [ ] Rate-limit bindings exist after deploy: student `AUTH_ACCOUNT_RATE_LIMITER` 1301, `AUTH_CLIENT_RATE_LIMITER` 1302; admin 1201, 1203, `PUBLIC_FORM_RATE_LIMITER` 1202; web 1101.
- [ ] Database initialized per §R5; first super_admin created; one disposable student test account and one admin test account created for smoke tests.
- [ ] Record each Worker's current version id (`wrangler versions list --name rms-<app>`) as the rollback anchor.
- [ ] Announce: every admin and student signs in again after this deploy.
- [ ] Build from a clean, env-free Linux checkout (WSL/CI): `pnpm install --frozen-lockfile && pnpm --filter @rms/<app> cf:build`; the post-guard must report no embedded variables.

**Deploy order:** student → smoke → admin → smoke → web → smoke (one app at a time).

**Post-deploy verification (each app)**
- [ ] `pnpm test:e2e:prod` green; `http://` → 301 on all four hosts; security headers incl. `Strict-Transport-Security` present; `/login?callbackUrl=foo` = 200.
- [ ] Student (authorized test account, `pnpm test:e2e:prod:auth`): sign-in from `/login` lands on `/overview`; sign-out → `/overview` redirects to `/login`.
- [ ] Admin (authorized test account, manual or a future `prod:auth` admin project): sign-in persists; sign-out ends the session.
- [ ] `wrangler tail rms-<app>` shows no `[student-auth]`/`[admin-auth]`/`[sign-out]` errors during the smoke.

**Rollback**
* Code/config: `wrangler rollback <recorded version id> --name rms-<app>` (or the `rollback.yml` workflow once deployment records exist), then `node scripts/ci/smoke.mjs --app <app> --production`. Rolling back restores the old sign-in/sign-out defects and removes the rate-limit bindings' effect; it does not undo database changes.
* Session effects: none persistent — after a rollback users sign in again; `users.updated_at` stamps from sign-outs are harmless to the old code.
* Database: the R1 code needs no schema change, so code can be rolled back independently of the database. A production migration (§R5) is rolled back only by restoring the step-3 restore point (data written since then would be lost — acceptable only before real data exists).

## R7. Final status

**READY FOR REVIEW.** The critical blockers addressed in code — sign-out (both apps), admin session cookie mode, safe migrations and first-admin bootstrap, NAT-safe rate limits, timing equalization, log hygiene, honest login errors, and the broken integration test — are implemented and verified locally in the real runtime against an isolated database. Production rollout is **BLOCKED** on: owner review/merge, production database identification, secrets, a Neon rehearsal branch, and authorized test accounts (§R6). No production system was changed by this work.


---

# Final Remediation Review and Migration Rehearsal — 2026-10-11 (review pass R8)

**Scope.** Independent review of the uncommitted remediation on `ci/phase-4-deploy-building-blocks` @ `917694b` (179 changed paths at the end of this pass; 0 staged, 0 stashes), re-verification of every claim in §R3, a migration/first-admin rehearsal, and a launch-prerequisite check. Nothing was committed, pushed, merged, deployed or migrated. No production or old-production database was contacted. `admin-test-creds.env` was not opened. All earlier sections (A–R7) are preserved unchanged.

## R8.1 Baseline

* `git status`: 177 changed paths at the start (85+ modified tracked files, the rest untracked: remediation code, tests, `e2e/`, `.github/CODEOWNERS|dependabot.yml|workflows/rollback.yml`, `scripts/ci/rollback.mjs`, this report). Pre-existing work in `.github/`, `scripts/ci/`, `docs/` was not touched except this file. `apps/student/lib/actions/auth.ts` is deleted on purpose (R1.2).
* Re-run at the start of this pass (before the review edits): `pnpm typecheck` 5/5 PASS; unit tests db 177, auth 39, web 67, admin 542, student 436 PASS; `pnpm test:ci-scripts` 269/269 PASS — identical to §R3, so the report matched the tree.
* Guard files read in full: `packages/db/src/guard.ts`, `guard-env.ts`, `migration-runner.ts`, `node-tooling.ts`, `scripts/migrate.ts`, `drizzle.config.ts`, `apps/admin/scripts/{bootstrap-first-admin,seed-admin}.ts`, `scripts/lib/first-admin.ts`.

## R8.2 Review findings

Severity: **High** = exploitable or blocks launch; **Medium** = real defect with a bounded impact; **Low** = hardening/cosmetic; **Info** = decision or observation.

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| R8-01 | **Medium** | **Open-redirect bypass in the callback sanitizers (student and admin).** `toSafeCallbackPath` / `toPostLoginTarget` rejected `//` and `/\` only on the *input*. (a) An absolute URL was reduced to its pathname *after* the check, so `https://evil.test//evil2.com/x` became the protocol-relative `//evil2.com/x`; (b) `/<TAB>/evil.com` (also CR/LF/NUL) passes, and WHATWG URL parsing deletes tab/CR/LF, so browsers resolve it to `//evil.com`. Probed: `new URL(toPostLoginTarget(v), 'https://s.example')` → `https://evil.com/` for tab, LF, CR and for the absolute form. Impact is bounded because Auth.js's default `redirect` callback prefixes the base URL (all 8 hostile values stayed on-origin in the real workerd runtime, see R8.6) — but the sanitizer was wrong, the `redirectTo` is passed to a Server Action `redirect`, and the login page echoes the value into a hidden field. | probe test output; fix + 19 tests | **FIXED**: `isSameOriginPath()` validates the *final* path (starts with `/`, not `//`, no backslash, no C0/DEL control characters). `apps/student/lib/auth/callback-url.ts`, `apps/admin/lib/auth-redirect.ts` |
| R8-02 | **Medium** | **Unauthenticated Server Actions in the admin import module.** `getDownloadTemplateCsvAction` and `getDownloadErrorReportCsvAction` had no `auth()` check. Next.js resolves a Server Action by its id from any path the middleware lets through (e.g. the public `/enroll/*` form), so the middleware matcher does not protect them. Pure CPU transforms (no data disclosure), but an anonymous CPU/amplification lever and an inconsistency (in the 12 other admin action modules every exported action calls the DB-revalidating `auth()`; verified by counting exports vs `auth()` calls per file; the public enrollment action is anonymous by design). | code; count per file | **FIXED**: both return `''` for an unauthenticated caller; regression test in `bulk-import-actions.test.ts` |
| R8-03 | **Medium** | **Migration lock is unreliable through Neon's pooled endpoint.** The runner serialises with a *session-level* `pg_advisory_lock`. Neon's `-pooler` host is PgBouncer in transaction mode, which does not support session-level advisory locks, so two runners could interleave unnoticed. The runbook (§R5) did not say which connection string to use, and the pinned test endpoint is itself a pooler URL. | code + Neon pooling documentation | **FIXED**: `rehearsal` and `production` targets now refuse a `-pooler` host with an instruction to use the DIRECT string (runs *after* the identity/collision checks so their more specific refusals win). `packages/db/src/guard-env.ts` + 2 tests. `test`/`development` unchanged |
| R8-04 | Low | **Flaky unit tests** (5 s default timeout vs pure-JS bcrypt and cold dynamic imports under parallel load): `admin-auth.test.ts` failed once in a full run (passes alone 2/2); earlier report saw the same class in `db-transaction-guard.test.ts`. A flaky gate eventually gets bypassed. | `unit2.log`; isolated re-runs | **FIXED**: `testTimeout: 15_000` in `apps/admin/vitest.config.ts` and `apps/student/vitest.config.ts`; no assertion changed. Final full run 1283/1283 |
| R8-05 | Info | The pinned NonProd **test** database has 23 public tables (22 + sentinel) and **no migration journal** (it predates the runner). The real runner connected to it over the Neon WebSocket, passed the identity check and then correctly refused: *"tables but no migration journal"*. Consequence: `pnpm test:db:bootstrap` cannot be re-run on this branch, and it cannot be used to rehearse the runner. Integration tests are unaffected. | `db:migrate --target=test` | Open (owner): recreate the test branch from an empty parent and re-bootstrap, or leave as is |
| R8-06 | Info | `neon.endpoint_id` **is reported** by Neon (verified read-only on the test branch), so `verifyLiveIdentity()` with `requireEndpointReport` will work for rehearsal/production. | probe | Verified |
| R8-07 | Info | `wrangler.jsonc` of `rms-admin` lists `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` under `secrets.required`. A password-only first admin does not need them, but the Worker will not deploy/start without them. | `apps/admin/wrangler.jsonc` | Owner decision: create the GitHub OAuth app, or remove the two names from `required` before the first deploy |
| R8-08 | Info | Formal-assessment XP is awarded *after* the attempt is finalised, in a separate statement. A Worker crash between them loses the +20 XP (never doubles it; the ledger insert is idempotent and the attempt can no longer be submitted again). | `formal-assessment.ts` step 7→8 | Accepted risk; candidate follow-up: award in the same transaction |
| R8-09 | Info | A formal attempt started but never submitted before the deadline+grace stays unsubmitted forever: the student can neither submit nor retake and no score is recorded. | `startFormalAttempt` `TIME_EXPIRED`, `submitFormalAttempt` `DEADLINE_EXCEEDED` | Product decision (auto-finalise as zero, or admin reset) |
| R8-10 | Low | React #418 hydration mismatches are wider than §R4 listed: student `/overview`, `/library`, `/assessments/<id>`, admin `/colleges` (seen in the real runtime). Cause confirmed by grep: ≈35 call sites format dates/times with `toLocale*String()` without `timeZone` in client components (server runs UTC, browsers run local time). Visible effect: a re-render and possible date flicker; no data impact. | Playwright `pageerror`; grep | Open. Not changed (broad, behaviour-neutral refactor; "no speculative rewrites"). Recommended fix: one shared `formatDate(value, opts)` helper that always passes `timeZone: 'Asia/Kolkata'`, with a lint/unit test forbidding bare `toLocale*String` |

**Reviewed and found sound (no change):** sign-out route handlers and matchers (student/admin; fail-closed CSRF, deletion-only cookies, `Cache-Control: no-store`, server-side revocation via `users.updated_at`); pinned `__Host-` cookies; `authTime` fail-closed rule; per-account (5/min) and per-IP (60/min) limits applied inside `authorize()` so the direct Auth.js endpoint is covered, client-first ordering, `cf-connecting-ip` as the only IP source; one-bcrypt-per-path timing equalisation; formal-assessment trust model (ownership, attempt-derived batch/quiz, advisory lock per (quiz, student), `WHERE submitted_at IS NULL` single finalisation, server deadline + grace); XP ledger (`ON CONFLICT DO NOTHING` on the `activity_idempotency_idx` that exists in migration 0003, stats upsert driven by the insert); anonymous enrollment (public mode never updates an existing student, staff emails refused, indistinguishable outcomes, bcrypt cost equalised); access-lifecycle SQL predicate; CSV formula escaping (`csvCell` and Papa `escapeFormulae`); security-header builders; the API surface (student: auth + sign-out; admin: auth + sign-out + revoked; web: none) — all other mutations are Server Actions, and every exported admin action now calls the DB-revalidating `auth()` (13 modules checked, 1 anonymous by design).

## R8.3 Files changed in this pass

| File | Change |
|---|---|
| `apps/student/lib/auth/callback-url.ts` | `isSameOriginPath()`; `toSafeCallbackPath` validates the final path |
| `apps/admin/lib/auth-redirect.ts` | same; `toPostLoginTarget` validates the final path |
| `apps/student/lib/__tests__/callback-url.test.ts` | +10 tests (9 hostile values, 1 control) |
| `apps/admin/lib/__tests__/post-login-target.test.ts` | +9 tests |
| `apps/admin/app/(admin)/enrollments/import/actions.ts` | `auth()` guard on the two CSV helper actions (**admin = protected surface; owner to confirm**) |
| `apps/admin/lib/__tests__/bulk-import-actions.test.ts` | +1 test |
| `packages/db/src/guard-env.ts` | `assertDirectHost()` for `rehearsal` and `production` (**DB safety guard — strengthened only; owner to confirm**) |
| `packages/db/src/__tests__/migration-target.test.ts` | +2 tests |
| `apps/admin/vitest.config.ts`, `apps/student/vitest.config.ts` | `testTimeout: 15_000` |
| `docs/audits/production-readiness-audit.md` | this section |

Not touched: `packages/auth/**`, `apps/admin/lib/auth.config.ts`, `packages/db/src/schema.ts`, migration SQL/journal, `.github/`, `scripts/ci/`.
Temporary helper files I created in the repo (`zz-*`) were deleted; the WSL `.dev.vars` files containing the test URL were deleted; the throwaway PostgreSQL cluster was stopped.

## R8.4 Test commands and results (final state of the tree)

| Command | Result |
|---|---|
| `pnpm typecheck` | **PASS** 5/5 workspaces (re-run after the last edit) |
| `pnpm -r --no-bail --if-present test` | **PASS** db **179**, auth **39**, web **67**, admin **552**, student **446** = **1283** (one earlier run: admin `admin-auth.test.ts` timed out at 5 s under load → R8-04; passes alone; clean after the config change) |
| `pnpm test:ci-scripts` | **PASS** 269/269 |
| `pnpm -r --no-bail --if-present test:int` (pinned NonProd test DB, endpoint-verified by the guard) | **PASS** student **17/17** (3 files, incl. `assessment-concurrency`), admin **36/36** (4 files) |
| WSL clean copy (`~/rms-review-20261011`, rsync excluding `.git`, `node_modules`, `.next`, env files; `pnpm install --frozen-lockfile`) → `pnpm cf:build` student, admin, web | **PASS 3/3**; `[cf-env-guard] OK: next-env.mjs contains no embedded environment variables` for each. These run `next build` inside, so they are also the production builds. Repo `.next` folders untouched; native Windows `pnpm build` was deliberately **not** run to avoid overwriting existing artifacts (and `cf:build` cannot run natively, §E) |
| `pnpm test:e2e` with `E2E_STUDENT_BASE_URL=http://127.0.0.1:8791` (tooling + local-student) | **PASS 15/15** (an earlier attempt with `localhost` failed its health probe because Node resolved IPv6 while workerd listens on IPv4 — environment, not product) |
| `pnpm test:e2e:prod` (read-only, GET/HEAD only) | **PASS 6/6** |
| Local workerd journeys (`review-journeys.mjs`, Chromium → WSL `wrangler dev --local --local-upstream`, NonProd test DB, fresh disposable admin with an in-memory password) | **PASS 51/51 checks** (27 student/callback/isolation/formal/empty/direct + 24 admin). The first admin pass had 8 failing steps that were a test-design artefact (five admin sign-ins in a minute legitimately exhausted the 5/min per-account budget, so the sixth sign-in was rate-limited); the admin part was re-run with a 63 s pause: 24/24. Detail in R8.6 |

## R8.5 Migration and first-admin verification

**Neon rehearsal (`db:migrate --target=rehearsal`): BLOCKED — owner action required.** This session has no Neon API key, no `neonctl`, no Neon MCP connector, none of `REHEARSAL_DATABASE_URL`, `REHEARSAL_DATABASE_ENDPOINT`, `RMS_PRODUCTION_DB_ENDPOINT`, `PRODUCTION_DATABASE_URL` set, and nothing identifies the new Neon project/branch. A target cannot be verified, so none was guessed and no command was run against Neon except the read-only plan against the pinned NonProd *test* branch.

What *was* verified instead:

1. `rehearsal` **is a supported target** and resolves only from `REHEARSAL_DATABASE_URL` + `REHEARSAL_DATABASE_ENDPOINT` (Neon host, URL endpoint equal to the pin, direct host only after R8-03, not the test/production/any-app endpoint). 23 target-resolution tests, including the retired old-production database. CLI failure modes executed with nothing set: no target / unknown target / `development` / `rehearsal` / `production` / `production --confirm-production=…` — each exits non-zero **before any connection** (`development` reports the URL as *missing* even though `apps/admin/.env.local` holds one → no fallback to that file). `drizzle-kit push` without `RMS_DB_TARGET=development` is refused, a non-`rms_dev*` Neon URL is refused, `drizzle-kit migrate` is disabled.
2. **Real-Neon transport:** `db:migrate --target=test` connected over WebSocket, passed identity verification and was refused for the right reason (R8-05). `neon.endpoint_id` is reported (R8-06).
3. **Real PostgreSQL 15.4 rehearsal (local, throwaway cluster on 127.0.0.1:55432, databases named `rms_dev_*`) of the actual `runMigrations()` and `createFirstAdmin()` code with the repo's real SQL and journal — 27/27 PASS:** plan lists 5 pending in journal order and creates nothing; apply applies 0000…0004 each in its own transaction (22 tables); journal rows equal drizzle's own `readMigrationFiles` (hash and `created_at`) for all 5; second run is a no-op; **`drizzle-orm`'s own `migrate()` run afterwards is a no-op (interchangeable journals)**; injected failure in a 6th migration (`CREATE TABLE` then `INSERT` into a missing table) → reported, rolled back, no partial table, journal still 5 rows, earlier schema intact, advisory lock released, and after fixing the file a re-run applies only that migration; modified applied migration, database ahead of checkout and tables-without-journal are each refused; a server that does not report a Neon endpoint is refused when identity is required.
4. **Schema equals the Drizzle definitions:** a direct comparison of the migrated database with `schema.ts` — 22 tables, 196 columns (nullability), 26 indexes, 35 foreign keys, 11 enums (all labels) — **no differences**. `drizzle-kit generate` also reports "No schema changes" (snapshots in sync). (`drizzle-kit push --dry` could not be used: it insists on a TLS Neon-style connection.)
5. Enum/transaction behaviour: 0001 `ALTER TYPE … ADD VALUE` and 0002's use of `'active'` in an index predicate are in different transactions, which is exactly what the per-migration transaction design requires; verified on PG 15.4 here and PG 16.4 (PGlite) in R1.

**Not exercised (BLOCKED, marked honestly):** the interactive CLIs end to end (hidden password prompt, typed endpoint confirmation) — this tool has no TTY and the CLIs need a Neon WebSocket endpoint; they are covered by code review and `first-admin.test.ts` (CLI never reads the password from argv or the environment; refuses without a TTY). Neon-side behaviours of a *branch* (restore, pooled/direct hostnames) were not observed.

**First-admin bootstrap (isolated PG 15.4, real code):** creates exactly one `super_admin` with a lower-cased email, `status=active`, only a bcrypt hash stored; no hard-coded password exists anywhere in the path (`--auth=github` stores the hash of a discarded random secret); the password verifies and a wrong one does not; `evaluateAdminSession` (the server-side authorization rule) accepts the new account for a session issued after creation and rejects one issued before `updated_at` (the sign-out revocation rule); **second bootstrap refused**; **an existing non-admin user with that email is refused and gets no role**; **two concurrent bootstraps → exactly one admin**. In the real workerd runtime a super_admin created by the seed path signed in, reached every protected section, signed out and was refused afterwards (R8.6). Recovery if creation fails: the command is one transaction under an advisory lock — a failure leaves no user or role; fix the cause and re-run; if a half-created account somehow exists, restore the step-3 restore point (§R5) or delete the single `users` row by id from the Neon SQL editor, then re-run.

## R8.6 Browser journeys (local workerd, NonProd test DB) — what was and was not covered

| Area | Result |
|---|---|
| Student sign-in from `/login` and `/` → `/overview`; wrong password → generic message, no cookie | PASS |
| Cookie `__Host-student-sess` HttpOnly, Secure, SameSite=Lax; refresh and new tab keep session | PASS |
| Sign-out: `303 → /login`, deletion-only `Set-Cookie`; afterwards direct URL, refresh, new tab, Back + reload all end on `/login`; replay of the pre-sign-out token rejected server-side; re-login works and the current token reaches the page (control); cross-site POST to sign-out → 403 | PASS |
| Callback: deep link survives login (`?callbackUrl=/leaderboards`); unauthenticated deep link → login → back; **8 hostile values** (`//evil.test`, `https://evil.test//evil2.test/x`, `/%09/…`, `/\evil.test`, `javascript:`, and the admin equivalents) never leave the origin (all non-loopback requests were aborted and recorded: 0) | PASS |
| Batch isolation: student → other batch in the same college, → batch in another college; other-college student → Alpha batch; tampered `rms_active_cohort` cookie | PASS (nothing disclosed) |
| Formal assessment: student of another batch and of another college cannot see or start it; eligible student starts, answers, submits once, a second attempt is not offered | PASS |
| Empty state: active student with no enrollment opens `/overview`, `/batches`, `/assessments`, `/leaderboards`, `/library` without an error UI | PASS |
| Direct Auth.js endpoint (student and admin): POST without CSRF token does not sign in; with CSRF, the 6th wrong password for one account in a minute → `rate_limited` | PASS |
| Admin: student credentials rejected; sign-in from `/login` and `/` → `/programs`, session persists, `__Host-rms-admin-sess` HttpOnly/Secure/Lax; 6 sections + 5 batch sub-pages render (path asserted); **super_admin creates a college and sees it listed**; anonymous `/enroll` creates a pending enrollment; anonymous enrollment *with the admin's own email* is acknowledged identically and creates no enrollment and no change to the admin; sign-out, Back/refresh/new tab → `/login`; old token replay never reaches a page; cross-site sign-out → 403; re-login works | PASS |
| `pageerror`s | only React #418 (R8-10) on student `/overview`, `/library`, `/assessments/<id>`, admin `/colleges` |
| **BLOCKED / not covered** | admin portal on an **empty database** at application level (the apps use the Neon HTTP driver and cannot target a local PostgreSQL; the empty-schema first-admin path is covered at SQL level); CSV import through the browser (covered by 31 unit tests); activation / forgot / reset e-mail delivery (no Resend sandbox); authenticated **production** journeys (no authorised production account — the production DB is not initialised); mobile viewport journeys; Windows-native Worker build |

Fixtures written to the **NonProd test DB** (disposable): `admin.review.*@rms-careers.local` and `admin.review2.*@rms-careers.local` (super_admin), `empty.review@rms-careers.local` (student, no enrollment), `Review College <timestamp>`, two pending enrollments (`review.enroll.*`, `Privilege Probe`), one submitted formal attempt by `peer.demo` (single-attempt: that student cannot repeat it), `users.updated_at` bumps from sign-outs.

## R8.7 Launch prerequisites (verified or not)

Live, read-only HEAD/GET at review time (production still runs the HEAD-era code, §C.3):

| Check | Result |
|---|---|
| `http://` → `https://` | **301** on apex, `www`, `student` (after one transient connection reset), `admin` |
| Apex → `www` canonical | **Missing**: `https://rms-careers.com/` returns 200 |
| HSTS and other security headers (CSP, XFO, nosniff, Referrer-Policy, Permissions-Policy) | **Absent** on `www` (and the others) in production; **present** in the working-tree build (verified on the local student workerd: HSTS `max-age=31536000; includeSubDomains`, CSP, XFO DENY, Referrer-Policy). They ship with the deploy |
| Anonymous `student`/`admin` → `/login?callbackUrl=<absolute URL>` | 307, works (old code, accepts absolute URLs; the fixed sanitizer is not deployed yet) |

| Item | State |
|---|---|
| Cloudflare Worker bindings / rate-limit ids | Repo-verified, unique: student `AUTH_ACCOUNT_RATE_LIMITER` 1301 (5/60 s), `AUTH_CLIENT_RATE_LIMITER` 1302 (60/60 s); admin 1201 (5/60), 1203 (60/60), `PUBLIC_FORM_RATE_LIMITER` 1202 (5/60); web `PUBLIC_FORM_RATE_LIMITER` 1101 (5/60). Unit tests assert equality with the in-code fallback and uniqueness. Whether they exist in the account is **unverifiable** (no Cloudflare access) |
| Required Worker secrets (`secrets.required`) | student: `POSTGRES_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`; admin: `POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` (R8-07), `RESEND_API_KEY`, `EMAIL_FROM`; web: `POSTGRES_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `PARTNER_ENQUIRY_TO`. Vars (non-secret, in `wrangler.jsonc`): `STUDENT_APP_URL`, `EMAIL_LOGO_URL`. `AUTH_SECRET` must differ between student and admin. **Presence cannot be verified from here** |
| Resend verified sender | **BLOCKED**: needs the Resend dashboard (domain verified with SPF/DKIM for the `EMAIL_FROM` domain) |
| New production Neon project / branch / endpoint | **Not identified** in this session (see R8.5). Pins required by the tooling: `RMS_PRODUCTION_DB_ENDPOINT` (production) and `REHEARSAL_DATABASE_ENDPOINT` (rehearsal) |
| Session invalidation | Every admin and student must sign in again after the deploy: admin cookie name changes to `__Host-rms-admin-sess`; student/admin sessions without `authTime` fail closed; "sign out all devices" is the accepted semantics (a student's sign-out on a lab PC also ends their phone session) |
| Date-formatting hydration | Open (R8-10) |

## R8.8 Remaining risks and owner decisions

1. **Merge hygiene:** the change set is one large uncommitted tree (179 paths) mixing CI, security, schema tooling, tests and e2e on a CI branch. Review it in slices (suggested: (a) `packages/db` tooling + `db:migrate`; (b) admin/student auth + sign-out + rate limits; (c) formal-assessment/XP/access lifecycle; (d) web partner enquiry; (e) CI/rollback/`e2e/` + docs). Approval-gated files touched by the remediation: `apps/admin/lib/auth.config.ts` (approved earlier), and in this pass `apps/admin/.../import/actions.ts` and `packages/db/src/guard-env.ts` — please confirm both.
2. Neon rehearsal not performed (R8.5) — the one acceptance step this pass could not satisfy.
3. R8-05 (test branch without journal), R8-07 (GitHub secrets), R8-08/R8-09 (assessment edge cases), R8-10 (hydration).
4. Previously recorded and unchanged: per-account limit can be used to delay a victim by ≤1 minute (add Turnstile/WAF), Workers rate limiting is per location and eventually consistent, revoked-admin-token replay by a non-browser client bounces between `/programs`, `/api/session/revoked` and `/login` (observed again: harmless), `completed`-batch write policy and draft-program policy undecided.
5. Production DB identity, Worker secrets, Resend sender, dashboard rules: unverifiable from here (owner).

## R8.9 Recommended release sequence

1. Owner reviews and commits in slices (R8.8-1); CI must be green on each slice (`ci-gate`).
2. **Neon rehearsal** (below) → record the results in the deployment log.
3. Create the production Neon branch; record project, branch, region, **endpoint id**, database; take a restore point.
4. Migrate production with the **direct** connection string (§R5 step 4), then create the first super_admin (§R5 step 5). Unset the variables.
5. Set Worker secrets/vars (R8.7); add the Cloudflare apex → `www` redirect, keep Always Use HTTPS, add WAF rate rules; record each Worker's current version id.
6. Deploy **student → smoke → admin → smoke → web → smoke** from a clean env-free Linux build (`cf:build` post-guard OK). Announce that everyone signs in again.
7. Post-deploy: `pnpm test:e2e:prod`, `http→https`, security headers incl. HSTS, `/login?callbackUrl=foo` = 200, sign-in/sign-out with an authorised test account per app, `wrangler tail` clean.
8. After one stable week: consider zone HSTS.

## R8.10 What the owner must do (dashboards and shell)

**Neon (new account only)**
1. Open the new project. On the *production* branch confirm *Tables* is empty; note its endpoint id (`ep-…`, first label of the host).
2. Create a branch `rehearsal-<date>` from that empty branch (or a separate empty project). Open it → *Connect* → choose role and database, **turn "Connection pooling" OFF** (direct host, no `-pooler`), copy the URL. Do not paste it into a file in the repo.
3. In a PowerShell window (shell only, never a file):
   ```powershell
   $env:REHEARSAL_DATABASE_URL      = '<direct url of the rehearsal branch>'
   $env:REHEARSAL_DATABASE_ENDPOINT = 'ep-<rehearsal endpoint>'
   $env:RMS_PRODUCTION_DB_ENDPOINT  = 'ep-<production endpoint>'   # lets the guard refuse if the two ever collide
   pnpm --filter @rms/db db:migrate --target=rehearsal             # expect: pending 5, nothing applied
   pnpm --filter @rms/db db:migrate --target=rehearsal --apply     # expect: applied 0000 … 0004
   pnpm --filter @rms/db db:migrate --target=rehearsal             # expect: pending none
   pnpm --filter @rms/admin admin:bootstrap-first-admin --target=rehearsal --email=<ops email>   # optional; hidden prompt
   ```
   Then in the Neon SQL editor of the rehearsal branch: `select count(*) from drizzle.__drizzle_migrations;` → 5, and 22 tables in `public`. Delete the branch; clear the variables.
4. (Optional hygiene) recreate the NonProd *test* branch from an empty parent and run `pnpm test:db:bootstrap` (R8-05).

**Cloudflare**
1. Zone `rms-careers.com`: keep *Always Use HTTPS*; add a Redirect Rule *hostname equals `rms-careers.com`* → `https://www.rms-careers.com` + path + query, 301.
2. WAF rate-limiting rule / managed challenge for `POST /login`, `/api/auth/*`, `/enroll/*` on `student` and `admin`.
3. Per Worker (`rms-student`, `rms-admin`, `rms-web`) set the secrets listed in R8.7 (use *different* `AUTH_SECRET` values); decide R8-07; confirm the rate-limit namespaces appear after the first deploy.
4. Resend: verify the sending domain; create the API key; set `EMAIL_FROM` to an address on it.

## R8.11 Rollback and recovery

* **Code:** `wrangler rollback <recorded version id> --name rms-<app>` (or `rollback.yml` once deployment records exist), then `node scripts/ci/smoke.mjs --app <app> --production`. The R1 code needs no schema change, so code can be rolled back independently of the database. Rolling back restores the old sign-out/sign-in defects and removes the new headers; sessions simply sign in again.
* **Database:** a failed migration rolls back on its own and is re-runnable. A completed production migration is undone only by restoring the pre-migration Neon restore point (acceptable only before real data exists). Never use `drizzle-kit migrate/push` against production (disabled).
* **First admin:** one transaction; failure leaves nothing. A lost admin password: re-run is refused by design (an administrator exists) — reset through the admin portal's password flow if available, otherwise by a deliberate manual update of the single `password_hash` using a bcrypt hash generated offline, then record it.
* **Secrets:** rotate `AUTH_SECRET` to invalidate every session of that app immediately.

## R8.12 Final status

**BLOCKED — OWNER ACTION REQUIRED.**

Evidence supports the code as merge-ready: typecheck 5/5, 1283 unit, 269 CI-script, 53 integration, 3/3 Worker builds, 15/15 local and 6/6 production-smoke Playwright, and 51 real-runtime journey checks all pass after three defects were fixed (R8-01…R8-03) — no open code defect remains that I could demonstrate. It is not marked `READY FOR MERGE` because the stated acceptance step, a migration rehearsal on an isolated **Neon** branch, could not be performed (no Neon access; the substitute was a real PostgreSQL 15.4 rehearsal plus a read-only Neon test-branch check), two approval-gated files were edited, and the production database identity, Worker secrets, Resend sender and Cloudflare rules are unverifiable from here. Nothing else prevents the merge once the owner has reviewed the slices and confirmed the two approvals.
