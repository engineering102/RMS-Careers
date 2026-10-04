# RMS Careers — Platform Architecture Specification

**Document Status:** Approved Target Architecture (Consistency & Portability Validated)  
**Version:** 2.2.0-FINAL-PORTABLE  
**Author:** Antigravity Architecture & Technical Leadership  
**Target Platform:** RMS Careers Unified Educational Ecosystem  
**Date:** March 2026  

---

## 1. Executive Summary

RMS Careers is an enterprise-grade educational, placement preparation, and training platform deployed across four dedicated subdomains under the canonical domain `rmscareers.com`:

1. **Public Website (`rmscareers.com`):** Unauthenticated brand showcase, trust layer, SEO-optimized curriculum discovery, and freemium practice portal.
2. **Student Application (`student.rmscareers.com`):** Authenticated learning environment for DSA sheets, structured curriculum, assignments, gamified progress, and college leaderboards.
3. **Tutor Application (`tutor.rmscareers.com`):** High-efficiency academic workbench for instructors and mentors to evaluate submissions, monitor batch progress, deliver qualitative feedback, and conduct mock interviews.
4. **Admin Application (`admin.rmscareers.com`):** Administrative control plane governing institutional onboarding (colleges), curriculum lifecycle, batch orchestration, student rosters, bulk imports, audit logging, and platform security.

The platform is designed with a strict **portability-first architecture**. It utilizes **Cloudflare** for initial infrastructure (DNS, Workers/edge runtime, and R2 object storage) and **Neon PostgreSQL** with **Drizzle ORM**, while strictly isolating all infrastructure details behind provider-neutral interfaces in a **pnpm monorepo** workspace.

---

## 2. Product Vision and Locked Foundation

The product direction incorporates four **Locked Decisions**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOCKED PRODUCT DECISIONS                        │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. Student Registration  │ INVITATION-ONLY via Admin/College bulk CSV  │
│                          │ onboarding. No open self-registration.      │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 2. Tutor Publishing      │ DRAFTS ONLY. Tutors author content as       │
│                          │ drafts; Admin approval is required for      │
│                          │ platform-wide or batch publication.         │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 3. Tutor Assignments     │ CROSS-COLLEGE POOL. Tutors are independent  │
│                          │ and can mentor batches across colleges.     │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 4. Public Curriculum     │ FREEMIUM. Selected starter DSA sheets and   │
│                          │ guides are publicly accessible to anonymous │
│                          │ visitors to drive SEO and conversion.       │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 3. Application and Surface Topology

Each surface is deployed as an independent Next.js 15 application within a shared repository workspace, mapped to its respective canonical domain.

```
                              ┌────────────────────────────────────────┐
                              │            RMS Careers Brand           │
                              │           https://rmscareers.com       │
                              │    (Trust, Freemium DSA, Curriculum)   │
                              └───────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
  ┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
  │     Student Application      │ │      Tutor Application       │ │      Admin Application       │
  │   student.rmscareers.com     │ │    tutor.rmscareers.com      │ │     admin.rmscareers.com     │
  │                              │ │                              │ │                              │
  │ • Authenticated (STUDENT)    │ │ • Authenticated (TUTOR)      │ │ • Authenticated (ADMIN)      │
  │ • Cookie: __Host-student-sess│ │ • Cookie: __Host-tutor-sess  │ │ • Cookie: __Host-admin-sess  │
  │ • DSA Sheets & Topic Trees   │ │ • Assigned Batch Rosters     │ │ • Institutional Governance   │
  │ • Progress & XP Ledger       │ │ • Submission Review Queue    │ │ • Master Curriculum & Sheets │
  │ • Assignments & Submissions  │ │ • Qualitative Rubric Feedback│ │ • Bulk Roster CSV Ingestion  │
  │ • College Leaderboard        │ │ • Mock Interview Management  │ │ • Platform Security & Audit  │
  └──────────────┬───────────────┘ └──────────────┬───────────────┘ └──────────────┬───────────────┘
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  │
                                                  ▼
                               ┌─────────────────────────────────────┐
                               │       Shared Platform Core          │
                               │  PostgreSQL (Neon) + Drizzle ORM    │
                               │  Shared Identity & Domain Engine    │
                               └─────────────────────────────────────┘
```

### Surface Operational Matrix

| Surface | Deployment | Authentication | Rendering | Key UX Attribute |
| :--- | :--- | :--- | :--- | :--- |
| **Public Web** | `apps/web` | None (Public) | SSG / ISR (Edge CDN) | Fast, responsive, accessible, high conversion |
| **Student** | `apps/student`| `STUDENT` role | Dynamic SSR (RSC + Actions) | Distraction-free, motivating, dark/light theme |
| **Tutor** | `apps/tutor` | `TUTOR` role | Dynamic SSR (RSC + Actions) | Dense data grids, split-screen review drawer |
| **Admin** | `apps/admin` | `ADMIN` / `SUPER_ADMIN` | Dynamic SSR (RSC + Actions) | Data integrity, transactional confirmations |

