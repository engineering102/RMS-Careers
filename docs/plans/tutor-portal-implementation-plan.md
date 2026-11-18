# Tutor Portal: Final Implementation Plan

Status: **approved 2026-10-22** (D-1, D-2, D-5 as revised, D-12). Progress:
- WS-1 (hide public tutor links): merged, #56.
- WS-2 (Auth.js `5.0.0-beta.32`): merged, #58.
- WS-3 (migration 0006): PR #62. **0006 applied to production** (`ep-blue-queen-b4qdn2dc`, `neondb`) by the owner on
  2026-10-29 with the guarded runner; Neon restore branch `pre-0006-2026-10-29`. Also applied to the NonProd test branch.
- WS-4 (`@rms/academic` shared package): merged, #63. WS-5 (atomic review): merged, #65. WS-6 (D-12): merged, #64.
- WS-7 (admin tutor management): merged, #66. WS-8 (live sessions): merged, #67. WS-9 (tutor app, auth): merged, #68.
- WS-10 (tutor features): merged, #69. Choices made while building it:
  - "Last activity" (roster and signals) is the latest of the batch's XP activity, project submissions and quiz attempts;
    the activity ledger alone misses submissions and failed attempts.
  - Signals: inactive from 7 days, no activity after the first week, overdue required items, projects returned for
    changes; none for a completed batch.
  - The curriculum page lists items without resource links.
  - `notFound()` pages render the not-found UI, but the HTTP status is 200 because dashboard routes stream behind
    `loading.tsx` (a Next.js behaviour); the app is `noindex`.
- WS-11 (CI and deploy): merged, #70. Tutor is in every pipeline list but held back as pre-launch (`PRE_LAUNCH_APPS`),
  so it deploys only through an explicit bootstrap. Not built: `tutor:seed` scripts (tutors are created in admin).
- WS-12 (docs): in review. Architecture `docs/architecture/tutor-portal.md`; launch runbook
  `docs/development/tutor-launch.md` (supersedes the step list in §13.5). `docs/audits/launch-readiness-checklist-2026-10.md`
  is not in `main`, so its L-5 entry is not updated here.
- Build hotfix outside the plan: #57 (`--dangerouslyUseUnsupportedNextVersion`, see `docs/architecture/deployment.md`).
Date: 2026-10-22. Branch inspected: `feat/staging-env`, which has many uncommitted changes. Implementation must start from a
clean branch off `main`.

Evidence labels:
- **[V]** verified in the repository or by a read-only command during planning.
- **[M]** measured by an existing repo audit (the source is cited).
- **[A]** assumption, not verifiable without credentials or an owner action.
- **[P]** proposal.
- **[D]** decision that still needs approval.
- Paths marked *(new)* are expected files that do not exist yet. Unmarked paths exist.

Related documents:
- `docs/ui-ux/admin-enrollment-live-lectures-components-plan.md`: the live-lectures design (D-4/D-5), extended here.
- `docs/plans/phase-4-production-deployment-spec.md` (§6): migrations are manual and separate from deploys.
- `docs/audits/scale-and-security-audit-2026-10.md`: H-2 (Auth.js), S-1..S-4.
- `docs/audits/load-testing-2026-10.md`: measured round trips and bcrypt cost.
- `docs/audits/launch-readiness-checklist-2026-10.md`: L-5, the dead tutor link.

The two earlier planning passes (the audit and the blueprint) were delivered in conversation, not as repository files. This
document supersedes them and keeps their findings (see §2.4).

---

## 1. Executive summary

**Scope of the first release.** A fourth, isolated Next.js app, `apps/tutor` (`tutor.rms-careers.com`), where an assigned
tutor can:
- work a cross-batch project-review queue, which is the primary daily surface;
- see assigned batches, read-only rosters with progress, curriculum, assessment participation summaries and live-session
  schedules;
- manage their own profile and password.

The release also needs admin-side tutor lifecycle and assignment management, admin live-session management, and a student
Live page. Reviews from admin and tutor both run through one shared, atomic review function.

**Architecture.**
- A new workspace package, `@rms/academic`, holds the shared review logic and the scope-enforcing academic queries. Every
  query takes a branded `AcademicScope`.
- The tutor app resolves its scope from the database on every request: tutor, role, active flags and assignments. It never
  trusts a JWT claim or a client-supplied `batchId`.
- Reviews run in one `dbTx` transaction: a compare-and-set update, reviewer attribution, an idempotent XP award and the
  in-app notification.

**Key decisions.**
- Auth.js upgrade to `5.0.0-beta.32` as a separate prerequisite PR.
- Additive migration `0006`: `assignment_submissions.reviewed_by_user_id` and the `batch_live_sessions` table.
- Admins may correct and reopen approved reviews. **XP is retained on reopen**, because the ledger has no reversal path (§9.5).
- No per-question assessment data, and in-app notifications only.

**Conflict with baseline decision 5.** The repo's own guardrail says "Admin credentials must never be accessible or verifiable
from student or tutor domains" (`docs/ENGINEERING-GUARDRAILS.md` §1). Giving an existing admin user the tutor role would let
that admin password be verified, and reset, on the tutor domain. The recommended resolution is to reject admin emails for
tutor accounts; the person uses a separate tutor identity (§3, D-5). Confirmation is needed.

**Major risks.**
1. A missed scope predicate leaking data across batches.
2. Launching on the vulnerable Auth.js beta.
3. Behavior drift in admin when the review and query logic moves.
4. A pre-existing race in the student resubmission path (§9.6).
5. CI and deploy scripts that hard-code three apps.

---

## 2. Repository-verified baseline

### 2.1 Data model (`packages/db/src/schema.ts`) [V]

| Entity | Facts relied on |
|---|---|
| `users` | `email` unique. `status`: `pending_activation`, `active`, `suspended`, `archived`. `updated_at` doubles as the session-revocation clock: admin and student both reject sessions issued before it (`apps/admin/lib/session-validation.ts`, `apps/student/lib/auth/session-revocation.ts`). |
| `user_roles` | Unique `(user_id, role)`. Roles: `super_admin`, `admin`, `tutor`, `student`. A user can hold several roles. |
| `tutors` | `user_id` unique, FK to `users` ON DELETE CASCADE. Columns: `full_name`, `headline`, `bio`, `linkedin_url`, `github_url`, `is_active`. |
| `tutor_batch_assignments` | Unique `(tutor_id, batch_id)`, cascade on both sides, `assigned_at`. No role, no history. |
| `assignment_submissions` | Unique `(student_id, assignment_id, batch_id)`. Status enum: `submitted`, `under_review`, `approved`, `resubmission_requested`. Also `score`, `tutor_feedback`, `reviewed_by_tutor_id` (FK to `tutors`, SET NULL), `reviewed_at`, `submitted_at`, `updated_at`. **No index with `batch_id` or `status` leading.** |
| `activities` | XP ledger. Unique `(student_id, activity_type, reference_id)`. Index `(batch_id, student_id, activity_date_ist)`. |
| `student_stats` | `total_xp`, `current_level`, streaks. Fed only by `awardActivityXp`. |
| `notifications` | Keyed by `user_id`, with `type`, `title`, `body`, `action_url`, `is_read`. Index `(user_id, is_read, created_at)`. No dedupe key. |
| `account_tokens` | Hashed (SHA-256), single-use, `activation` or `password_reset`. Index on `token_hash`. |
| `quizzes`, `quiz_attempts` | `quiz_type` is `practice` or `formal`. Attempts have `batch_id` and `tab_blur_count`. Index `(student_id, quiz_id)` only. |
| Migrations | `packages/db/drizzle/meta/_journal.json` ends at idx 5, `0005_external_test_content_type`. **The next migration is `0006`.** |

### 2.2 Behavior [V]

- **Review flow.** `apps/admin/lib/db/queries/batch-projects.ts`:
  - The transition map `computeAllowedTransitions` is at line 479.
  - `updateSubmissionReviewStatus` (line 498) SELECTs the row, then UPDATEs `WHERE id = $id` only, with **no compare-and-set**.
  - It resolves `reviewed_by_tutor_id` from `tutors.user_id = session user`. An admin has no tutors row, so the previous
    reviewer is kept.
  - It awards `PROJECT_APPROVAL_XP = 100` (a constant, not score-based) **after** the update, best-effort, swallowing errors.
  - It emits no notification.
- **Admin review UI.** `projects/actions.ts` checks `session?.user`, which is admin-only because admin `auth()` rejects other
  roles. The UI is two-step: "Start Review" moves `submitted → under_review`, then approve or request resubmission.
- **XP ledger.** `packages/db/src/xp-ledger.ts`, `awardActivityXp`, is one idempotent statement (ledger insert plus stats
  upsert). **No function reverses or decrements XP anywhere in the repo.**
  - Batch leaderboards sum `activities.xp_awarded` (`apps/student/lib/db/queries/leaderboards.ts:72,110,171,277`).
  - Global and level views read `student_stats.total_xp`.
