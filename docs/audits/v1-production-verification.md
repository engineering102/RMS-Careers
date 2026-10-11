# RMS Careers — V1 Production Verification Report

**Audit date:** 2026-10-08 · **Baseline:** `main` @ `b5315e3` (clean tree) · **Scope:** `apps/web`, `apps/admin`, `apps/student`, `packages/db`, `packages/auth`
**Mode:** read-only audit. No application code, schema, migrations, or Cloudflare config was modified. Nothing was committed or pushed. This file is the only change.

---

## 0. How to read this report / evidence limits

| Evidence type | Used for | Limits |
|---|---|---|
| Static code reading (all server actions, auth config, entitlement + leaderboard + assessment + XP code, schema, migrations, wrangler/OpenNext config) | Everything | Not exhaustive for every UI component |
| `pnpm typecheck`, `pnpm test`, `pnpm build` | Build health | See §18 — the test suite touches the live DB |
| Unauthenticated `GET`/`HEAD` against production (`student.`, `admin.`, `www.`, apex) | Routing, headers, redirects, one live 500 | No authenticated session was used |
| **Read-only aggregate SQL** against the Neon DB in `apps/student/.env.local` (counts only, no PII) | Real data shape (enrollment statuses, batch/college state) | Assumes `.env.local` points at the production DB (it holds the data you described: real enrollments, a deactivated college, etc.) |
| Authenticated E2E in a browser | **Not performed** — no credentials, and I did not create accounts or write production data | Every "Actual" in the matrix is code/data-derived unless marked *live* |

Anything I could not confirm is marked **UNCONFIRMED** or **BLOCKED**, not guessed.

> **Disclosure:** `pnpm test` includes 5 suites (`student/multi-batch-schema`, `admin/batch-management`, `batch-curriculum`, `content-library`, `multi-batch-import`) that connect to the DB from `.env.local` and insert/delete real rows. I ran the full suite before checking this. Afterwards I queried for leftovers: nothing was created after my run started (12:04 UTC); one test college/student pair (`B1 Test College …`, created 11:37 UTC, i.e. *before* my run) and two archived test programs (`TEST`, `DSA_TEST`, `Bulk Import Test`) already exist from earlier runs. See D-04.

---

## 1. Executive Summary

**V1 is functional and in good structural shape, but not yet reliable for real student cohorts.** Typecheck, 5 test packages (≈417 tests) and builds are green, auth/session design is sound, server-side authorization is consistently applied to student actions, and the formal-assessment timer *is* enforced server-side. The problems are concentrated in **the enrollment → batch → entitlement pipeline**, which your four observations all touch.

**Your four observations — independently verified:**

| # | Observation | Verdict | Root cause | Isolated or systemic? |
|---|---|---|---|---|
| 1 | Need batch-level enrollment form / copy link | **Valid feature gap; underlying model is mostly ready** | Only `/enroll/<programCode>` exists. It creates `pending`, **batch-less**, college-less enrollments. The orchestration service (`createEnrollmentWithStudentProvisioning`) already accepts `batchId` + `collegeId`; nothing in the UI uses them for the public flow. **Admin also has no way to assign a batch to an existing enrollment** (most live enrollments have no batch). | **Systemic** — missing step in the enrollment pipeline |
| 2 | Error opening student platform after login | **Cannot be root-caused from code alone (UNCONFIRMED).** Found 2 concrete defects + 1 data-shape cause (below). | See §4.4 / D-02, D-07, D-08. Needs the exact error text/URL + `wrangler tail rms-student`. | Mix: one isolated crash, one systemic |
| 3 | Assignments not working in student dashboard | **Confirmed real bug** | `submitProjectAssignment` requires `enrollments.status = 'active'`; every other path accepts `('active','confirmed')`, and the admin UI only ever sets `confirmed`. **Admin-confirmed students can open a project but can never submit it.** Separately: admin cannot author assignments at all, and only 1 project exists in the whole DB (in an inactive-college demo batch). | **Systemic** — inconsistent entitlement-status predicate repeated across ~25 queries |
| 4 | College activate/deactivate should affect programs + batches | **Valid; currently not implemented by design** | `setCollegeActiveAction` flips one boolean and its comment says it intentionally touches nothing else. Nothing downstream reads `colleges.is_active`. Live: **batches belong to the deactivated college and are still `active` and fully accessible.** | **Systemic** — no central "is this cohort accessible" rule |

**Top risks:** (1) enrollment-status inconsistency (D-01); (2) the pipeline cannot place a student in a batch from the admin UI (D-02); (3) XP is recorded inconsistently — lecture completions and project approvals never update `student_stats` (D-03); (4) tests mutate the production DB (D-04); (5) no effective rate limiting on login or the public enrollment form (D-05/D-06).

**No P0 (active exploit / data-loss / outage) found.** Authorization on student server actions is solid; the worst integrity issue is an answer-leak after submission (D-12).

---

## 2. Environment / Deployment Baseline

| Item | Finding |
|---|---|
| Monorepo | pnpm 9.15.4; `apps/{web,admin,student}`, `packages/{db,auth}`. `apps/tutor` not present (documented as future) |
| Runtime | Next 15.5.x (resolved), React 19, Auth.js `5.0.0-beta.25`, Drizzle `0.31.4`, `@neondatabase/serverless` HTTP driver; transactions via a per-call WebSocket `Client` (`packages/db/src/tx.ts`) |
| Cloudflare | Three Workers (`rms-web`, `rms-admin`, `rms-student`) via OpenNext 1.20, `nodejs_compat`, compat date `2026-10-04`, custom-domain routes for `www.`, `admin.`, `student.` only |
| Secrets | `POSTGRES_URL`, `AUTH_SECRET` (+GitHub OAuth for admin) declared required; `RESEND_API_KEY`/`EMAIL_FROM` optional; `STUDENT_APP_URL` in `vars` |
| Build guard | `scripts/check-cloudflare-build-env.mjs` blocks `cf:build` when populated `.env*` files exist (good; means a `cf:build` needs `.env.local` moved aside) |
| Prod live checks | See §15 |
| Local gates | `typecheck` ✅ · `test` ✅ · `build` — see §18 |

