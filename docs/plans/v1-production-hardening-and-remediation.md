# RMS-Careers V1 Production Hardening & Remediation Plan

**Status:** PLAN ONLY — nothing in this document has been implemented. **Date:** 2026-10-08 · **Baseline:** `main` @ `b5315e3` · **Input:** `docs/audits/v1-production-verification.md`
**Constraints honoured:** no code, schema, migration, Cloudflare-config, commit or push changes were made to produce this plan. Product decisions are **not** made here; they are listed with options and a recommendation and marked as blockers where they block work.

---

## 0. Corrections to the audit (found while verifying for this plan)

The plan is built on the code, not on the audit's wording. Re-verification changed these items:

| Audit item | Correction |
|---|---|
| **D-09** "Overview mixes all batches / stale single-batch assumption" | **Overstated.** `docs/specs/phase-4-multi-batch-alignment.md` (§2.3, §5, §15) *deliberately* makes Overview aggregate across **all** active cohorts and says the Resume engine is `EXISTING / PRESERVE`. The only genuine gap is that the spec's recommended **Option C** (`preferredBatchId` on `getResumeLearningTarget`) was never implemented. Downgraded to P3 and re-scoped (Slice 4). |
| **D-14** "admin breadth" | `docs/architecture/authorization.md` documents `admin` = operations (programs, batches, enrollment approvals, imports) and `super_admin` = colleges/tutors/role assignment. Current behaviour **matches the documented model**. The real open question is whether *college-scoped* admins are wanted (no mapping exists). Re-scoped to a product decision + a guard-consistency fix (A-1). |
| **D-03** "XP dual-sourced" | The spec makes this **intentional**: `activities` is the ledger (batch-attributed, §6A) and `student_stats` is the *lifetime global* aggregate. The defect is not "two sources", it is that **the aggregate is not maintained by every ledger writer**. The plan keeps both and makes the aggregate a *derived, transactionally-maintained* cache. |
| **D-12** | Also: `quizzes.show_explanations` (`immediate/after_deadline/never`) is read in only one query (`assessments.ts:660`); `submitFormalAssessment` ignores the policy entirely and uses only `dueAt`. New sub-finding **N-3**. |
| **New findings** discovered during verification | **N-1 (P2)** `submitProjectAssignment` does not require the project to be *published* or *placed in the batch's curriculum* (`curriculumRecord` is optional) — an entitled student can submit to any existing assignment id. **N-2 (P2)** the public enrollment action returns `enrollmentResult.message` for `database_error`, which is the raw `error.message` — raw DB/driver text on an unauthenticated endpoint. **N-3** (above). **N-4 (P3)** `external_assessment` XP (spec §6A) is never awarded anywhere. **N-5 (P2)** program capacity is checked then inserted without a lock (race) and counts all non-cancelled enrollments program-wide. **N-6 (P3)** `archived` program status is used by the public form as "registration closed" — it must **not** silently become "revoke student access" (affects Obs 4 design). |
| Test claims | Most "unit" tests mock the DB so heavily that they mirror, rather than check, real behaviour (e.g. `enrollment-lifecycle.test.ts` re-implements the unique index in a mock). This is *why* D-01 passed 417 tests. |

---

## 1. Executive Summary

The audit's 25+ findings collapse into **five root causes**, not 25 bugs:

1. **No enforced boundary between tests and production** (D-04). Every other slice depends on being able to run real-DB tests safely, so it goes first.
2. **Enrollment/eligibility is an unmodelled concept.** "May this student act in this batch?" is an inline SQL predicate copy-pasted into ~25 queries/actions with two different spellings (`('active','confirmed')` vs `'active'`), ignores college/program/batch state, has no lifecycle rules, and the admin has no way to place an enrollment in a batch. This single root explains D-01, D-02, D-15, D-17, D-19, Obs 1, 2 (partially), 3 and 4.
3. **XP is a ledger with an incompletely-maintained cache** (D-03, D-10, D-19, D-25, N-4).
4. **Client-supplied context is trusted where it should be derived** (D-12, D-13, N-1, N-3) — multi-batch correctness is a *domain-model* issue (what is selected-context vs. authorization vs. data-scope), not a page-by-page patch.
5. **Abuse/observability foundations are missing** (D-05, D-06, D-07, D-08, X-3, X-6, N-2): no edge rate limiting, no bot protection, no security headers, errors swallowed or leaked.

**Plan shape:** 8 slices (0–7), executed mostly serially because slices 1–4 share the enrollment/eligibility and XP foundations. **Zero database migrations are *required*** by the recommended path; up to **5 conditional/optional** migrations exist depending on product decisions. **14 product/infra decisions** are catalogued; **6 are hard blockers** for specific slices. One small, safe hotfix (the D-01 predicate) is deliberately pulled ahead as Slice 2a because 16 production enrollments are affected today.

---

## 2. Current V1 Baseline

* Monorepo (pnpm): `apps/web`, `apps/admin`, `apps/student`, `packages/db` (Drizzle schema, neon-http `db`, per-call WebSocket `dbTx`), `packages/auth` (bcryptjs, SHA-256 tokens, RBAC helpers). Next 15 / OpenNext on three Cloudflare Workers.
* Green: typecheck, ~417 tests, `next build` ×3. **No CI exists** (`.github/` absent). No lint script.
* Production data (aggregate, read-only, from the audit): counts redacted in this copy. Shape: enrollments in mixed statuses (most `pending`, a minority `confirmed`/`active`) and most without a batch; batches, some under the one inactive college; a few student users; students lacking a college or `student_stats`; students without a user; one project content item, assignment and submission; two super_admins.
* `apps/admin/vitest.config.ts` loads `.env.local` unconditionally; `apps/student/lib/__tests__/multi-batch-schema.test.ts` self-loads `.env.local`/`../admin/.env.local`; 5 suites write to that database. `.env.local` points at the production Neon database. `drizzle.config.ts`, `student:seed` and `admin:seed` also read it implicitly.

---

## 3. Audit Findings Reconciliation

Disposition key: **NOW** (in a planned slice) · **LATER** · **ACCEPT** · **SUPERSEDED** · **DECISION** (blocked on product/infra decision).
PD-n = product decision (§4). M-n = conditional migration (§8).

| Finding | Root cause (verified in code) | Slice | Pri | Decision | Migration | Dependencies |
|---|---|---|---|---|---|---|
| **D-04** tests hit prod DB | Test configs auto-load `.env.local`; no tiering; no CI; mocks hide real behaviour | **0** | P1 | PD-14 (test infra) | none | — (first) |
| **D-01** project submit rejects `confirmed` | `projects.ts:155` literal `'active'`; predicate duplicated | **2a** hotfix → **1** refactor | P1 | — | none | S0 |
| **D-02** no batch assignment; batch-less/college-less students | Pipeline lacks a "place in cohort" operation; public form never passes `batchId`/`collegeId`; admin list has no batch | **1** | P1 | PD-1, PD-2, PD-3 | none (M-2 optional) | S0 |
| **D-15** no enrollment state machine | `updateEnrollmentStatus` is a raw `UPDATE`; unique-index violation → generic failure; bulk has no per-row result | **1** | P2 | PD-1 | none | S1 core |
| **D-17** inactive college/program/batch unenforced | No central accessibility rule; `batches.status` has no editor and no reader | **1** | P1 | **PD-3 (blocker)** | none (derived) / M-1 | S1 eligibility module |
| **D-19** college-less students lack stats | `student_stats.college_id NOT NULL`; stats created only if college known; XP code does `if (stats)` | **1** (stamping) + **3** (XP) | P2 | PD-4 | none / M-4 | S1, S3 |
| **N-5** capacity race / scope | check-then-insert, program-wide count | **1** | P2 | PD-2 | none | S1 |
| **D-11** assignments cannot be authored; GET inserts | Admin never creates `assignments`; `getProjectAssignmentForStudent` lazily inserts | **2b** | P2 | PD-6 (late policy) | none | S1 |
| **N-1** submit w/o placement/published check | `curriculumRecord?.` optional; no `isPublished` | **2a/2b** | P2 | — | none | S0 |
| **D-03** XP cache not maintained | 3 hand-copied updaters; 0 callers of `recordLearningActivity`; lecture & approval write ledger only; stats updated even when ledger insert conflicted | **3** | P1 | PD-5, PD-9 | none | S0, S1 |
| **D-10** XP table drift | Magic numbers inline in actions | **3** | P2 | **PD-5 (blocker for values only)** | none | S3 core |
| **D-25** ties/names | Positional rank; full names | **3** (presentation) | P3 | PD-12 | none | S3 |
| **N-4** external XP never awarded | spec vs code | **3** | P3 | PD-5 | none | S3 |
| **D-12 / N-3** formal submit trusts `batchId`, ignores policy | input `batchId` used for join, dueAt, ledger | **4** | P2 | PD-10 (policy semantics) | none | S3 (XP path) |
| **D-13** attempt races | check-then-insert, no constraint | **4** | P2 | — | none (advisory lock) / M-5 | S0 (integration tests) |
| **D-09** (corrected) Resume ignores selected cohort | spec Option C unimplemented | **4** | P3 | PD-8 | none | S1 |
| Library scope | program-OR-batch entitlement | **4** | P3 | **PD-7** | none | S1 |
| **D-05** no effective rate limit | per-isolate Map; no login limit; spoofable IP | **5** | P1 | PD-13 (infra) | none / M-3 | S0 |
| **D-06 / N-2** public form abuse + raw error leak | no throttle/CAPTCHA; `message` passthrough | **5** | P1 | PD-13 | none | S5 infra → before S1 batch link launch |
| **D-07** `/login?callbackUrl=foo` 500 | unguarded `new URL` | **5** | P2 | — | none | S0 |
| **D-08** error masking/swallowing | `?error=` ignored; catch-all returns "unauthorized" | **5** | P2 | — | none | S0 |
| **X-3** security headers | none configured | **5** | P2 | — | none | S0 |
| **X-6** raw error logging | `console.error(err)` | **5** | P3 | — | none | S5 logger |
| **D-14** admin RBAC breadth | matches docs; guard style inconsistent | **6** | P2 | **PD-11** | none | S0 |
| **A-1** admin JWT never re-checked | `authorized()` JWT-only | **6** | P2 | — | none | S0 |
| **A-2** GitHub login loses `super_admin` | `token.role = user.role \|\| 'admin'` | **6** | P2 | — | none | S6 |
| **D-16** apex not redirecting | Cloudflare dashboard/zone, not repo | **7** | P2 | PD-13b (owner action) | none | — |
| **D-18** bulk import non-atomic | per-row tx; throw aborts | **1** (import part) | P2 | PD-1 | none | S1 |
| **D-20** completed-batch inconsistency | no shared definition | **SUPERSEDED by S1** | P3 | PD-9b | none | S1 |
| D-21 / A-3 dead branch | matcher excludes `/login` | LATER (S5 touches same file) | P3 | — | none | S5 |
| D-22 branding/soft-404/sitemap | cosmetic | LATER (S7) | P3 | — | none | — |
| D-23 dead code/hacks | `recordLearningActivity` (becomes live in S3), `42703` fallbacks, `(row as any)`, `scratch/` | LATER (cleanup) | P3 | — | none | after S1–S4 |
| D-24 expired unsubmitted attempts | no autosave | **DECISION (defer)** | P3 | PD-10 | none | S4 |
| A-4, A-5 | defence-in-depth only | ACCEPT | P3 | — | — | — |
| S-4 cascade asymmetry | RESTRICT on students/enrollments blocks real deletes | ACCEPT (document) | P3 | — | — | — |
| S-5 `students.college_id` vs `student_stats.college_id` drift | no sync | **SUPERSEDED by S3** (XP service writes from student row) | P3 | — | none | S3 |
| S-6 `dsa_solved` reference global | by design (spec §15 D2) | ACCEPT | P3 | — | — | — |
| S-7 `42703` fallbacks | stale | LATER (cleanup) | P3 | — | none | — |
| S-8 migrations ≡ schema | positive finding | n/a | — | — | — | — |
| P-1…P-5 | scale-dependent | ACCEPT with thresholds (§12) | P3 | — | — | — |