- **`PROJECT_REVIEWED` notification.** Defined in `apps/student/lib/types/notifications.ts`, rendered by the student bell and
  notifications view, formatted in `apps/student/lib/events/dispatcher.ts`. **Never dispatched by any production code.**
- **Student resubmission.** `apps/student/lib/actions/projects.ts:215-265` reads the status, then updates `WHERE id` only.
  It refuses `under_review` and `approved` based on that read.
- **Student progress.** `apps/student/lib/db/queries/progress.ts:326-420`, `resolveBatchProgressSummary`:
  - Lecture, notes and resource items are complete via a `lecture_completed` activity, which is global per student.
  - A quiz is complete when any attempt passed.
  - A project is complete when approved; `resubmission_requested` counts as `needs_revision`.
  - DSA items complete via `student_dsa_progress` by slug; external tests via an imported record.
  - Percentage = completed required ÷ required items. Computed per student in memory.
- **Formal assessments.** Single attempt enforced by an advisory lock plus compare-and-set
  (`apps/student/lib/db/queries/formal-assessments.ts`).
- **Account provisioning.** `apps/admin/lib/db/queries/student-provisioning.ts` uses `dbTx`. `PRIVILEGED_ROLES` (admin,
  super_admin, tutor) blocks attaching a student identity to staff emails.
- **Transactions.** `@rms/db` (neon-http) cannot run transactions. `@rms/db/tx` (`dbTx`) opens one WebSocket client per
  transaction.
- **Tutor management.** `assignTutorToBatch` and `getBatchesForTutor` exist (`apps/admin/lib/db/queries/batches.ts:260-295`)
  but are only called from tests. No UI or script creates tutors.

### 2.3 Auth, platform and CI [V]

- **Auth.js.**
  - Admin and student both run `next-auth@5.0.0-beta.25` with `@auth/core@0.37.2` (`pnpm -r ls`).
  - `pnpm audit --prod` reports critical GHSA-8fpg-xm3f-6cx3 (configuration errors make `auth()` fail open) and
    GHSA-7rqj-j65f-68wh (email normalization), both patched in `>=5.0.0-beta.32`.
  - `npm view next-auth dist-tags` shows `beta: 5.0.0-beta.32` (published 2026-07-20) and `latest: 4.24.15` (v4).
  - The same audit also reports Drizzle 0.31.4 (SQL injection via identifiers, high) and `xlsx` 0.18.5 in admin (high).
- **Cookies and sessions.**
  - Admin: `__Host-rms-admin-sess`. Student: `__Host-student-sess`, JWT max age 30 days, 24-hour update age.
  - Both revalidate in the database on every `auth()` call.
- **Middleware.** The student matcher exempts `api`, `login`, `activate`, `forgot-password`, `reset-password` and
  `resend-activation`. The admin app has **no** password-reset flow.
- **Rate limits.** Namespaces in use: 1101, 1201–1203, 1301–1302, 2101, 2301–2302.
- **Measured costs** [M] (`docs/audits/load-testing-2026-10.md`): a DB round trip is about 94–116 ms (p50 116 ms, range
  74–146). bcrypt cost 12 is about 435 ms CPU.
- **CI app detection.** In `scripts/ci/affected.mjs`, normal-path detection reads apps from the pnpm graph
  (`knownApps`, line 403). Only the degraded fail-closed fallback hard-codes the app list (lines 423-428).
  `INTEGRATION_APPS = ['admin','student']` (line 451).
- **Scripts that hard-code `web|admin|student`:**
  - `scripts/ci/artifact.mjs:38,51,643,949-952`
  - `scripts/ci/deploy-tracking.mjs:18,19,27,344`
  - `scripts/ci/deploy-gate.mjs:94` (validation uses `APPS` from deploy-tracking)
  - `scripts/ci/rollback.mjs:46`
  - `scripts/ci/smoke.mjs:19-37,81`
  - `scripts/ci/deploy.mjs:211` (doc comment)
  - `.github/workflows/deploy.yml` (one job per app, dispatch options)
  - `deploy-app.yml:72`, `rollback.yml:37`, `artifact-poc-app.yml:62`
  - `scripts/ci/__tests__/staging-config.test.mjs:13-14`
  - `e2e/support/targets.ts` (student and admin only)
- **Already tutor-aware.** `tests/load/lib/config.js:34,49` already allows `rms-tutor` and `rms-tutor-staging`.
- **Staging configs.** `wrangler.staging.jsonc` exists for web and student only.
- **DNS.** `nslookup tutor.rms-careers.com` returns a non-existent domain. `student.rms-careers.com` resolves.
- **Public tutor links are live.**
  - `apps/web/components/header.tsx:74-76`
  - `apps/web/components/footer.tsx:100-105`
  - `apps/web/app/login/page.tsx:75-103`
  - FAQ text at `apps/web/lib/data/homepage-content.ts:970`
- **No linter.** No package defines an ESLint or `lint` script. The "lint" gate in this repo is `tsc --noEmit`.
- **Test-config scan.** `packages/db/src/__tests__/test-config-scan.test.ts` auto-discovers every vitest config and requires
  the `setup-unit` or guarded integration setup.

### 2.4 Earlier findings carried forward

| Finding | Where addressed |
|---|---|
| No `apps/tutor`; dead DNS and links | §7 WS-1, §13 |
| Tutor tables exist, no onboarding path | §10 |
| Broken reviewer attribution | §6.1, §9 |
| No review compare-and-set; XP best-effort | §9 |
| `PROJECT_REVIEWED` never emitted | §9.4 |
| No live-session model | §6.2, §10.5 |
| Admin queries unscoped by tutor | §5.3 |
| Auth.js advisories | WS-2 |
| CI hard-coded app lists | §13 |
| `xlsx` and Drizzle advisories | §15, out of scope |
| Staging database status unknown | §13.4 |
| Missing indexes are unmeasured | §14.3 |
| Dirty working tree | header |

### 2.5 Not verifiable during planning [A]

- Whether the NonProd `test` branch (`TEST_DATABASE_URL`) is reachable today. `.env.test.local` exists locally; I did not read
  it. Earlier project notes recorded it as verified on 2026-10-18.
- Whether the Neon **staging** branch still exists. `.env.staging.local` exists locally, but earlier project notes record the
  branch as likely deleted on 2026-10-18.
- Whether the `rms-*-staging` Workers are deployed.
- Production data volumes, and whether any production submissions have been reviewed.
- Whether rate-limit namespaces 1401/1402 are free account-wide. They are unused in the repo.
- Whether `custom_domain: true` will create the DNS record automatically.
- Whether the Auth.js JWT salt makes tokens non-interchangeable across cookie names. Test T-07 will prove the actual guarantee.

---

## 3. Decision register

| ID | Decision | Status | Rationale | Consequence |
|---|---|---|---|---|
| D-1 | Upgrade `next-auth` to `5.0.0-beta.32` in admin and student as a **separate PR before** the tutor app is integrated; the tutor app starts on beta.32 | Accepted baseline; **owner approval for the PR** | Two critical advisories [V] | Touches the protected auth area. Gated by the existing auth tests plus a manual login check. |
| D-2 | Migration `0006`: `reviewed_by_user_id` and `batch_live_sessions` | Accepted baseline; **owner approval of the schema diff** | Attribution needs a user-level reviewer. Live sessions need their own table (content-item reuse breaks XP and progress; plan D-4). | Edits `schema.ts`, a guardrail file. Additive only. |
| D-3 | Admin overrides: correct score or feedback on an approved submission; reopen approved → `under_review`. **XP retained**, never duplicated. | Accepted, with the XP behavior defined in §9.5 | No reversal path exists; adding one needs an enum value (enum DDL hazard) or negative ledger rows that break the streak logic | A reopened submission that is never re-approved keeps its 100 XP. Documented and shown to admins. |
| D-4 | Live: admin CRUD, tutor view, student Live page; weekly recurrence only | Accepted, with the limits in §6.2 | Keeps tutor and student views on one source | No cancellations, exceptions or host links. |
| D-5 | **Revised:** tutor accounts may **not** reuse an `admin` or `super_admin` email, nor a student-linked email | **Needs confirmation** (conflicts with baseline 5) | Guardrail §1. Admin has no reset flow; a tutor-side reset would create one for admin passwords. A shared `users.updated_at` also couples sign-out across portals. | An admin who teaches uses a second email or identity. `users.email` is unique, so a plus-address works [A]. |
| D-6 | Any assigned tutor (and any admin) may act on an eligible submission; compare-and-set prevents lost updates | Accepted | Equal permissions | The last actor is attributed and the UI shows who holds a claim. |
| D-7 | No per-question responses or answer keys in the tutor app | Accepted | Assessment integrity | Tutors see participation and summary scores only. |
| D-8 | In-app notifications only (existing table) | Accepted | No new provider | Email on review deferred. |
| D-9 | Production migration is a manual owner step with a restore point | Accepted | Matches the deployment spec §6 [V] | A release dependency (§13.5). |
| D-10 | No tutor staging Worker initially | Accepted | Staging database unverified | Validate on NonProd test plus local workerd (§13.4). |
| D-11 | Plan stored at `docs/plans/tutor-portal-implementation-plan.md` | Done | `docs/plans/` exists [V] | This file. |
| D-12 | Student resubmission gains a status guard (§9.6) | **Needs approval** (touches the student app) | Pre-existing race with a tutor claim | One-line `WHERE` change plus a test. |