---

## 3. Feature Inventory (only what exists)

**Public website (`apps/web`)** — landing, `/programs` + `/programs/[code]` (only `active` programs with `college_id IS NULL`), `/curriculum`, guest learning `/learn` + `/learn/dsa/*` (client-side localStorage only), `/login` (portal chooser linking to the three subdomains), `robots`, `sitemap`. **No contact/application/inquiry flow exists** (NOT IMPLEMENTED — flag, not a bug).

**Admin (`apps/admin`)** — credentials + GitHub login; colleges (super_admin only); programs (create, status, college binding); batches (create, curriculum builder, assessments monitor, external-assessment import, project review, analytics + CSV export); content library + quiz authoring; enrollments (list/filter, status change, bulk status, resend email); bulk student import (CSV/XLSX → batch); **public** `/enroll/[programCode]` form. *Not present:* batch status change, batch edit/delete, assignment/rubric authoring, student profile management, enrollment→batch assignment, tutor management.

**Student (`apps/student`)** — activate / forgot / reset / resend-activation; overview (XP, streak, heatmap, deadlines, resume-learning); batches + workspace + curriculum; My Library; content player (lecture/notes/resource/project); DSA practice; assessments (practice, formal timed, projects, external report cards); leaderboards (batch/college, weekly/all-time); notifications; profile; cohort switcher. *There is no page named "Assignments"* — assignments are "Project Assignments" on `/assessments` and `/content/[id]`.

---

## 4. Authentication Verification

### 4.1 What was checked and passed
| Check | Result | Evidence |
|---|---|---|
| Password hashing | PASS — bcryptjs, 12 rounds, malformed hash → `false` | `packages/auth/src/passwords.ts`, 39 auth tests |
| Token hashing | PASS — 32-byte CSPRNG, SHA-256 at rest, constant-time compare | `packages/auth/src/tokens.ts` |
| Student cookie | PASS — `__Host-student-sess`, `HttpOnly; Secure; SameSite=Lax; Path=/`, no `Domain` | `apps/student/lib/auth/config.ts:12-22` |
| Session lifetime | PASS — JWT, 30-day max, 24-h refresh | same file |
| Surface isolation | PASS — separate `AUTH_SECRET`, host-only cookies, no wildcard domain | live `Set-Cookie` shows `__Host-authjs.csrf-token` host-only on both portals |
| Unauthenticated protection | PASS (*live*) — `/`, `/dashboard`, `/overview`, `/robots.txt` → `307 /login?callbackUrl=…`; `/login`, `/activate` public | curl |
| Per-request status re-check (student) | PASS — layout re-queries `users.status` + role on every render, so a suspended student is cut off despite a valid JWT | `entitlements.ts:92-110` |
| Login for inactive/non-student | PASS — `status != active` or missing student role → `null` | `student-identity.ts:20-23` |
| Generic login error (no user enumeration) | PASS | `login/actions.ts` |
| Open redirect via `callbackUrl` | PASS — action requires `startsWith('/')`; Auth.js default redirect callback is same-origin | `login/actions.ts` |

### 4.2 Findings
| ID | Sev | Finding |
|---|---|---|
| A-1 | P2 | **Admin sessions are never re-validated against the DB.** A suspended/demoted admin keeps access for up to 30 days (JWT default). Student side does re-check; admin does not. (`apps/admin/lib/auth.config.ts`, `authorized()` is JWT-only) |
| A-2 | P2 | **GitHub-login admins always get role `admin`**, even if `super_admin` in DB: `token.role = user.role \|\| 'admin'` and OAuth `user` has no role. Super-admin-only actions (colleges) are then unreachable via GitHub. (`auth.config.ts:37`) |
| A-3 | P3 | Student `authorized()` branch that redirects an already-signed-in user away from `/login` is **dead code**: the middleware matcher excludes `login`. Signed-in users can still view `/login`. |
| A-4 | P3 | Admin uses default Auth.js cookie names (`__Secure-…`) rather than `__Host-`. Still host-only; defense-in-depth only. |
| A-5 | P3 | `trustHost: true` everywhere with no `AUTH_URL`. Acceptable behind Cloudflare custom domains; would matter if a `*.workers.dev` URL is ever exposed. |

### 4.3 Privilege escalation attempts (static)
No path found for student → admin or cross-portal session reuse. Admin middleware (`authorized`) rejects any non-`admin|super_admin` role; server actions additionally call `auth()`/`requireAdmin()`.

### 4.4 Observation #2 — "error when I open the student platform after login"

**Result: UNCONFIRMED root cause.** I traced the whole path (`loginAction` → `/dashboard` → `/overview` → `(dashboard)/layout` → entitlement → overview queries) and checked the live data. The relevant facts:

1. **Login → landing is correct code.** Typecheck/tests pass; all 7 *active* student accounts in the DB have a student row, a college and a stats row, so the entitlement lookup resolves for all of them (5 have a batch-attached `active`/`confirmed` enrollment, 1 has none → "No Active Batch Enrollments" empty state, which is a message, not an exception).
2. **Concrete defect, reproduced live:** `GET /login?callbackUrl=foo` → **HTTP 500**. `login/page.tsx:18` calls `new URL(callbackUrl)` with no try/catch when the value is neither `/…` nor an absolute URL. (D-07)
3. **Misleading error masking:** the login page shows *"You do not have access to the Student Portal."* for **any** `?error=` value — including Auth.js's own `Configuration`, `MissingCSRF`, `UntrustedHost`, `CredentialsSignin` — verified live with `?error=Configuration`. A real infra error would therefore be displayed as an authorization error and is undiagnosable from the UI. (D-08)
4. **Silent failure design:** `getStudentEntitlementContext` and `authenticateStudent` swallow all exceptions and return "not a student" / `null`. Any transient Neon error becomes a redirect to `/login?error=Unauthorized`. (D-08)
5. **Batch-less confirmed enrollments** (6 in DB) make `hasActiveEntitlement = true` while `activeBatches = []`, so the dashboard renders in a half-state ("No Active Batch" pill, no cohort). Not a crash, but a candidate for "something is wrong". (D-02)
6. Not the cause (ruled out): bcrypt CPU on Workers (student has no `limits.cpu_ms` like admin does, which would fail on the *Free* plan only — **please confirm you are on Workers Paid**), db module-load env (admin works with the same pattern), cookie config, missing migrations (all columns used exist in migrations 0000–0004).

