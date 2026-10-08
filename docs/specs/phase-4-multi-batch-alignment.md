# Phase 4 — Student Portal Multi-Batch Alignment
## Implementation Specification

```text
STATUS: SPECIFICATION ONLY
IMPLEMENTATION: NOT STARTED
MIGRATIONS: NONE
PUSH: NONE
```

---

## 1. Status / Purpose

### 1.1 Purpose
This document provides the authoritative engineering specification for completing the remaining scope of **Phase 4: Student Portal Multi-Batch Alignment (P1)** in the RMS Careers monorepo (`@rms/student`).

The Phase 4 objective is to transform the student learning experience from a single-cohort biased view (`activeBatches[0]`) into an enterprise-grade multi-cohort platform capable of:
1. **Decoupled Shell Navigation (4.1):** Allowing students enrolled in multiple programs or batches to switch their active learning context reliably, persistently, and safely.
2. **Aggregated Learning Hub (4.2):** Completing `/overview` so that deadlines across all enrolled batches are fully actionable deep links, while unifying the welcome presentation with the active cohort.
3. **Scoped Leaderboards (4.3):** Guaranteeing that batch cohort leaderboards calculate and display **strictly batch-attributed XP**, eliminating cross-batch and global XP leakage.

### 1.2 Baseline Audit Status
A forensic audit of the repository against the original Phase 4 scope established:
- **4.1 Shell Decoupling:** 🔴 **NOT IMPLEMENTED** — Navigation across sidebar, header, mobile drawer, and overview remains hardcoded to `context.activeBatches[0]`. No persistent cohort selector exists.
- **4.2 Aggregated Learning Hub:** 🟡 **PARTIALLY COMPLETE** — Multi-batch deadline queries exist in `overview.ts`, and Commit `7446e0d` delivered the complete Resume Learning engine (`resume-learning.ts`, `<ResumeLearningCard />`). However, deadline items in `<DeadlinesCard />` remain non-clickable static text, and the Overview welcome banner still hardcodes a `Primary Cohort` badge pointing to `activeBatches[0]`.
- **4.3 Scoped Leaderboards:** 🔴 **NOT IMPLEMENTED** — `getBatchLeaderboard` uses global `studentStats.totalXp` for all-time rankings, and fails to filter `activities.batchId = batchId` in weekly rankings, leaking XP across cohorts.

---

## 2. Existing Implementation to Preserve

The implementing agent **MUST NOT** rewrite, duplicate, or dismantle existing functioning subsystems. The following components are designated as **`EXISTING / PRESERVE`**:

1. **Resume Learning Engine (`EXISTING / PRESERVE`):**
   - Implemented in Commit `7446e0d` within `apps/student/lib/services/resume-learning.ts`.
   - Functions `getResumeLearningTarget(studentId)` and `getNextCurriculumItem(studentId, currentContentItemId, batchId)` deterministically evaluate curriculum milestones across active cohorts.
   - Component `apps/student/components/dashboard/resume-learning-card.tsx` handles unenrolled, completed, caught-up, and actionable module states.
   - **Constraint:** Do NOT rewrite this engine. Preserve its priority hierarchy (Revisions → Due Soon → Next in Sequence).

2. **Entitlement & Authorization Guards (`EXISTING / PRESERVE`):**
   - `apps/student/lib/db/queries/entitlements.ts`: `requireStudentEntitlement()`, `getStudentEntitlementContext(userId)`, and `assertBatchEntitlement(studentId, batchId)`.
   - All server actions and server components must continue using these guards.

3. **Multi-Batch Overview Query Aggregation (`EXISTING / PRESERVE`):**
   - `apps/student/lib/db/queries/overview.ts` lines 135–214: Aggregates upcoming milestones across `batchIds` using `inArray(batchCurriculum.batchId, batchIds)`.
   - Preserve query logic, batch attribution (`batchName`), and deadline urgency calculations.

4. **Activity Reward & Streak Engine (`EXISTING / PRESERVE`):**
   - `apps/student/lib/services/activity-reward.ts`: Pure Asia/Kolkata streak rollover logic (`evaluateStreak`) and idempotent activity recording.

5. **Application Boundaries (`EXISTING / PRESERVE`):**
   - Student session isolation, NextAuth credentials, `@rms/auth`, and separate portal deployment boundaries must remain untouched.

---

## 3. Architecture Constraints

1. **Zero Database Migrations:**
   - **NO DDL OR SCHEMA MODIFICATIONS.**
   - Do NOT edit `packages/db/src/schema.ts`.
   - Do NOT generate migrations in `packages/db/drizzle/`.
   - All batch-attributed XP isolation is fully supported by the existing `activities` schema and its index `activity_batch_xp_idx` (`batch_id`, `student_id`, `activity_date_ist`).