---

## 4. Product scope and exclusions

**Initial release.**
- Tutor auth: login, activation, password reset, resend activation, sign-out.
- Overview.
- Review queue and review page.
- Batches list and batch home.
- Roster and student detail.
- Curriculum (read-only).
- Assessment participation.
- Live schedule.
- Profile.
- Admin tutor lifecycle, assignments, live-session CRUD, and attributed reviews with overrides.
- Student Live page.
- `PROJECT_REVIEWED` in-app notifications from admin and tutor reviews.

**Excluded (later):**
- Rubric per-criterion scoring.
- Bulk review.
- Charts.
- Tutor email digests and review emails.
- Mock-interview scorecards.
- Shared tutor notes.
- Curriculum delivery state ("mark as taught").
- Assessment authoring, resets or imports by tutors.
- Per-question assessment views.
- XP reversal.
- Live-session exceptions, cancellations and host links.
- An audit-log table.
- Bulk tutor import.
- Lead or assistant tutor roles.
- A tutor staging Worker.

---

## 5. Architecture and trust boundaries

### 5.1 Responsibilities

| Unit | Owns | Must not |
|---|---|---|
| `apps/tutor` *(new)* | Tutor Auth.js instance, guards, Server Components and Server Actions, presentation, input validation (Zod), transaction opening (`dbTx`) | Import from `apps/admin` or `apps/student`; construct an admin scope; write to any table except `assignment_submissions` (review fields), `notifications`, `tutors` (own row), `users` (own password and `updated_at` via auth flows) and `account_tokens` |
| `apps/admin` | Tutor lifecycle, assignments, live-session CRUD, admin review UI, admin-only analytics and CSV | Hold the review state machine (it moves to the package) |
| `apps/student` | Student experience; reads `batch_live_sessions` (published only) | Anything new except the Live page and D-12 |
| `packages/db` (`@rms/db`) | Schema, clients, the `tx` and `xp-ledger` subpaths, migrations | Domain queries for academic review (avoids redeploying `apps/web`, which depends on `@rms/db`) |
| `packages/auth` (`@rms/auth`) | Password and token hashing, `hasRole` | Unchanged in this plan |
| `packages/academic` *(new, `@rms/academic`)* | Scope type and helpers, the review state machine and `reviewSubmission`, project and assessment read queries, tutor aggregates, progress derivation, indicator rules, live-session schedule math, notification text builder | Import a global `db`, read env, import from apps, or depend on `@rms/auth` |

**Why a package rather than app code or `@rms/db`.**
- Two apps need the same review semantics. A copy would drift, and the review owns XP.
- `affected.mjs` deploys every dependent of a changed package. `apps/web` depends on `@rms/db`, so putting review code there
  would redeploy the public site on every review change. A package used only by admin and tutor redeploys only those two.
- `@rms/academic` depends on `@rms/db/schema` (no client side effect), `@rms/db/xp-ledger` and `drizzle-orm`. There is no
  cycle: `@rms/auth` already depends on `@rms/db` types.

### 5.2 What moves, what stays

| Item | Disposition |
|---|---|
| `batch-projects.ts`: types, `computeAllowedTransitions`, overview, list, details, update | **Moves** to `@rms/academic/projects` and `/review`. The admin file becomes a wrapper keeping its exported names and signatures (the default `db` client plus `adminScope()`). |
| `batch-assessments.ts`: `getBatchAssessmentsOverview`, `getBatchAssessmentAttempts`, `getBatchAttemptDetails` | Overview and attempts **move** to `@rms/academic/assessments`. `getBatchAttemptDetails` (per-question) and `generateBatchAssessmentCsv` **stay in admin** (D-7). |
| `batch-analytics.ts` (1,137 lines), `batch-external-assessments.ts`, `curriculum.ts`, `batches.ts` roster, CSV helpers | **Stay.** Tutor gets narrower new queries instead. |
| Student `progress.ts` | **Stays.** `@rms/academic/progress` re-implements the same rules set-based, guarded by a parity test (T-17). |

### 5.3 Scope API (`packages/academic/src/scope.ts`, new) [P]

```ts
declare const brand: unique symbol;
export type AcademicScope =
  | { readonly [brand]: 'scope'; readonly kind: 'all' }
  | { readonly [brand]: 'scope'; readonly kind: 'batches'; readonly batchIds: readonly string[] };
export function adminScope(): AcademicScope;                          // used only by apps/admin
export function tutorScope(batchIds: readonly string[]): AcademicScope; // [] matches nothing
export function inScope(column: AnyPgColumn, scope: AcademicScope): SQL; // TRUE | FALSE | col IN (...)
```

Rules:
- Every exported query or mutation takes `scope` as its first argument after the client, and ANDs `inScope(...)` into every
  statement touching batch-owned rows.
- A `batchId` argument is a filter, never authorization.
- A source-assertion test forbids `adminScope` under `apps/tutor/**` and `apps/student/**`.

### 5.4 Ownership

| Concern | Owner |
|---|---|
| Validation | Zod in the Server Action, plus domain checks (transitions, score bounds) in `@rms/academic` |
| Authorization | Tutor-app guards produce the scope; the package enforces it in SQL |
| Transactions | The calling app opens `dbTx.transaction`; the package receives `tx` |
| Presentation | App components only |

### 5.5 Tutor authentication and session

- **Auth.js instance.** `apps/tutor/lib/auth/config.ts` (edge-safe) plus `lib/auth.ts`. Credentials only, JWT, max age
  30 days, update age 24 hours (student values).
- **Cookie.** `__Host-tutor-sess` (httpOnly, Secure, SameSite=Lax, Path=/, no Domain).
- **Secret.** Its own `AUTH_SECRET`, never reused. `trustHost: true`, `useSecureCookies: true`, as admin pins (PR-10
  rationale in `apps/admin/lib/auth.config.ts`).
- **JWT claims.** `id`, `role: 'tutor'`, `authTime`.
- **Middleware.** Checks only `auth?.user?.role === 'tutor'` (cheap). Matcher exempts `api`, `login`, `activate`,
  `forgot-password`, `reset-password` and `resend-activation`.
- **Per-request revalidation.** `getTutorContext()` is wrapped in React `cache()`, per request only. In one query it joins:
  - `users`, with `status = 'active'`;
  - `user_roles`, with role `tutor`;
  - `tutors`, with `is_active`;
  - `isSessionCurrent(authTime, users.updated_at)`.
  - It also confirms no `admin`/`super_admin` role on that user (D-5, defense in depth).
- **Assignments.** `getAssignedBatchIds(tutorId)` runs in parallel. It joins `tutor_batch_assignments → batches → colleges →
  programs` with batch status in `ACCESS_GRANTING_BATCH_STATUSES` (`active`, `completed`; mirrored from
  `apps/student/lib/db/access-policy.ts`), college active and program not archived.
- **Revocation.**
  - Unassignment, deactivation, suspension and role removal take effect on the next request. Nothing is cached across
    requests or stored in the JWT.
  - Password reset and sign-out stamp `users.updated_at`, revoking every tutor session on every device.
  - Session-gating claims are never trusted without the database check.
- **Sign-in** (`authenticateTutor`). Exactly one bcrypt comparison on every path (equalization hash, as in admin and
  student). Generic failure. Rate-limited per account (5/min) and per client (60/min) via Workers bindings
  `AUTH_ACCOUNT_RATE_LIMITER` (1401) and `AUTH_CLIENT_RATE_LIMITER` (1402), with the in-memory fallback copied from
  `apps/student/lib/security/request-limits.ts`.
- **Activation and reset.** Tutor-local copies of the student flows (`activation.ts`, `password-recovery.ts`), with the
  student join replaced by a tutors join:
  - Tokens are validated as 64-hex.
  - The atomic compare-and-set consume from `account_tokens` is used.
  - The resend response is generic.
  - A reset request for a non-tutor email sends nothing and responds identically.
  - Reset emails link to `TUTOR_APP_URL`.
- **Other hardening.** Callback validation is a copy of `apps/student/lib/auth/callback-url.ts`. Security headers are a copy
  of `apps/student/security-headers.ts` and its test.
- **Errors.** Each guard's denial returns `notFound()` for resources and redirects to `/api/session/revoked` for the session.
  Actions return `{ success: false, error }` with codes, never stack traces.

---

## 6. Data model and migration specification

### 6.1 `assignment_submissions.reviewed_by_user_id` (migration 0006)

```sql
ALTER TABLE assignment_submissions
  ADD COLUMN reviewed_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL;
```

- Written on **every** review transition, by admin or tutor.
- `reviewed_by_tutor_id` is still written when the acting user has a `tutors` row, for compatibility with existing joins.
- Display name is `COALESCE(tutors.full_name, users.name)`, preferring the user-level reviewer.
- **No backfill.** Historical rows cannot be attributed: admin reviews kept the previous or a null tutor. The UI shows
  "Reviewer not recorded" when both columns are null.