**To close this out I need:** the exact URL + visible error text/digest, whether it happens for *every* student or specific accounts, and `wrangler tail rms-student` output while reproducing. Until then it is **BLOCKED** on runtime evidence.

---

## 5. Authorization / RBAC Verification

| Area | Verdict |
|---|---|
| Student server actions (`content`, `dsa`, `quiz`, `projects`, `notifications`, `profile`, `cohort`) | **PASS** — every action calls `requireStudentEntitlement()` and derives `studentId` from the session; no client-supplied student id is trusted. Notification mutations filter on `userId`. Cohort switch validates against server-resolved `activeBatches`. |
| Student read queries | **PASS** — `assertBatchEntitlement`/enrollment joins; unauthorized batch returns 404 (no existence leak) |
| Admin server actions | **PASS with caveat** — 12 action files all call `auth()`/`requireAdmin()`. Colleges require `super_admin`. All others accept *any* admin (see D-14) |
| Public action | `submitStudentEnrollment` is intentionally unauthenticated — see D-05 |
| IDOR | None found on student surfaces. One **client-supplied `batchId` is trusted** in `submitFormalAssessment` (D-12) |
| Template/error-report download actions | Unauthenticated but pure functions of caller input (P3) |

---

## 6. Multi-Batch Verification

| Check | Result |
|---|---|
| Student can hold several batches | PASS — partial unique index `(student_id, batch_id) WHERE status IN ('active','confirmed')`; context builds a deduped `activeBatches` list |
| Cohort resolution | PASS — route > query > validated cookie > first batch; cookie can't select an unentitled batch |
| Leaderboards | PASS — batch XP is `SUM(activities.xp) WHERE activities.batch_id = :batch`; viewer must be enrolled |
| Overview "Active Cohort" | **PARTIAL** — header pill uses the active cohort, but XP/heatmap/deadlines/"Enrolled Batches" are computed across **all** `activeBatchIds`, not the selected cohort (commit message says deadlines were aligned) — D-09 |
| Resume Learning | **FAIL (stale single-batch assumption)** — `getResumeLearningTarget` ignores the cohort switcher and picks its own "primary" batch (soonest deadline, else latest activity, else `enrollments[0]`). The user can be in Batch B in the switcher while "Resume" points into Batch A. `resume-learning.ts:60-112` |
| Library/content | **PARTIAL** — entitlement is *program-OR-batch*, so a student in any batch of program P sees all published content with `program_id = P`, whether or not it is placed in their batches; content visibility isn't batch-scoped |
| Completed batches | **INCONSISTENT** — `assertBatchEntitlement`/`getContentItem` allow `completed`; context, library, quizzes, DSA, leaderboards do not |
| No-batch / one-batch / many-batch | no-batch → empty state or half-state (D-02); one-batch → redirect to workspace; many → selector |
| Stale-term search (`primaryBatch`, `activeBatch`, `first batch`) | `resume-learning.ts` (above), `entitlements.ts` fallback `activeBatches[0]` (intentional), `projects.ts` "first enrolled batch" fallback when `batchId` omitted |

---

## 7. Database Verification

*Schema was not modified. Items below are findings, separated from confirmed bugs.*

**Confirmed (data-backed)**
- `enrollments.batch_id` is nullable; **most rows are batch-less** (pending and confirmed).
- Some batches belong to an inactive college; they remain `status='active'`.
- Some students have no college and **no `student_stats` row**; some have no user account (never provisioned, pending enrollments).

**Schema observations (potential problems, not bugs)**
| ID | Sev | Observation |
|---|---|---|
| S-1 | P2 | `batches.status` is free `varchar(32)` (UI uses `draft/active/completed/archived`), no CHECK/enum; nothing reads it for access control |
| S-2 | P2 | No unique constraint on `(quiz_id, student_id)` for formal attempts → "single attempt" is check-then-insert (race) |
| S-3 | P2 | `student_stats.college_id` is `NOT NULL`, so students without a college can never have stats; code paths do `if (stats)` and silently skip XP |
| S-4 | P3 | `programs.college_id ON DELETE SET NULL` vs `batches.college_id ON DELETE CASCADE` — inconsistent; deleting a college would cascade-delete batches and their curriculum/enrollments (RESTRICT on `students` and on `enrollments.batch_id` actually blocks it today) |
| S-5 | P3 | `students.college_id` can drift from `student_stats.college_id` (comment says "must sync"; no mechanism) |
| S-6 | P3 | `activities` unique on `(student, type, referenceId)` — `dsa_solved` reference is global per student (DSA progress is not batch-scoped: by design, but XP is batch-attributed only if the client passes a batch) |
| S-7 | P3 | Dead "unmigrated environment" `42703` fallbacks in `apps/web` and `apps/admin` program queries |
| S-8 | P3 | Migrations are consistent with `schema.ts` for every column used by code (checked 0000–0004) |

---

## 8. Student Platform Verification

| Feature | Status | Notes |
|---|---|---|
| Auth/activation/recovery | PASS | single-use hashed tokens; 25 tests |
| Overview | PARTIAL | D-09 scope mixing; unguarded ledger queries can throw to error boundary |
| Batch workspace/curriculum | PASS (code) | |
| My Library / content player | PARTIAL | program-level entitlement (§6) |
| Project assignments | **FAIL** | D-01 |
| DSA practice | PASS | server-authoritative catalog; XP 10/25/50 (D-10) |
| Notifications | PASS | ownership enforced |
| Leaderboards | PASS (logic) | top-50 cap, deterministic ties (xp ↓, streak ↓, id ↑), **no shared ranks**; exposes peers' full names + branch (product decision) |
| Cohort switcher | PASS | |
| 404 / error boundary | PASS | dashboard `error.tsx`, `not-found.tsx` present |

