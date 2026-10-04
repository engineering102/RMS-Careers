# RMS Careers — Platform Implementation Roadmap

**Document Status:** Implementation Execution Plan  
**Version:** 2.0.0-FINAL  
**Author:** Antigravity Architecture & Technical Leadership  
**Target Platform:** RMS Careers Unified Educational Ecosystem  
**Date:** March 2026  

---

## 1. Executive Implementation Strategy

This roadmap operationalizes the target architecture defined in [RMS_CAREERS_PLATFORM_ARCHITECTURE.md](file:///c:/Users/Mohith/myprojects/RMS-Careers/docs/RMS_CAREERS_PLATFORM_ARCHITECTURE.md). It outlines the sequential phases, safety gates, and rollback strategies required to evolve the existing Admin application into a 4-surface platform without disrupting active enrollment workflows or compromising production data.

### Core Implementation Principles
1. **Zero Downtime for Admin:** The existing Admin enrollment features (bulk CSV ingestion, email confirmations, program listings) must remain functional after every git commit and deployment.
2. **Vertical Slices:** Every phase and sub-slice delivers an end-to-end, test-verified capability rather than horizontal, untested layers.
3. **Database Branching & Sandboxing:** All schema migrations and backfill scripts are tested against isolated Neon database branches before execution against production.
4. **Defense-in-Depth:** Security guards, role checks, and token hashing are built into foundational packages before higher-level user interfaces are exposed.
5. **Deployment Portability & Adapter Isolation:** Cloudflare is the initial deployment target (Workers/Pages, DNS, R2), while all domain and application logic remains strictly provider-neutral. Storage and email are accessed through explicit interfaces (`ObjectStorage`, `EmailProvider`).

---

## 2. Phase 0 — Existing Admin Hardening & Monorepo Foundation

Phase 0 isolates the existing working Admin application, establishes a strict testing baseline, transitions the repository to a `pnpm` workspace, and extracts shared database and identity packages.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 0 SUB-SLICE PROGRESSION                   │
├─────────────┬──────────────────────────┬───────────────────────────────┤
│ Slice 0.1   │ Admin Security Hardening │ Decommission env credentials; │
│             │                          │ implement secure DB auth.     │
├─────────────┼──────────────────────────┼───────────────────────────────┤
│ Slice 0.2   │ Admin Test Stabilization │ Add Vitest coverage for CSV   │
│             │                          │ parsing & enrollment actions. │
├─────────────┼──────────────────────────┼───────────────────────────────┤
│ Slice 0.3   │ Monorepo Restructuring   │ Initialize pnpm workspace;    │
│             │                          │ move Admin to apps/admin.     │
├─────────────┼──────────────────────────┼───────────────────────────────┤
│ Slice 0.4   │ Shared DB Package        │ Extract Drizzle schema & Neon │
│             │                          │ client into packages/db.      │
├─────────────┼──────────────────────────┼───────────────────────────────┤
│ Slice 0.5   │ Shared Identity Package  │ Create packages/auth with     │
│             │                          │ RBAC guards & token utilities.│
└─────────────┴──────────────────────────┴───────────────────────────────┘
```

---

### Slice 0.1: Admin Security Hardening

- **Objective:** Eliminate hardcoded plaintext credentials (`ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env.local`) and replace them with database-backed authentication using bcrypt-hashed passwords.
- **Preconditions:**
  - Active Neon database connection string verified.
  - Existing Admin deployment is operational.
- **Scope & Code Changes:**
  - Create initial `admins` table or seed the initial `users` + `user_roles` record in PostgreSQL with an Argon2id/Bcrypt hash.
  - Update `lib/auth.ts` credentials provider to query the database and verify the hashed password using `bcryptjs`.
  - Enforce `SameSite=Strict` and `HttpOnly` on Admin session cookies.
- **Verification:**
  - Administrator logs in using the seeded database credentials.
  - Entering invalid credentials correctly returns an authentication error.
  - Removing `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env.local` does not break login.
- **Rollback Strategy:** Revert `lib/auth.ts` to environment-based credentials if database query fails.
- **Exit Criteria:** Admin authenticates exclusively against PostgreSQL with zero plaintext credentials stored in environment files.

---

### Slice 0.2: Admin Test Stabilization

- **Objective:** Establish regression test suites for all mission-critical Admin business logic before structural file reorganizations occur.
- **Preconditions:**
  - Slice 0.1 complete.
  - Vitest installed in the existing Admin directory.
- **Scope & Code Changes:**
  - Write unit tests for the CSV/Excel parser (`lib/csv/*`):
    - Valid multi-row CSV imports.
    - Malformed headers, missing required fields, invalid email syntax.
    - Duplicate email and roll number detection.
  - Write integration tests for enrollment Server Actions with mocked database calls.
  - Write unit tests for Resend email formatting and payload construction.
- **Verification:**
  - Execute `npm run test` or `pnpm test`; all test suites pass with 100% success rate.
- **Rollback Strategy:** Test additions do not modify production code; failure requires fixing tests.
- **Exit Criteria:** Core parser and enrollment logic covered by passing automated tests.

---

### Slice 0.3: Repository & Monorepo Restructuring

- **Objective:** Move the single-project codebase into a standard `pnpm` monorepo structure without altering file logic.
- **Preconditions:**
  - Slice 0.2 complete with passing tests.
  - Clean git working tree.
- **Scope & Code Changes:**
  - Create root `pnpm-workspace.yaml`:
    ```yaml
    packages:
      - 'apps/*'
      - 'packages/*'
    ```
  - Create root `package.json` with Turborepo task pipelines.
  - Move current `Admin/` contents into `apps/admin/`.
  - Update path aliases in `apps/admin/tsconfig.json`.
- **Verification:**
  - Run `pnpm install` from repository root.
  - Run `pnpm --filter @rms/admin dev`; Admin console starts on `localhost:3000`.
  - Run `pnpm --filter @rms/admin test`; all tests continue to pass.
- **Rollback Strategy:** `git checkout` to restore single-directory root if workspace linking fails.
- **Exit Criteria:** Admin runs and passes tests inside `apps/admin` within the pnpm workspace.

---

### Slice 0.4: Shared Database Package Extraction (`packages/db`)

- **Objective:** Extract Drizzle schema, connection pooling, and migrations into an internal workspace package (`packages/db`) consumed by `apps/admin`.
- **Preconditions:**
  - Slice 0.3 complete.
- **Scope & Code Changes:**
  - Initialize `packages/db/package.json` with name `@rms/db`.
  - Move `apps/admin/lib/db/schema.ts` and `apps/admin/lib/db/index.ts` to `packages/db/src/`.
  - Add `@rms/db: "workspace:*"` to `apps/admin/package.json`.
  - Replace relative imports in `apps/admin` with `@rms/db`.
- **Verification:**
  - Run `pnpm --filter @rms/db build` (or TypeScript check).
  - Admin queries execute without type errors or runtime failures.
- **Rollback Strategy:** Revert imports in `apps/admin` to internal `lib/db/`.
- **Exit Criteria:** Schema and database client reside exclusively in `packages/db`.

---

### Slice 0.5: Shared Identity & Security Package (`packages/auth`)

- **Objective:** Create `packages/auth` containing password hashing algorithms, RBAC role assertion helpers, and cryptographically secure token generators.
- **Preconditions:**
  - Slice 0.4 complete.
- **Scope & Code Changes:**
  - Initialize `packages/auth/package.json` with name `@rms/auth`.
  - Implement `hashPassword()` and `verifyPassword()` using `bcryptjs` (cost factor 12).
  - Implement `generateAccountToken()`: returns `{ rawToken, tokenHash }` using `crypto.randomBytes(32)` and SHA-256.
  - Implement RBAC assertion utilities: `assertRole(session, allowedRoles)`.
- **Verification:**
  - Unit tests verify that SHA-256 token hashing is deterministic and password verification rejects invalid strings.
- **Rollback Strategy:** Standalone package; can be refactored without touching Admin.
- **Exit Criteria:** `@rms/auth` passes unit tests and is ready for integration across all portals.

---

## 3. Phase 1 — Shared Identity and Institutional Foundation

- **Objective:** Deploy the unified multi-tenant institutional schema to Neon and execute the non-destructive data migration of existing student records.
- **Scope:**
  - Deploy new tables: `users`, `user_roles`, `account_tokens`, `colleges`, `batches`, `tutor_batch_assignments`.
  - Migrate existing records in `students` to link with `users` and a designated initial `colleges` record.
- **Database Changes:**
  - Run Drizzle migration creating the new identity and institutional tables.
  - Execute data migration script:
    1. Insert designated partner institution into `colleges` (e.g. `code: 'DEFAULT_PARTNER'`).
    2. For each record in legacy `students`, create a corresponding `users` row with `status = 'pending_activation'`.
    3. Insert a `user_roles` row with `role = 'student'`.
    4. Populate `students.user_id` and `students.college_id` foreign keys.
  - Apply `NOT NULL` constraints on foreign keys.
- **Application Changes:**
  - Update `apps/admin` student queries to join through `users` and `colleges`.
- **Security Requirements:**
  - Raw activation tokens generated during migration are hashed before insertion into `account_tokens`.
- **Tests:**
  - Migration dry-run tested on a Neon database branch clone.
  - Verify that existing enrollments and student counts remain identical before and after migration.
- **Exit Criteria:** All existing student records resolve through `users` and `colleges`; Admin bulk import creates corresponding `users` records atomically.

---

## 4. Phase 2 — Public Brand & Marketing Website (`apps/web`)

- **Objective:** Launch `rmscareers.com` as the unauthenticated marketing, trust, and freemium discovery layer.
- **Scope:**
  - Initialize `apps/web` using Next.js 15 App Router.
  - Build landing page, curriculum overview, institutional partnership inquiry, and student success showcases.
  - Implement the **Freemium Public DSA Practice** section:
    - Queries public sheets (`visibility = 'public'`) via `@rms/db`.
    - Allows anonymous visitors to view problems and hints.
    - Stores anonymous progress strictly in browser `localStorage`.
    - Displays callout banner: *"Create or activate your student account to save progress and earn XP."*
  - Build the **Portal Selector Gateway** at `rmscareers.com/login` (clean redirects to `student`, `tutor`, or `admin`).
- **Application Changes:**
  - SSG/ISR rendering with edge CDN caching.
  - SEO optimization: dynamic `/sitemap.xml`, Open Graph tags, JSON-LD structured data.
- **Security Requirements:**
  - The public site accepts zero credentials and contains zero administrative or grading code.
  - Headers: strict CSP, HSTS, `X-Content-Type-Options: nosniff`.
- **Tests:**
  - Core Web Vitals audit: Lighthouse score >= 95 across Performance, Accessibility, and SEO.
  - Responsive layout validation across mobile, tablet, and desktop breakpoints.
- **Exit Criteria:** `apps/web` deployed to Cloudflare (Workers/Pages) and mapped to `rmscareers.com`.

---

## 5. Phase 3 — Student Application MVP (`apps/student`)

- **Objective:** Deliver the primary authenticated student learning and practice platform on `student.rmscareers.com`.
- **Scope:**
  - Initialize `apps/student` with Next.js 15 App Router.
  - Implement account activation flow via emailed secure tokens:
    - User clicks link: `https://student.rmscareers.com/activate?token=...`
    - Token hash validated against `account_tokens` via atomic compare-and-swap query.
    - Student establishes their password; account status transitions to `active`.
  - Implement `__Host-student-session` authentication via Auth.js.
  - Build the **DSA Practice Center**:
    - Topic tree and curated sheets (filtered by `visibility IN ('public', 'enrolled')`).
    - Problem view with topic tags, external links (LeetCode/GFG), and hint drawers.
  - Build the **Server-Authoritative Progress Engine**:
    - Problem solved action invokes `ServerXpRuleEngine`.
    - Inserts into `activities` and `xp_ledger` with idempotency key.
    - Transactionally updates `student_stats` and evaluates `Asia/Kolkata` calendar streaks.
  - Build the **College Leaderboard**:
    - Queries `student_stats` filtered by `college_id` ordered by `total_xp DESC`.
- **Security Requirements:**
  - Zero trust of client-submitted XP or streak values.
  - Header: `X-Robots-Tag: noindex, nofollow` emitted for all student routes.
- **Tests:**
  - Unit tests for `ServerXpRuleEngine`: verify XP calculation across Easy, Medium, Hard problems.
  - Idempotency test: verify that submitting the same solved problem multiple times awards XP exactly once.
  - Streak test: verify consecutive calendar days in `Asia/Kolkata` increment streak, same day maintains streak, and missed day resets streak.
- **Exit Criteria:** Enrolled students can activate accounts, solve DSA questions, accumulate XP, and view their college ranking.

---

## 6. Phase 4 — Tutor Application MVP (`apps/tutor`)

- **Objective:** Deploy the high-density academic workbench on `tutor.rmscareers.com` for instructors and evaluators.
- **Scope:**
  - Initialize `apps/tutor` with `__Host-tutor-session` authentication.
  - Implement Batch Roster View:
    - Displays students and aggregate progress for batches assigned to the authenticated tutor via `tutor_batch_assignments`.
  - Implement Assignment Creation (Batch-Scoped):
    - Tutors create assignments with problem descriptions, due dates, and rubrics.
    - Assignments created in `draft` mode pending Admin publication (Locked Rule).
  - Implement Submission Review Workbench:
    - Pending submission queue with filters by batch and status.
    - Split-screen code/text submission viewer.
    - Structured qualitative feedback editor: rubric scoring, comments, and decision (`approved`, `resubmission_requested`).
- **Security Requirements:**
  - IDOR Protection: Every query and mutation asserts that the target submission belongs to a batch assigned to the authenticated tutor.
- **Tests:**
  - Authorization tests: assert that a tutor attempting to query a submission from an unassigned batch receives `404 Not Found`.
- **Exit Criteria:** Tutors can log in, view assigned cohort rosters, grade submissions, and provide qualitative feedback.

---

## 7. Phase 5 — Admin Application Evolution (`apps/admin`)

- **Objective:** Mature the Admin console on `admin.rmscareers.com` into an enterprise control plane.
- **Scope:**
  - Implement College Management:
    - Register partner colleges, configure roll number formats, manage active status.
  - Implement Batch & Program Orchestration:
    - Create Program offerings and instantiate college-specific Batches.
    - Assign and reassign Tutors to Batches via a visual assignment matrix.
  - Implement Content & Tutor Moderation Queue:
    - Review tutor-authored assignment and article drafts; promote to `published`.
  - Implement Platform Audit Log Viewer:
    - Filterable data table displaying immutable records from `audit_logs`.
- **Security Requirements:**
  - Strict `SUPER_ADMIN` check on role elevations and college deletions.
- **Tests:**
  - End-to-end testing of college creation -> batch creation -> tutor assignment -> student bulk CSV import.
- **Exit Criteria:** Complete academic and institutional lifecycle managed through the Admin UI.

---

## 8. Phase 6 — Cross-Platform Workflows & Polish

- **Objective:** Connect cross-surface event loops and automated notifications.
- **Scope:**
  - Emailed Notifications via Resend:
    - Automated email to student when tutor submits assignment feedback.
    - Automated email to tutor when a student submits an assignment.
  - Student Profile & Resume Vault:
    - Student profile page with GitHub, LinkedIn, and PDF resume upload.
    - Uploads stored in private object storage (Cloudflare R2 via `ObjectStorage` interface); tutors access via signed URLs.
  - Mock Interview Scheduling:
    - 1-on-1 interview slot booking and evaluation scorecards.
- **Exit Criteria:** End-to-end feedback loop operational across Student, Tutor, and Admin portals.

---

## 9. Phase 7 — Advanced Scaling & Analytics

- **Objective:** Scale platform infrastructure to support high institutional concurrency.
- **Scope:**
  - Read-Replica Splitting:
    - Route analytical Admin queries and public catalog fetches to a Neon read replica.
  - Automated PDF Watermarking:
    - Dynamically watermark student roll number and email on downloaded curriculum PDFs.
  - Institutional Placement Analytics:
    - College-level dashboards tracking cohort readiness, topic mastery, and placement conversion.
- **Exit Criteria:** Platform validated under simulated load of 5,000+ concurrent active students.

---

## 10. Database Migration Protocol: Legacy to Unified Schema

The existing database contains active production data in `students`, `programs`, and `enrollments`. This protocol governs the safe migration to the unified schema:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DATA MIGRATION DECISION RECORD                    │
├────────────────────────────────────────────────────────────────────────┤
│ CURRENT STATE:                                                         │
│ Existing student records contain:                                      │
│ `full_name`, `email`, `phone`, `college_roll_number`, `branch`, `year` │
│ but NO `college_id` foreign key.                                       │
│                                                                        │
│ MIGRATION DECISION:                                                    │
│ 1. An explicit partner college record will be inserted representing     │
│    the primary institution of the existing cohort:                     │
│    `INSERT INTO colleges (name, code) VALUES ('MVSR', 'MVSR_ENG');`    │
│ 2. Existing student records will be bound to this college during the   │
│    migration script. No students will be assigned to a generic or      │
│    invented entity without institutional confirmation.                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Migration Execution Steps
1. **Branch Testing:** Create a Neon database branch (`migration-test-01`).
2. **Execute Schema Creation:** Run Drizzle migrations on the branch creating `users`, `user_roles`, `account_tokens`, `colleges`, `batches`.
3. **Run Backfill Script:**
   ```sql
   BEGIN;
     -- Step A: Insert primary partner college
     INSERT INTO colleges (id, name, code) 
     VALUES ('c0000000-0000-0000-0000-000000000001', 'Partner Institution', 'PARTNER_COLLEGE')
     ON CONFLICT (code) DO NOTHING;

     -- Step B: Backfill users from students
     INSERT INTO users (id, email, status, created_at)
     SELECT gen_random_uuid(), email, 'pending_activation', created_at 
     FROM students
     ON CONFLICT (email) DO NOTHING;

     -- Step C: Assign student roles
     INSERT INTO user_roles (user_id, role)
     SELECT u.id, 'student' 
     FROM users u
     JOIN students s ON u.email = s.email
     ON CONFLICT (user_id, role) DO NOTHING;

     -- Step D: Link foreign keys on students
     UPDATE students s
     SET user_id = u.id, college_id = 'c0000000-0000-0000-0000-000000000001'
     FROM users u
     WHERE s.email = u.email AND s.user_id IS NULL;
   COMMIT;
   ```
4. **Validation Check:** Verify that `SELECT count(*) FROM students WHERE user_id IS NULL;` returns `0`.
5. **Apply Constraints:** Add `NOT NULL` constraints to `students.user_id` and `students.college_id`.
6. **Production Execution:** Execute against the primary Neon production branch during a scheduled 5-minute maintenance window.

---

## 11. Final Implementation Readiness Gate

```
┌────────────────────────────────────────────────────────────────────────┐
│                       ARCHITECTURE READINESS STATUS                    │
│                                                                        │
│                      >>> READY FOR IMPLEMENTATION <<<                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.1. Locked Decisions
1. **Student Registration:** Invitation-only via Admin bulk onboarding.
2. **Tutor Publishing:** Tutors author drafts; Admin approval is required for publication.
3. **Tutor Assignments:** Cross-college tutor pool assigned to batches across institutions.
4. **Public Curriculum:** Freemium model with selected starter DSA sheets accessible anonymously.
5. **Subdomain Isolation:** Independent `__Host-` prefixed session cookies per application portal.
6. **Progress Authority:** Server-authoritative `ServerXpRuleEngine` with idempotent ledger transactions.
7. **Streak Standard:** Deterministic calendar-date model in `Asia/Kolkata` (IST) time.
8. **Token Security:** SHA-256 hashed single-use tokens in `account_tokens` table.

### 11.2. Remaining Decisions
- **Zero blocking decisions remain.** All architectural ambiguities, token semantics, streak boundaries, and schema invariants have been resolved.

### 11.3. Implementation Blockers
- **None.** The path forward is completely unlocked.

### 11.4. First Implementation Slice
Upon explicit approval, implementation begins immediately with:
> **Phase 0.1 — Admin Security Hardening:**  
> Transition `apps/admin/lib/auth.ts` from plaintext environment credentials to database-backed authentication using bcrypt-hashed passwords.

---
*End of Implementation Roadmap. Ready for Phase 0 execution upon stakeholder approval.*