2. **Package Boundaries:**
   - Primary modification scope: `apps/student/`.
   - Forbidden modification zones: `apps/admin/`, `apps/web/`, `packages/auth/`, `packages/db/`.

3. **Next.js 15 App Router Conventions:**
   - Server Components by default.
   - Client components strictly marked with `'use client'` at the top.
   - In Next.js 15, `cookies()` from `next/headers` is an **async** function: `const cookieStore = await cookies();`.
   - Server Actions must return `{ success: boolean, data?: T, error?: string }` objects rather than throwing unhandled client exceptions.

4. **Institutional Business Model & Integrity Rules:**
   - No retail pricing, carts, or checkout flows.
   - No fabricated statistics, fake logos, or false placement guarantees.

---

## 4. 4.1 Shell Decoupling — Persistent Cohort Switcher

### A. Source of Truth & Persistence
- **Storage Mechanism:** A client-readable, server-authoritative HTTP cookie named:
  ```text
  rms_active_cohort
  ```
- **Cookie Attributes:**
  - `Path=/`
  - `SameSite=Lax`
  - `HttpOnly=false` (allows client-side instant optimistic sync while server remains authoritative)
  - `Max-Age=2592000` (30 days; persists across browser restarts, page reloads, and tab sessions)
- **Server Authority:**
  The server layout `apps/student/app/(dashboard)/layout.tsx` reads the cookie via `await cookies()`, validates the batch ID against `context.activeBatches`, and injects the resolved `activeCohort` into the shell context.

### B. Fallback Hierarchy
When resolving the active cohort, the server and client must evaluate this deterministic hierarchy:

```text
┌────────────────────────────────────────────────────────┐
│ 1. Explicit Route Parameter (`/batches/[batchId]`)     │
└───────────────────────────┬────────────────────────────┘
                            │ (If not on route)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Validated Cookie (`rms_active_cohort`)              │
│    - MUST exist in `context.activeBatches`             │
└───────────────────────────┬────────────────────────────┘
                            │ (If missing / invalid / un-enrolled)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Fallback: First Active Batch (`activeBatches[0]`)   │
└───────────────────────────┬────────────────────────────┘
                            │ (If no active batches)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Empty State (`activeCohort = null`)                 │
└────────────────────────────────────────────────────────┘
```

- If a student has **0 active batches**: `activeCohort` is `null`. The shell displays the "No Active Batch" state and renders `<EmptyEnrollmentView />`.
- If a student has **1 active batch**: That batch is automatically active. The switcher displays the cohort name without interactive switching options.
- If a student has **multiple active batches**: The switcher renders an interactive dropdown.

### C. Security & Entitlement Validation
Client cookies can be tampered with or become stale (e.g., student transferred out of a batch, or multiple students using the same browser).
- **Validation Engine:** In `apps/student/lib/db/queries/entitlements.ts` (or a helper `resolveActiveCohort`):
  ```typescript
  export function resolveActiveCohort(
    cookieBatchId: string | undefined,
    activeBatches: StudentBatchItem[]
  ): StudentBatchItem | null {
    if (!activeBatches || activeBatches.length === 0) return null;
    if (!cookieBatchId) return activeBatches[0];

    const matched = activeBatches.find((b) => b.batchId === cookieBatchId);
    return matched ?? activeBatches[0];
  }
  ```
- **Server Action Validation:**
  The action to switch cohorts (`setActiveCohortAction(batchId: string)`) must assert:
  1. Authenticated student session exists.
  2. The requested `batchId` is present in the student's active enrollments (`status IN ('active', 'confirmed')`).
  3. If invalid, the action rejects with `{ success: false, error: 'Unauthorized batch selection' }` and does not set the cookie.

### D. Shell UI Specifications
1. **Desktop Header (`header.tsx`):**
   - Replace the static `primaryBatch` badge with `<CohortSwitcher context={context} activeCohort={activeCohort} />`.
   - When multiple cohorts exist, render a clean Radix `<Select>` trigger showing:
     - Cohort Name
     - Program Code badge (e.g. `FS-WD-2026`)
     - Green active status dot
   - On change, invokes `setActiveCohortAction(batchId)`, updates the cookie, and refreshes the router via `router.refresh()`.