---

## 9. Admin Platform Verification

| Feature | Status | Notes |
|---|---|---|
| Login / role gate | PASS | A-1, A-2 caveats |
| Colleges | PASS | super_admin only; status toggle does not cascade (Obs 4) |
| Programs | PASS | status change doesn't affect existing batches/students |
| Batches | PARTIAL | create only — **no status/edit action**; college must be active, program must belong to college ✔ |
| Enrollments | **PARTIAL** | no batch column, no batch assignment, status changes unvalidated (see D-02/D-15) |
| Bulk import | PARTIAL | batch-aware ✔; every row creates `pending` + sends emails; **non-atomic** (rows commit one at a time, a mid-file failure aborts with partial import and a generic error); ~350 ms bcrypt CPU per *new* student (acknowledged in `wrangler.jsonc`) |
| Content library / quiz authoring | PASS | **no project/assignment/rubric authoring** — `assignments` rows are never created by admin; student read path lazily inserts a default rubric (D-11) |
| Project review | PARTIAL | approval writes an `activities` row (+100 XP) but not `student_stats`, and stamps the date in **UTC** (`toISOString().split('T')[0]`), not IST (D-03) |
| Analytics / CSV | PASS (code) | |

---

## 10. Public Website Verification

| Item | Result (live where noted) |
|---|---|
| `www` home / robots / sitemap | 200 *(live)*; sitemap lists `https://www.rms-careers.com/…` ✔ |
| 404 handling | 404 *(live)* |
| **Apex `rms-careers.com`** | **200, indexable (`robots: index, follow`), no redirect, no canonical** *(live)*. CLAUDE.md says apex must redirect to `www`. Not in `wrangler.jsonc` (only `www` routed) — so this is done (or missing) in the Cloudflare dashboard. D-16 |
| Sitemap `lastmod` | always "now" (request time) — meaningless freshness signal (P3) |
| Sitemap contains `/login` | low-value URL in sitemap (P3) |
| No-price / no-fake-claims guardrails | No pricing or e-commerce found; marketing copy lives in `lib/data/*` ✔. Not exhaustively proof-read for claims |
| Contact/apply flow | NOT IMPLEMENTED |
| `/enroll/NOPE` on admin host | returns **200** with a "Program Not Found" card (soft-404) *(live)* (P3) |

---

## 11. Assessment Verification

| Requirement | Result |
|---|---|
| Practice: unlimited, untimed, retry | PASS — every attempt persisted; first pass +20 XP idempotency via lookup |
| Formal: server-enforced timer | **PASS** — deadline = `startedAt + limit` computed from DB; submit rejected after +2 min grace; resume returns original `startedAt`; late-within-grace marked auto-submitted |
| Formal: single attempt | **PARTIAL** — enforced by check-then-insert, no DB constraint (S-2) |
| Formal: score integrity | PASS — grading server-side from DB answer keys; client score ignored |
| Window enforcement | PASS at *start*; submit doesn't re-check `isPublished`/window (fine given the attempt exists) |
| Expired, never-submitted attempt | **GAP** — start returns `TIME_EXPIRED` forever; the attempt is never finalized (score 0, `submittedAt` null) and there's no autosave, so refresh/crash after the deadline loses work (needs product decision) |
| Explanation suppression until `dueAt` | **FAIL (bypass)** — D-12 |

---

## 12. Leaderboard / Gamification Verification

| Rule | Spec (docs) | Implementation | Status |
|---|---|---|---|
| DSA Easy / Medium / Hard | 10 / 20 / 40 (`RMS_CAREERS_PLATFORM_ARCHITECTURE.md:391-393`) | **10 / 25 / 50** (`actions/dsa.ts`) | NEEDS PRODUCT DECISION |
| Assignment | 50 "on-time" (architecture doc) | **100** on approval, no on-time rule (phase-4 spec says 100) | NEEDS PRODUCT DECISION |
| Lecture | — / 5 (phase-4 spec) | 5 | spec OK |
| Quiz | 20 first pass (phase-4 spec) | 20 | PASS |
| Idempotency | unique `(student,type,ref)` | ledger insert is `onConflictDoNothing`, **but `student_stats` is then updated unconditionally** → a concurrent double-submit can double-count XP | PARTIAL (D-03) |
| `student_stats` updates | single service `recordLearningActivity` | **service has zero callers**; logic is hand-copied 3× (dsa, practice quiz, formal quiz) and absent for lecture + project approval | **FAIL** (D-03) |
| Read-modify-write atomicity | atomic (per service comment) | plain `SELECT` then `UPDATE` over neon-http, not transactional | PARTIAL |
| Streak / IST midnight | Asia/Kolkata | IST via `Intl` in student; **admin approval uses UTC date** | PARTIAL |
| Level | — | `floor(xp/100)+1` | — |
| Where XP is read | | Overview/profile use `student_stats`; batch leaderboard sums `activities`; college leaderboard (stats-based) | **surfaces can disagree** |

---

## 13. Security Audit

| ID | Sev | Finding |
|---|---|---|
| X-1 | P1 | **No effective rate limiting.** (a) `lib/rate-limit.ts` is an in-memory `Map` — per Worker isolate, resets on eviction, useless across isolates. (b) **Login has no rate limit at all** (each guess costs a bcrypt compare). (c) Client IP for limiting is taken from spoofable `x-forwarded-for` instead of Cloudflare's `cf-connecting-ip`. |
| X-2 | P1 | **Public `/enroll/<code>` (on the admin host) is unauthenticated, un-throttled, no CAPTCHA/honeypot**, and each call can create a student + user + bcrypt hash + send two emails. Abuse = DB bloat, email-quota burn, harassment mail to arbitrary addresses, program-capacity exhaustion. |
| X-3 | P2 | No security headers on any app (*live*): no CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, `nosniff`, `Referrer-Policy`. Only student has `X-Robots-Tag`; **admin and web login pages have none** and admin isn't `noindex`. |
| X-4 | P2 | Answer leak / explanation bypass in `submitFormalAssessment` (D-12). |
| X-5 | P2 | Public enrollment page lives on the **admin control-plane host**, weakening the "admin surface is private" posture. Product/architecture decision. |
| X-6 | P3 | `console.error` paths log raw error objects (could include SQL text); tx helper correctly avoids the connection string. |
| X-7 | P3 | Error boundary message is generic ✔; no stack traces observed *(live)*. |
| — | PASS | SQL injection: all queries parameterized via Drizzle/`sql` templates; `ilike` input is escaped in library search. XSS: no `dangerouslySetInnerHTML` found in student actions/pages sampled. CSRF: server actions use Next's origin check; Auth.js CSRF token present *(live)*. Secrets: env guard prevents bundling `.env*`; no secrets in repo. CORS: no custom CORS. GitHub URL validator restricts host to `github.com` (no SSRF). |

