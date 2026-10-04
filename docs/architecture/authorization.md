# Authorization & RBAC Architecture

This document describes the role-based access control (RBAC) model implemented in `@rms/auth/rbac`.

---

## 1. Role Hierarchy

The platform defines four formal roles in `packages/db/src/schema.ts` (`roleEnum`):

| Role | Scope | Permitted Actions |
| :--- | :--- | :--- |
| `super_admin` | Global Platform | Full control plane access, manage all colleges, programs, tutors, and assign administrator roles. |
| `admin` | Operations / College | Program management, batch creation, enrollment approvals, CSV bulk imports, confirmation email dispatches. |
| `tutor` | Academic / Assigned Batches | View assigned cohort rosters, grade submissions, provide rubric feedback, evaluate mock interviews. |
| `student` | Individual Learner | Access enrolled program curricula, submit assignments, track XP and personal streaks, view batch leaderboards. |

---

## 2. RBAC Utilities (`@rms/auth`)

The `@rms/auth` package provides type-safe, normalized helper functions for role evaluation:

### `hasRole(userRoles, requiredRole)`
Evaluates whether a user's role list (string array, object array, or single string) contains the required role:
```typescript
import { hasRole } from '@rms/auth';

if (hasRole(session.user.role, 'student')) {
  // Allow student access
}
```

### `hasAdminPrivileges(userRoles)`
Checks whether a user holds either `admin` or `super_admin` status:
```typescript
import { hasAdminPrivileges } from '@rms/auth';

if (!hasAdminPrivileges(session.user.role)) {
  throw new AuthorizationError('Administrative privileges required');
}
```

### `assertRole(userRoles, requiredRole, message?)`
Server-side assertion utility that throws `AuthorizationError` if the user lacks the required role.

---

## 3. Defense-in-Depth Layering

Authorization is enforced at three distinct layers:
1. **Middleware Level** (`apps/admin/middleware.ts`): Rejects unauthorized HTTP requests before route processing.
2. **Server Action Level** (`actions.ts`): Checks session and role before executing any business logic mutation.
3. **Database Query Level** (`lib/db/queries/*.ts`): Queries filter records by tenant (e.g. `collegeId`, `batchId`, or `studentId`) to prevent horizontal privilege escalation.