---

## 4. Product Decisions Required

Format per request. **None of these has been decided in this plan.** "Blocker" = the dependent work must not start until decided.

### PD-1 — Enrollment lifecycle (what each status means, and who moves it)
**DECISION REQUIRED:** Which statuses grant access, which transitions are legal, and whether `confirmed` may exist without a batch.
**CURRENT OPTIONS:**
* **A** — Keep both `confirmed` and `active` as "entitled" (what ~25 queries already do); `confirmed` = approved, `active` = created by transfer; require a batch to confirm.
* **B** — Collapse to one entitled state (`active`), migrate the 16+4 rows, retire `confirmed` from UI.
* **C** — Allow `confirmed` without batch ("program-level approval, cohort pending") and show a distinct "awaiting cohort" student state.
**RECOMMENDED OPTION:** **A, with a pure `canTransition()` function and "confirm requires batch" as default**; do not touch the enum. B needs a data migration and risks every query; C re-creates today's half-state.
**IMPACT:** Determines whether the admin "Confirm" action can run on batch-less rows (A: no — must assign batch first), the student empty-state work, and the backfill report for the 6 confirmed batch-less rows. **Blocks Slice 1 transitions** (not the eligibility module itself).

### PD-2 — Public enrollment & batch link model (Obs 1)
**DECISION REQUIRED:** Link semantics, approval, capacity and security.
**CURRENT OPTIONS:**
* **A** — Plain `…/enroll/b/<batchId>` link (UUID), creates `pending`, admin approves.
* **B** — Signed link `…/enroll/b/<batchId>.<exp>.<hmac>` (no storage; expiry baked in; whole-secret rotation revokes all; closing the batch revokes that cohort).
* **C** — Stored token links (table with expiry/revocation/max-uses/audit) — **needs migration M-2**.
* Orthogonal: auto-`confirmed` on submit vs `pending`; capacity per program (today) vs per batch (no column); require college email domain / roll-number allow-list; host (admin domain today vs `www`/`student`).
**RECOMMENDED OPTION:** **B + pending-with-admin-approval + program-level capacity retained**, host stays on admin domain until PD-2b decides otherwise. B gives expiry and cohort-level kill-switch with zero schema change; move to C only if per-link revocation/usage analytics are required.
**IMPACT:** B/A = zero migrations; C = M-2 plus an admin "links" UI. Auto-confirm removes an admin workload step but makes Slice 5 abuse controls security-critical. **Blocks the batch link feature only** (Slice 1 phase 1c).

### PD-3 — Inactive college / program / batch semantics (Obs 4)
**DECISION REQUIRED:** What "inactive" means for new enrollments, existing students, and data.
**CURRENT OPTIONS:**
* **A — Derived effective state (no writes):** college inactive ⇒ programs/batches of that college are *effectively* closed; reactivation instantly restores.
* **B — Cascade writes:** set program/batch statuses when the college toggles (lossy: cannot know prior manual states) — needs a stored prior-state/reason to be reversible (M-6).
* **C — Block only new things:** inactive college blocks new programs/batches/enrollments; existing students unaffected.
* Sub-decision on *student access*: **(i)** unaffected, **(ii)** read-only (view, no submissions/XP), **(iii)** blocked (cannot see the cohort).
**RECOMMENDED OPTION:** **A** for derivation, with **(ii) read-only** for existing students of an inactive college, and **programs: `archived` stays "registration closed" (N-6) and does not revoke student access**; `draft` also does not affect existing students. Batch `draft/archived` ⇒ not enrollable and hidden; `completed` ⇒ read-only.
**IMPACT:** Determines the single accessibility function in the eligibility module and ~25 call sites; (iii) is the most disruptive (7 live batches would vanish for their students). **Blocks D-17 / Obs 4 only.**

### PD-4 — Students without a college
**DECISION REQUIRED:** How students from generic (college-less) programs participate in XP/leaderboards.
**CURRENT OPTIONS:** **A** require a college on every student (public form gets a college selector; generic program → a placeholder college row such as "RMS Direct", data only); **B** make `student_stats.college_id` nullable (M-4; college board skips nulls); **C** college-less students earn no stats.
**RECOMMENDED OPTION:** **A** (zero migration, keeps the `NOT NULL` integrity and leaderboard queries intact). Batch-link students inherit the batch's college automatically.
**IMPACT:** XP service must create a stats row in the same transaction (A/B); B adds a migration and null handling in 3 leaderboard queries.

### PD-5 — XP values and rules **(blocker for values only)**
**DECISION REQUIRED:** Authoritative table (docs: DSA 10/20/40, assignment 50 "on-time"; code: 10/25/50, approval 100) and retroactivity.
**OPTIONS:** **A** docs are right → change code and (optionally) leave history; **B** code is right → update docs; **C** new values.
**RECOMMENDED:** **B (ratify code) unless the business wants differentiated Medium/Hard**, because 100 XP approval is already in the Phase-4 spec; **no retroactive rewrite of existing ledger rows** (history stays as awarded).
**IMPACT:** Slice 3 is built around a single `XP_RULES` config so this is a one-file change *after* the architecture lands; it does not block the architecture work. Also decide whether `external_assessment` awards XP (N-4).