---

## 4. Platform Strategy & Deployment Portability

### 4.1. Core Portability Requirement
> **Portability Rule:** The RMS Careers core application and domain logic must remain portable across standards-compatible hosting environments. Infrastructure-specific capabilities must be isolated behind explicit adapters/interfaces and must not leak into domain logic or core application services.
>
> RMS Careers must not require a migration of domain/business logic when changing hosting providers. A hosting-provider migration should primarily require replacement of deployment configuration and infrastructure adapters rather than rewriting business rules or application workflows.

### 4.2. Initial Deployment Platform (Cloudflare)
Cloudflare is selected as the initial infrastructure provider, not the application architecture:
- **DNS & Ingress:** Cloudflare DNS with SSL/TLS termination and DDoS mitigation.
- **Compute Runtime:** Cloudflare Workers / Pages edge runtime (via Next.js edge/workers compatibility layer such as OpenNext or `@cloudflare/next-on-pages`).
- **Object Storage:** Cloudflare R2 for private document storage (PDFs, slide decks, resumes) accessed strictly via an application-level storage abstraction.
- **Relational Database:** Neon PostgreSQL accessed via standard SQL connection pooling (`@neondatabase/serverless` over HTTP/WebSocket or standard pg pooler).

```
                            Cloudflare Ingress (DNS / SSL)
                                   rmscareers.com
                                          │
          ┌───────────────────────┬───────┴───────────────┬───────────────────────┐
          ▼                       ▼                       ▼                       ▼
   [ Cloudflare Worker ]   [ Cloudflare Worker ]   [ Cloudflare Worker ]   [ Cloudflare Worker ]
      rms-public-web          rms-student-app         rms-tutor-app           rms-admin-app
      rmscareers.com        student.rmscareers.com  tutor.rmscareers.com    admin.rmscareers.com
          │                       │                       │                       │
          └───────────────────────┼───────────────────────┼───────────────────────┘
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │       Application Layer         │
                 │   (Domain Logic, Rules, RBAC)   │
                 └────────────────┬────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       [ Storage Adapter Interface ]   [ Database Connection Pool ]
                  │                               │
                  ▼                               ▼
       ┌─────────────────────┐         ┌─────────────────────┐
       │    Cloudflare R2    │         │   Neon PostgreSQL   │
       │  (Object Storage)   │         │ (Serverless Branch) │
       └─────────────────────┘         └─────────────────────┘
```

### 4.3. Infrastructure Layer vs. Domain Layer Separation

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE BOUNDARIES                       │
├───────────────────────────────┬────────────────────────────────────────┤
│ APPLICATION / DOMAIN LAYER    │ INFRASTRUCTURE ADAPTER LAYER           │
│ (Strictly Provider-Neutral)   │ (Replaceable Implementations)          │
├───────────────────────────────┼────────────────────────────────────────┤
│ • Business & enrollment rules │ • Cloudflare Worker runtime configs    │
│ • ServerXpRuleEngine          │ • Cloudflare R2 ObjectStorage adapter  │
│ • Deterministic streak engine │ • Resend EmailProvider adapter         │
│ • RBAC assertion services     │ • Edge cache headers & CDN rules       │
│ • Content visibility guards   │ • Neon serverless HTTP connection pool │
│ • Drizzle schema & queries    │ • Environment variable loaders         │
│ • Validation (Zod schemas)    │ • Future Queue / Event bus adapters    │
└───────────────────────────────┴────────────────────────────────────────┘
```

### 4.4. Explicit Application Interfaces

#### 1. Object Storage Abstraction (`ObjectStorage`)
The domain layer never imports Cloudflare R2 SDKs or AWS S3 SDKs directly. All file uploads and signed URL generations interact through a lightweight interface:

```typescript
// packages/db/src/storage/interface.ts (or packages/storage)
export interface ObjectStorage {
  upload(params: {
    key: string;
    data: ReadableStream | Buffer | Uint8Array;
    contentType: string;
    contentLength?: number;
  }): Promise<{ key: string; url?: string }>;

  getSignedUrl(params: {
    key: string;
    expiresInSeconds: number;
  }): Promise<string>;