2. **Desktop Sidebar (`sidebar.tsx`):**
   - Replace `const primaryBatch = context.activeBatches[0];` with `activeCohort`.
   - In the "Current Cohort" card:
     - Displays `activeCohort.batchName` and `activeCohort.programName`.
     - Links the "Batch Workspace" nav item directly to `/batches/${activeCohort.batchId}`.
3. **Mobile Drawer (`mobile-nav.tsx`):**
   - Mount `<CohortSwitcher />` within the mobile navigation drawer.
   - Updating cohort in mobile drawer switches the active cohort and updates the navigation link to the Batch Workspace.

### E. Routing Interaction
- **Navigating to `/batches`:**
  - If student has 1 active batch: Redirects to `/batches/${batch.batchId}`.
  - If student has multiple active batches: Redirects to `/batches/${activeCohort.batchId}` (matching the selected cohort), while providing a header link "View All Cohorts" to view the full card directory at `/batches?all=true`.
- **Navigating to `/batches/[batchId]`:**
  - Server verifies `assertBatchEntitlement(student.id, batchId)`.
  - Visiting an explicit batch workspace automatically synchronizes the `rms_active_cohort` cookie so the surrounding shell context reflects the visited workspace.

---

## 5. 4.2 Aggregated Learning Hub — Remaining Overview Requirements

### A. Actionable Multi-Batch Deadline Feed
In `apps/student/components/overview/deadlines-card.tsx`, convert each deadline item from a static `<div>` into an **actionable interactive card**.

#### Destination Routing Matrix:
| Content Type (`item.contentType`) | Destination Route | Query Context |
| :--- | :--- | :--- |
| `lecture` | `/content/${item.contentItemId}` | `?batchId=${item.batchId}` |
| `notes` / `resource` | `/content/${item.contentItemId}` | `?batchId=${item.batchId}` |
| `project` | `/content/${item.contentItemId}` | `?batchId=${item.batchId}` (hosts `ProjectSubmissionWorkspace`) |
| `quiz` | `/assessments` or `/assessments/${item.contentItemId}` | `?batchId=${item.batchId}` |
| `dsa_sheet` | `/dsa` | `?batchId=${item.batchId}` |

#### Actionability Requirements:
1. Wrap each deadline row in `<Link href={targetHref}>` with hover states (`hover:border-slate-700 hover:bg-slate-900/60 transition`).
2. Add an explicit chevron or action icon (`<ArrowRight className="h-4 w-4" />`) indicating clickability.
3. If an item is already completed (`item.isCompleted = true`), display the green completed badge and still allow navigation to review past submissions.
4. If an item is overdue (`dueAt < now`), display an amber/rose badge `"Past Due"` with warning iconography.

### B. Clear Batch Attribution
- Every deadline card MUST prominently display its cohort source badge:
  ```tsx
  <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/80">
    {item.batchName}
  </span>
  ```
- Items from different batches must never appear ambiguous when listed in the chronological feed.

### C. Overview Welcome Header Decoupling
In `apps/student/app/(dashboard)/overview/page.tsx`:
- Remove the misleading hardcoded badge:
  ```tsx
  // REMOVE:
  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
    Primary Cohort
  </span>
  <p className="text-sm font-semibold text-slate-100 mt-0.5">{primaryBatch.batchName}</p>
  ```
- Replace with the **Active Cohort Display**:
  ```tsx
  // REPLACE WITH:
  {activeCohort && (
    <div className="flex flex-col sm:items-end justify-center rounded-xl border border-blue-800/40 bg-blue-950/40 p-4 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
          Active Cohort
        </span>
        {context.activeBatches.length > 1 && (
          <span className="text-[10px] text-slate-400">
            ({context.activeBatches.length} Enrolled)
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-100 mt-0.5">{activeCohort.batchName}</p>
      <p className="text-xs text-slate-400">{activeCohort.programName}</p>
    </div>
  )}
  ```

### D. Resume Hero Integration (`EXISTING — PRESERVE`)
- The Resume Hero component `<ResumeLearningCard target={resumeTarget} />` was completed in `7446e0d`.
- **Integration Rule:** The Resume Hero continues to evaluate across all enrolled active cohorts by default (ranking by most imminent deadline across all cohorts), but if the student switches active cohorts, the Overview page passes `activeCohort.batchId` as an optional `preferredBatchId` to `getResumeLearningTarget(student.id, activeCohort.batchId)` so the student's chosen cohort milestone is focused (see Section 15: Open Decisions).

---

## 6. 4.3 Scoped Leaderboards — Batch-Attributed XP

### A. Comprehensive Audit of XP Sources