- No index (no query filters by it).

### 6.2 `batch_live_sessions` (migration 0006)

```sql
CREATE TABLE batch_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_url text NOT NULL,                 -- validated Zoom join URL (https, *.zoom.us, /j|/my|/w paths), never logged
  joining_instructions text,                 -- rendered as plain text
  recurrence_days smallint[] NOT NULL,       -- ISO weekdays 1..7
  start_time varchar(5) NOT NULL,            -- 'HH:MM'
  duration_minutes integer NOT NULL,
  time_zone varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
  starts_on date,
  ends_on date,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bls_duration_chk CHECK (duration_minutes BETWEEN 15 AND 480),
  CONSTRAINT bls_days_chk CHECK (cardinality(recurrence_days) BETWEEN 1 AND 7
                                 AND recurrence_days <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
  CONSTRAINT bls_time_chk CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT bls_window_chk CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX batch_live_sessions_batch_pub_idx ON batch_live_sessions (batch_id, is_published);
```

No PostgreSQL enum is created, which avoids the enum-in-transaction hazard (CLAUDE.md §5). `time_zone` is fixed to IST in the
admin form for v1 (plan D-5a).

**Supported.**
- Weekly recurring sessions on one or more weekdays.
- An optional date window.
- A one-off session: `starts_on = ends_on` with the matching single weekday, enforced by the admin form.
- Publish and unpublish.
- Next occurrence is computed by a pure function in IST.

**Deliberately unsupported.** Document these in the admin UI help text.
- Cancelling or rescheduling a single occurrence. Workaround: edit the window or days, or unpublish.
- Biweekly or monthly patterns.
- Separate Zoom host or start links. Tutors host via Zoom's alternative-host or co-host settings [A].
- "Live now" status and attendance.
- Time zones other than IST.
- `zoomgov.com`.

**Model risk.** If real teaching needs per-date exceptions, a child table (`batch_live_session_exceptions`) is the additive
extension. It is not planned.

### 6.3 Migration procedure

1. Generate with `pnpm --filter @rms/db db:generate`. Review the SQL; the CHECK constraints may need hand-editing in the
   generated file, which is the Drizzle 0.31 way.
2. Commit `0006_*.sql`, the snapshot and the journal entry (idx 6).
3. Validate on the NonProd **test** branch only:
   - `pnpm test:db:bootstrap` (migrate plus sentinel).
   - The migration tests (T-23).
   - Run the old query set against the migrated schema (forward compatibility).
4. **Production (owner).** Take a Neon restore point, review the SQL, then run `pnpm --filter @rms/db db:migrate` from the
   owner machine with the production URL from outside GitHub (deployment spec §6). Then verify:
   - the column exists and is nullable;
   - the table and index exist;
   - `SELECT count(*)` on `batch_live_sessions` is 0;
   - admin and student smoke tests pass.
5. **Only after step 4** merge the PRs whose code reads the new column or table. Every deploy's `plan` job lists changed
   `packages/db/drizzle/**` files for the approver.
6. **Rollback.** Code rollback needs no database change, because old code ignores the additions. Reverting the schema
   (`DROP TABLE`, `DROP COLUMN`) is an owner decision and would lose live sessions and new attribution. Never roll code back
   to a version that requires a schema that is no longer present.

### 6.4 Indexes

**None in 0006 besides the live-session index.** The candidate indexes are evaluated in §14.3 against query plans.

---

## 7. Implementation workstreams (dependency-ordered PRs)

Each PR passes `pnpm typecheck`, `pnpm test`, `pnpm test:int` (when relevant) and the affected `cf:build` in CI before merge.
**Merging to `main` deploys** the affected apps to production after environment approval.

| PR | Contents | Depends on | Paths |
|---|---|---|---|
| WS-1 | Hide tutor links behind a flag | none | `apps/web/lib/data/portals.ts` *(new)*: `TUTOR_PORTAL_LIVE = false` and the URL. Edits: `apps/web/components/header.tsx`, `apps/web/components/footer.tsx`, `apps/web/app/login/page.tsx`, `apps/web/lib/data/homepage-content.ts` (FAQ text conditional), `apps/web/lib/__tests__/*` (new assertions). |
| WS-2 | Auth.js upgrade admin and student to `5.0.0-beta.32` (D-1) | approval | `apps/admin/package.json`, `apps/student/package.json`, `pnpm-lock.yaml`. Any type fixes in `apps/*/lib/auth*.ts`. Tests: existing `admin-auth`, `auth-timing`, `session-revocation`, `sign-out`, `middleware-matcher`, `login-*`. Add a "error-shaped auth object is signed-out" test per app. |
| WS-3 | Schema and migration 0006 (D-2) | approval | `packages/db/src/schema.ts`, `packages/db/drizzle/0006_*.sql` *(new)*, `drizzle/meta/_journal.json`, `drizzle/meta/0006_snapshot.json` *(new)*, `packages/db/src/__tests__/*` |
| WS-4 | Create `@rms/academic` and move project and assessment reads; admin wrappers; **no behavior change** | WS-3 types | `packages/academic/{package.json,tsconfig.json,vitest.config.ts}` *(new)*, `src/{scope,projects,assessments}.ts` *(new)*. Edits: `apps/admin/lib/db/queries/{batch-projects,batch-assessments,index}.ts`, `apps/admin/package.json` (dependency). Gate: existing `apps/admin/lib/__tests__/{batch-projects,batch-assessments}.test.ts` unchanged and green. |
| WS-5 | Review consistency: `reviewSubmission`, attribution, notification, admin overrides | WS-3, WS-4 (WS-6 if D-12 approved) | `packages/academic/src/{review,notifications}.ts` *(new)*. Edits: `apps/admin/app/(admin)/batches/[batchId]/projects/{actions.ts,projects-client.tsx}` (switch to `requireAdmin()`, open `dbTx`, conflict UI, correct and reopen controls, reviewer display). |
| WS-6 | Student resubmission guard (D-12) | approval | `apps/student/lib/actions/projects.ts` (`WHERE status IN ('submitted','resubmission_requested')`, return `LOCKED_UNDER_REVIEW` on 0 rows), `apps/student/lib/__tests__/projects.test.ts` |
| WS-7 | Admin tutor lifecycle and assignments | WS-3 | `apps/admin/lib/db/queries/tutors.ts` *(new)*, `apps/admin/app/(admin)/tutors/{page.tsx,tutors-client.tsx,actions.ts,loading.tsx}` *(new)*, `apps/admin/lib/email/templates/tutor-invitation.ts` *(new)*, `apps/admin/lib/email/tutor-portal-url.ts` *(new)*. Edits: `apps/admin/lib/email/index.ts`, `apps/admin/app/(admin)/layout.tsx` (nav), `apps/admin/app/(admin)/batches/[batchId]/page.tsx` (Tutors card), `apps/admin/app/(admin)/batches/batches-client.tsx` (tutors column), `apps/admin/lib/db/queries/batches.ts` (idempotent assign, tutors per batch), `apps/admin/wrangler.jsonc` and `.dev.vars.example` and `.env.example` (`TUTOR_APP_URL`). |
| WS-8 | Live sessions: admin CRUD and student Live page | WS-3 | `packages/academic/src/live-sessions.ts` *(new; Zoom URL parser and next occurrence)*, `apps/admin/lib/db/queries/live-sessions.ts` *(new)*, `apps/admin/app/(admin)/batches/[batchId]/live-lectures/{page.tsx,live-lectures-client.tsx,actions.ts}` *(new)*, `apps/admin/components/admin/batch-nav.tsx` (section), `apps/student/app/(dashboard)/batches/[batchId]/live/page.tsx` *(new)*, `apps/student/lib/db/queries/live-sessions.ts` *(new)*, `apps/student/components/batch-workspace/workspace-subnav.tsx` (real link) |
| WS-9 | `apps/tutor` scaffold, auth, guards, shell | WS-2, WS-4 | §13.1 file list |
| WS-10 | Tutor features | WS-5, WS-8, WS-9 | `packages/academic/src/tutor/{overview,roster,review-queue,progress,curriculum,assessments,indicators}.ts` *(new)*; `apps/tutor/app/(dashboard)/**` and `apps/tutor/components/**` *(new)* |
| WS-11 | CI, deploy, rollback and smoke for the fourth app | WS-9 | §13.2 |
| WS-12 | Docs | all | §13.3 |
| Launch | Owner steps, then flip `TUTOR_PORTAL_LIVE` | all | §13.5 |

WS-1 and WS-2 are independent of each other. WS-7 and WS-8 can proceed in parallel after WS-3, but they touch separate
admin files, so they must not overlap in the same files. WS-4 must land before WS-5 and WS-10.

---

## 8. Route and permission matrix (`apps/tutor`)