---

## 14. Cloudflare Deployment Audit

| Item | Result |
|---|---|
| Config (3 workers, assets, self-reference binding, observability) | PASS |
| `nodejs_compat` + `global_fetch_strictly_public` | OK; project-submission GitHub `HEAD` fetch targets public host ✔ |
| Pure-JS crypto | PASS — `bcryptjs`, Web Crypto; no native modules |
| Transactions | PASS design — WebSocket `Client` per call (`tx.ts`); relies on global `WebSocket` (OK on Workers) |
| CPU limits | Admin sets `cpu_ms: 300000` (Paid). **Student/web do not.** Student login does one bcrypt compare (~250-400 ms CPU) — fine on Paid, **fails on Free**. Confirm plan. |
| In-memory state | Rate limiter is per-isolate (X-1) |
| DB module init | `index.ts` reads `POSTGRES_URL` at import (placeholder fallback). Works today; `tx.ts` correctly reads per call. Fragile if env population timing changes |
| `cf:build` guard | Correctly refuses to build with a populated `.env.local` (your local dev env triggers this by design) |
| Not verified | Worker bundle size, cold-start latency, real Cloudflare caching rules, DNS/zone rules (apex redirect, WAF) — outside the repo |

---

## 15. Domain / Routing Audit

| Check | Result |
|---|---|
| Hyphenated domain only | PASS — no `rmscareers.com` anywhere (grep) |
| Canonical host `www` | sitemap/robots ✔; apex not redirecting (D-16) |
| Portal links from `/login` on web | point to `student.`, `tutor.` (not yet existing), `admin.` — `tutor.rms-careers.com` link is **dead until the tutor app ships** (P3, confirm it renders as "coming soon") |
| Email links | `STUDENT_APP_URL` var set in both workers ✔; admin falls back to `NODE_ENV` switch |
| Auth callbacks | relative, same-origin ✔ |
| Stale references | Admin README still describes Vercel deploy + starter-template remote; admin page titles/layout say **"Academy Enrollment"** (not RMS Careers) including the public form and email sender default `Academy Enrollment <onboarding@resend.dev>`; `docs/architecture/deployment.md` mentions Vercel/`NEXTAUTH_URL` (P3) |

---

## 16. UI/UX Functional Audit

| Item | Result |
|---|---|
| Loading states | present (`loading.tsx` on major student routes) |
| Error states | dashboard boundary ✔; **login page can 500 (D-07) and mislabels errors (D-08)** |
| Empty states | present for no-enrollment, library, assessments |
| Half-state: confirmed enrollment with no batch | confusing (shows "No Active Batch" pill, empty cohort widgets) |
| Destructive confirmations | admin cancel / college toggle use confirm dialogs ✔ |
| Branding | public form + admin chrome say "Academy Enrollment" |
| Accessibility | basic `aria-label`s and `role="alert"` present; **not audited** (no screen-reader/keyboard pass) |
| Responsive | mobile nav present; not visually verified |

---

## 17. Performance Audit

| ID | Sev | Finding |
|---|---|---|
| P-1 | P3 | Overview issues ~10 sequential/parallel HTTP queries per render (neon-http round trip each); fine at current scale (7 active students) |
| P-2 | P3 | `getStudentOverview` runs `quizAttempts` + `assignmentSubmissions` completion lookups unbounded by batch |
| P-3 | P3 | Leaderboard = grouped join over all `activities` for the batch each load; capped at 50 rows but scan is unbounded; index `(batch_id, student_id, date)` helps. Revisit past a few thousand students |
| P-4 | P3 | Admin enrollments list loads all rows, no pagination (small today) |
| P-5 | P3 | Bulk import does 1 transaction + 1 bcrypt per new student sequentially in a single request |
| — | PASS | No N+1 found in the sampled student queries; progress summary is batched |

---

## 18. Testing Coverage

**Results:** `pnpm typecheck` ✅ (db, auth, web, admin, student) · `pnpm test` ✅ web 38, auth 39, student 308 (27 files), admin 32 files · `pnpm build`: see addendum at the bottom.

**Covered well:** password/token primitives, RBAC helpers, activation & recovery, entitlements, cohort resolution, leaderboards, activity/streak engine, enrollment orchestration + import, college management, CSV/XLSX parsing, middleware matcher, sitemap/SEO.