| XP Source Event | Activity Type Enum | Database Location | Has `batch_id`? | Include in Batch Leaderboard? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lecture Completion** | `lecture_completed` | `activities` table | **YES** (`verifiedBatchId`) | **YES** | Awards +5 XP. Scoped to curriculum batch. |
| **Quiz Completion** | `quiz_completed` | `activities` table | **YES** (`verifiedBatchId`) | **YES** | Awards +20 XP on first pass. |
| **Project Approval** | `assignment_approved` | `activities` table | **YES** (`batchId`) | **YES** | Awards +100 XP upon tutor review. |
| **External Benchmark** | `external_assessment` | `activities` table | **YES** (`batchId`) | **YES** | Imported by institutional admin/CSV. |
| **Batch DSA Sheet** | `dsa_solved` | `activities` table | **YES** (`verifiedBatchId`) | **YES** | Problem solved via cohort assignment sheet. |
| **General DSA Practice** | `dsa_solved` | `activities` table | **NO** (`batchId = NULL`) | **NO** | Self-paced practice in `/dsa`. Global only. |
| **Self-Paced Library** | `lecture_completed` | `activities` table | **NO** (`batchId = NULL`) | **NO** | Content viewed without batch context. Global only. |
| **Cumulative Lifetime** | N/A | `student_stats.total_xp` | **NO** (Global only) | **NO** | Lifetime XP across all batches and tracks. |

### B. All-Time Batch Leaderboard Query Specification
In `apps/student/lib/db/queries/leaderboards.ts` lines 64–88:

**Current Defect:**
The query joins `studentStats` and ranks by `studentStats.totalXp`. This leaks XP earned outside the batch into the batch rankings.

**Required Query Architecture:**
Calculate all-time XP by summing `activities.xpAwarded` filtered strictly by `activities.batchId = batchId`:

```typescript
// All-Time Batch Leaderboard (Top 50) — BATCH-SCOPED XP
rawEntries = await db
  .select({
    studentId: students.id,
    fullName: students.fullName,
    branch: students.branch,
    xp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`,
    currentStreak: sql<number>`coalesce(${studentStats.currentStreak}, 0)::int`
  })
  .from(enrollments)
  .innerJoin(students, eq(students.id, enrollments.studentId))
  .leftJoin(studentStats, eq(studentStats.studentId, students.id))
  .leftJoin(
    activities,
    and(
      eq(activities.studentId, students.id),
      eq(activities.batchId, batchId) // <--- STRICT BATCH XP ISOLATION
    )
  )
  .where(
    and(
      eq(enrollments.batchId, batchId),
      inArray(enrollments.status, ['active', 'confirmed'])
    )
  )
  .groupBy(
    students.id,
    students.fullName,
    students.branch,
    studentStats.currentStreak
  )
  .orderBy(
    desc(sql`coalesce(sum(${activities.xpAwarded}), 0)::int`),
    desc(sql`coalesce(${studentStats.currentStreak}, 0)::int`),
    asc(students.id)
  )
  .limit(50);
```

### C. Weekly Batch Leaderboard Query Specification
In `apps/student/lib/db/queries/leaderboards.ts` lines 91–127:

**Current Defect:**
The join on `activities` filters only by `activityDateIst >= startOfWeekIst` without checking `activities.batchId`.

**Required Query Architecture:**
Add `eq(activities.batchId, batchId)` to the weekly `activities` join condition:

```typescript
// Weekly Batch Leaderboard (Top 50) — BATCH-SCOPED WEEKLY XP
rawEntries = await db
  .select({
    studentId: students.id,
    fullName: students.fullName,
    branch: students.branch,
    xp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`,
    currentStreak: sql<number>`coalesce(${studentStats.currentStreak}, 0)::int`
  })
  .from(enrollments)
  .innerJoin(students, eq(students.id, enrollments.studentId))
  .leftJoin(studentStats, eq(studentStats.studentId, students.id))
  .leftJoin(
    activities,
    and(
      eq(activities.studentId, students.id),
      eq(activities.batchId, batchId), // <--- STRICT BATCH ISOLATION
      gte(activities.activityDateIst, startOfWeekIst)
    )
  )
  .where(
    and(
      eq(enrollments.batchId, batchId),
      inArray(enrollments.status, ['active', 'confirmed'])
    )
  )
  .groupBy(
    students.id,
    students.fullName,
    students.branch,
    studentStats.currentStreak
  )
  .orderBy(
    desc(sql`coalesce(sum(${activities.xpAwarded}), 0)::int`),
    desc(sql`coalesce(${studentStats.currentStreak}, 0)::int`),
    asc(students.id)
  )
  .limit(50);
```

### D. Current Student Standing Outside Top 50
If the authenticated student does not place in the top 50 (`currentUserIndex === -1`), their individual standing must also reflect **batch-attributed XP**, NOT global `studentStats.totalXp`:

```typescript
if (currentUserIndex !== -1) {
  const userEntry = entries[currentUserIndex];
  userStanding = {
    rank: userEntry.rank,
    xp: userEntry.xp,
    currentStreak: userEntry.currentStreak,
    totalParticipants: entries.length
  };
} else {
  // Query batch-scoped XP specifically for the current student
  const [userBatchXpRow] = await db
    .select({
      batchXp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`
    })
    .from(activities)
    .where(
      and(
        eq(activities.studentId, studentId),
        eq(activities.batchId, batchId),
        timeframe === 'weekly' ? gte(activities.activityDateIst, startOfWeekIst) : sql`true`
      )
    );

  const [userStreakRow] = await db
    .select({ currentStreak: studentStats.currentStreak })
    .from(studentStats)
    .where(eq(studentStats.studentId, studentId))
    .limit(1);

  userStanding = {
    rank: null,
    xp: userBatchXpRow?.batchXp ?? 0,
    currentStreak: userStreakRow?.currentStreak ?? 0,
    totalParticipants: entries.length
  };
}
```

### E. Concrete Multi-Batch Isolation Scenario

```text
Student A enrollments:
  - Enrolled in Batch Alpha (Full Stack Web)
  - Enrolled in Batch Beta (Data Structures & Algorithms)