| Route | Guard | Data returned | Denial |
|---|---|---|---|
| `/login`, `/activate`, `/forgot-password`, `/reset-password`, `/resend-activation` | none (rate-limited) | forms | Generic errors |
| `/api/auth/[...nextauth]` | Auth.js | n/a | n/a |
| `/api/session/revoked`, `/api/session/sign-out` | session | n/a | Clears the cookie, redirects to `/login` |
| `/` | redirect to `/overview` | n/a | n/a |
| `/overview` | `requireTutor` | §14 metrics over scope | Revoked → `/api/session/revoked` |
| `/reviews?status=&batch=&cursor=` | `requireTutor` | Queue rows in scope (student name, roll number, project, batch, status, age, reviewer) | Same |
| `/reviews/[submissionId]` | `requireTutorSubmission`: resolved with `id = $1 AND batch_id IN scope` | Submission, project brief, rubric (display only), links, history, student name, roll number, email | `notFound()` for foreign or nonexistent |
| `/batches` | `requireTutor` | Assigned batches with counts | n/a |
| `/batches/[batchId]` | `requireTutorBatch` | Batch home | `notFound()` |
| `/batches/[batchId]/students` | `requireTutorBatch` | Roster: name, roll number, branch, year, email, completion %, last activity date, flags | `notFound()` |
| `/batches/[batchId]/students/[studentId]` | `requireTutorBatch` and the student's enrollment in that batch (`active`, `confirmed` or `completed`) | Per-item progress **in this batch** | `notFound()` |
| `/batches/[batchId]/curriculum` | `requireTutorBatch` | Week, title, type, required, available-from, due date; resource links only for content types students can open | `notFound()` |
| `/batches/[batchId]/assessments` | `requireTutorBatch` | Per quiz: type, time limit, due date, participants ÷ active students, average %, pass rate, non-attempters list. Per student: best score, passed, attempts count, last submitted time, tab-blur count. **No responses or keys.** | `notFound()` |
| `/batches/[batchId]/projects` | `requireTutorBatch` | Queue filtered to the batch, links to `/reviews/[id]` | `notFound()` |
| `/batches/[batchId]/live` | `requireTutorBatch` | Published and unpublished sessions, next occurrence, Join link | `notFound()` |
| `/profile` | `requireTutor` | Own `tutors` row, email | n/a |

**Server Actions (all guarded).**

| Action | Guard and rules |
|---|---|
| `reviewSubmissionAction(submissionId, expectedVersion, transition, score?, feedback?)` | `requireTutorSubmission`. Allowed transitions: claim, approve, request resubmission, resume (`resubmission_requested → under_review`). **No overrides**, which are admin-only. |
| `updateProfileAction` | `requireTutor`. Writes `tutors` (headline, bio, LinkedIn, GitHub; full name read-only) and **never** `users.updated_at`. |
| `changePasswordAction` | `requireTutor`. Current-password check, then stamps `users.updated_at` (revokes other sessions). |
| `signOutAction` | Stamps `users.updated_at`, same as student and admin. |

**Never visible to tutors:** `students.phone`, `github_url`, `linkedin_url`, `portfolio_url`, `target_companies`,
`primary_language`; quiz questions, options, keys and responses; other batches' rows.

**Student-entered URLs** on a submission (`github_url`, `live_url`) are part of the submission and are shown.

---

## 9. Project-review and XP consistency specification

### 9.1 Transitions

| From | To | Actor | Rules | XP | Notification |
|---|---|---|---|---|---|
| `submitted` | `under_review` (claim) | assigned tutor or admin | none | none | none |
| `under_review` | `approved` | assigned tutor or admin | `score` integer 0..`assignments.max_score`, required by both UIs; the server keeps the existing rule (optional) | `awardActivityXp('assignment_approved', ref = submission.id, 100)` | `PROJECT_REVIEWED` |
| `under_review` | `resubmission_requested` | assigned tutor or admin | non-empty feedback (≤ 5,000 characters [P]) | none | `PROJECT_REVIEWED` |
| `resubmission_requested` | `under_review` (resume) | assigned tutor or admin | existing transition, kept | none | none |
| `approved` | `under_review` (reopen) | **admin only** | reason required; included in the notification body only, since there is no review-history table [P] | **retained** (§9.5) | `PROJECT_REVIEWED` ("Review reopened") |
| `approved` | `approved` (correct) | **admin only** | new score and/or feedback | none (XP is constant) | `PROJECT_REVIEWED` ("Review updated") |
| student resubmit | `submitted` | student | only from `submitted` or `resubmission_requested` (D-12 guard) | none | none |

A claim also sets the reviewer and `reviewed_at`. This is the existing behavior, preserved. `reviewed_at IS NOT NULL AND
status = 'submitted'` identifies a resubmission.

### 9.2 Version token (verified precision issue)

- Drizzle maps `timestamptz` to a JS `Date`, which has millisecond precision. Rows written with `defaultNow()` carry
  microseconds.
- Comparing `updated_at = $jsDate` can therefore spuriously fail.
- **Token:** `updated_at::text`, read with the row and returned to the UI as an opaque string. Compared as
  `updated_at::text = $token`. The lookup is by primary key, so there is no index concern.

### 9.3 Transaction (`reviewSubmission(tx, scope, actor, input)`, `@rms/academic/review`)

```ts
type ReviewActor = { userId: string; tutorId: string | null; kind: 'tutor' | 'admin' };
type ReviewInput = { submissionId: string; expectedVersion: string;
  transition: 'claim' | 'approve' | 'request_resubmission' | 'resume' | 'reopen' | 'correct';
  score?: number | null; feedback?: string | null; reason?: string };
type ReviewResult = { ok: true; status: SubmissionStatusEnum; version: string; xpAwarded: boolean }
  | { ok: false; code: 'not_found' | 'forbidden_transition' | 'conflict' | 'invalid_score' | 'feedback_required' };
```

Steps inside one `dbTx.transaction`:
1. `SELECT … FROM assignment_submissions s JOIN assignments a … WHERE s.id = $id AND inScope(s.batch_id) FOR UPDATE`.
   Zero rows returns `not_found`, the same for foreign and nonexistent submissions.
2. Check `version === expectedVersion`, otherwise return `conflict`. Then check the transition against actor kind and current
   status, the score bounds, and the feedback rule.
3. `UPDATE … SET status, score, tutor_feedback, reviewed_by_user_id = actor.userId,
   reviewed_by_tutor_id = COALESCE(actor.tutorId, reviewed_by_tutor_id), reviewed_at = now(), updated_at = now()
   WHERE id = $id AND updated_at::text = $expectedVersion RETURNING updated_at::text`. Zero rows returns `conflict`.
   This is belt and braces with the `FOR UPDATE` lock.
4. On `approve`, call `awardActivityXp({ studentId, batchId: s.batch_id, activityType: 'assignment_approved',
   referenceId: s.id, xp: 100 }, tx)`.
5. On notifying transitions, `INSERT INTO notifications (user_id, type, title, body, action_url)`:
   - `user_id` is `students.user_id`, skipped if null.
   - The text comes from `buildProjectReviewedNotification()`.
   - `action_url` is `/batches/{batchId}`, a verified student route.
6. Commit. Any error rolls back steps 3–5 together, and the action returns `{ success: false }` with a generic message.

**Deliberate behavior changes** (relative to the admin code today; noted for the reviewer):
- An XP failure now fails the review instead of being logged and swallowed.
- Concurrent edits now return `conflict` instead of last-writer-wins.
- Notifications are now created.
- Admin attribution is now recorded.

**Notification text.**
- `buildProjectReviewedNotification` mirrors the student dispatcher's title format
  (`Project Review: {assignmentTitle}`).
- It omits "Score: …" when there is no score. The current student template prints `Score: 0` for resubmissions; the student
  template itself is not changed.
- A parity unit test pins the title and type (T-13).

### 9.4 Idempotency and concurrency outcomes

| Scenario | Outcome |
|---|---|
| Double-click or retry of the same approve | The second call sees a new version, so `conflict`. The UI reloads and shows "already approved". Ledger unique index guarantees ≤1 XP row. |
| Two tutors approve or reject simultaneously | The row lock serializes them. The first commits; the second fails the version check, so `conflict`. Exactly one XP award and one notification. |
| Tutor claims while the student resubmits | With D-12, the student update affects 0 rows and returns `LOCKED_UNDER_REVIEW`; the claim stands. Without D-12 this is the existing race (§9.6). |
| Stale tab acts after resubmission (ABA) | `updated_at` changed, so `conflict`. |
| Admin re-approves after reopen | The ledger insert hits `ON CONFLICT DO NOTHING`, so `xpAwarded: false`. No duplicate XP. A notification is sent. |
| Failure mid-transaction | Full rollback, with no partial status, XP or notification. |
| Unassigned between page load and action | The scope no longer contains the batch, so `not_found`. |

### 9.5 Reopen and XP (traced)

- XP lives in two places: `activities` rows (feeding batch leaderboards) and `student_stats.total_xp`, `current_level` and the
  streak fields (feeding global views).
- There is no reversal function. Streak fields cannot be recomputed from a decrement.
- Adding reversal would need either a new `activity_type` enum value (the enum DDL hazard) or a negative-amount convention
  that the streak SQL does not model.