### PD-6 — Late project submissions & expiry
**DECISION REQUIRED:** Allow submissions after `dueAt`? Penalty/flag?
**OPTIONS:** **A** allow, show "late" (today's de-facto behaviour); **B** block after `dueAt`; **C** allow within a grace window.
**RECOMMENDED:** **A with a stored lateness derivable from `submittedAt > dueAt`** (no column needed), reviewer sees it.
**IMPACT:** One conditional in the submit action + admin review display.

### PD-7 — Library entitlement scope
**DECISION REQUIRED:** What is visible in "My Library".
**OPTIONS:** **A** program-wide + batch-placed (today); **B** only content placed in an accessible batch; **C** B plus content explicitly marked global.
**RECOMMENDED:** **A** (documented intent: "self-paced repository"; spec §6A says library activity is global, `batchId = NULL`), but filtered through the new accessibility rule and with `availableFrom` honoured consistently.
**IMPACT:** B/C change `library.ts` and `content.ts` entitlement SQL and may hide content students use today.

### PD-8 — Resume Learning & selected cohort
**OPTIONS:** spec §15 Options A/B/C. **RECOMMENDED:** spec **Option C** (hybrid, `preferredBatchId`). **IMPACT:** one optional parameter + Overview wiring; Overview aggregation stays as specified.

### PD-9 — Streak and ledger rules
**DECISION REQUIRED:** (a) Which activity types advance the streak? (b) Are completed batches XP-earning?
**OPTIONS (a):** **A** only student-initiated (DSA, lecture, quiz); **B** all ledger events; **C** status quo (DSA + quizzes only; lecture none).
**RECOMMENDED:** **A.** Staff-driven events (project approval, external import) add XP but never touch streaks or `last_activity_date_ist` (they happen on staff time). (b) completed = read-only, no new XP.
**IMPACT:** Parameter table in the XP service; streak backfill scope.

### PD-10 — Formal assessment policy
**DECISION REQUIRED:** (a) expired-unsubmitted attempts (auto-finalise as zero, auto-finalise from saved answers — needs autosave — or allow late submit); (b) how `show_explanations` (`immediate/after_deadline/never`) applies to formal quizzes.
**RECOMMENDED:** (a) **auto-finalise as zero via a lazy "reaper" on next read** (no scheduler, no schema); defer autosave. (b) honour the enum, fail-closed.
**IMPACT:** Slice 4.

### PD-11 — Admin permission model
**DECISION REQUIRED:** Is the documented flat `admin` model correct, or must admins be college-scoped?
**OPTIONS:** **A** flat admin (current/docs); **B** college-scoped admins (needs an admin↔college mapping — migration M-7); **C** A now, B as a later phase.
**RECOMMENDED:** **C.** Document a permission matrix (§Slice 6) and enforce via one guard now.
**IMPACT:** B adds schema, scoping to ~12 action files and all list queries.

### PD-12 — Leaderboard presentation
Tie ranking (competition/dense/positional) and peer-name visibility (full / first-name+initial / anonymous). **RECOMMENDED:** competition ranking ("1,2,2,4"), full name + branch unchanged unless the institution objects. Presentation-only.

### PD-13 — Abuse-control infrastructure (infra, not product)
**DECISION REQUIRED:** (a) rate limiting backend; (b) human verification; (c) who owns Cloudflare dashboard changes (apex redirect, WAF rules).
**OPTIONS (a):** **A** Cloudflare WAF rate-limit rules (dashboard, no code); **B** Workers Rate Limiting binding (`wrangler.jsonc` change — needs explicit approval); **C** DB-backed counters (M-3); **D** keep in-memory (rejected: ineffective).
**RECOMMENDED:** **A for coarse edge protection + B for per-account login throttling + Cloudflare Turnstile (b) on the public enrollment form and on login after repeated failures.** C only if B proves insufficient.
**IMPACT:** B and Turnstile need new bindings/secrets (config changes requiring approval, planned in Slice 7).

### PD-14 — Test database topology (infra)
**OPTIONS:** **A** separate Neon *project* (own credentials) for test/CI; **B** Neon branch of production (copies PII; same account/credentials family); **C** local Postgres + Neon-HTTP proxy.
**RECOMMENDED:** **A** (schema-only, seeded fixtures; no production data, no shared credentials), plus a separate **dev** project so `.env.local` never again points at production.
**IMPACT:** Slice 0 foundation; **blocks all real-DB tests**.

**Count: 14 decisions (PD-1…PD-14). Hard blockers: PD-14 (Slice 0 infra), PD-1 (Slice 1 transitions), PD-3 (D-17/Obs 4), PD-2 (batch link), PD-11 (only for scoped admins; flat model unblocks Slice 6), PD-5 (values only).**

---

## 5. Architecture / Domain Decisions

These are engineering decisions (recommended; confirm before implementation).

### AD-1 Cohort eligibility is a single module, not inline SQL
New file `packages/db/src/eligibility.ts` (no schema change, exported from `@rms/db`) containing:
* constants `ENTITLED_STATUSES = ['active','confirmed']`, `READABLE_STATUSES = [...ENTITLED, 'completed']`;
* a Drizzle condition builder `entitledEnrollment(studentId, opts)` returning the enrollment⨝batch⨝program⨝college predicate;
* a pure `cohortAccess({college, program, batch, enrollment}) → 'open' | 'read_only' | 'closed'` implementing PD-3;
* a pure `canTransition(from, to, ctx)` implementing PD-1;
* a pure `isBatchAcceptingEnrollment(...)`.
All 25 literal-status sites (student: `entitlements`, `content`, `library`, `overview`, `projects` ×3, `assessments` ×4, `batch-workspace`, `external-assessments`, `leaderboards` ×4, `resume-learning`, `actions/{content,dsa,quiz×2,projects}`; admin: `enrollments`, `batch-*` ×4, import parser) migrate to it. A **repository test greps for raw `'active', 'confirmed'` string literals** and fails if any remain outside the module — preventing re-divergence.

### AD-2 Domain vocabulary
| Concept | Definition | Source of truth | Authorization input? |
|---|---|---|---|
| Batch membership | an `enrollments` row (student, batch) in an entitled status | `enrollments` | yes |
| Accessible batch | membership ∧ `cohortAccess ≠ closed` | eligibility module | yes |
| Selected cohort | the UI focus (`rms_active_cohort` cookie / route param) | cookie, **validated** | **never** — presentation only |
| Batch-scoped data | curriculum placement, deadlines, formal attempts, project submissions, external assessments, batch XP (`activities.batch_id`), batch leaderboards | per-table `batch_id` | derived from the *resource*, not request input |
| Student-global data | DSA progress, lifetime XP/level/streak (`student_stats`), profile, notifications, library/DSA activity (`batch_id` NULL), practice attempts | student id | session only |
| Cohort-aggregated views | Overview, My Library | spec-defined all-cohort aggregation | accessible-batch set |

**Rule:** a server action either takes a resource id and **derives** the batch from it (e.g. `attemptId → attempt.batch_id`), or takes a `batchId` and **validates** it against accessible batches; it never trusts a batch id for scoping a different resource.

### AD-3 XP: ledger is truth, `student_stats` is a transactionally-maintained cache
Single `awardActivity(tx, event)` in `packages/db/src/gamification.ts` (+ pure `XP_RULES`, `levelForXp`, `evaluateStreak`, `istDate`). Algorithm inside **one `dbTx` transaction**: `INSERT … ON CONFLICT DO NOTHING RETURNING id` on `activities` → if no row returned, **return duplicate and touch nothing**; else `SELECT … FOR UPDATE` the `student_stats` row (creating it from `students.college_id` if absent, per PD-4), apply streak rules per PD-9, `UPDATE`. Every XP-producing path (DSA, lecture, practice quiz, formal quiz, project approval, external import) calls it. `recordLearningActivity` (currently dead) is retired/replaced, not duplicated. The existing pure `evaluateStreak`/IST helpers are **preserved** (spec §2.4) and moved/re-exported.

### AD-4 Race safety without schema changes
Use Postgres **transaction-scoped advisory locks** (`pg_advisory_xact_lock(hashtextextended(key,0))`) inside `dbTx` for: formal attempt start (key `quiz:student`), program capacity (key `program:id`), enrollment batch assignment (key `student:program`). Row locks (`FOR UPDATE`) where a row exists. Constraint-level hardening is listed as optional migrations (M-5).

### AD-5 Errors are classified, not swallowed
Introduce a result type `{ ok: true, value } | { ok: false, kind: 'unauthorized' | 'not_found' | 'infrastructure' }` for the entitlement lookup. `infrastructure` renders the retryable error boundary and logs; only genuine authorization failures redirect to `/login?error=…`. A shared server `logError(scope, err)` strips connection strings/PII and emits structured JSON for `wrangler tail`.

### AD-6 Authorization layering (explicit per operation)
* **Before query:** session → role → resource-independent permission (`requireStudentEntitlement`, `requireAdmin`).
* **Inside the query/transaction:** ownership and cohort access are conditions of the same statement (e.g. `WHERE attempt.student_id = :me`), so check and use cannot diverge (no TOCTOU).
* **At DB constraint level:** only where already present (partial unique enrollment index, activity idempotency index); new constraints are optional migrations.
* **Middleware** stays a coarse gate only.

### AD-7 Admin guard uniformity
All admin server actions use `requireAdmin()` / `requireSuperAdmin()` (DB-backed status+role check — A-1), enforced by an **authz-coverage test** that parses each `'use server'` file and asserts every exported async function calls a guard before any query.

---

## 6. Implementation Slices

### Execution order at a glance
`S0` → `S2a (hotfix)` → `S5-core (errors/login/headers/logging)` → `S1 (core eligibility + admin batch assignment)` → `S3 (XP)` → `S4 (multi-batch)` → `S5-abuse (before any public batch link)` → `S1c (batch link)` → `S2b (assignment authoring)` → `S6` → `S7` → cleanup.
Rationale and the dependency graph are in §7 and §13.

---

### Slice 0 — Test & Production Safety (FIRST)

**Objective.** Make it structurally impossible for tests, seeds or tooling to touch production, and create a safe real-DB integration tier so the remaining slices can be verified for real.
**Findings:** D-04; enables verification of everything else.
**Root cause.** Test configs and one test file auto-load `.env.local` (production URL); there is one test tier (mocks + a few live-DB suites), no CI, no environment naming convention, and tools (`drizzle-kit`, seed scripts) read the same file.

**Current architecture.** `apps/admin/vitest.config.ts` (`loadEnvFile('.env.local')`), `apps/student/lib/__tests__/multi-batch-schema.test.ts` (candidate-list `loadEnvFile`), `admin/lib/__tests__/{batch-management,batch-curriculum,content-library,multi-batch-import}.test.ts` (live DB). Student vitest config has no env loading but the test file adds it.

**Proposed architecture.**
1. **Three tiers**, enforced by file naming and separate vitest projects:
   * `*.test.ts` — **unit**: runs with a setup file `test/setup-unit.ts` that deletes `POSTGRES_URL`/`DATABASE_URL`/`TEST_DATABASE_URL`, and replaces `@neondatabase/serverless` `neon`/`Client` with throwing stubs ("unit tests must not open DB connections"). Existing live-DB suites are **moved** to the integration tier, not deleted.
   * `*.int.test.ts` — **integration**: only runs when `TEST_DATABASE_URL` is set; `test/setup-int.ts` runs the **production guard** (below), then sets `process.env.POSTGRES_URL = TEST_DATABASE_URL` *in-process only*.
   * `*.e2e.test.ts` / smoke scripts — later tiers (§9).
2. **Production guard** (`test/db-guard.ts`, shared): refuses to run unless **all** hold: (a) `TEST_DATABASE_URL` host ≠ host of any URL found in `POSTGRES_URL`/`.env.local`/`.dev.vars`; (b) `SELECT current_database()` matches an allow-list pattern (`^rms_test`); (c) a sentinel table `_rms_test_sentinel` exists (created only by the test-DB bootstrap, never by migrations of prod); (d) `NODE_ENV`/`CF_PAGES`/`CI` signals do not indicate a production deploy. Any failure = hard abort with a message that never prints the URL.
3. **No implicit env loading in tests**: remove `loadEnvFile` from vitest configs and test files. Test env comes only from `TEST_DATABASE_URL` (CI secret or an untracked `.env.test.local`, git-ignored via the existing `.env*` rule).
4. **Dev vs prod credentials:** create a separate *dev* Neon project; `.env.local` points to dev. Seeds (`admin:seed`, `student:seed`) and `drizzle.config.ts` gain the same guard in reverse: they refuse to run when the URL host matches the **production allow-list** unless `--i-know-this-is-production` is passed (`db:migrate` for production is run deliberately from a release script, not by default).
5. **Test DB bootstrap** (`scripts/test-db/bootstrap.ts`): applies `packages/db/drizzle/*.sql` to an empty `rms_test` database, creates the sentinel, and exposes fixtures (colleges, programs, batches, students in each enrollment state). Integration tests use transactions with rollback or unique-prefixed rows with guaranteed teardown.
6. **CI** (`.github/workflows/ci.yml`, new): jobs `typecheck`, `unit`, `integration` (against the test project), `build` (3 apps), `cf-verify` (see §10 / Slice 7). **Production secrets are never configured in CI.** A required status check.
7. **Repo safeguards:** a test that fails if any `vitest.config.*` or test file references `.env.local`/`POSTGRES_URL` loading; a pre-commit/CI grep for `loadEnvFile` in test paths.

**Database changes.** None to production. The test project gets migrations 0000–0004 applied.
**Files:** `apps/*/vitest.config.ts`, the five live suites (rename → `.int.test.ts`), new `test/` helpers (root or `packages/test-utils`), `packages/db/drizzle.config.ts`, seed scripts, root `package.json` scripts (`test:unit`, `test:int`, `test:all`; root `test` becomes **unit only**), `.github/workflows/ci.yml`.
**Security considerations.** The guard must fail closed; never log connection strings; test-project credentials are the only DB secrets in CI. Consider rotating the current production credential after the dev/prod split (hygiene — it has lived in a developer `.env.local`).
**Tests.** *Unit:* guard logic (matrix of URL/db-name/sentinel combinations incl. malformed URLs, same-host different-db). *Integration:* the guard itself against the real test DB (positive) and against a deliberately mislabelled DB (must abort). *Meta:* config-scan test.
**Migration strategy.** n/a. **Rollout.** Developer-tooling only; no production deployment. Remove leftover test rows from production (`B1 Test College …`, `TEST`, `DSA_TEST`, `Bulk Import Test` programs and dependent students) **only after** explicit owner approval, via a reviewed one-off script (dry-run listing first).
**Dependencies.** PD-14. **Risks.** Developers bypass the guard; integration suite slow/flaky (mitigate with transaction-per-test and a single bootstrap).
**Definition of done.** Root `pnpm test` cannot open a DB connection (proved by a test); `pnpm test:int` aborts on any non-test DB; CI runs green on a clean clone using only test credentials; `.env.local` no longer contains the production URL; the five formerly-live suites pass in the integration tier; documented in `docs/development/testing.md`.

---

### Slice 2a — Project submission hotfix (small, immediate)

**Objective.** Let admin-confirmed students submit projects now, without waiting for Slice 1.
**Findings:** D-01, N-1 (partial).
**Root cause.** `submitProjectAssignment` step 3 uses `eq(enrollments.status,'active')` while reads use `('active','confirmed')` and the admin UI only emits `confirmed`.
**Proposed change.** In `apps/student/lib/actions/projects.ts` replace the predicate with the shared constant (introduce `ENTITLED_STATUSES` in `packages/db/src/eligibility.ts` now; Slice 1 builds the rest around it — no throw-away work). Add: project content item must be `isPublished` and **placed in that batch's `batch_curriculum`** (reject otherwise; today the placement lookup is optional); keep `availableFrom` enforcement; keep the GitHub check unchanged.
**Server notes.** Authorization stays *inside* the entitlement query (same statement); no new client input. **DB:** none. **UI:** none (error copy only).
**Tests.** *Unit:* status matrix over the enum (`pending/waitlisted/cancelled/transferred/dropped/revoked/suspended` rejected; `active`/`confirmed` accepted; `completed` rejected for writes). *Integration (S0):* real rows — confirmed student submits; student in batch B cannot submit to a project placed only in batch A; unpublished project rejected; resubmission state machine unchanged. *Authz:* foreign `assignmentId`/`contentItemId`/`batchId` combinations.
**Rollout.** Single-app deploy (`rms-student`); no data change; behaviour widens only to already-entitled students. **Rollback:** redeploy previous version (stateless).
**Dependencies.** Slice 0 (so the test is real). **Definition of done.** confirmed student can submit; all status cases covered; N-1 closed; no regression in existing `projects.test.ts`.

---

### Slice 1 — Enrollment, Eligibility & Cohort Lifecycle

**Objective.** One coherent lifecycle: *apply → approve → place in cohort → access (open/read-only/closed) → complete*, with admin tooling to operate it, safe public entry points (program form and batch link), and a single eligibility rule enforced server-side everywhere.
**Findings:** D-02, D-15, D-17, D-19 (stamping part), D-18, N-5, D-20 (superseded), Obs 1, Obs 2 (half-state), Obs 4.
**Root cause.** Eligibility is undefined as a concept (AD-1); batch placement is not a first-class operation; college/program/batch state is not part of any rule; students are created without college/stats.

**Current architecture (verified).**
* Admin `enrollments` page lists enrollment⨝student⨝program only (no batch, college); actions: single/bulk status change via raw `UPDATE`, resend email. `transferEnrollment()` exists, is tested with mocks, and is **never called from any UI**.
* Public `/enroll/[programCode]` → `submitStudentEnrollment` → `createEnrollmentWithStudentProvisioning({programId, student})`: no `batchId`, no `collegeId`; status hard-coded `pending`; capacity pre-check non-atomic.
* Bulk import: batch-aware, per-row transactions, `collegeId = batch.collegeId || program.collegeId`, always `pending`, batch status/college state not checked (only program `archived`).
* Student `getStudentEntitlementContext`: `hasActiveEntitlement = enrollmentRows.length > 0` (counts batch-less rows) while `activeBatches` excludes them → half-state.

**Proposed architecture.**
*1a — Eligibility core (no UI).* Build the AD-1 module and migrate all call sites behind it, **behaviour-preserving first** (status sets identical, no new gating). Make `hasActiveEntitlement` mean "has ≥1 accessible batch" **only** when PD-1 option A/C is decided; until then keep behaviour and add the half-state UI. Replace swallow-all catch with AD-5 result type (shared with Slice 5).
*1b — Admin cohort operations (full workflow).*
 1. **Enrollments list**: add Batch, College, Program-state columns, filter "No batch", counters for "needs cohort", pagination (P-4 threshold).
 2. **Assign / change batch** (`assignEnrollmentBatchAction`, `requireAdmin`, `dbTx`):
    * advisory lock `(student, program)`; `SELECT … FOR UPDATE` the enrollment;
    * validate: enrollment in {pending, waitlisted, confirmed, active}; batch exists; `batch.programId == enrollment.programId`; `batch.collegeId == program.collegeId` when the program is college-bound; batch accepts enrollment per PD-3; student's college is null → set from batch (stamping, PD-4) or equals batch college else reject with a clear message; no existing entitled enrollment for (student, batch) (pre-check + map `23505` from the partial unique index to a friendly error); capacity under lock (N-5);
    * `batch_id IS NULL` → in-place update; `batch_id` differs → **transfer semantics** (old row `transferred` + `transferredAt`, new row inserted in the *same status class*, preserving history) — one code path shared with `transferEnrollment` (which becomes the single implementation);
    * ensures `student_stats` exists (PD-4) in the same transaction;
    * structured audit log (`logAudit({actor, action, enrollmentId, before, after})` to Workers logs now; durable table optional M-6).
 3. **Bulk assign** from the list: per-row result table (applied / skipped + reason), never all-or-nothing silently.
 4. **Status transitions**: `canTransition()` (PD-1); `updateEnrollmentStatus` becomes transactional + validated; bulk returns per-row outcomes; "Confirm" on a batch-less enrollment is rejected (option A) with a "Assign batch" CTA; destructive transitions (cancel/drop/revoke) keep confirmation dialogs and require a reason string logged.
 5. **Batch lifecycle controls**: `setBatchStatusAction` (admin) with vocabulary `draft|active|completed|archived` validated by zod; batch row shows **effective status** and reason ("inactive via college X"). Batch *edit* (name/dates) is out of scope unless requested.
 6. **Bulk import hardening (D-18):** validate batch/program/college accepting-state up front; process rows in chunks with per-row results; on failure continue and report (idempotent re-run safe because `already_enrolled` is detected); keep emails post-commit; surface a downloadable result report. Respect the Workers CPU note (bcrypt per new student).
*1c — Batch enrollment link (Obs 1)* — **gated on PD-2 and on Slice 5 abuse controls**: route `app/(public)/enroll/b/[token]` (matcher already exempts `enroll/`), server resolves token → batch → program → college, renders program/batch/college info (read-only), prefilled hidden context, reuses `createEnrollmentWithStudentProvisioning({programId, batchId, student:{…, collegeId: batch.collegeId}})`, creates `pending` (or per PD-2), applies capacity lock, rejects closed/inactive batches with a neutral message. Admin: "Copy enrollment link" on the batch row (generates signed link per PD-2 option B). Student-facing result page identical in tone to the existing success card; duplicate registration returns the same neutral response (no account enumeration, see Slice 5).
*1d — Inactive-state enforcement (Obs 4 / D-17)* — **gated on PD-3**: implement `cohortAccess()`; wire into (i) student entitlement context + `assertBatchEntitlement`, (ii) every write path (submit, XP, attempts) via `open` check, reads via `open|read_only`, (iii) public program form + batch link (`isBatchAcceptingEnrollment`), (iv) admin create program/batch and bulk import, (v) admin UI badges. College toggle UI shows an **impact preview** ("N batches, M students affected") before confirming. No writes to programs/batches on toggle (option A).
*1e — Student half-state:* if no accessible batch → existing `EmptyEnrollmentView` variants: "awaiting cohort assignment" (confirmed/pending without batch), "cohort not currently accessible" (inactive), unchanged "no enrollments". Overview/sidebar must not render cohort widgets without a cohort.

**Files/components.** `packages/db/src/eligibility.ts` (new), `packages/db/src/index.ts` (export); admin: `lib/db/queries/enrollments.ts`, `lib/services/enrollment-orchestration.ts`, `app/(admin)/enrollments/*`, `app/(admin)/batches/{actions,batches-client}.ts*`, `app/(admin)/colleges/*`, `app/(admin)/enrollments/import/*`, `app/(public)/enroll/**`; student: all 25 predicate sites, `entitlements.ts`, `empty-enrollment.tsx`, overview page.
**Database changes.** **None required** (statuses, `batches.status` varchar, nullable `enrollments.batch_id`, partial unique index all exist). Optional/conditional: M-1 (`CHECK` on `batches.status`), M-2 (stored link tokens), M-6 (audit table), M-8 (`CHECK` batch required for entitled statuses — only after backfill).
**Existing-data compatibility.** Existing `active`, `confirmed` and `pending` rows are untouched. Eligibility refactor preserves current access for them. **Backfill (read-only report first, idempotent apply second):** (a) list the confirmed and pending batch-less enrollments with program/college so an admin can place them; (b) create `student_stats` for the students who have a college and none (idempotent `ON CONFLICT DO NOTHING`); (c) list the 10 college-less students for manual college assignment (never guessed); (d) list the 8 students without user accounts for provisioning. **No automatic batch assignment.**
**Pre-deployment impact queries (mandatory before 1d):** count of entitled students whose batch's college is inactive / program archived or draft / batch not active|completed — this is the exact population PD-3 would affect (today: the 7 inactive-college batches, including the demo batch with 3 active enrollments).
**Server/API.** New actions: `assignEnrollmentBatchAction`, `bulkAssignEnrollmentBatchAction`, `setBatchStatusAction`, public `submitBatchEnrollment`; modified: status actions, `submitStudentEnrollment`, import actions, college toggle (impact preview query). Validation: zod everywhere; ids as int/uuid; **error text to clients is generic for infrastructure failures (fixes N-2)**. Transactions: all multi-statement mutations in `dbTx`; emails strictly post-commit (existing rule).
**Security.** IDOR: enrollment ids are sequential integers → every admin action is `requireAdmin` and loads by id inside the transaction; no student-facing exposure. Link tokens are bearer secrets: signed, expiring, HMAC secret in Worker secret; constant-time compare (reuse `timingSafeEqual`). Never reveal whether an email already exists beyond what the current UX already does (see Slice 5).
**Tests.** *Unit:* `canTransition` matrix (all 10×10), `cohortAccess` truth table, link sign/verify (tamper, expiry, wrong batch). *Integration (real DB):* assign null→batch, change batch (history preserved), duplicate placement rejected (23505 mapped), program/batch/college mismatch rejected, capacity race with parallel requests (N-5), bulk assign mixed outcomes, import with a failing row continues, student sees only accessible batches, inactive college ⇒ per PD-3, existing seeded states keep access. *Authorization:* each new action with no session / student session / admin session; student cannot reach admin routes. *DB:* partial unique index behaviour; FK `restrict` on batch delete. *E2E:* admin creates link → student registers → admin approves + assigns → student logs in and sees exactly that cohort. *Smoke:* §10.
**Rollout.** Ship 1a (invisible) → 1b (admin only) → backfill report → 1e → (decision-gated) 1c and 1d separately; each independently revertible. Old and new app versions can coexist: no schema change, only stricter validation.
**Dependencies.** S0; S2a constant; S5-core (error type, logger); S5-abuse before 1c; PD-1, PD-2, PD-3, PD-4.
**Risks.** Cutting off live students (mitigated by impact query + feature flag `ELIGIBILITY_ENFORCE_COLLEGE_STATE` default off at first deploy); transfer logic regression (use integration tests, not mocks); capacity lock deadlocks (single advisory key order).
**Definition of done (acceptance).** Admin can assign/reassign a student to a batch and the student sees exactly that cohort; invalid program/batch/college combinations are rejected server-side; inactive/closed batches reject new enrollment (per PD-3); `confirmed` without batch is impossible going forward (per PD-1) or explicitly labelled; no raw status literals outside the eligibility module (repo test); existing students keep access; backfill report reviewed and applied; all auth tests pass; production DB untouched by tests.

---

### Slice 2b — Project / Assignment Authoring & Workflow

**Objective.** Make assignments a first-class, admin-authored entity; remove writes from student read paths.
**Findings:** D-11, N-1 (complete), PD-6.
**Root cause.** Admin content library can create `content_type='project'` items but nothing creates the 1:1 `assignments` row; the student GET path lazily inserts a hard-coded default rubric.
**Current architecture.** Student `getProjectAssignmentForStudent` inserts into `assignments` during page render; `getStudentProjectAssignments` returns `assignmentId: ''` when absent; admin `batch-projects.ts` reviews submissions and (best effort) writes an `activities` row.
**Proposed.** *Complete workflow:* (1) Admin creates/edits a project content item → **in the same transaction** the `assignments` row is created (default empty rubric, `max_score=100`); (2) new authoring screen `content/[id]/assignment` (mirrors the quiz-authoring pattern): rubric criteria editor (title, description, maxPoints), `maxScore` derived/validated as Σ criteria, instructions via `content_items.description`; zod validation, `requireAdmin`; (3) publish gate: a project item cannot be *published* or *placed in a curriculum* until it has ≥1 criterion; (4) batch curriculum placement unchanged (due/available dates per batch); (5) student read path becomes **pure read**: missing assignment ⇒ "not yet available" state, never an insert; (6) submission rules per PD-6 (lateness derived from `submittedAt > dueAt`, shown to reviewers); (7) review/approval path moves to the XP service (Slice 3) and validates `score ≤ maxScore` (already present); (8) one-time idempotent **backfill**: create default `assignments` rows for existing project items lacking one (currently 0 missing; script is a no-op safety net).
**Database.** None (1:1 `unique(content_item_id)` exists). **Files:** `admin/app/(admin)/content/**`, `admin/lib/db/queries/content.ts` (+ new `assignment-authoring.ts`), `student/lib/db/queries/projects.ts`, `student/components/projects/*` (copy only).
**Security.** Rubric JSON validated server-side (size caps); only admins write; students read only assignments of projects placed in an accessible batch.
**Tests.** Unit: rubric schema; Integration: create project ⇒ assignment row exists; student page render performs **zero writes** (assert via query log/trigger-free counter); publish gate; lateness derivation; authz matrix. E2E: author → place → student submits → admin approves → XP once.
**Rollout/rollback.** Admin deploy first (authoring), then student (pure read). Safe to coexist. **DoD:** no INSERT on any student GET; admin can author a rubric end-to-end; backfill report clean.
**Dependencies.** S0, S1a (constant), S3 (approval XP) for the final step. **Risks.** Rubric changes after submissions exist (rule: edits allowed, but already-reviewed scores keep their stored value; show warning).

---

### Slice 3 — XP & Gamification Integrity

**Objective.** One authoritative, atomic, idempotent XP path; consistent surfaces; spec-conformant events.
**Findings:** D-03, D-10, D-19 (stats rows), D-25, N-4, S-5, streak consistency.
**Root cause.** Four independently written updaters (DSA, practice quiz, formal quiz copy the same block; lecture completion and admin project approval write the ledger only; `recordLearningActivity` has zero callers); non-atomic read-modify-write; stats updated even when the ledger insert conflicted; skipped when no stats row; admin uses a UTC date; magic numbers inline.
**Current architecture / flow.** `activities` (unique `(student,type,ref)`) → written by each action; `student_stats` updated ad hoc; Overview/profile read stats; batch leaderboards sum ledger; college leaderboard reads stats.
**Proposed.** AD-3 service. *Migration of mutation paths (in this order, each behind its own tests):* DSA → practice quiz → formal quiz → lecture completion → project approval (admin; imports from `@rms/db`, fixing UTC date) → external assessment (only if PD-5 says it awards XP). *Event contract:* `{studentId, batchId|null (validated by caller), type, referenceId, occurredAt}`; XP amount resolved from `XP_RULES[type, difficulty]` (**single place**, PD-5 pending); streak rules per PD-9 table (`advancesStreak` flag per type). *Idempotency:* ledger insert `RETURNING` gate. *Level:* `levelForXp`. *Display:* leaderboards use competition ranking (PD-12). *Reconciliation tooling (read-only first):* `scripts/reconcile-xp.ts` compares `student_stats.total_xp/dsa_solved_count` to ledger sums and reports drift (expected drift today: lecture and approval XP absent from totals; students with no stats row); `--apply` (explicit flag, guarded, transactional, logged) rewrites `total_xp`, `current_level`, `dsa_solved_count` from the ledger; streak recompute only if PD-9 chosen and as a separate flag. No ledger rows are rewritten or deleted.
**Files:** `packages/db/src/gamification.ts` (new), `student/lib/actions/{dsa,quiz,content}.ts`, `student/lib/services/activity-reward.ts` (becomes thin re-export / removed), `admin/lib/db/queries/batch-projects.ts`, leaderboard queries/components, `docs` XP table.
**Database.** None (unique idempotency index and stats PK exist). Conditional M-4 (nullable `student_stats.college_id`) only if PD-4=B.
**Security.** XP amount never comes from the client; batch attribution validated by the caller against accessible batches (AD-2). Admin approval requires `requireAdmin`.
**Tests.** *Unit:* `levelForXp`, `evaluateStreak` (existing tests preserved), IST boundaries (23:59/00:00 IST, UTC offset day), `XP_RULES` table, `advancesStreak` matrix. *Integration (real DB):* each event type increments totals exactly once; **parallel double-submit yields one ledger row and one increment**; missing stats row created; ledger-sum == stats invariant after a randomized sequence; approval XP appears in totals and in the batch board; streak unaffected by staff events. *Authz:* cannot attribute XP to a non-accessible batch. *Regression:* leaderboard cross-batch isolation tests (spec §16) unchanged.
**Rollout.** Deploy admin + student together or student first (admin approval path keeps old behaviour until its own deploy; both write the same ledger so coexistence is safe). Run reconcile **report** pre-deploy and post-deploy; apply only after review. **Rollback:** code revert is safe (ledger is append-only); stats can be re-derived.
**Dependencies.** S0, S1a (stats-row creation, accessibility for writes), PD-4, PD-9; PD-5 only for the numeric values.
**Risks.** Duplicate XP during the transition (mitigated: all writers share the same idempotency key); lock contention (per-student row lock only); `dbTx` connection overhead (~WebSocket per award; acceptable at current volume — P-metrics in §12).
**Definition of done.** Exactly one function mutates `student_stats`; grep test enforces it; ledger-sum invariant test passes; lecture and approval XP reflected; no UTC-dated activity rows; reconciliation report shows zero unexplained drift (or applied and re-verified); XP table documented and matched to PD-5.

---

### Slice 4 — Multi-Batch / Cohort Correctness

**Objective.** Apply the AD-2 domain model to assessments, resume/overview behaviour and library, and make races impossible.
**Findings:** D-12, N-3, D-13, D-09 (corrected), D-24 (decision-gated), library scope (PD-7), D-20 (via S1).
**Root cause.** Several student actions accept a `batchId` from the client and use it for scoping/authorization of a *different* resource; check-then-insert for single-attempt; explanation policy ignored.
**Current architecture.** `submitFormalAssessment(attemptId, quizId, batchId, …)` joins `batch_curriculum` on the *client's* `batchId` (LEFT JOIN ⇒ `dueAt` null for a bogus batch ⇒ `explanationsSuppressed=false`) and writes `activities.batch_id` from it; `startFormalAssessmentAttempt` SELECTs then INSERTs.
**Proposed.**
* **Derive, don't trust:** `submitFormalAssessment` ignores input `batchId`; it uses `quiz_attempts.batch_id` (set at start from a validated enrollment). Re-checks the student is still entitled to that batch (per `cohortAccess`); if the batch became `closed`, reject with a clear code.
* **Fail-closed explanations (N-3/PD-10b):** compute from `quizzes.show_explanations` + the attempt's curriculum `dueAt`; missing curriculum row ⇒ suppress.
* **Single-attempt (D-13):** `dbTx` + advisory lock `(quiz_id, student_id)` around "find existing → insert". Same for practice first-pass XP (covered by S3 gate). Optional constraint hardening M-5 deferred.
* **Expired unsubmitted attempts (D-24/PD-10a):** lazy reaper on next start/read per PD-10 (if chosen), otherwise keep `TIME_EXPIRED` and document.
* **Resume Learning (D-09 corrected):** add optional `preferredBatchId` (spec Option C); Overview passes the validated `activeCohort.batchId`; default behaviour unchanged. Overview aggregation stays as specified.
* **Library (PD-7):** keep program-wide + batch-placed; route through `entitledEnrollment()` so inactive/closed cohorts and `completed` behave per PD-3/PD-9; align `availableFrom` handling between list and detail.
* **Cohort-context audit:** a test enumerates every student server action and asserts its batch handling is one of {derived-from-resource, validated-against-accessible-set, not-applicable}.
**Files:** `student/lib/actions/quiz.ts`, `student/lib/db/queries/{assessments,library,content,progress}.ts`, `student/lib/services/resume-learning.ts`, `student/app/(dashboard)/overview/page.tsx`.
**Database.** None required; M-5 optional.
**Security (threat → fix → test).** *Explanation/answer leak via foreign batchId* → derive from attempt → test submit with random/other-batch UUID returns suppressed results. *XP attribution to arbitrary batch* → derive/validate → test ledger `batch_id` equals attempt's batch. *Double attempt via parallel start* → advisory lock → test 20 parallel starts ⇒ 1 attempt. *Cross-student attempt id* → ownership in WHERE → test returns NOT_FOUND.
**Tests.** Integration + authorization as above; unit for explanation policy matrix (policy × dueAt past/future × missing curriculum); E2E: two-batch student switches cohort and sees no leakage in workspace/leaderboards/resume.
**Rollout.** Student-only deploy; backwards compatible (client may still send `batchId`; ignored). **DoD:** no action uses a client `batchId` as authority; races proven closed; spec Option C implemented; library behaviour documented per PD-7.
**Dependencies.** S0, S1a/S1d (accessibility), S3 (XP gate), PD-7, PD-8, PD-10. **Risks.** Behaviour change for in-flight attempts at deploy (mitigate: deploy outside exam windows).

---

### Slice 5 — Security & Abuse Protection

Split to respect dependencies: **5-core** (no infra dependency, ship early) and **5-abuse** (needs PD-13 and must precede the public batch link).

**5-core — Errors, login hardening, headers, logging.**
*Threat → vulnerability → mitigation → server enforcement → test:*
* **Unsafe/invalid redirect & crash (D-07):** `new URL()` unguarded → `safeCallbackPath(input)` accepts only same-origin relative paths (rejects `//host`, `/\host`, absolute foreign URLs, `javascript:`; absolute same-origin URLs are reduced to path+query) → used by the login page **and** `loginAction` → unit fuzz tests + live smoke (`/login?callbackUrl=foo` must be 200).
* **Error masking (D-08):** page shows one message for all `?error=` → map Auth.js codes (`CredentialsSignin`, `AccessDenied`, `Configuration`, `MissingCSRF`, `UntrustedHost`, unknown) to distinct user-safe messages; infrastructure kinds log server-side with a correlation id shown to the user ("reference: abc123"); entitlement lookup returns AD-5 result type so DB failure ≠ "unauthorized".
* **Sensitive error leakage (N-2, X-6):** public and admin actions return generic text for infrastructure failures; `logError` strips connection strings/driver text; unit test asserts no returned error contains `postgres://`, SQL fragments, or `error.message` of thrown DB errors.
* **Security headers (X-3):** via each app's `next.config.ts headers()`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (+ CSP `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera/mic/geo), `Strict-Transport-Security: max-age=31536000` (**no `includeSubDomains`/`preload` initially**), **CSP as `Content-Security-Policy-Report-Only` first** (Next inline scripts/Auth.js; tighten after observing), admin + web login pages get `noindex`. Keep the existing student `X-Robots-Tag` test and extend it per app.
* **CSRF:** server actions rely on Next's Origin/Host check; `/api/auth/*` uses Auth.js CSRF token — add smoke tests (cross-origin POST to a server action endpoint must fail; absent CSRF token on credentials callback must fail).
* **Dead branch (A-3):** remove or document the unreachable authenticated-`/login` redirect when touching the same file.
**Files:** `student/app/login/*`, `student/lib/auth/config.ts`, `student/lib/db/queries/entitlements.ts`, `student/lib/db/student-identity.ts`, new `packages/db/src/log.ts` (or `lib/log.ts` per app), three `next.config.ts`, public enrollment action.
**DB:** none. **Rollout:** headers in report-only first; watch for breakage on all three apps; promote CSP after one release cycle. **Rollback:** header config revert.

**5-abuse — Rate limiting & bot protection (shared infrastructure).**
* **Shared pieces:** `getClientIp()` (trust `cf-connecting-ip` only; ignore `x-forwarded-for` in production), `RateLimiter` interface with adapters (Workers Rate Limiting binding / in-memory for dev & tests), `verifyTurnstile(token, ip)`, a `throttle(key, policy)` helper that returns a uniform "try again later" response (no oracle).
* **Login (D-05):** per-IP (generous, NAT-friendly: colleges share IPs) + per-email (strict, e.g. 10/15 min) + Turnstile challenge after N failures; constant-time-ish failure path (always run a bcrypt compare against a dummy hash for unknown users to flatten timing and CPU).
* **Recovery/activation:** keep existing per-email/IP limits but back them with the shared limiter (per-isolate Map retained only as dev fallback).
* **Public enrollment (D-06) — program form and batch link:** Turnstile required; per-IP and per-email throttles; honeypot field; **idempotent side effects** — an existing pending account does not trigger another activation email within a cooldown; cap emails per address/day; no enumeration (identical response for "new" and "already registered" except for the same-session confirmation).
* **Edge (PD-13a):** Cloudflare WAF rate-limit rules on `POST /login`, `/api/auth/*`, `/enroll/*` as a second layer (dashboard change by the owner; documented).
**Config changes needed (approval required, executed in Slice 7):** `ratelimit` binding in `wrangler.jsonc`, `TURNSTILE_SECRET`/site key.
**Tests.** *Unit:* limiter policy windows; IP extraction (spoofed XFF ignored when `cf-connecting-ip` present); Turnstile verifier with mocked fetch (success/fail/timeout ⇒ fail closed). *Integration:* login throttle triggers at N and resets; throttled response indistinguishable from failure; enrollment idempotency (no second email in cooldown). *False-positive test:* 200 distinct users behind one IP can all sign in within policy. *Smoke (prod, read-only):* headers present; no unauthenticated POST abuse performed.
**Risks.** Rate-limit false positives on college NATs (mitigate: per-email primary, IP generous, Turnstile instead of hard block); Turnstile outage (fail-closed on public form with friendly message; login falls back to per-email throttle only).
**DoD.** Brute-force and form-spam scenarios are throttled at the edge and in-app; no spoofable IP use; headers live; `/login?callbackUrl=foo` is 200; no raw errors reach clients; security tests green.
**Dependencies.** S0; PD-13. **Order constraint:** 5-abuse **must** be live before the Slice 1c link is announced.

---

### Slice 6 — RBAC / Admin Hardening

**Objective.** Make admin authorization uniform, DB-backed and testable; document the permission model.
**Findings:** D-14 (re-scoped), A-1, A-2, auth-guard consistency.
**Root cause.** 9 of 12 action files use bare `auth()` (any session user) while 3 use `requireAdmin`/`requireSuperAdmin`; JWT is trusted for 30 days; OAuth login discards the DB role.
**Proposed.**
1. `requireAdmin()`/`requireSuperAdmin()` additionally load `users.status` and current roles from the DB (one indexed query) — suspended/demoted admins lose access on the next action; middleware stays JWT-based (coarse).
2. `callbacks.signIn` (GitHub): resolve DB roles and set `user.role` to the highest (`super_admin` > `admin`) so `jwt` stores the real role; credentials path unchanged.
3. Replace all bare `auth()` guards with the shared helpers (mechanical); add the **authz-coverage test** (AD-7).
4. **Permission matrix** committed to `docs/architecture/authorization.md` (colleges: super_admin; programs/batches/enrollments/import/content/quiz/review: admin+; role assignment/tutors: super_admin) — implemented as a table-driven map so PD-11 can later add scope.
5. Auditability: privileged mutations emit structured audit logs (actor id, action, target, before/after ids) now; durable `audit_log` table = optional M-6 once desired.
6. Destructive safeguards: confirmation dialogs retained; cancel/revoke/college-deactivate require reason text (logged).
**DB:** none (M-7 only if PD-11=B). **Tests:** *Authorization:* every action × {no session, student session, admin, super_admin, suspended admin, demoted admin}; GitHub login of a super_admin ⇒ super_admin session; coverage test. **Rollout:** admin-only deploy; risk: locking out the two super_admins by a guard bug — mitigate with a pre-deploy staging check and keeping credentials login as break-glass. **DoD:** all actions use the guards; suspended admin is rejected within one request; matrix documented and tested.
**Dependencies.** S0 (S1 adds actions that should use the new guards from the start, so land the helper change before/with S1b — it is small). PD-11.

---

### Slice 7 — Deployment, Routing & Production Verification

**Objective.** Make Cloudflare changes verifiable without risking production; fix routing/SEO gaps.
**Findings:** D-16, X-3 (infra side), D-22, `cf:build` verification, Workers plan/CPU question.
**7.1 Safe `cf:build` / Workers verification procedure (guard is *kept*):**
1. **Build from a clean tree:** `git worktree add ../rms-cf-verify <commit>` (or a fresh clone) — it has no `.env*` files, so `check-cloudflare-build-env.mjs pre` passes **without being weakened**. Run `pnpm install --frozen-lockfile`, then `pnpm --filter @rms/<app> cf:build` for each app. The `post` check proves `next-env.mjs` contains no variables. `.open-next` is git-ignored and lives only in the throwaway worktree.
2. **Static inspection of the artifact:** assert worker entry, assets directory, size under the Workers limit, no `process.env` literals with secrets (the existing post-check), and `wrangler deploy --dry-run --outdir <tmp>` (validates bindings/compat flags/bundle, **deploys nothing**).
3. **Local runtime test in workerd:** `opennextjs-cloudflare preview` with `.dev.vars` containing **only test-project credentials** (not bundled by OpenNext). Exercise: login (bcrypt CPU), a server action (assignment submit against test DB), `dbTx` WebSocket transaction (enrollment assignment), cookies (`__Host-` over `http://localhost` — Chrome accepts; use https preview via `wrangler dev --local-protocol https` for `__Host-`/Secure fidelity), middleware redirects, response headers.
4. **Staging deployment (needs explicit approval + config change, so not part of this phase):** a second Worker per app (`*-staging`) on `workers.dev` bound to the **test** Neon project and a staging `AUTH_SECRET`; production remains untouched. Alternatively `wrangler versions upload` (creates an un-promoted version with a preview URL) once approved.
5. **Production smoke (read-only, scripted, post-deploy):** `scripts/smoke/prod.mjs` issues only `GET/HEAD` (no logins, no writes): redirects for protected routes, `/login` 200 incl. `?callbackUrl=foo`, `?error=Configuration` text, `Set-Cookie` attributes, all required security headers, `robots.txt`, `sitemap.xml`, apex → `www` 301, soft-404 status, `/enroll/<bad>` returns 404. Output compared to a committed expectations file.
6. **Runtime-compatibility checklist** (executed in 3 and 4): Node APIs (`Buffer` in admin file import → needs `nodejs_compat`, present), `bcryptjs` CPU vs plan (confirm Workers Paid; add `limits.cpu_ms` to student/web only after measuring), WebSocket for `dbTx`, `Intl.DateTimeFormat('Asia/Kolkata')` availability, `process.env` population timing for `db`'s module-level read (keep `tx.ts` per-call pattern; consider lazy init in `index.ts`), incremental cache (default dummy cache ⇒ `revalidatePath` has no effect on cached pages; all authenticated routes are dynamic — verify, and note the sitemap/`lastmod` behaviour), image optimisation, observability logs.
**7.2 Routing fixes.** D-16: owner adds a Cloudflare Redirect Rule `rms-careers.com/*` → `https://www.rms-careers.com/$1` (301) *(dashboard, no repo change)*; in code add `metadataBase` + canonical for web; sitemap `lastmod` from content timestamps (or omit), drop `/login`; soft-404 → real 404 for unknown `/enroll/<code>`; admin/public branding strings (low priority); mark `tutor.` link as "coming soon" until the app exists.
**7.3 Config changes to request approval for (listed, not performed):** `ratelimit` binding, Turnstile vars, staging worker names/environments, optional `limits.cpu_ms`.
**DB:** none. **Tests:** the smoke suite itself is the test; unit tests for canonical/sitemap. **DoD:** clean-worktree `cf:build` documented and green for 3 apps; `wrangler deploy --dry-run` green; workerd preview passes the scripted flows against the test DB; prod smoke script committed and green; apex redirect verified. **Dependencies:** S0 (test DB), S5 (headers to verify). **Risk:** accidental production deploy — mitigated by never running `deploy` in this plan and by the guard on env files.

---

## 7. Dependency Graph

```
PD-14 test infra ─► S0 Test/Prod safety ──────────────────────────────────────────────┐
                        │                                                              │
                        ├─► S2a D-01 hotfix (introduces ENTITLED_STATUSES) ───────┐   │
                        │                                                          ▼   ▼
                        ├─► S5-core (error type, logger, login fix, headers) ─► S1a eligibility core
                        │                                                          │
                        ├─► S6 guards helper (small, before S1b) ──────────────────┤
                        │                                                          ▼
                        │                                   S1b admin cohort ops (assign batch, status machine, import)
                        │                                                          │  [PD-1]
                        │                                                          ▼
                        │                              backfill report → S1e student half-states
                        │                                                          │
                        │            ┌─────────────────────────────────────────────┤
                        │            ▼                                             ▼
                        │      S3 XP architecture  [PD-4, PD-9; PD-5 values]   S1d inactive enforcement [PD-3]
                        │            │                                             │
                        │            ▼                                             │
                        │      S4 multi-batch correctness  [PD-7, PD-8, PD-10] ◄───┘
                        │            │
                        ├─► S5-abuse (limiter, Turnstile) [PD-13] ──► S1c batch enrollment link [PD-2]
                        │
                        └─► S2b assignment authoring (needs S1a, S3 for approval XP)
                                         │
                                         ▼
                                S6 full RBAC pass ─► S7 deployment/verification ─► cleanup (D-21…D-23, S-7)
```

**Must-be-serial pairs (shared foundation):** S1a before S1b/1d/S3/S4 (all consume the eligibility module); S3 before S4's XP-bearing changes and before S2b's approval; S5-abuse before S1c; S0 before anything with real-DB tests.
**Safely parallel:** S5-core ∥ S2a (different apps/files); S6 guard-helper ∥ S1a; S7 smoke-script authoring ∥ any slice. **Not parallel:** S1b ∥ S3 (both mutate enrollment/stats semantics in `packages/db`); S3 ∥ S4 (same files `quiz.ts`/`dsa.ts`/`content.ts`).

---

## 8. Database Migration Plan

**Recommended path requires ZERO migrations.** Every required fix is expressible with existing tables, the partial unique indexes, advisory/row locks, derived state and application-level validation. The following are **conditional/optional** and **must not be created in this phase**.

| ID | Trigger | Tables/columns | New constraints/indexes | Data migration / backfill | Production-data compatibility | Rollback | Deployment order |
|---|---|---|---|---|---|---|---|
| **M-1** | After PD-3/batch vocabulary fixed (optional hardening) | `batches.status` | `CHECK (status IN ('draft','active','completed','archived'))` added `NOT VALID` then `VALIDATE` | none (all 15 rows are `active`/`completed`) | Safe | `DROP CONSTRAINT` | after S1b deployed (app already validates) |
| **M-2** | PD-2 = option C | new `batch_enrollment_links(id, batch_id FK, token_hash, expires_at, revoked_at, max_uses, uses, created_by FK users, created_at)` | unique `token_hash`; index `batch_id` | none | Additive | drop table (no dependents) | migration → admin deploy (create links) → public route |
| **M-3** | PD-13a = DB counters | new `rate_limit_counters(key, window_start, count)` | PK `(key, window_start)` + TTL cleanup job | none | Additive | drop table | before S5-abuse deploy |
| **M-4** | PD-4 = option B | `student_stats.college_id` → nullable | none; leaderboard queries gain `IS NOT NULL` | none | Loosening only | re-tighten after backfill | migration first, code second |
| **M-5** | Optional hardening of D-13 | `quiz_attempts` add `kind` (or `is_formal`) | partial unique `(quiz_id, student_id) WHERE kind='formal'` | **backfill `kind` from `quizzes.quiz_type`**; precheck for existing duplicate formal attempts (query first) | Needs duplicate check; additive column | drop index/column | column+backfill → index → code |
| **M-6** | Audit trail desired / PD-3 option B | new `audit_log(id, actor_user_id, action, target_type, target_id, before, after, created_at)` (+ optional prior-state columns if cascade chosen) | index `(target_type,target_id)`, `(actor,created_at)` | none | Additive | drop table | before admin deploy that writes it |
| **M-7** | PD-11 = scoped admins | new `admin_colleges(user_id, college_id)` | unique pair | seed from product input | Additive | drop table | before scoping code |
| **M-8** | PD-1 enforces "entitled ⇒ batch" | `enrollments` | `CHECK (status NOT IN ('confirmed','active') OR batch_id IS NOT NULL)` `NOT VALID` → `VALIDATE` | **must first place or revert the 6 confirmed batch-less rows** (backfill report from S1) | Would fail on current data until backfilled | `DROP CONSTRAINT` | only after backfill verified |

**General migration rules (production):** take a Neon branch/point-in-time restore point first; run `drizzle-kit generate` output review (never `db:push`); apply additive changes **before** the code that uses them and constraints **after** the code that respects them (expand → migrate → contract); PostgreSQL enum additions are never combined with usage in the same transaction (existing project rule); migrations are applied by an explicit release step with the production guard override, never by tests or seeds.

---

## 9. Testing Strategy

**Principles.** Real DB for anything that encodes a rule the database enforces or races (eligibility, uniqueness, XP, attempts); mocks only for external services (Resend, GitHub, Turnstile). Tests never read production credentials (Slice 0 guard). Every fix ships with the test that would have caught the original defect.

| Tier | Where it runs | Scope |
|---|---|---|
| **UNIT** | every PR, no DB (connection attempts throw) | `canTransition`, `cohortAccess`, `ENTITLED_STATUSES` matrix, `safeCallbackPath`, link signing, XP rules, streak/IST edges, level, explanation-policy matrix, limiter windows, IP extraction, rubric schema, guard matrix, error-sanitisation, repo-lint tests (no raw status literals; no `loadEnvFile` in tests; every server action has a guard; only gamification service writes `student_stats`) |
| **INTEGRATION** | CI + local against the **test** Neon project | enrollment assign/transfer/bulk/import, capacity race, partial unique index, college/program/batch inactivity effects, XP idempotency incl. parallel double-submit, ledger-sum invariant, formal attempt single-start race, assignment authoring + zero-write student GET, library/content/leaderboard cohort isolation, admin DB-backed guard (suspend/demote) |
| **AUTHORIZATION** | integration tier, table-driven | every server action × {anon, student A, student B, admin, super_admin, suspended admin}; IDOR: foreign `attemptId`/`submissionId`/`notificationId`/`enrollmentId`/`batchId`/`assignmentId`; unauthorized batch content by direct URL; explanation-bypass attempt; admin-only actions invoked as student; redirect fuzz; CSRF origin test |
| **DATABASE** | integration | migrations 0000–0004 apply cleanly to an empty DB; constraints (unique/partial unique/FK restrict/cascade); optional migrations' pre/post checks; backfill scripts idempotency (run twice ⇒ no change) |
| **E2E** | staging or workerd preview vs **test** DB (Playwright), nightly + pre-release | admin creates link → student registers → admin approves + assigns → student activates, logs in, sees only that cohort → completes lecture/DSA/quiz → submits project → admin approves → XP/leaderboard/overview consistent; multi-batch switch isolation; formal assessment with refresh/timeout; deactivate college and observe per PD-3; mobile viewport pass |
| **PRODUCTION SMOKE** | post-deploy, read-only scripts, no logins, no writes | §Slice 7 list; plus monitoring queries (§10) run read-only |

**Specific coverage called out by the audit:** multi-batch isolation; project eligibility (status × placement × publish × availability); single-attempt races (N parallel starts); XP idempotency (parallel + replay); enrollment lifecycle (full transition matrix); inactive college/program/batch enforcement (truth table × every access path); authorization boundaries (matrix above).
**Replace mock-mirroring tests:** keep unit mocks where they test pure logic; convert `enrollment-lifecycle`, `entitlements`, `projects`, `leaderboards` DB-rule assertions into integration tests so DB behaviour is exercised, not re-implemented.
**CI gates (required to merge):** typecheck, unit, integration, 3× `next build`; `cf-verify` (clean-worktree OpenNext build + `deploy --dry-run`) on release branches.

---

## 10. Production Rollout Strategy

**Global rules.** One slice (or sub-slice) per release; no schema change bundled with behaviour change; feature flags (env `vars`, defaulting to the *old* behaviour) for any behaviour that can cut off users (`ELIGIBILITY_ENFORCE_COLLEGE_STATE`, `ENFORCE_ATTEMPT_LOCKS`); deploy outside exam/deadline windows (check `batch_curriculum.due_at` for the next 48 h before each deploy); Neon restore point immediately before any data script or migration; **no deploy from a machine with a populated `.env.local`** (guard) — use the clean-worktree procedure. This plan performs no deployment.

| Slice | PRE-DEPLOYMENT | DEPLOYMENT | POST-DEPLOYMENT (smoke / monitoring / verification queries) | Rollback trigger → action |
|---|---|---|---|---|
| **S0** | create test & dev Neon projects; move `.env.local` off prod; owner-approved cleanup list of leftover test rows | n/a (tooling/CI only) | CI green on clean clone; confirm no prod host in any test config | n/a |
| **S2a** | integration test green; confirm count of `confirmed` rows (16) | `rms-student` only | verify a confirmed student can submit (use a **test cohort/account created for this purpose with owner consent**, not a real student); read-only query: submissions by enrollment status | error-rate spike on submit → redeploy previous version |
| **S5-core** | headers in Report-Only; staged on workerd preview | all three apps (config only) | prod smoke: headers, `/login?callbackUrl=foo` 200, error-message mapping; check CSP report volume | broken page/script blocked → remove CSP, keep other headers |
| **S1a/1b** | impact queries; backfill **report** reviewed by owner; restore point | admin then student; flags off | admin assigns a test enrollment; monitor `23505`/transaction errors in `wrangler tail`; queries: batch-less entitled enrollments trending to 0 | transaction failures >1% or wrong access → disable flag / redeploy previous |
| **S1d (PD-3)** | exact list of students affected (query) shared with owner; communication plan | flag on for a single college first | affected students see the specified state (read-only/closed); queries: accessible-batch count per student vs. before | students unexpectedly locked out → flag off immediately |
| **S1c (link)** | S5-abuse live; PD-2 decided; HMAC secret set | admin (link generation) then public route | submit one registration from a controlled address; check email dedupe and WAF counters | abuse spike → disable route (feature flag) |
| **S3** | reconcile **report** (drift baseline); restore point | admin+student same window | re-run report: drift must trend to 0 only for *new* events; apply script only after owner review, then re-run | duplicate XP detected → revert code; ledger is append-only, re-derive stats |
| **S4** | deploy off-hours; no active formal window | student | forged-`batchId` replay in test env; query attempts per (quiz,student) ≤1 for formal | attempt-start errors → revert |
| **S5-abuse** | bindings/secrets approved & created; WAF rules staged in "log" mode first | student/admin/web config | throttle counters; false-positive watch (login success rate before/after) | login success rate drops >X% vs baseline → relax thresholds, switch WAF to log |
| **S6** | verify both super_admins can log in via credentials (break-glass) | admin | suspend a *test* admin ⇒ rejected next action; GitHub super_admin gets right role | super_admin lockout → redeploy previous; use credentials login |
| **S7** | clean-worktree cf-build & dry-run green | n/a for config-only; apex redirect by owner in dashboard | scripted smoke incl. apex 301 | redirect loop → remove rule |

**Monitoring.** Enable/keep Workers observability (already `enabled: true`); structured logs from `logError/logAudit`; saved queries: unhandled exceptions, `23505`, `infrastructure` auth errors, rate-limit hits, 5xx rate per route, CPU-time p99 for login. **Verification queries** are read-only SQL kept in `scripts/verify/*.sql` (batch-less entitled enrollments; ledger vs stats drift; duplicate formal attempts; students without college/stats; entitled students in non-open cohorts).
**Old/new version coexistence:** all slices are additive in schema (none required) so rolling back code never strands data; the only two-way-door caution is the S3 reconcile `--apply`, which is guarded and logged.

---

## 11. Risk Register

| Risk | Probability | Impact | Affected area | Mitigation | Detection | Rollback |
|---|---|---|---|---|---|---|
| Data migration risk (optional M-x) | Low (zero required) | High | DB | expand→migrate→contract; NOT VALID→VALIDATE; restore point | pre/post count queries | drop constraint/table; PITR |
| Authorization regression (eligibility refactor, guards) | Medium | High | all student/admin actions | behaviour-preserving first deploy; repo-lint for raw literals; full authz matrix tests | authz test suite; `wrangler tail` 403/404 anomalies | redeploy previous version |
| Multi-batch regression (cohort derivation) | Medium | High | assessments, XP, leaderboards, library | integration tests with 2-batch students; cross-batch isolation tests retained | leaderboard/ledger consistency queries | revert student app |
| XP duplication / loss during consolidation | Medium | Medium | `activities`, `student_stats` | shared idempotency key; transactional award; reconcile report before/after | drift report, ledger-sum invariant job | revert; re-derive stats from ledger |
| Enrollment corruption (assign/transfer) | Low–Medium | High | `enrollments` | transaction + locks + partial unique index; integration race tests; audit log | queries for multiple entitled rows per (student,batch), orphan `transferred` | restore point; manual repair script (documented) |
| **Production DB test contamination** | **High today** → Low after S0 | High | prod DB | S0 guard (fail-closed), separate projects, CI without prod secrets | CI check; periodic query for test-prefixed rows | cleanup script (owner-approved) |
| Cloudflare runtime incompatibility (new code: advisory locks over WebSocket, Turnstile fetch, headers) | Medium | High | Workers | clean-worktree build, `deploy --dry-run`, workerd preview, staging worker | smoke + observability errors | redeploy previous version |
| Assessment attempt race / mis-expiry at deploy | Low | High (exam fairness) | formal quizzes | advisory lock; deploy outside windows; no change to timer math | attempts-per-(quiz,student) query | revert; manually reconcile affected attempts |
| Rate-limit false positives (college NAT, shared Wi-Fi) | Medium | Medium | login/enrollment | per-email primary, generous IP, Turnstile instead of hard blocks, WAF in log mode first | login success-rate dashboard | relax thresholds |
| Cutting off live students via inactive-state rule | Medium | High | access | PD-3 decision; impact query; flag; college-by-college rollout | affected-student query vs complaints | flag off |
| CSP breaks Next/Auth.js scripts | Medium | Medium | all apps | Report-Only first | CSP reports, smoke | remove header |
| Over-eager backfill assigns wrong batch/college | Low | High | data | **no automatic assignment**; report → owner review → scripted apply with dry-run | before/after diff report | PITR |
| Scope creep merging slices | Medium | Medium | delivery | strict slice order/exit criteria | review | split PRs |

---

## 12. Deferred / Accepted Findings

| Finding | Disposition | Reason / trigger to revisit |
|---|---|---|
| A-3 / D-21 dead `/login` redirect branch | LATER (fold into S5-core if same file) | harmless |
| A-4 admin cookie names not `__Host-` | ACCEPT | host-only already; revisit with a general auth upgrade |
| A-5 `trustHost: true` | ACCEPT | custom domains only; revisit if `workers.dev` is exposed |
| S-4 cascade asymmetry | ACCEPT + document | `RESTRICT` on `students` and `enrollments.batch_id` blocks destructive deletes |
| S-6 DSA reference global | ACCEPT | spec §15 Decision 2 |
| S-7 / D-23 dead code, `42703` fallbacks, `(row as any)`, `scratch/` | LATER (cleanup after S1–S4) | removing before the refactors risks churn |
| D-22 branding/soft-404/sitemap | LATER (S7, low) | cosmetic |
| D-24 stranded expired attempts | DECISION PD-10 | do not guess exam policy |
| D-25 tie ranking / name visibility | DECISION PD-12 | presentation only |
| D-10 numeric XP values | DECISION PD-5 | architecture proceeds with config |
| Library scope | DECISION PD-7 | keep behaviour until decided |
| D-14 scoped admins | DECISION PD-11 | flat model implemented now |
| P-1…P-5 performance | ACCEPT with thresholds | revisit at >500 active students (overview/leaderboard scans), >1,000 enrollments (admin list pagination — pull forward in S1b UI), imports >200 rows (chunking in S1b), `dbTx` latency p95 >500 ms |
| N-4 external-assessment XP | DECISION PD-5 | spec says it awards XP; code does not |
| Autosave for formal answers | NOT PLANNED | product scope |
| Tutor app, contact/application flow on `www` | NOT IN SCOPE | not implemented by design |

**Should NOT be fixed yet:** anything gated by PD-3 (D-17/Obs 4 enforcement), PD-2 (batch link), PD-5 (XP numbers), PD-7 (library), PD-10 (expired attempts), PD-11 (scoped admins), PD-12 (ties/names), and all cosmetic items.

---

## 13. Final Recommended Execution Order

| # | Phase | WHY NOW | DEPENDENCIES | FILES/AREAS | DB IMPACT | TESTING | EXIT CRITERIA |
|---|---|---|---|---|---|---|---|
| 0 | **Decisions (no code)** | Unblocks sequencing; PD-14 gates everything | — | this doc §4 | none | — | PD-14, PD-1, PD-3, PD-13 answered (others can trail) |
| 1 | **Slice 0** | Without it every later real-DB test risks production | PD-14 | configs, `test/`, CI, scripts | none (new test project) | guard tests | `pnpm test` cannot connect to a DB; CI green with test creds only; `.env.local` ≠ prod |
| 2 | **Slice 2a** hotfix | 16 production enrollments are blocked today; tiny, isolated | S0 | `projects.ts`, `eligibility.ts` (constants) | none | status matrix + placement | confirmed student submits |
| 3 | **Slice 5-core** | Gives honest errors/logging needed to diagnose Obs 2; headers; no infra dependency | S0 | login, entitlements result type, `next.config` ×3 | none | redirect fuzz, headers, error mapping | `/login?callbackUrl=foo` 200; infra errors visible; headers live |
| 4 | **Slice 6 guard helper** (small) | New S1 actions must be born with correct guards | S0 | `authz.ts` + mechanical swap | none | guard matrix | all actions use shared guards; A-1/A-2 closed |
| 5 | **Slice 1a/1b/1e** | Root of Obs 1–4; the most-shared foundation | S0, S2a, S5-core, PD-1, PD-4 | eligibility module, enrollments admin, import, student half-states | none | integration + authz + races | acceptance list in Slice 1 (minus 1c, 1d) |
| 6 | **Backfill report → apply** | Cleans the batch-less + stats gaps using the new tools | step 5 | `scripts/verify`, `scripts/backfill` | data only (guarded, idempotent) | dry-run diff | zero entitled batch-less enrollments; stats rows exist for all collegiate students |
| 7 | **Slice 3 (XP)** | Needs stats stamping & eligibility; unblocks S4/S2b XP | step 5, PD-4, PD-9 | gamification service, 5 actions, admin approval | none (M-4 conditional) | idempotency/parallel/ledger-sum | single writer, drift zero, XP table per PD-5 |
| 8 | **Slice 4 (multi-batch)** | Consumes eligibility+XP; closes authz/race items | steps 5, 7; PD-7/8/10 | quiz actions, resume, library | none (M-5 optional) | forged batchId, races, isolation | no client `batchId` authority; races closed |
| 9 | **Slice 5-abuse** | Must precede any public link; needs infra approvals | S0, PD-13 | limiter, Turnstile, WAF | none (M-3 cond.) | throttle/false-positive tests | brute-force & spam throttled |
| 10 | **Slice 1d (inactive enforcement)** | Needs PD-3 and S4's write-path discipline; highest user-impact | step 5, PD-3, impact query | eligibility wiring, admin badges | none | truth table × paths | per PD-3, flag rollout complete |
| 11 | **Slice 1c (batch link)** | Needs abuse controls and approved model | step 9, PD-2 | public route, admin copy-link | none (M-2 cond.) | E2E link→enroll→assign | Obs 1 satisfied safely |
| 12 | **Slice 2b (assignment authoring)** | Needs eligibility+XP; not blocking submissions (2a did) | steps 5, 7 | admin content, student read path | none | author→submit→approve E2E | zero writes on student GET |
| 13 | **Slice 6 full pass** | PD-11 docs/matrix, audit logs | step 4 | docs, tests | none (M-6/7 cond.) | authz coverage | matrix tested |
| 14 | **Slice 7** | Verification procedures finalise after code settles; apex redirect | steps 1, 3 | scripts, CI job, dashboard rules | none | smoke | clean-worktree cf-build, dry-run, preview, prod smoke green |
| 15 | **Cleanup** | Only after refactors | all | dead code, docs, branding | none | existing suites | audit P3s closed or accepted |

**Why this deviates from the example order:** XP comes *after* Enrollment (stats rows/college stamping are produced there) and Multi-batch comes *after* XP (its fixes call the XP gate); Security is split so cheap, high-value parts (errors, headers, login) land early and abuse controls land before — not after — the public batch link; the D-01 hotfix is pulled forward because it is isolated and user-visible.

---

## 14. Definition of Done for V1.1

1. **Safety:** no test/seed/tool can reach production; CI exists and is required; `.env.local` is dev-only.
2. **Enrollment:** admin can place any pending/confirmed enrollment into a valid batch; invalid program/batch/college combinations are rejected server-side; no entitled enrollment lacks a batch (or is explicitly labelled per PD-1); batch link (if approved) live behind abuse controls; inactive-state behaviour matches PD-3; legacy rows backfilled/reported.
3. **Projects:** confirmed students submit; admins author assignments; student reads never write; late policy per PD-6.
4. **XP:** one authoritative award path; ledger == stats; no UTC-dated rows; spec-conformant events; XP table ratified (PD-5).
5. **Multi-batch:** no action trusts a client batch id for authority; single-attempt and capacity races closed; explanation policy honoured fail-closed; Resume supports `preferredBatchId`; library behaviour documented.
6. **Security:** effective login/recovery/enrollment throttling; Turnstile on public forms; security headers on all apps; no raw error leakage; `/login?callbackUrl=foo` safe; admin sessions DB-validated; GitHub super_admin role correct.
7. **Deployment:** documented, repeatable, secret-safe `cf:build` verification; apex redirect live; production smoke script green.
8. **Quality gates:** unit + integration + authorization + E2E suites green in CI; repo-lint guards (no raw status literals, single `student_stats` writer, every server action guarded, no env loading in tests) in place.
9. **Documentation:** `authorization.md` matrix, `testing.md`, XP table, enrollment lifecycle, eligibility rules and runbooks (verification queries, backfill, rollback) updated; stale Vercel/Academy references removed or noted.
10. **Audit closure:** every finding in §3 is marked fixed, superseded, accepted or decision-pending with an owner.