Activities logged:
  - Project 1 approved in Batch Alpha: +100 XP (batchId = Batch Alpha)
  - Lecture 1 completed in Batch Alpha: +5 XP (batchId = Batch Alpha)
  - Quiz 1 passed in Batch Beta: +20 XP (batchId = Batch Beta)
  - General DSA problem solved: +10 XP (batchId = NULL)

Resulting Leaderboard Scores:
  ┌──────────────────────────────────────────────────────────┐
  │ Batch Alpha Leaderboard:  105 XP (100 + 5)               │
  │ Batch Beta Leaderboard:    20 XP (20)                    │
  │ Global / College Ranking: 135 XP (105 + 20 + 10)         │
  └──────────────────────────────────────────────────────────┘
```

**Verification Invariant:**
No XP from Batch Beta or general practice appears on Batch Alpha. No XP from Batch Alpha appears on Batch Beta.

---

## 7. Cross-Slice Context Rules & Precedence

To eliminate conflicting batch contexts across the portal, the application must adhere to this unified precedence rule:

```text
Explicit Route Parameter (`/batches/[batchId]`)
        >
Query Parameter (`?batchId=...`)
        >
Validated Cookie Context (`rms_active_cohort`)
        >
Fallback: First Enrolled Active Batch (`activeBatches[0]`)
```

1. **Route Precedence:** If a page route includes `[batchId]`, that parameter is authoritative for that page. Direct navigation to `/batches/[batchId]` synchronizes the active cohort cookie.
2. **Leaderboards Isolation:** The Leaderboard page accepts `?batchId=...`. If omitted, it falls back to the active cohort from cookie, then `activeBatches[0]`.
3. **Overview Hub:** Displays aggregated information across ALL active cohorts, with the active cohort banner and switcher driven by the cookie.

---

## 8. Security & Entitlement Model

1. **Cohort Switcher Tampering Protection:**
   - Any batch ID supplied to `setActiveCohortAction(batchId)` is validated via database query against `enrollments` table for the authenticated `student.id`.
   - If a student crafts a request attempting to switch to a batch they do not belong to, the action rejects with an HTTP 403 / unauthorized status and does not modify the cookie.
2. **Direct Route Traversal Protection:**
   - `assertBatchEntitlement(studentId, batchId)` throws `notFound()` on unauthorized access, preserving the existing anti-enumeration security guarantee.
3. **Stale Cookie Invalidation:**
   - If a student's enrollment changes from `enrolled` to `withdrawn`, the server-side `resolveActiveCohort` automatically discards the cookie value and falls back to their remaining active batches.

---

## 9. Data / Query Design

### 9.1 Summary of Query Modifications
1. **`apps/student/lib/db/queries/leaderboards.ts`:**
   - Modify `getBatchLeaderboard(studentId, collegeId, batchId, 'all_time')`: Replace `studentStats.totalXp` with `SUM(activities.xpAwarded)` where `activities.batchId = batchId`.
   - Modify `getBatchLeaderboard(studentId, collegeId, batchId, 'weekly')`: Add `eq(activities.batchId, batchId)` to the `activities` left join.
   - Update fallback `userStanding` query outside top 50 to compute batch-scoped XP.
   - Index utilized: `activity_batch_xp_idx` on `(batch_id, student_id, activity_date_ist)`.

2. **`apps/student/lib/db/queries/overview.ts`:**
   - Verify `getStudentOverview(studentId, activeBatchIds)`: Retains multi-batch deadline query.
   - Deadlines query already includes `contentItemId`, `batchId`, `batchName`, `contentType`, `weekNumber`, `dueAt`, `isCompleted`. No SQL changes required.

3. **`apps/student/lib/actions/cohort.ts` (NEW):**
   - Server Action `setActiveCohortAction(batchId: string)`:
     - Validates user session.
     - Asserts student is actively enrolled in `batchId`.
     - Writes `rms_active_cohort` cookie.
     - Returns `{ success: true, activeBatchId: batchId }`.

---

## 10. Component & Route Design

### 10.1 New Components
1. **`apps/student/components/shell/cohort-switcher.tsx` (`'use client'`):**
   - Renders a dropdown selector for switching between active cohorts.
   - Displays cohort name, program code, and enrollment status badge.
   - Handles optimistic local state and calls `setActiveCohortAction`.
   - Responsive design: compact trigger for header, full-width trigger for sidebar and mobile drawer.

### 10.2 Modified Components
1. **`apps/student/app/(dashboard)/layout.tsx`:**
   - Reads `rms_active_cohort` cookie via `await cookies()`.
   - Resolves `activeCohort` using `resolveActiveCohort(cookieVal, context.activeBatches)`.
   - Passes `activeCohort` to `<DashboardShell context={context} activeCohort={activeCohort}>`.
2. **`apps/student/components/shell/dashboard-shell.tsx`:**
   - Accepts `activeCohort: StudentBatchItem | null`.
   - Passes `activeCohort` down to `<Header>`, `<Sidebar>`, and `<MobileNav>`.
3. **`apps/student/components/shell/header.tsx`:**
   - Replaces `primaryBatch` badge with `<CohortSwitcher />`.
4. **`apps/student/components/shell/sidebar.tsx`:**
   - Uses `activeCohort` instead of `activeBatches[0]`.
   - Links "Batch Workspace" nav item directly to `/batches/${activeCohort.batchId}`.
5. **`apps/student/components/shell/mobile-nav.tsx`:**
   - Uses `activeCohort` instead of `activeBatches[0]`.
   - Includes `<CohortSwitcher />` within the mobile navigation drawer.
6. **`apps/student/components/overview/deadlines-card.tsx`:**
   - Converts deadline rows to clickable links (`<Link href={destinationHref}>`).
   - Adds batch badge and clear navigation cues.
7. **`apps/student/app/(dashboard)/overview/page.tsx`:**
   - Replaces "Primary Cohort" badge with "Active Cohort" badge synchronized with `activeCohort`.

---

## 11. Acceptance Criteria

### 4.1 Shell Decoupling
- **AC-4.1-01:** A student enrolled in 2 or more active cohorts sees a Cohort Switcher in the desktop header, sidebar, and mobile drawer.
- **AC-4.1-02:** Selecting a different cohort updates the `rms_active_cohort` cookie and immediately refreshes the shell context.
- **AC-4.1-03:** Reloading the browser or reopening the portal preserves the selected cohort.
- **AC-4.1-04:** A student cannot set or persist a batch ID for which they do not have active entitlement (`status IN ('active', 'confirmed')`).
- **AC-4.1-05:** If no cookie exists, the shell gracefully defaults to `activeBatches[0]`.
- **AC-4.1-06:** If the student's enrollment in the selected batch is revoked, the shell gracefully falls back to their remaining active batches.
- **AC-4.1-07:** The "Batch Workspace" sidebar and mobile navigation items link directly to `/batches/${activeCohort.batchId}`.
- **AC-4.1-08:** A student with 1 active cohort sees their active cohort displayed without unnecessary switching controls.

### 4.2 Aggregated Learning Hub
- **AC-4.2-01:** Upcoming deadlines on `/overview` aggregate milestones across ALL active batches the student is enrolled in.
- **AC-4.2-02:** Every displayed deadline item clearly identifies its source cohort name and program.
- **AC-4.2-03:** Clicking a lecture, note, or project deadline navigates directly to `/content/${contentItemId}?batchId=${batchId}`.
- **AC-4.2-04:** Clicking a quiz deadline navigates directly to the assessment runner or assessment center with `batchId` context.
- **AC-4.2-05:** Clicking a DSA sheet milestone navigates directly to `/dsa?batchId=${batchId}`.
- **AC-4.2-06:** The Overview welcome banner displays "Active Cohort" reflecting the selected cohort, eliminating the hardcoded `primaryBatch[0]` presentation.

### 4.3 Scoped Leaderboards
- **AC-4.3-01:** In `getBatchLeaderboard` (all-time), a student's score reflects ONLY XP earned from activities where `activities.batchId = targetBatchId`.
- **AC-4.3-02:** In `getBatchLeaderboard` (weekly), a student's score reflects ONLY XP earned from activities where `activities.batchId = targetBatchId` and `activities.activityDateIst >= startOfWeekIst`.
- **AC-4.3-03:** XP earned in Batch A NEVER appears in Batch B's leaderboard.
- **AC-4.3-04:** General DSA practice XP (`batchId = NULL`) is strictly excluded from all batch leaderboards.
- **AC-4.3-05:** A student outside the top 50 receives an accurate individual `userStanding` showing their batch-isolated XP.
- **AC-4.3-06:** Students must be enrolled in the target batch to view its leaderboard; unauthorized attempts throw an authorization error.
- **AC-4.3-07:** The College Leaderboard continues to display college-wide rankings without regression.

---

## 12. Test Strategy

### A. Unit & Data-Layer Tests
1. **`apps/student/lib/__tests__/leaderboards.test.ts`:**
   - **Cross-Batch XP Isolation Test:** Seed activities for Student 1 in Batch A (+100 XP) and Batch B (+50 XP). Assert Batch A all-time leaderboard returns 100 XP, and Batch B returns 50 XP.
   - **Weekly Batch Isolation Test:** Seed weekly activities across Batch A and Batch B. Assert weekly batch leaderboard counts only the target batch's weekly XP.
   - **Null Batch XP Exclusion Test:** Seed activity with `batchId: null` (+20 XP). Assert it does not appear in any batch leaderboard.
   - **Individual Standing Scoping Test:** Assert `userStanding.xp` matches batch-scoped XP when student is ranked outside the top 50.
2. **`apps/student/lib/__tests__/cohort-switcher.test.ts` (NEW):**
   - Test `resolveActiveCohort` fallback logic (valid cookie, missing cookie, invalid cookie, stale enrollment).
   - Test `setActiveCohortAction` entitlement authorization guard.

### B. Component Tests
1. **`apps/student/lib/__tests__/deadlines-card.test.ts` (NEW or updated in `overview.test.ts`):**
   - Verify that deadline items render valid anchor elements (`<a>` / `<Link>`) with correct destination URLs (`/content/...`, `/dsa...`, `/assessments...`).
   - Verify that batch name badges are present on all deadline items.

### C. Portal Regression Suite
- Run full Vitest suite in `@rms/student`: `pnpm --filter @rms/student test` (must pass 100% of tests).
- Run TypeScript typecheck: `pnpm --filter @rms/student typecheck` (zero errors).
- Run Next.js production build: `pnpm --filter @rms/student build`.

---

## 13. Implementation Sequence

The safest, non-disruptive implementation sequence is:

```text
Step 1: 4.3 Scoped Leaderboards
        - Update `apps/student/lib/db/queries/leaderboards.ts` (all-time & weekly SQL queries)
        - Update fallback userStanding query
        - Add cross-batch XP isolation tests to `leaderboards.test.ts`
        - Run `pnpm --filter @rms/student test` to verify