- **Decision:** reopen does not touch XP. The approval ledger row stays.
- Consequences:
  - Re-approval awards nothing new.
  - If the submission ends in `resubmission_requested`, the student keeps 100 XP.
  - Student progress (status-based) shows `needs_revision`.
  - The admin reopen dialog states this explicitly.
- XP reversal is deferred and needs its own design.

### 9.6 Pre-existing race (student resubmission)

`apps/student/lib/actions/projects.ts:215-265` checks the status in a read, then updates `WHERE id`. A claim committed
between the two is overwritten back to `submitted`, and the reviewer then reviews a changed submission.

Proposed fix (D-12): add the status predicate to the UPDATE and treat 0 rows as `LOCKED_UNDER_REVIEW`.

### 9.7 Historical attribution limits

- Pre-0006 admin reviews have `reviewed_by_tutor_id` of null or a stale value, and no `reviewed_by_user_id`.
- Pre-0006 reviews emitted no notifications, and none will be sent retroactively.

---

## 10. Admin prerequisites and workflows

All new admin actions use `requireAdmin()` (`apps/admin/lib/authz.ts`), Zod validation and the structured
`{ success, error, fieldErrors? }` result. This follows note N-4 in the live-lectures plan.

### 10.1 Create and invite a tutor (`createTutorAccount`, `apps/admin/lib/db/queries/tutors.ts`, new)

Input: email, full name, optional headline.

**Email rules** (D-5):

| Existing user | Result |
|---|---|
| None | Create the account |
| Student-linked (`students.user_id`) or has the `student` role | Reject: "Email belongs to a student account" |
| Has `admin` or `super_admin` | Reject: "Use a separate email for the tutor account" |
| Has `tutor` | Return "Already a tutor" (idempotent; offer Resend) |
| Exists with no roles (orphan) | Reject; manual review |

**Transaction (`dbTx`).**
1. Insert `users` (`pending_activation`, random placeholder bcrypt hash).
2. Insert `user_roles('tutor')` ON CONFLICT DO NOTHING.
3. Insert `tutors` (full name, headline).
4. Insert an `account_tokens` activation token (168 hours), using the same code path as student provisioning.
5. Commit. A failure at any step rolls back all four.

**After commit.** Send the `tutor-invitation` email via the existing Resend wrapper with `${TUTOR_APP_URL}/activate?token=…`.
If the email fails or isn't configured, return `{ success: true, data: { emailSent: false } }` and the UI shows "Created; the
invitation was not sent. Resend". The raw token is never logged or shown.

**Resend invitation.** Only while the user is `pending_activation`. Invalidate the unconsumed activation tokens (set
`consumed_at`) and issue a new one in one transaction, then email it.

### 10.2 Activation, deactivation and reactivation

- **Activation** happens in the tutor app (§5.5). It sets the password hash, `status = 'active'`, `email_verified_at` and
  `updated_at`.
- **Deactivate:** `tutors.is_active = false`. Reactivate: set it to true. `users.status` is untouched. The tutor guard
  denies on the next request. Existing reviews keep their attribution.
- **Suspending the user** (`users.status`) is not part of this UI.
- **Never delete** tutors or users: the FK `SET NULL` would erase attribution. No delete control is provided.

### 10.3 Assign and unassign

The Tutors card on `/batches/[batchId]` lists the assigned tutors (name, email, active flag, assigned date).
- **Assign:** a select over active tutors, then `INSERT … ON CONFLICT (tutor_id, batch_id) DO NOTHING`.
- **Unassign:** `ConfirmDialog`, then `DELETE`.
- Access ends on the tutor's next request.
- Submission history and attribution are on `assignment_submissions`, so they are unaffected.
- `/batches` gains a "Tutors" column, from one grouped query.

### 10.4 Admin review integration

The projects page switches to `reviewSubmission` with `adminScope()` and an actor of `{ userId, tutorId: <their tutors row or null>, kind: 'admin' }`. It adds:
- conflict handling;
- Reopen and Correct controls on approved submissions, with confirm dialogs and the XP note;
- the reviewer name from `COALESCE`.

### 10.5 Live sessions (admin)

A `/batches/[batchId]/live-lectures` tab with list, create, edit, publish and delete (`ConfirmDialog`). The form fields
follow §6.2. The URL is validated by `parseZoomMeetingUrl` (`@rms/academic/live-sessions`) and masked in lists
(`zoom.us/j/••••1234`).

---

## 11. UI and accessibility acceptance criteria

- **Design system.** Reuse the student tokens (`globals.css` CSS variables, `tailwind.config.ts`) and the fonts mechanism
  (`app/fonts.ts`). Copy UI primitives from `apps/student/components/ui/*`, plus `table.tsx`, `sheet.tsx` and
  `pagination-bar.tsx` from admin. Use `sonner` for toasts (already used by admin). **No new UI library.**
- **Layout.** Sidebar from `lg`, a sheet nav below it, and a header with page title and account menu. At 375 px width:
  - no horizontal page scroll;
  - tables collapse to cards or scroll inside a labelled region;
  - targets are at least 44 px.
- **Semantics.**
  - Nav uses `aria-current="page"`. Batch subnav is a `<nav aria-label="Batch sections">`.
  - Tables have `<th scope>`. Status uses a badge with text, never color alone.
  - Form controls have `<label>`s. Errors are linked via `aria-describedby`.
  - Action results go to an `aria-live="polite"` region. Icon buttons have an `aria-label`.
  - Focus rings are visible, and `prefers-reduced-motion` is honored.
- **Keyboard.** Every action is reachable by keyboard. Dialogs trap focus and restore it. The review form submits with Enter
  only from the submit button. The queue's row links are focusable in order.
- **States.**
  - Every route has `loading.tsx` (skeleton matching the layout) and an `error.tsx` boundary with retry and no stack.
  - Empty states use the copy in §8.
  - Success is a toast plus an updated status badge.
  - A review conflict shows a non-dismissable banner: "This submission changed. Reload to see the latest".
- **Indicators.** Shown under the label "Tutoring signals (not grades)", each with an evidence tooltip, for example
  "Last activity 12 Oct 2026".

---

## 12. Test strategy

Tiers are the existing ones:
- **Unit:** Vitest with `setup-unit`; no database.
- **Integration:** `*.int.test.ts` against the guarded `TEST_DATABASE_URL`, NonProd test branch, serial.
- **End-to-end:** Playwright local config, loopback only.
- **CI scripts:** `node --test`.

| ID | Requirement | Test (tier, location) |
|---|---|---|
| T-01 | Every academic query includes the scope predicate | Unit with a SQL-capturing fake client, `packages/academic/src/__tests__/scope.test.ts` |
| T-02 | Tutor A cannot read or act on batch B (pages, actions, queue, detail) | Integration, `apps/tutor/lib/__tests__/authz-isolation.int.test.ts` |
| T-03 | A student in batches A and B: tutor A sees A-only progress and submissions | Integration, same file |
| T-04 | Foreign and nonexistent IDs get identical `notFound` and action error | Unit plus integration |
| T-05 | Unassign, deactivate, suspend, remove role or reset password: the next request is denied | Integration, `session-lifecycle.int.test.ts` |
| T-06 | An email with an admin role cannot be created as a tutor, and cannot sign in to the tutor app even if a role row is forced | Integration, admin `tutors.int.test.ts` plus tutor auth test |
| T-07 | Cross-app token isolation: student and admin JWTs (their cookie names and secrets) are rejected by the tutor app; the tutor JWT is rejected by admin and student | Unit, `apps/tutor/lib/__tests__/token-isolation.test.ts`, plus one assertion added in admin and student |
| T-08 | One bcrypt per sign-in path; rate limits apply | Unit, copies of the student `auth-timing` and `login-rate-limit` tests |
| T-09 | An error-shaped `auth()` value is treated as signed out (GHSA-8fpg) | Unit in admin, student and tutor |
| T-10 | Transition table §9.1, score bounds, feedback rule, admin-only overrides | Unit, `packages/academic/src/__tests__/review.test.ts` |
| T-11 | N parallel approvals: exactly one `ok`, the others `conflict` | Integration, `packages/academic` or the admin int suite |
| T-12 | Exactly one `activities` row and one stats increment, across retries and reopen plus re-approve | Integration |
| T-13 | Exactly one notification per transition; title parity with the student dispatcher; no "Score: 0" on resubmission | Integration plus unit |
| T-14 | Injected failure in the XP or notification step rolls back the status | Integration with a failing fake for step 4 |
| T-15 | Existing admin suites unchanged and green after WS-4 and WS-5 (`batch-projects`, `batch-assessments`, `batch-analytics`, `batch-roster`, `csv-*`) | Existing |
| T-16 | Student suites unchanged (`formal-assessment-integrity`, `assessment-concurrency.int`, `xp-attribution`, `xp-ledger`, `progress`, `projects`, `notifications`) | Existing |
| T-17 | Tutor completion % equals `resolveBatchProgressSummary` for every student in a seeded batch covering all seven content types | Integration, `packages/academic/.../progress-parity.int.test.ts` (imports the student function via a test-only relative path, since the student app exports nothing) |
| T-18 | Indicator boundaries (6 vs 7 days, never active, new enrollee, completed batch) | Unit, `indicators.test.ts` |
| T-19 | Tutor code never references excluded student columns or quiz `responses`, `correct_option_ids` | Source assertion |
| T-20 | Tutor writes only to the allowed tables | Source assertion |
| T-21 | Onboarding: create, invite, activate, login. Injected failure leaves no rows. Duplicate-email matrix §10.1. Resend invalidates the old token. | Integration (admin) plus E2E |
| T-22 | Idempotent assign; unassign preserves history | Integration |
| T-23 | 0006 applies on the bootstrap path; constraints reject bad days, times and windows; old queries still run | Integration on the NonProd test branch |
| T-24 | Zoom URL parser (accept and reject cases), next occurrence in IST, one-off, ended window | Unit |
| T-25 | Query budgets (§14) via a counting client | Integration |
| T-26 | E2E: admin creates and assigns a tutor; student submits; tutor claims and approves; student sees status, XP and notification | Playwright local (new `local-tutor` project) |
| T-27 | Mobile 375 px (no overflow) plus keyboard path through review | Playwright |
| T-28 | Loading, empty and error states render | DOM tests (`*.dom.test.tsx`, existing pattern) |
| T-29 | `cf:build` plus local workerd smoke for the tutor app; CI-script tests with four apps | CI |
| T-30 | With the flag off, no tutor link is rendered on web | Web unit |
| T-31 | Student resubmission blocked after a concurrent claim (D-12) | Integration (student) |
| T-32 | Student Live page shows published sessions only; 404 for non-entitled students | Integration plus unit (student) |