  delete(key: string): Promise<void>;
}
```
Underneath this interface, `CloudflareR2Storage` implements the methods using standard S3-compatible APIs. If RMS Careers later migrates to AWS S3, Google Cloud Storage, or MinIO, only the underlying adapter is replaced; zero domain services or Server Actions require modification.

#### 2. Transactional Email Abstraction (`EmailProvider`)
Business logic does not couple directly to Resend or any third-party mailer:

```typescript
// packages/auth/src/email/interface.ts
export interface EmailProvider {
  send(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
```
Implemented by `ResendEmailProvider` (or a future SMTP/SES adapter).

### 4.5. Additional Portability Invariants
1. **Application-Level Identity:** Authentication and authorization remain 100% within the Next.js application layer (`Auth.js`, session tokens, bcrypt/argon2id). The platform does **not** rely on Cloudflare Access, Cloudflare Zero Trust, or proprietary edge identity headers.
2. **Infrastructure Caching:** Cloudflare edge caching is treated strictly as a performance optimization. The platform remains fully functional and correct even if caching is completely bypassed.
3. **Provider-Neutral Environment Variables:** Application code reads standard names:
   - `DATABASE_URL` (instead of vendor-specific connection keys)
   - `AUTH_SECRET`
   - `EMAIL_API_KEY`
   - `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`
4. **Runtime Standards Compatibility:** Application and domain code strictly targets standard Web APIs (`fetch`, `crypto`, `Headers`, `Request`, `Response`, `ReadableStream`). Native C++ Node.js binaries that cannot run in modern edge/worker runtimes are barred from shared core packages.

---

## 5. Domain Architecture and Relationships

The platform organizes its domain into five clean sub-domains:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DOMAIN BOUNDARIES                                    │
├──────────────────┬──────────────────┬──────────────────┬───────────────────────────────┤
│ Identity & Auth  │ Institutional &  │ Content &        │ Pedagogy &                    │
│                  │ Cohorts          │ Curriculum       │ Evaluation                    │
├──────────────────┼──────────────────┼──────────────────┼───────────────────────────────┤
│ • users          │ • colleges       │ • content_items  │ • assignments                 │
│ • user_roles     │ • programs       │ • program_content│ • assignment_submissions      │
│ • account_tokens │ • batches        │ • dsa_sheets     │ • submission_feedback         │
│ • audit_logs     │ • enrollments    │ • dsa_questions  │ • mock_interviews             │
│                  │ • tutor_batches  │ • sheet_questions│ • activities & xp_ledger      │
│                  │                  │                  │ • student_stats & achievements│
└──────────────────┴──────────────────┴──────────────────┴───────────────────────────────┘
```

### Institutional Domain Rules
1. **Colleges:** Higher education institutions (e.g., "MVSR Engineering College"). Owns batches and student rosters.
2. **Programs:** Master educational offerings (e.g., "Full Stack Placement 2026").
3. **Batches (Cohorts):** Concrete instances of a Program tied to a College and academic calendar.
4. **Student College Binding:** A Student belongs to exactly one College. College roll numbers are unique within that college (`UNIQUE(college_id, college_roll_number)`).
5. **Cross-College Tutors:** Tutors can be assigned to batches across multiple colleges (`tutor_batch_assignments`).

---

## 6. Authentication, Identity, and Tokens

### 6.1. Unified Identity Model
All authenticated entities use a single `users` record paired with typed 1-to-1 profile tables and 1-to-many role assignments:

```
                               ┌────────────────────────────────┐
                               │             users              │
                               ├────────────────────────────────┤
                               │ id: uuid (PK)                  │
                               │ email: citext (UNIQUE)         │
                               │ password_hash: text            │
                               │ status: user_status            │
                               │ email_verified_at: timestamp   │
                               └───────────────┬────────────────┘
                                               │
                       ┌───────────────────────┼───────────────────────┐
                       │ 1:N                   │ 1:1                   │ 1:1
                       ▼                       ▼                       ▼
           ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐
           │      user_roles       │ │     students      │ │      tutors       │
           ├───────────────────────┤ ├───────────────────┤ ├───────────────────┤
           │ user_id: uuid (FK)    │ │ user_id: uuid (PK)│ │ user_id: uuid (PK)│
           │ role: role_enum       │ │ college_id: uuid  │ │ full_name: text   │
           │ granted_at: timestamp │ │ full_name: text   │ │ headline: text    │
           └───────────────────────┘ │ roll_number: text │ │ bio: text         │
                                     └───────────────────┘ └───────────────────┘
```

### 6.2. Secure Token Architecture (`account_tokens`)
Raw tokens are **never stored** in the database. All account activation and password reset tokens use cryptographically random 256-bit strings hashed with SHA-256 before storage:

- `account_tokens` table:
  - `id`: UUID primary key
  - `user_id`: UUID foreign key referencing `users.id`
  - `token_hash`: `VARCHAR(64)` indexed lookup hash
  - `token_type`: Enum (`activation`, `password_reset`)
  - `expires_at`: Timestamp with timezone (Activation: 7 days; Password reset: 60 minutes)
  - `consumed_at`: Nullable timestamp recording consumption
  - `created_at`: Timestamp with timezone
- **Single-Use Enforcement:** Tokens are consumed via an atomic compare-and-swap query:
  ```sql
  UPDATE account_tokens
  SET consumed_at = NOW()
  WHERE token_hash = :hash
    AND token_type = :expectedType
    AND consumed_at IS NULL
    AND expires_at > NOW()
  RETURNING user_id;
  ```
- **Replay Protection:** If `consumed_at IS NOT NULL` or rows affected == 0, the operation is rejected immediately.

---

## 7. Subdomain and Session Strategy

### 7.1. Independent `__Host-` Session Cookies
Wildcard cookies (`Domain=.rmscareers.com`) and centralized SSO protocols are explicitly rejected. Each subdomain maintains an independent session cookie protected by the RFC 6265bis `__Host-` prefix:

- `student.rmscareers.com`: Sets `__Host-student-session` with `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`.
- `tutor.rmscareers.com`: Sets `__Host-tutor-session` with `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`.
- `admin.rmscareers.com`: Sets `__Host-admin-session` with `Path=/`, `Secure`, `HttpOnly`, `SameSite=Strict`.

### 7.2. Cross-Subdomain Security Guarantees
1. **Cookie Scoping:** `__Host-` cookies cannot be modified or read by sibling subdomains or parent domains.
2. **Subdomain Cookie Tossing Immunity:** Sibling subdomains cannot overwrite or inject session cookies.
3. **Role Enforcement:** Middleware on each subdomain extracts the session and verifies that the `user_id` has the mandatory role for that subdomain in `user_roles`. Users without the requisite role receive a `403 Forbidden` and are redirected to that portal's login page.
4. **Session Invalidation:** Revoking a role or suspending a user in the `users` table immediately invalidates active sessions at the next server verification cycle.

---

## 8. Enrollment and Batch Semantics

### 8.1. Program vs. Batch Hierarchy
A student does not enroll into an abstract program in isolation; they are enrolled into a concrete **Batch** of a Program.

```
Program (e.g. Placement Prep 2026)
   │
   └── Batch (e.g. MVSR - CSE 2026 - Batch 1)
          │
          └── Enrollment (Student ↔ Batch ↔ Program)
```

### 8.2. Enrollment Invariants & Transfer Rules
1. **Single Active Batch Rule:** A student can belong to **at most one active batch** per program at any given time.
   - Enforced in PostgreSQL via a **partial unique index**:
     ```sql
     CREATE UNIQUE INDEX unique_active_enrollment_idx 
     ON enrollments (student_id, program_id) 
     WHERE status = 'active';
     ```
2. **Batch Transfers:**
   - When a student is transferred from Batch A to Batch B, the existing enrollment record's status is updated to `transferred` with a `transferred_at` timestamp.
   - A new enrollment record is created for Batch B with `status = 'active'`.
   - Historical submission records and XP remain intact and permanently linked to the student.
3. **Historical Audit Trail:** Historical enrollments (`completed`, `dropped`, `transferred`) are retained for institutional reporting and transcript verification.

---

## 9. Content Visibility and Freemium Architecture

### 9.1. Content Visibility Taxonomy
Every piece of curriculum content (`content_items`, `dsa_sheets`, `dsa_questions`) is governed by an explicit visibility state:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CONTENT VISIBILITY ENUM                         │
├───────────────┬────────────────────────────────────────────────────────┤
│ PUBLIC        │ Accessible to anyone, including unauthenticated        │
│               │ visitors on rmscareers.com (Freemium catalog).         │
├───────────────┼────────────────────────────────────────────────────────┤
│ AUTHENTICATED │ Accessible to any authenticated user with an active    │
│               │ account on any RMS Careers portal.                     │
├───────────────┼────────────────────────────────────────────────────────┤
│ ENROLLED      │ Accessible only to students with an active enrollment  │
│               │ in the program that contains this content item.        │
├───────────────┼────────────────────────────────────────────────────────┤
│ BATCH         │ Accessible only to students enrolled in the specific   │
│               │ batch to which this content or assignment is bound.    │
└───────────────┴────────────────────────────────────────────────────────┘
```

### 9.2. Anonymous vs. Authenticated DSA Experience
- **Anonymous Visitors (`rmscareers.com`):** Can view public sheets and store progress in browser `localStorage`. Zero database write access, zero XP, no streak updates, and no leaderboard access. Anonymous local storage state is never merged blindly into an authenticated session upon login.
- **Authenticated Students (`student.rmscareers.com`):** Full access to enrolled curriculum, persistent database progress records, server-authoritative XP, and college leaderboards.

### 9.3. Tutor Content Publishing Workflow (Locked Rule)
- Tutors author supplementary articles or assignments in `draft` mode (`is_published = false`).
- Platform Administrators review pending drafts via the Admin portal and promote them to `published`.
- Binary assets (PDFs, slide decks) are stored in private object storage (Cloudflare R2 via `ObjectStorage`) and served exclusively via **short-lived signed URLs** (TTL: 15 minutes) generated after verifying authorization.

---

## 10. Server-Authoritative XP and Gamification Engine

### 10.1. Elimination of Client-Determined XP
XP values are **never determined by client input** or static problem metadata. All point calculations execute exclusively through a **Server-Side XP Rule Engine**:

```
┌──────────────────┐
│  Student Action  │ (e.g. solve DSA question #104)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                  ServerXpRuleEngine (Server)                 │
├──────────────────────────────────────────────────────────────┤
│ 1. Validate problem status transition (unvisited -> solved)  │
│ 2. Evaluate rule table:                                      │
│    - Easy DSA problem:   10 XP                               │
│    - Medium DSA problem: 20 XP                               │
│    - Hard DSA problem:   40 XP                               │
│    - Assignment on-time: 50 XP                               │
│ 3. Check for streak bonuses or first-solve bonuses           │
│ 4. Generate idempotent ledger transaction                    │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │        PostgreSQL DB         │
                │     (Atomic Transaction)     │
                ├──────────────────────────────┤
                │ • INSERT activities          │
                │ • INSERT xp_ledger           │
                │ • UPDATE student_stats       │
                │ • EVALUATE achievements      │
                └──────────────────────────────┘
```

### 10.2. Atomic Ledger Invariants
1. **Activity-Backed Ledger:** Every row in `xp_ledger` must reference a valid `activity_id` in `activities`.
2. **Idempotency Constraint:** The unique index on `(student_id, activity_type, entity_id)` guarantees that solving the same problem multiple times or submitting multiple times awards XP **exactly once**.
3. **Double-Entry Discipline:** Manual admin adjustments or penalties insert compensatory ledger entries (`ADJUSTMENT_CREDIT`, `PENALTY_DEBIT`) rather than modifying historical rows.

---

## 11. Deterministic Streak Architecture

### 11.1. Platform Standard Timezone (`Asia/Kolkata`)
All streak calculations are anchored to a **deterministic calendar-date model** in Indian Standard Time (`Asia/Kolkata`, UTC+5:30):

```typescript
// packages/db/src/utils/dates.ts
export function getPlatformCalendarDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}
```

### 11.2. Streak Rules and Invariants
1. **Qualifying Activities:** Only pedagogical actions increment streaks (`dsa_solved`, `assignment_submitted`). Browsing articles or logging in does NOT count.
2. **Single Daily Increment:** Multiple qualifying activities performed on the same IST calendar date do not increment the streak more than once.
3. **Calculation:** If an activity occurs on date $D_{today}$:
   - If $D_{last} = D_{today}$: Streak is unchanged.
   - If $D_{last} = D_{today} - 1\text{ day}$: Streak increments by 1.
   - If $D_{last} < D_{today} - 1\text{ day}$: Streak resets to 1.

---

## 12. `student_stats` Denormalization & Leaderboard Tenancy

### 12.1. Why `college_id` is Denormalized
Denormalizing `college_id` onto `student_stats` enables an ultra-fast composite index for the college leaderboard:

```sql
CREATE INDEX college_leaderboard_idx ON student_stats (college_id, total_xp DESC);
```

### 12.2. Invariant Guarantee
**Invariant:** `student_stats.college_id === students.college_id` must hold true at all times.
Maintained atomically in application services whenever a student's institutional affiliation changes:
```sql
BEGIN;
  UPDATE students SET college_id = :newCollegeId WHERE id = :studentId;
  UPDATE student_stats SET college_id = :newCollegeId, updated_at = NOW() WHERE student_id = :studentId;
COMMIT;
```

---

## 13. Tutor Authorization Model and IDOR Prevention

Tutors mentor batches across multiple colleges (Locked Decision). Authorization is strictly enforced server-side on every query. Tutors never query by raw submission ID alone; all queries join through assigned batches:

```typescript
// Tenancy assertion: Submission must belong to a batch assigned to this tutor
inArray(
  assignmentSubmissions.assignmentId,
  db.select({ id: assignments.id })
    .from(assignments)
    .innerJoin(batches, eq(assignments.batchId, batches.id))
    .innerJoin(tutorBatchAssignments, eq(batches.id, tutorBatchAssignments.batchId))
    .innerJoin(tutors, eq(tutorBatchAssignments.tutorId, tutors.id))
    .where(eq(tutors.userId, tutorUserId))
)
```

---

## 14. Public Login Gateway (`rmscareers.com/login`)

The public website provides an unauthenticated portal directory to route users to their respective subdomains:
- Accepts **no username/password inputs** and accepts no login credentials.
- Trusts **zero client-supplied roles**.
- Routes cleanly to independent, secure `/login` pages on `student`, `tutor`, or `admin`.

---

## 15. Measurable Engineering Performance Targets (SLOs)

```
┌────────────────────────────────────────────────────────────────────────┐
│                     SERVICE LEVEL OBJECTIVES (SLOs)                    │
├──────────────────────────┬─────────────────────────────┬───────────────┤
│ Surface / Metric         │ Target (p95)                │ Target (p99)  │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ Public Web TTFB (Edge)   │ < 100 ms                    │ < 250 ms      │
│ Public Web Core LCP      │ < 1.8 s                     │ < 2.5 s       │
│ Student Dashboard SSR    │ < 250 ms                    │ < 500 ms      │
│ Student Action Latency   │ < 150 ms                    │ < 350 ms      │
│ Tutor Review Queue SSR   │ < 200 ms                    │ < 400 ms      │
│ College Leaderboard Query│ < 30 ms                     │ < 80 ms       │
│ Database Indexed Query   │ < 15 ms                     │ < 50 ms       │
│ Database Atomic Txn      │ < 40 ms                     │ < 100 ms      │
│ Initial Concurrent Load  │ 1,000 active concurrent     │ Zero 5xx drop │
└──────────────────────────┴─────────────────────────────┴───────────────┘
```

---

## 16. Comprehensive Security Threat Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SECURITY THREAT MATRIX                          │
├────────┬─────────────────────────┬──────────────┬──────────────────────┤
│ Severity│ Threat Vector           │ Surface      │ Architectural Defense│
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ BLOCKER│ Cross-subdomain cookie  │ All Portals  │ Strict `__Host-` prefix│
│        │ tossing & privilege leak│              │ on cookies; no parent│
│        │                         │              │ `.rmscareers.com` dom│
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ BLOCKER│ Raw token exposure in   │ Auth Engine  │ SHA-256 token hashing│
│        │ database dumps          │              │ in `account_tokens`; │
│        │                         │              │ single-use atomic CAS│
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ HIGH   │ Tutor IDOR accessing    │ Tutor App    │ All queries joined   │
│        │ unassigned batches      │              │ through tutor_batch_ │
│        │                         │              │ assignments table    │
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ HIGH   │ Client-side XP & streak │ Student App  │ ServerXpRuleEngine;  │
│        │ state manipulation      │              │ idempotent ledger;   │
│        │                         │              │ server IST calendar  │
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ HIGH   │ Unauthorized PDF scraping│ Content / CDN│ Private R2 buckets;  │
│        │ via direct public URLs  │              │ 15-min signed URLs   │
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ MEDIUM │ Brute-force credential  │ Login Routes │ Sliding-window rate  │
│        │ attacks on accounts     │              │ limiting via Upstash │
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ MEDIUM │ State poisoning from    │ Public/Student No merge of anon     │
│        │ anon local storage      │              │ localStorage data    │
├────────┼─────────────────────────┼──────────────┼──────────────────────┤
│ LOW    │ Subdomain takeover via  │ DNS          │ Cloudflare CNAME pin;│
│        │ stale DNS pointers      │              │ SSL wildcard certs   │
└────────┴─────────────────────────┴──────────────┴──────────────────────┘
```

---

## 17. Definitive Database Schema Blueprint (Drizzle ORM)

```typescript
// packages/db/src/schema/index.ts
import {
  pgTable,
  uuid,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
  jsonb,
  varchar
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- ENUMS ---
export const userStatusEnum = pgEnum('user_status', [
  'pending_activation',
  'active',
  'suspended',
  'archived'
]);

export const roleEnum = pgEnum('role', [
  'super_admin',
  'admin',
  'tutor',
  'student'
]);

export const tokenTypeEnum = pgEnum('token_type', [
  'activation',
  'password_reset'
]);

export const programStatusEnum = pgEnum('program_status', [
  'draft',
  'active',
  'archived'
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'active',
  'transferred',
  'completed',
  'dropped'
]);

export const contentVisibilityEnum = pgEnum('content_visibility', [
  'public',
  'authenticated',
  'enrolled',
  'batch'
]);

export const dsaDifficultyEnum = pgEnum('dsa_difficulty', [
  'easy',
  'medium',
  'hard'
]);

export const dsaStatusEnum = pgEnum('dsa_status', [
  'unvisited',
  'attempted',
  'solved'
]);

export const submissionStatusEnum = pgEnum('submission_status', [
  'submitted',
  'in_review',
  'approved',
  'resubmission_requested'
]);

// --- 1. IDENTITY & AUTHENTICATION ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  status: userStatusEnum('status').notNull().default('pending_activation'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  grantedBy: uuid('granted_by').references(() => users.id)
}, (t) => ({
  userRoleIdx: uniqueIndex('user_role_idx').on(t.userId, t.role)
}));

export const accountTokens = pgTable('account_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  tokenType: tokenTypeEnum('token_type').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  tokenHashIdx: index('token_hash_idx').on(t.tokenHash)
}));

// --- 2. INSTITUTIONAL & PROFILES ---
export const colleges = pgTable('colleges', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  city: text('city'),
  state: text('state'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'restrict' }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  collegeRollNumber: text('college_roll_number').notNull(),
  branch: text('branch'),
  year: integer('year'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  collegeRollIdx: uniqueIndex('college_roll_idx').on(t.collegeId, t.collegeRollNumber)
}));

export const tutors = pgTable('tutors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  headline: text('headline'),
  bio: text('bio'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// --- 3. PROGRAMS, BATCHES & ENROLLMENTS ---
export const programs = pgTable('programs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  status: programStatusEnum('status').notNull().default('draft'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: integer('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const tutorBatchAssignments = pgTable('tutor_batch_assignments', {
  id: serial('id').primaryKey(),
  tutorId: uuid('tutor_id').notNull().references(() => tutors.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').notNull().references(() => batches.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  tutorBatchIdx: uniqueIndex('tutor_batch_idx').on(t.tutorId, t.batchId)
}));

export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  programId: integer('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').notNull().references(() => batches.id, { onDelete: 'restrict' }),
  status: enrollmentStatusEnum('status').notNull().default('active'),
  transferredAt: timestamp('transferred_at', { withTimezone: true }),
  confirmationSentAt: timestamp('confirmation_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  uniqueActiveEnrollmentIdx: uniqueIndex('unique_active_enrollment_idx')
    .on(t.studentId, t.programId)
    .where(sql`status = 'active'`)
}));

// --- 4. CONTENT & DSA ENGINE ---
export const contentItems = pgTable('content_items', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(), // 'article' | 'pdf' | 'resource'
  visibility: contentVisibilityEnum('visibility').notNull().default('enrolled'),
  content: text('content'),
  fileUrl: text('file_url'),
  isPublished: boolean('is_published').notNull().default(false),
  authorId: uuid('author_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const dsaSheets = pgTable('dsa_sheets', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  visibility: contentVisibilityEnum('visibility').notNull().default('enrolled'),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const dsaQuestions = pgTable('dsa_questions', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  difficulty: dsaDifficultyEnum('difficulty').notNull(),
  topic: text('topic').notNull(),
  visibility: contentVisibilityEnum('visibility').notNull().default('enrolled'),
  leetcodeUrl: text('leetcode_url'),
  gfgUrl: text('gfg_url'),
  hints: jsonb('hints').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const dsaSheetQuestions = pgTable('dsa_sheet_questions', {
  id: serial('id').primaryKey(),
  sheetId: integer('sheet_id').notNull().references(() => dsaSheets.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => dsaQuestions.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull().default(0)
}, (t) => ({
  sheetQuestionIdx: uniqueIndex('sheet_question_idx').on(t.sheetId, t.questionId)
}));

export const studentDsaProgress = pgTable('student_dsa_progress', {
  id: serial('id').primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => dsaQuestions.id, { onDelete: 'cascade' }),
  status: dsaStatusEnum('status').notNull().default('unvisited'),
  solvedAt: timestamp('solved_at', { withTimezone: true }),
  notes: text('notes')
}, (t) => ({
  studentQuestionIdx: uniqueIndex('student_question_idx').on(t.studentId, t.questionId)
}));

// --- 5. EVALUATION & TUTOR WORKBENCH ---
export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').notNull().references(() => batches.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  maxScore: integer('max_score').notNull().default(100),
  isPublished: boolean('is_published').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const assignmentSubmissions = pgTable('assignment_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  repoUrl: text('repo_url'),
  submissionText: text('submission_text'),
  status: submissionStatusEnum('status').notNull().default('submitted'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  studentAssignmentIdx: index('student_assignment_idx').on(t.assignmentId, t.studentId)
}));

export const submissionFeedback = pgTable('submission_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  submissionId: uuid('submission_id').notNull().references(() => assignmentSubmissions.id, { onDelete: 'cascade' }),
  tutorId: uuid('tutor_id').notNull().references(() => tutors.id, { onDelete: 'restrict' }),
  score: integer('score'),
  comments: text('comments').notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow()
});

// --- 6. GAMIFICATION, PROGRESS & STATS ---
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(),
  entityId: text('entity_id').notNull(),
  calendarDateIst: varchar('calendar_date_ist', { length: 10 }).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  studentActivityIdx: index('student_activity_idx').on(t.studentId, t.createdAt)
}));

export const xpLedger = pgTable('xp_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'set null' }),
  activityType: text('activity_type').notNull(),
  entityId: text('entity_id').notNull(),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  idempotentXpIdx: uniqueIndex('idempotent_xp_idx').on(t.studentId, t.activityType, t.entityId)
}));

export const studentStats = pgTable('student_stats', {
  studentId: uuid('student_id').primaryKey().references(() => students.id, { onDelete: 'cascade' }),
  collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
  totalXp: integer('total_xp').notNull().default(0),
  currentLevel: integer('current_level').notNull().default(1),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  dsaSolvedCount: integer('dsa_solved_count').notNull().default(0),
  lastActivityDateIst: varchar('last_activity_date_ist', { length: 10 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  collegeLeaderboardIdx: index('college_leaderboard_idx').on(t.collegeId, t.totalXp)
}));

// --- 7. AUDIT LOGGING ---
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  details: jsonb('details').default({}),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
```

---

## 18. Final Conceptual Architecture Diagram

```text
                                  ══════════════════════════════════════════════════════════
                                                 CANONICAL ROUTING & DNS LAYER
                                                   https://rmscareers.com
                                                (Cloudflare Ingress & Edge)
                                  ══════════════════════════════════════════════════════════
                                                             │
                  ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
                  │                                          │                                          │
                  ▼                                          ▼                                          ▼
   ┌──────────────────────────────┐           ┌──────────────────────────────┐           ┌──────────────────────────────┐
   │        PUBLIC WEBSITE        │           │     STUDENT APPLICATION      │           │      TUTOR WORKBENCH         │
   │       rmscareers.com         │           │    student.rmscareers.com    │           │     tutor.rmscareers.com     │
   ├──────────────────────────────┤           ├──────────────────────────────┤           ├──────────────────────────────┤
   │ • Unauthenticated SSG/ISR    │           │ • Authenticated (STUDENT)    │           │ • Authenticated (TUTOR)      │
   │ • Value Proposition & Trust  │           │ • Cookie: __Host-student-sess│           │ • Cookie: __Host-tutor-sess  │
   │ • Freemium DSA Practice      │           │ • DSA Sheets & Topic Trees   │           │ • Assigned Batch Rosters     │
   │ • Curriculum Discovery       │           │ • Server-Authoritative XP    │           │ • Submission Review Queue    │
   │ • Institutional Lead Capture │           │ • IST Calendar Streaks       │           │ • Rubric & Feedback Editor   │
   │ • Portal Selector (/login)   │           │ • Assignments & Submissions  │           │ • Mock Interview Scorecards  │
   │ • Cloudflare Edge CDN        │           │ • College Leaderboard        │           │ • Content Authoring (Drafts) │
   └──────────────────────────────┘           └──────────────┬───────────────┘           └──────────────┬───────────────┘
                                                             │                                          │
                                                             │         ┌────────────────────────────────┘
                                                             │         │
                                                             ▼         ▼
                                              ┌──────────────────────────────┐
                                              │      ADMIN APPLICATION       │
                                              │     admin.rmscareers.com     │
                                              ├──────────────────────────────┤
                                              │ • Authenticated (ADMIN)      │
                                              │ • Cookie: __Host-admin-sess  │
                                              │ • College & Batch Governance │
                                              │ • Master Curriculum & Sheets │
                                              │ • Bulk Roster CSV Ingestion  │
                                              │ • Tutor Moderation & Approval│
                                              │ • Platform Audit Logs & Tele │
                                              └──────────────┬───────────────┘
                                                             │
                                                             ▼
                                  ══════════════════════════════════════════════════════════
                                                    SHARED PLATFORM CORE
                                                 (pnpm Monorepo Workspace)
                                  ══════════════════════════════════════════════════════════
                                                             │
                 ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
                 ▼                                           ▼                                           ▼
  ┌─────────────────────────────┐             ┌─────────────────────────────┐             ┌─────────────────────────────┐
  │        packages/auth        │             │         packages/db         │             │      Storage Adapters       │
  ├─────────────────────────────┤             ├─────────────────────────────┤             ├─────────────────────────────┤
  │ • Shared Argon2id / Bcrypt  │             │ • Modular Drizzle Schema    │             │ • ObjectStorage Interface   │
  │ • account_tokens CAS Auth   │             │ • ServerXpRuleEngine        │             │ • Cloudflare R2 Adapter     │
  │ • RBAC Assertion Middleware │             │ • IST Date Utils (Asia/Kol) │             │ • Short-Lived Signed URLs   │
  │ • Isolated Cookie Prefixes  │             │ • Standard PostgreSQL Pool  │             │ • Private PDF & Slide Vault │
  └─────────────────────────────┘             └──────────────┬──────────────┘             └─────────────────────────────┘
                                                             │
                                                             ▼
                                              ┌─────────────────────────────┐
                                              │    Neon PostgreSQL Serverless│
                                              ├─────────────────────────────┤
                                              │ • users & user_roles        │
                                              │ • account_tokens (hashed)   │
                                              │ • colleges & batches        │
                                              │ • programs & enrollments    │
                                              │ • dsa_questions & sheets    │
                                              │ • assignments & submissions │
                                              │ • activities & xp_ledger    │
                                              │ • student_stats (rollup)    │
                                              │ • audit_logs (immutable)    │
                                              └─────────────────────────────┘
```

---
*End of Architecture Specification. Implementation details are codified in [RMS_CAREERS_IMPLEMENTATION_ROADMAP.md](file:///c:/Users/Mohith/myprojects/RMS-Careers/docs/RMS_CAREERS_IMPLEMENTATION_ROADMAP.md).*