Step 2: 4.1 Shell Decoupling Core
        - Create `apps/student/lib/actions/cohort.ts` (`setActiveCohortAction`)
        - Add `resolveActiveCohort` helper to `entitlements.ts`
        - Update `apps/student/app/(dashboard)/layout.tsx` to read cookie and inject `activeCohort`
        - Update `dashboard-shell.tsx`, `sidebar.tsx`, `header.tsx`, `mobile-nav.tsx`
        - Create `apps/student/components/shell/cohort-switcher.tsx`
        - Add unit tests in `apps/student/lib/__tests__/cohort-switcher.test.ts`

Step 3: 4.2 Aggregated Learning Hub Completion
        - Update `apps/student/components/overview/deadlines-card.tsx` (actionable links & badges)
        - Update `apps/student/app/(dashboard)/overview/page.tsx` (active cohort welcome banner)
        - Verify interaction with `<ResumeLearningCard />`
        - Add component tests for deadline navigation

Step 4: Final Validation
        - Full test run across `@rms/student`
        - TypeScript compilation check (`tsc --noEmit`)
        - Next.js production build validation
```

---

## 14. File-Level Impact

### Files to Create:
1. `apps/student/lib/actions/cohort.ts`: Server action for persistent cohort switching with entitlement validation.
2. `apps/student/components/shell/cohort-switcher.tsx`: Interactive cohort selector component for header, sidebar, and mobile drawer.
3. `apps/student/lib/__tests__/cohort-switcher.test.ts`: Unit tests for cohort resolution and switching security.

### Files to Modify:
1. `apps/student/lib/db/queries/leaderboards.ts`: Isolate batch XP in all-time, weekly, and `userStanding` queries.
2. `apps/student/lib/__tests__/leaderboards.test.ts`: Add tests proving cross-batch XP isolation and null-batch exclusion.
3. `apps/student/lib/db/queries/entitlements.ts`: Add `resolveActiveCohort` helper function.
4. `apps/student/app/(dashboard)/layout.tsx`: Read cookie and pass resolved `activeCohort` to shell.
5. `apps/student/components/shell/dashboard-shell.tsx`: Accept and thread `activeCohort` prop.
6. `apps/student/components/shell/header.tsx`: Mount `<CohortSwitcher />` and remove `primaryBatch[0]` badge.
7. `apps/student/components/shell/sidebar.tsx`: Bind cohort card and Batch Workspace link to `activeCohort`.
8. `apps/student/components/shell/mobile-nav.tsx`: Mount `<CohortSwitcher />` and update Batch Workspace link.
9. `apps/student/components/overview/deadlines-card.tsx`: Make deadline items clickable deep links with cohort attribution badges.
10. `apps/student/app/(dashboard)/overview/page.tsx`: Update welcome header to display `activeCohort`.

### Files FORBIDDEN from Modification:
- `packages/db/*`: No schema changes or migrations.
- `packages/auth/*`: No auth package changes.
- `apps/admin/*`: Complete admin surface isolation.
- `apps/web/*`: Public website isolation.
- `apps/student/lib/services/resume-learning.ts`: Core Resume Learning engine from `7446e0d` must be preserved.

---

## 15. Open Decisions

### Decision 1: Resume Learning Engine Scoping vs Global Evaluation
- **Context:** Commit `7446e0d` evaluates Resume Learning candidates across **all active batches** by prioritizing imminent deadlines across cohorts.
- **Options:**
  - *Option A (Global Priority):* Resume Learning remains strictly multi-batch, always recommending the most urgent milestone across all cohorts regardless of the selected cohort in the shell.
  - *Option B (Cohort-Scoped):* If an active cohort is selected, Resume Learning evaluates milestones strictly within that cohort.
  - *Option C (Hybrid — Recommended):* Resume Learning evaluates across all active cohorts by default to ensure urgent deadlines are never missed, but accepts an optional `preferredBatchId` so that if a student is focusing on a specific cohort workspace, it prioritizes that cohort.
- **Recommendation:** **Option C**. On `/overview`, Resume Learning continues its multi-batch priority evaluation so urgent deadlines across all cohorts remain prominent, but displays the cohort name badge clearly.

### Decision 2: Treatment of Activities with `batchId = NULL`
- **Context:** General DSA problems solved in `/dsa` or self-paced content viewed in `/library` record `batchId: null` in the `activities` table.
- **Decision:** **Strict Exclusion**. Activities with `batchId = null` must NEVER be included in any batch cohort leaderboard. They contribute strictly to the student's lifetime XP (`studentStats.totalXp`), daily streak calculations, and the College Leaderboard.

---

## 16. Definition of Done

Phase 4 will be formally certified as **COMPLETE** when:
- [ ] Cohort switcher is functional across desktop header, sidebar, and mobile drawer.
- [ ] Active cohort selection persists in `rms_active_cohort` cookie across reloads.
- [ ] Unauthorized batch selection attempts are blocked on the server.
- [ ] All deadline items in `<DeadlinesCard />` are clickable deep links to the appropriate content/workspace.
- [ ] Overview welcome banner reflects `activeCohort` with total cohort count.
- [ ] Batch all-time leaderboard calculates strictly batch-attributed XP from `activities`.
- [ ] Batch weekly leaderboard isolates weekly XP using `activities.batchId = batchId`.
- [ ] Cross-batch XP isolation tests in `leaderboards.test.ts` pass with 100% coverage.
- [ ] Vitest suite passes clean across `@rms/student` (all tests passing).
- [ ] TypeScript compilation (`tsc --noEmit`) passes with 0 errors.
- [ ] Next.js production build (`pnpm --filter @rms/student build`) succeeds without warnings.

---

## Final Readiness Verdict

```text
READY FOR IMPLEMENTATION
```