---

## 13. CI/CD and deployment inventory

### 13.1 New app files (`apps/tutor/`, all *new*)

- **Config:**
  - `package.json`: `@rms/tutor`, `dev` on port 3003; `build`, `test`, `test:int`, `typecheck`, `cf:build`, `preview`,
    `deploy`; dependencies mirroring student plus `@rms/academic` and `sonner`; `next-auth@5.0.0-beta.32`.
  - `tsconfig.json` (`@/` alias), `next.config.ts`, `open-next.config.ts`.
  - `wrangler.jsonc`:
    - name `rms-tutor`;
    - route `tutor.rms-careers.com`, `custom_domain: true`;
    - `WORKER_SELF_REFERENCE`;
    - var `TUTOR_APP_URL`;
    - rate limits 1401 and 1402 (5/60, 60/60);
    - `secrets.required`: `POSTGRES_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`;
    - observability on; no placement.
  - `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts` (`setup-unit`), `vitest.int.config.ts` (`setup-int`,
    serial), `middleware.ts`, `security-headers.ts`, `.env.example`, `.dev.vars.example`.
  - `scripts/seed-tutor.ts`: dev and test targets only; production rejected, using the existing `guard-env` pattern.
- **App routes:** `app/{layout.tsx,page.tsx,fonts.ts,globals.css}`, the auth routes, `app/api/{auth,session}`, and
  `app/(dashboard)/…` per §8.
- **Library:** `lib/auth.ts`, `lib/auth/{config,session-revocation,sign-out,callback-url,login-errors}.ts`,
  `lib/db/{tutor-context,activation,password-recovery,session-store}.ts`, `lib/guards/{tutor,batch,submission,student}.ts`,
  `lib/actions/{review,profile,password}.ts`, `lib/security/request-limits.ts`, `lib/rate-limit.ts`, `lib/email/*`,
  `lib/format/*`.
- **Components:** `components/{ui,shell,overview,reviews,batches,roster,live}/*`, and `lib/__tests__/*`.

### 13.2 Existing files that must change for a fourth app

| File | Change | Test coverage |
|---|---|---|
| `package.json` (root) | `dev:tutor`, `tutor:seed`, `tutor:seed:test` (`build`, `test` and `typecheck` use `-r` and need no change [V]) | none |
| `scripts/ci/affected.mjs` | Add `tutor` to the degraded fallback lists (423-428). Add `tutor` to `INTEGRATION_APPS` once its int tests exist. Normal detection is automatic [V]. | `affected.test.mjs`: four-app graph, fallback, `packages/academic` change marks admin and tutor deployable and not web or student |
| `scripts/ci/artifact.mjs` | `APPS`, `EXPECTED_WORKER.tutor = 'rms-tutor'`, regex line 643, `LOCAL_DEV_VARS.tutor` (placeholders only) | `artifact.test.mjs` |
| `scripts/ci/deploy-tracking.mjs` | `APPS`, `ENVIRONMENTS.tutor = 'production-tutor'`, `WORKER_NAMES`, usage text | `deploy-tracking.test.mjs` |
| `scripts/ci/deploy-gate.mjs` | Bootstrap message (line 94); validation derives from `APPS` | `deploy-gate.test.mjs` |
| `scripts/ci/deploy.mjs` | Doc comment (line 211); confirm no other app literals | `deploy.test.mjs` |
| `scripts/ci/rollback.mjs` | `WORKERS.tutor` | `rollback.test.mjs` |
| `scripts/ci/smoke.mjs` | `PRODUCTION_URLS.tutor`, `CHECKS.tutor = loginGate`, error text | `smoke.test.mjs` |
| `.github/workflows/deploy.yml` | `tutor` job (copy of `student`), `tutor` in dispatch options | `deploy-workflow.test.mjs` |
| `.github/workflows/deploy-app.yml` | `case` line 72 | `deploy-workflow.test.mjs` |
| `.github/workflows/artifact-poc-app.yml` | `case` line 62, description | `artifact-poc-workflow.test.mjs` |
| `.github/workflows/artifact-poc.yml` | Add a tutor call if it enumerates apps (verify in WS-11) | same |
| `.github/workflows/rollback.yml` | Options line 37 | `rollback-workflow.test.mjs` |
| `.github/workflows/ci.yml` | No change expected: the build matrix comes from `detect` [V] | covered by `affected` |
| `scripts/ci/__tests__/staging-config.test.mjs` | Add `tutor` to `ALL_APPS` (production namespaces and names); not to `STAGED_APPS` | itself |
| `scripts/ci/__tests__/deployment-docs.test.mjs` | Update if the deployment docs' app-order sentence changes | itself |
| `scripts/check-cloudflare-build-env.mjs` | Update the header comment; confirm no per-app list | n/a |
| `e2e/support/targets.ts`, `e2e/playwright.local.config.ts` | `resolveLocalTutorBaseUrl` (loopback-only, default `http://localhost:3003`); `local-tutor` project | `e2e/tests/tooling` |
| `tests/load/lib/config.js` | None (already includes `rms-tutor`) [V] | n/a |
| `.github/CODEOWNERS` | None (`**/wrangler.jsonc` covers it) [V] | n/a |
| `packages/db/src/__tests__/test-config-scan.test.ts` | None; the new configs must satisfy it | itself |

### 13.3 Documentation

`CLAUDE.md`, `AGENTS.md`, `CODEX.md` (all three have uncommitted local edits on the current branch), and:
- `docs/architecture/{applications,overview,authentication,authorization,database,deployment}.md`
- `docs/development/{setup,testing,deployment}.md`
- `docs/REUSE-MAP.md`
- `docs/audits/launch-readiness-checklist-2026-10.md` (L-5 status)
- this plan's status line

### 13.4 Validation without staging

- Integration and migration tests on the NonProd **test** branch.
- `pnpm --filter @rms/tutor preview` (local workerd), following the recorded local-workerd recipe: WSL build,
  `--local-upstream`, one hostname.
- `artifact.mjs` local smoke, plus the deploy dry-run rehearsal (`deploy.yml` `dry_run: true`).
- **A tutor staging Worker becomes justified** when:
  1. a NonProd staging database branch is confirmed to exist and be isolated;
  2. Worker-level latency or placement must be measured (load-testing F-1 and F-2 are unmeasured on Workers); or
  3. real tutors need UAT before launch.
- It would then add `apps/tutor/wrangler.staging.jsonc` (`rms-tutor-staging`, namespaces 2401 and 2402) and extend
  `STAGED_APPS`.

### 13.5 Owner-operated steps (not code)

1. Approve D-1, D-2, D-5 and D-12.
2. Before WS-5, WS-7, WS-8 or WS-10 merge:
   - take a Neon restore point;
   - review `0006`;
   - apply `0006` to production manually;
   - run the post-migration checks (§6.3).
3. GitHub: create Environment `production-tutor` with required reviewers. Confirm the deploy credentials are inherited as
   for the other apps.
4. Cloudflare: set the Worker secrets for `rms-tutor` (`POSTGRES_URL` as the pooled production URL, a new `AUTH_SECRET` from
   `openssl rand -base64 32`, `RESEND_API_KEY`, `EMAIL_FROM`). Confirm rate-limit namespaces 1401 and 1402 are free.
