# Backend Architecture & API Patterns

This document details the backend, server actions, services, and business logic execution patterns in the RMS Careers platform.

---

## 1. Backend Architecture Topology

RMS Careers follows a modern Next.js App Router serverless architecture without requiring a separate standalone Express or Nest.js backend service. Backend operations run in edge/Node.js serverless functions:

```text
Client Requests / Form Submissions
              │
              ▼
   ┌────────────────────────────────────────┐
   │ Next.js App Router (Server Actions /   │
   │ API Route Handlers)                    │
   └──────────────────┬─────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  @rms/auth       │      │  lib/db/queries  │
│  • RBAC guards   │      │  • Typed queries │
│  • Token service │      │  • Transactions  │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  @rms/db (Drizzle ORM)  │
         │  Neon PostgreSQL (HTTP) │
         └─────────────────────────┘
```

---

## 2. Server Actions Pattern

Administrative actions in `apps/admin` (e.g. `apps/admin/app/(admin)/enrollments/actions.ts`) follow a strict contract:

```typescript
'use server';

export async function updateEnrollmentStatusAction(
  enrollmentId: number,
  status: EnrollmentStatus
): Promise<{ success: boolean; error?: string; data?: any }> {
  // 1. Authenticate & assert administrative role
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user.role)) {
    return { success: false, error: 'Unauthorized: Administrative role required' };
  }

  // 2. Validate input
  if (!enrollmentId || !status) {
    return { success: false, error: 'Invalid parameters' };
  }

  // 3. Execute database mutation
  try {
    const updated = await updateEnrollmentStatus(enrollmentId, status);
    revalidatePath('/enrollments');
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update enrollment' };
  }
}
```

---

## 3. Query Service Layer

Database queries are organized into domain-specific modules under `lib/db/queries/`:
- `programs.ts`: Public and institutional program listings, program code resolution, capacity tracking.
- `colleges.ts`: College onboarding, metadata updates, code uniqueness checks.
- `batches.ts`: Program batch schedules, college allocations, tutor assignments.
- `students.ts`: Student profiles, roll numbers, college links, branch details.
- `enrollments.ts`: Multi-filter enrollment search, bulk status transitions, batch assignments.
- `users.ts`: User credential verification, role lookups, last login updates.
- `tokens.ts`: Account activation and password reset single-use token lifecycle.

---

## 4. Third-Party Integrations

### 4.1 Resend Transactional Email (`apps/admin/lib/email`)
- Dispatches transactional emails (e.g. enrollment confirmations, account activations).
- Wrapped in defensive try/catch handlers. If `RESEND_API_KEY` is missing or invalid, operations log a warning and complete without crashing the user flow.

### 4.2 CSV/Excel Ingestion (`apps/admin/lib/csv`)
- Ingests tabular data via `papaparse` (CSV) and `xlsx` (Excel).
- Performs column normalization, header validation, email validation, and duplicate detection before staging database batch inserts.