**Gaps (highest value first):**
1. **Entitlement-status contract** — no test asserting that *every* gated action/query agrees on which enrollment statuses grant access. A single parametrised test over `['pending','confirmed','active','completed',…]` would have caught D-01.
2. Login page: `callbackUrl` fuzzing, `?error=` mapping.
3. Authorization negative tests per student server action (student A's `attemptId`/`submissionId`/`notificationId`/`batchId` used by student B).
4. Formal assessment: concurrent start (race), submit with foreign `batchId`, expiry without submit.
5. XP consistency: after each activity type, `student_stats.totalXp == SUM(activities.xp)`.
6. Admin: role matrix (admin vs super_admin) on every action; suspended admin.
7. Public enrollment: throttling/duplicate/capacity race.
8. College deactivation semantics (once decided).

**Process defect (D-04):** 5 "unit" suites hit the live database. Recommend a Neon branch (or a `TEST_POSTGRES_URL` that refuses to run if it equals the app URL) before further development.

---

## 19. Defect Register

| ID | Sev | Area | Defect | Evidence |
|---|---|---|---|---|
| **D-01** | **P1** | Student/Projects | `submitProjectAssignment` accepts only `status='active'`; all other paths accept `active`+`confirmed`; admin UI only sets `confirmed`. Confirmed students cannot submit. | `student/lib/actions/projects.ts:155` vs `entitlements.ts:165`; DB: 16 confirmed vs 4 active enrollments; sole submission belongs to an `active` (seeded) enrollment. **Obs 3** |
| **D-02** | **P1** | Enrollment pipeline | Public form + import create `pending`, public form is **batch-less and college-less**; admin UI cannot assign a batch; confirmed batch-less enrollments grant "entitlement" with zero cohorts. | `admin/lib/db/queries/enrollments.ts:155`; `enroll/[programCode]/actions.ts`; DB: most enrollments batch-less, some students no college, 10 no stats. **Obs 1 (+2)** |
| **D-03** | **P1** | Gamification | `student_stats` not updated by lecture completion (`actions/content.ts`) or project approval (`admin …/batch-projects.ts:599-606`); `recordLearningActivity` is dead code; logic duplicated 3×; stats update runs even when ledger insert conflicted; skipped entirely when no stats row. XP surfaces disagree. | grep: 0 non-test callers of `recordLearningActivity`; `if (stats)` at `dsa.ts:188`, `quiz.ts:248,762` |
| **D-04** | **P1** | Process | Test suites write to the live DB configured in `.env.local`. | 5 suites; leftover test rows in DB |
| **D-05** | **P1** | Security | No effective rate limiting (login none; recovery limiter per-isolate; spoofable IP header). | `student/lib/rate-limit.ts`, `forgot-password/actions.ts:27` |
| **D-06** | **P1** | Security | Public enrollment form has no throttling/bot protection and triggers user creation + emails. | `admin/app/(public)/enroll/[programCode]/actions.ts` |
| **D-17** | **P1** | Access control | `colleges.is_active`, `programs.status`, `batches.status` are never read by student access paths — deactivation has no effect. some batches belong to the inactive college and remain accessible. | grep for `isActive`/`status` in student code; DB. **Obs 4** |
| D-07 | P2 | Student | `/login?callbackUrl=foo` → **500** (unguarded `new URL`). | *live* 500; `login/page.tsx:18` |
| D-08 | P2 | Student | Any `?error=` shows "You do not have access"; entitlement/auth code swallows all DB errors and reports "unauthorized". Hides real incidents (relevant to **Obs 2**). | *live* `?error=Configuration`; `entitlements.ts` catch-all, `student-identity.ts` `catch {}` |
| D-09 | P2 | Multi-batch | Overview mixes all batches regardless of selected cohort; **Resume Learning ignores the cohort switcher** (own "primary batch" heuristic). | `overview/page.tsx`, `resume-learning.ts:60-112` |
| D-10 | P2 | Spec drift | XP table differs from architecture doc (DSA M/H 25/50 vs 20/40; assignment 100 vs 50 on-time). | §12 |
| D-11 | P2 | Admin | Admin cannot author assignments/rubrics; student *page render* (a GET) inserts a default `assignments` row — side effect on read, unique-violation race on first concurrent view. | `student/lib/db/queries/projects.ts:156`; no admin insert |
| D-12 | P2 | Assessment | `submitFormalAssessment` trusts client `batchId` (not checked against enrollment or `attempt.batchId`): (a) substituting any UUID makes the `leftJoin` return `dueAt = NULL` → `explanationsSuppressed=false` → correct answers + explanations returned **before the deadline**; (b) XP is attributed to the supplied batch. | `quiz.ts:606-611`, `:711`, ledger insert `batchId` |
| D-13 | P2 | Assessment | Formal single-attempt and practice first-pass XP are check-then-insert (race); no DB constraint. | S-2 |
| D-14 | P2 | RBAC | Every admin (non-super) can create programs/batches, change enrollment status, import students, publish content; only colleges are super-admin. Confirm intended. | `programs/actions.ts`, `batches/actions.ts` |
| D-15 | P2 | Admin | `updateEnrollmentStatus` has no state-machine validation (e.g. `cancelled → confirmed`, confirming into a duplicate batch hits the partial unique index and surfaces as the generic "Failed to update"); bulk "confirm" has no per-row result. | `enrollments.ts` (admin) |
| D-16 | P2 | Routing | Apex returns 200 and is indexable (no redirect/canonical). | *live* |
| A-1 | P2 | Auth | Admin JWT never re-validated (30 days). | §4.2 |
| A-2 | P2 | Auth | GitHub login drops `super_admin`. | §4.2 |
| X-3 | P2 | Security | No security headers; admin/web lack `noindex`/robots header. | *live* |
| D-18 | P2 | Admin | Bulk import non-atomic; mid-file failure leaves partial import; per-row errors lost. | `import/actions.ts` loop |
| D-19 | P2 | Data | Students without a college get no `student_stats`; quiz/DSA XP silently never reflected in totals/college board. | S-3 |
| D-20 | P3 | Entitlement | Completed-batch handling inconsistent across modules. | §6 |
| D-21 | P3 | Auth | Dead redirect branch in student `authorized()`. | A-3 |
| D-22 | P3 | UX | Soft-404 on unknown program code; "Academy Enrollment" branding; sitemap `lastmod`/`/login`. | §10 |
| D-23 | P3 | Quality | Dead code/hacks: `recordLearningActivity`, `42703` fallbacks, `(row as any).status`, duplicated streak helpers (`getYesterdayDateIst` ×3 with different implementations), `scratch/` dirs checked in, stale README/deployment docs. | grep |
| D-24 | P3 | Assessment | Expired never-submitted formal attempts are stranded; no autosave. | §11 |
| D-25 | P3 | Leaderboard | No shared ranks on ties; full names shown to peers. | §8 |

---

## 20. Recommended Fix Order (whole system)

1. **D-01** one-line status fix + a shared `ENTITLED_ENROLLMENT_STATUSES` constant (unblocks assignments immediately).
2. **D-04** isolate tests from production DB *before any further coding session*.
3. **D-07/D-08** login crash + honest error mapping + logging in the swallowed catches (also gives you the evidence for Obs 2).
4. **D-03/D-19** make one XP service authoritative (atomic, creates missing stats rows) and route every XP source through it; backfill reconciliation script (read-only first).
5. **D-02** admin: show batch on enrollments, "Assign/Change batch" (reuse `transferEnrollment` semantics), prevent confirming batch-less enrollments or at least label them.
6. **D-12/D-13** formal-assessment hardening (use `attempt.batchId`; unique constraint needs a schema decision).
7. **D-05/D-06/X-3** Cloudflare-native throttling (WAF rate rule or Turnstile + `cf-connecting-ip`), security headers.
8. **Obs 1** batch enrollment link, then **Obs 4** college lifecycle (see §21 ordering).
9. D-09, D-10, D-14–D-16, A-1/A-2, then P3s.

---

## 21. Your four requested changes — analysis and safest implementation order

### Dependency map
```
D-01 status predicate ──► shared "entitled statuses" helper ──┐
D-02 batch assignment (admin) ──► Obs 1 batch link ───────────┼──► Obs 4 college lifecycle
D-03/D-19 stats-row/college stamping ─────────────────────────┘      (needs single access rule)
D-07/D-08 + logs ──► Obs 2
```

### Safest order
| Step | Item | Why here | Risk | Schema? |
|---|---|---|---|---|
| 0 | Decisions + evidence: collect Obs-2 logs; decide §22 items; point tests at a Neon branch | Everything after depends on it | none | no |
| 1 | **Obs 3 — fix `submitProjectAssignment`** (status predicate; extract shared constant; add parametrised status test; make the read-path assignment insert `ON CONFLICT DO NOTHING`) | Smallest, isolated, user-visible win; introduces the helper steps 5 reuses | Low | No |
| 2 | **Obs 2 — fix what is provable**: guard `new URL`, map `?error=`, log (not swallow) entitlement/auth DB errors, graceful "confirmed but no cohort" state. Then re-test with real logs; fix root cause if it's something else | Low blast radius; yields diagnostics | Low | No |
| 3 | **Admin enrollment → batch assignment** (batch column + assign/change action; reject confirming a batch-less enrollment or flag it). Backfill the batch-less rows manually/with a reviewed script | Prerequisite for Obs 1 to be coherent; fixes real data | Medium | No |
| 4 | **Obs 1 — batch enrollment link/form**: `/enroll/b/<batchId>` (or token), prefilled program + batch + college; reuse `createEnrollmentWithStudentProvisioning({batchId, collegeId})`; stamp college; ensure `student_stats` row; copy-link button on batch row; **add throttling/Turnstile first (X-2)** | Reuses tested service; depends on 3 and on rate-limit | Medium | No for v1 (UUID link); **Yes** if you want revocable/expiring links (join-token column) |
| 5 | **Obs 4 — college lifecycle**: implement as a **derived "effective access" rule** (`college.active ∧ program ∈ {active} ∧ batch.status ∈ {active,completed}`) in one shared predicate used by student entitlements, public enrollment, admin create dropdowns. **Do not cascade-write statuses**: reactivation can't know which programs/batches were manually archived. Show "inactive via college" in admin lists | Highest blast radius (touches ~25 queries) so last, after the helper from step 1 exists | High | No (derived) / Yes if you prefer persisted cascade with audit |

---

## 22. Product Decisions Required

1. **Batch link semantics:** on submit → `pending` (admin approves) or auto-`confirmed`? Batch capacity vs program capacity? Open link, or token with expiry/revocation (needs schema)? Should it verify college email domain / roll number?
2. **Where the public form lives** (currently on the admin host): move to `www` or `student`?
3. **College deactivation:** block *new* enrollments only, make existing students read-only, or block login? Do programs/batches *become* inactive (derived) or get *rewritten* (cascade)? Restore prior state on reactivation?
4. **Batch lifecycle:** who can change batch status (no action exists), and what does `draft/archived/completed` mean for students?
5. **XP table** (§12) — which is authoritative? "On-time" assignment bonus?
6. **Late project submissions** after `dueAt`: allowed? (currently allowed; `isPastDue` is display-only)
7. **Expired unsubmitted formal attempts:** auto-finalize with saved answers (needs autosave) or zero?
8. **Completed batches:** read-only everywhere or hidden?
9. **Library entitlement:** program-wide or batch-placed content only?
10. **Admin vs super_admin** permission split for programs/batches/enrollments.
11. **Leaderboard privacy** (full names) and tie ranking.
12. **Apex → www** redirect ownership; public contact/application flow (none exists).
13. Plan tier for Workers (CPU limit on student/web).

---

## 23. Overall V1 Readiness Assessment

**Conditionally ready for a controlled pilot with hand-held onboarding; not ready for self-serve cohort scale.**
- ✅ Core security primitives, session isolation, server-side grading/timer, ownership checks, and test hygiene for logic are strong.
- ⚠️ The enrollment pipeline is the weak seam: students can be "confirmed" yet cohort-less, can't submit projects, and XP is partially recorded. These will generate support tickets from the first real cohort.
- ⚠️ Abuse controls (rate limiting, public form) must exist before publicizing enrollment links (Obs 1 raises exposure).
- Obs 2 remains open pending runtime evidence.

---

## Appendix A — Verification Matrix

| Feature | Expected | Actual | Status | Sev | Evidence | Action |
|---|---|---|---|---|---|---|
| Student login | Valid active student signs in; others rejected generically | As expected | PASS | — | code + 25 tests | — |
| Login with odd `callbackUrl` | Safe fallback | 500 | FAIL | P2 | *live* | D-07 |
| Login error display | Accurate message | Everything shown as "no access" | FAIL | P2 | *live* | D-08 |
| Open student platform after login | Dashboard renders | UNCONFIRMED | BLOCKED | ? | §4.4 | logs + repro |
| Session cookie hardening | `__Host-`, HttpOnly, Secure, Lax | As expected | PASS | — | config + *live* | — |
| Student session re-validation | Suspended user cut off | Yes (per request) | PASS | — | entitlements.ts | — |
| Admin session re-validation | Same | No (JWT 30 d) | FAIL | P2 | auth.config.ts | A-1 |
| Protected routes unauth'd | Redirect to login | 307 | PASS | — | *live* | — |
| Cross-portal isolation | Independent | Yes | PASS | — | cookies | — |
| Student server-action authz | Server-derived identity | Yes | PASS | — | all actions | — |
| Admin action authz | Admin only; colleges super | Yes (+ D-14) | PASS | P2 | 12 files | decide RBAC |
| Multi-batch membership | Many batches | Supported | PASS | — | unique idx | — |
| Cohort switch isolation | No leakage | Cookie validated | PASS | — | cohort.ts | — |
| Resume learning follows cohort | Selected cohort | Own heuristic | FAIL | P2 | resume-learning.ts | D-09 |
| Overview scoped to cohort | Selected cohort | All batches | PARTIAL | P2 | overview/page.tsx | D-09 |
| Library batch scoping | Batch-placed content | Program-wide | NEEDS PRODUCT DECISION | P3 | library.ts | §22.9 |
| Project submission | Entitled student submits | Only `active` can | FAIL | P1 | projects.ts:155 | D-01 |
| Admin assignment authoring | Create/edit rubric | Not present | NOT IMPLEMENTED | P2 | grep | D-11 |
| Batch enrollment link | Per-batch form/link | Not present | NOT IMPLEMENTED | — | routes | Obs 1 |
| Assign batch to enrollment | Admin can | Cannot | NOT IMPLEMENTED | P1 | admin UI | D-02 |
| College deactivation effects | Cascades/enforced | Flag only | FAIL (vs request) | P1 | colleges/actions.ts | Obs 4 |
| Practice quizzes | Unlimited, untimed | As expected | PASS | — | quiz.ts | — |
| Formal timer | Server-enforced | Yes | PASS | — | quiz.ts | — |
| Formal single attempt | Enforced | App-level only | PARTIAL | P2 | quiz.ts | D-13 |
| Explanation suppression | Until dueAt | Bypassable | FAIL | P2 | quiz.ts:711 | D-12 |
| DSA XP | 10/20/40 | 10/25/50 | NEEDS PRODUCT DECISION | P2 | dsa.ts | D-10 |
| Lecture XP in total XP | Counted | Ledger only | FAIL | P1 | content.ts | D-03 |
| Project approval XP | Counted, IST | Ledger only, UTC date | FAIL | P1 | batch-projects.ts:599 | D-03 |
| XP idempotency | No dup | Ledger yes; stats racy | PARTIAL | P2 | quiz/dsa | D-03 |
| Streak IST cutoff | Asia/Kolkata | Student yes; admin UTC | PARTIAL | P2 | | D-03 |
| Batch leaderboard | Enrolled-only, batch XP | Yes | PASS | — | leaderboards.ts | — |
| Leaderboard ties | Deterministic | Deterministic, not shared | PASS | P3 | | D-25 |
| Notifications authz | Own only | Yes | PASS | — | notifications.ts | — |
| Email failure isolation | Don't fail transaction | Post-commit, caught | PASS | — | actions | — |
| Rate limiting | Effective | Per-isolate / none on login | FAIL | P1 | rate-limit.ts | D-05 |
| Public form abuse controls | Throttle/CAPTCHA | None | FAIL | P1 | actions.ts | D-06 |
| Security headers | CSP/HSTS/XFO | Absent | FAIL | P2 | *live* | X-3 |
| Apex → www | Redirect | 200 | FAIL | P2 | *live* | D-16 |
| Stale domains | None | None | PASS | — | grep | — |
| Typecheck / tests | Green | Green | PASS | — | CI-local | — |
| Tests safe for prod DB | Isolated | Hit live DB | FAIL | P1 | 5 suites | D-04 |

---

## CRITICAL FINDINGS
- None confirmed at P0. (Closest: D-04 tests writing to the production DB; D-06 unauthenticated user-creating form.)

## HIGH PRIORITY FINDINGS
- **D-01** Confirmed students cannot submit project assignments (Obs 3).
- **D-02** No way to place an enrollment in a batch from admin; public form creates batch-less, college-less students (Obs 1/2).
- **D-03** XP not reflected in `student_stats` for lectures and project approvals; dead central service; duplicated logic.
- **D-04** Test suite mutates production DB.
- **D-05 / D-06** No effective rate limiting; public form abusable.
- **D-17** College/program/batch inactive state not enforced anywhere (Obs 4).

## MEDIUM PRIORITY FINDINGS
- D-07 login 500 · D-08 error masking/swallowed exceptions · D-09 stale single-batch assumptions · D-10 XP spec drift · D-11 assignment authoring/GET-with-write · D-12 explanation bypass / unverified `batchId` · D-13 attempt races · D-14 admin RBAC breadth · D-15 enrollment state machine · D-16 apex · D-18 non-atomic import · D-19 college-less students · A-1, A-2 · X-3 headers.

## LOW PRIORITY FINDINGS
- D-20…D-25, A-3…A-5, S-4…S-8, X-6, P-1…P-5, branding/doc staleness, dead tutor link, sitemap quality.

## NO ISSUES FOUND
- Password/token primitives; student cookie hardening; surface isolation; student server-action authorization (no IDOR found); formal-assessment server-side timer and grading; SQL-injection surface; no `rmscareers.com` references; no pricing/e-commerce on the public site; env-leak build guard; typecheck clean; test suite green.

---

### Addendum — `pnpm build`
`pnpm build` (plain `next build`) succeeded for `web`, `admin` and `student` with no errors. This does **not** exercise the OpenNext/Workers bundle: `cf:build` was intentionally not run because the repo's own guard blocks it while `.env.local` is populated, and it writes `.open-next`. Workers-runtime behaviour is therefore assessed from code + live HTTP checks only. The working tree afterwards contained only this report (`git status`: `?? docs/audits/`).