5. Run the first deploy via `deploy.yml` bootstrap (`app: tutor`, one app). Confirm `tutor.rms-careers.com` has a custom
   domain and DNS, and certificate issuance.
6. Set the admin Worker var `TUTOR_APP_URL=https://tutor.rms-careers.com`. It ships in `wrangler.jsonc`; deploys use
   `--keep-vars`, so verify it after deploy.
7. Create the first tutor in admin, assign a batch, and run the production smoke for the tutor app.
8. Merge the flip of `TUTOR_PORTAL_LIVE = true` (a web deploy).

---

## 14. Performance and observability

### 14.1 Baseline (measured) vs targets (proposed)

Measured [M]: about 94–116 ms per round trip; 10–32 queries per student page; bcrypt about 435 ms CPU. **All numbers below
are targets** to validate with T-25 and a local workerd run against the test branch.

| Route | Max queries | Max sequential hops (including the guard) | Strategy |
|---|---|---|---|
| Guard | 2 (parallel) | 1 | `cache()` per request |
| `/overview` | 7 | 2 | Grouped aggregates `GROUP BY batch_id` over the scope in parallel |
| `/reviews` | 3 | 2 | Keyset page plus a count `GROUP BY status` |
| `/reviews/[id]` | 2 | 2 | Authorization and fetch in one statement, plus history |
| `/batches` | 2 | 2 | One grouped query |
| Batch home | 5 | 2 | Parallel |
| Roster (≤ 500 students) | 6 | 2 | One query per completion source, joined in memory; **no per-student loop** |
| Student detail | 6 | 2 | Same sources filtered to one student |
| Assessments | 3 | 2 | Grouped by quiz, plus per-student best attempt via `DISTINCT ON` |
| Review action | 1 transaction, ≤ 5 statements | n/a | One WebSocket connection |

**N+1 prevention.** A counting-client test (T-25) fails on any per-row query. Scope arrays are passed as one
`IN (…)` (bounded by the tutor's assignments, expected under 20 [A]).

**Caching.** Only the per-request `cache()`. No `unstable_cache`, no module-level maps, and no Worker-global caches for
authorization or student data. All dashboard routes are `dynamic = 'force-dynamic'`.

### 14.2 Pagination and filters

- **`/reviews`:** filters `status` (default awaiting claim plus in review), `batch`, `assignment`, and "mine". Ordering is
  `submitted_at ASC, id ASC`, the oldest first. Page size 25. Opaque cursor `(submitted_at, id)`. The count is separate.
  Search is by student name or roll number (`ilike`, bounded by scope).
- **Roster:** the full set is computed per batch; pagination is 50 rows in memory, with sort by name, completion or flag
  count.
- **Batches:** none (expected under 50 per tutor [A]). Client-side filter.

### 14.3 Index evaluation methodology

Candidates:
1. `assignment_submissions (batch_id, status, submitted_at)`.
2. `quiz_attempts (batch_id, quiz_id)`.

On the NonProd test branch, after seeding representative volume:
- `pnpm --filter @rms/student load:seed:test` creates accounts [V script exists]. Submissions and attempts need a fixture
  script, added in WS-10 as test tooling.
- Run `EXPLAIN (ANALYZE, BUFFERS)` on the queue, assessment and roster queries.

Add a migration `0007` only if a query shows more than 10 ms execution, or a sequential scan of more than 50k rows, at
projected volume (1,000 students, 20 projects each, practice attempts at ≥10 per quiz). Record the plans in the PR. **No
index ships without a plan showing the need.**

### 14.4 Observability and privacy

- **Logging.** One structured `console.info(JSON.stringify(…))` line per review action and per authorization denial, in the
  Worker with `observability.enabled` [V in the other apps]:
  - `{ evt: 'tutor.review', outcome, code, transition, submissionId, batchId, tutorId, ms }`
  - `{ evt: 'tutor.authz_denied', resource: 'batch'|'submission'|'student', id, tutorId }`
  - `{ evt: 'tutor.slow_page', route, ms, queries }` when the server time exceeds 1,500 ms [P]
- **Never logged:** emails, names, feedback text, meeting URLs, tokens, passwords, submission URLs or raw driver errors. Error
  class names only, matching the existing `[student-auth]` pattern.
- **Errors.** Actions catch, log the class, and return a generic message. Error boundaries show no details.

---

## 15. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Release-blocking if |
|---|---|---|---|---|---|
| R1 | Cross-batch leak via a missing scope | Medium | High | Branded scope, T-01 to T-04, T-19 | Any of T-01..T-04 fails |
| R2 | Launch on vulnerable Auth.js | Certain without WS-2 | High | WS-2 before WS-9 | The tutor app is not on ≥ beta.32 |
| R3 | Admin regression from WS-4 and WS-5 | Medium | High | Wrappers, unchanged admin suites, separate PRs | T-15 fails |
| R4 | Duplicate XP or notification, lost review | Medium | Medium | §9 transaction, T-11 to T-14 | Any of T-11..T-14 fails |
| R5 | Migration problem in production | Low | High | Additive, restore point, test-branch rehearsal | 0006 is not applied and verified before dependent merges |
| R6 | Tutor and student progress disagree | Medium | Medium | Parity T-17 | T-17 fails |
| R7 | CI or deploy misses the tutor app | High without WS-11 | Medium | §13.2 with tests | The dry-run rehearsal fails |
| R8 | Admin credentials exposed on the tutor domain | Medium if baseline 5 kept | High | D-5 rejection plus a login-time role check | D-5 not resolved |
| R9 | Student resubmission race | Low | Medium | D-12 | Not blocking (pre-existing); documented if declined |
| R10 | Latency exceeds targets | Medium | Medium | Budgets, T-25, index methodology | Not blocking; recorded |
| R11 | Live model too thin for real scheduling | Medium | Low | Documented limits; exception table later | Not blocking |
| R12 | Drizzle 0.31 and `xlsx` advisories | Existing | Medium | Separate dependency work (out of scope) | Not blocking for tutor; tracked |
| R13 | Coupled sign-out via shared `users.updated_at` for multi-role users | Low (with D-5) | Low | D-5 avoids admin and tutor overlap | none |
| R14 | Dirty working tree contaminates PRs | Medium | Medium | Branch from `main` | none |

---

## 16. Implementation sequence

1. **WS-1:** web link flag.
2. **WS-2:** Auth.js upgrade (approval).
3. **WS-3:** schema and 0006 (approval), validated on the test branch.
4. **Owner:** apply 0006 to production (§13.5 step 2).
5. **WS-4:** `@rms/academic` plus admin wrappers (no behavior change).
6. **WS-6:** student resubmission guard (approval). Then **WS-5:** review consistency in admin.
7. **WS-7:** tutor lifecycle. **WS-8:** live sessions plus the student Live page. Both proceed in parallel, on disjoint files.
8. **WS-9:** tutor scaffold and auth.
9. **WS-10:** tutor features.
10. **WS-11:** CI and deploy wiring. The tutor app cannot deploy before this lands, because `deploy.yml` has no tutor job [V].
    That keeps merges of WS-9 and WS-10 deploy-safe.
11. **WS-12:** docs.
12. **Owner:** launch steps §13.5 3–8.

---

## 17. Acceptance checklist (production-ready)

- [ ] T-01..T-32 pass in CI. Integration runs on the NonProd test branch.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm test:int`, `pnpm test:ci-scripts` and `cf:build` for web, admin, student and
      tutor all pass.
- [ ] `pnpm audit --prod` shows no `next-auth` or `@auth/core` advisory.
- [ ] 0006 is applied in production, with the post-checks recorded.
- [ ] Deploy dry-run rehearsal for `tutor` passes, then a bootstrap deploy plus production smoke (`/login` 200, `/` 307 to
      `/login`).
- [ ] A tutor's `/reviews` and roster stay within the §14 query budgets (T-25), with the measured timings recorded.
- [ ] Manual check at 375 px and with keyboard only on overview, reviews, review detail and roster.
- [ ] Admin: create, invite, resend, deactivate and reactivate, assign and unassign, review with attribution, reopen and
      correct, live CRUD all work against the test branch (E2E T-26).
- [ ] A student sees the review status, XP (once) and the notification, plus the Live page.
- [ ] No tutor link is visible until the flag flip. After the flip, all three link locations and the FAQ point to a resolving
      host.

---

## 18. Outstanding questions and approvals

Only items that block safe implementation:

1. **D-5 (blocking WS-7).** Confirm that tutor accounts must not reuse admin emails, contrary to baseline 5, because of
   guardrail §1. A person who is both uses a second email or identity.
2. **D-1, D-2, D-12 approvals (blocking WS-2, WS-3, WS-6).**
   - D-1: the Auth.js upgrade PR.
   - D-2: the 0006 schema diff (§6.1, §6.2).
   - D-12: the one-line student resubmission guard.
   - If D-12 is declined, the race in §9.6 remains, documented as R9.
3. **Owner availability for §13.5.** Production migration, GitHub Environment, Cloudflare secrets and DNS can only be done by
   you. WS-5 and onward cannot merge until 0006 is applied.

Everything else uses the decisions in §3.
