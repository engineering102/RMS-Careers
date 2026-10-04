# Application Boundaries & Surface Topology

This document details the distinct roles, entry points, dependencies, and boundaries of every application surface in RMS Careers.

---

## 1. Public Corporate Website (`apps/web`)

- **Domain**: `https://www.rms-careers.com` (Apex `https://rms-careers.com` redirects to `www`)
- **Port**: `3001` (local development)
- **Primary Audience**: Prospective partner colleges, Principals, TPOs, HODs, student learners, and general public.
- **Key Routes**:
  - `/`: Main corporate homepage containing the full 18-stage corporate presentation, 6 service pillars, 1-month career readiness program, program roadmap, rewards preview, student/institution benefits, capstone showcase, FAQ, and `#partner` inquiry lead form.
  - `/learn`: Guest learning entry point and public starter resources catalog.
  - `/learn/dsa`: Curated pattern-first DSA sheets catalogue.
  - `/learn/dsa/[sheet]`: Interactive in-browser DSA practice with local client storage.
  - `/curriculum`: Detailed semester-by-semester engineering roadmap guide.
  - `/programs`: Directory of publicly visible institutional programs and offerings.
  - `/programs/[programCode]`: Deep-dive into specific public cohort curricula.
  - `/login`: Portal selector gateway directing users to `student.rms-careers.com`, `tutor.rms-careers.com`, or `admin.rms-careers.com`.
- **Dependencies**:
  - Consumes `@rms/db` (read-only queries for public programs).
  - Client state: `localStorage` for anonymous DSA problem completion.
  - Zero authentication dependencies (unauthenticated public edge).

---

## 2. Admin Control Plane (`apps/admin`)

- **Domain**: `https://admin.rms-careers.com`
- **Port**: `3000` (local development)
- **Primary Audience**: RMS platform administrators and institutional coordinators (`admin`, `super_admin`).
- **Key Routes**:
  - `/login`: Credentials-based and GitHub OAuth authentication.
  - `/programs`: Management of training programs, program codes, capacities, and active statuses.
  - `/enrollments`: Filterable, searchable data grid of student enrollments with pagination and status management.
  - `/enrollments/import`: Bulk CSV/Excel student roster ingestion with schema validation, error logs, and automated confirmation emails.
  - `(public)/enroll/[programCode]`: Legacy direct enrollment form (prior to multi-app extraction).
- **Security & Authorization**:
  - Session management via Auth.js (NextAuth v5 beta) with `__Secure-` or `authjs.session-token`.
  - Strict middleware route guarding (`apps/admin/middleware.ts`).
  - Server-side role assertions enforcing `admin` or `super_admin` privileges via `@rms/auth`.
- **Dependencies**:
  - `@rms/db`: Drizzle ORM client, relational queries, insert/update mutations.
  - `@rms/auth`: Password hashing and RBAC assertion guards.
  - `resend`: Transactional email delivery for enrollment notifications and tokens.
  - `papaparse` & `xlsx`: CSV and Excel file ingestion engines.

---

## 3. Student Portal (`apps/student`) — Planned Phase 3

- **Target Domain**: `https://student.rms-careers.com`
- **Primary Audience**: Enrolled college batch students.
- **Scope & Capabilities**:
  - Activated via invitation token (`/activate?token=...`).
  - Authenticated session with `student` role.
  - Enrolled cohort curriculum access, assigned DSA problem sets, and code submission reviews.
  - Personal progress ledger, verified XP, daily practice streaks, and campus cohort leaderboards.
  - Strictly isolated session boundary; does not share session cookies with Admin or Tutor portals.

---

## 4. Tutor Portal (`apps/tutor`) — Planned Phase 4

- **Target Domain**: `https://tutor.rms-careers.com`
- **Primary Audience**: Technical instructors, mentor evaluators, and placement mock interviewers.
- **Scope & Capabilities**:
  - Authenticated session with `tutor` role.
  - Batch assignment overview across assigned partner colleges.
  - Student code review queue with rubric grading and qualitative feedback.
  - Batch progress diagnostics and student milestone evaluations.
  - Mock technical interview scheduling and evaluation scorecards.
