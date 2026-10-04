# RMS Careers — Code Reuse & Utility Inventory

This document maps all existing reusable components, utilities, schemas, types, and services across the monorepo to prevent redundant reimplementations.

---

## 1. Shared Database & ORM (`@rms/db`)

Location: `packages/db/src/`

### Database Client & Connection:
- `db`: Drizzle ORM client configured with Neon HTTP serverless driver (`import { db } from '@rms/db'`).

### Table References:
- `colleges`, `users`, `userRoles`, `accountTokens`, `tutors`, `students`, `studentStats`, `programs`, `batches`, `tutorBatchAssignments`, `enrollments`.

### Enums:
- `roleEnum` (`'super_admin' | 'admin' | 'tutor' | 'student'`)
- `programStatusEnum` (`'draft' | 'active' | 'archived'`)
- `enrollmentStatusEnum` (`'pending' | 'confirmed' | 'waitlisted' | 'cancelled' | 'active' | 'transferred' | 'completed' | 'dropped'`)
- `userStatusEnum` (`'pending_activation' | 'active' | 'suspended' | 'archived'`)
- `tokenTypeEnum` (`'activation' | 'password_reset'`)

### Types:
- `College`, `NewCollege`, `User`, `NewUser`, `UserRole`, `NewUserRole`, `AccountToken`, `NewAccountToken`, `Tutor`, `NewTutor`, `Batch`, `NewBatch`, `Program`, `NewProgram`, `Student`, `NewStudent`, `StudentStat`, `NewStudentStat`, `Enrollment`, `NewEnrollment`.

### Zod Validation Schemas:
- `insertCollegeSchema`, `selectCollegeSchema`
- `insertUserSchema`, `selectUserSchema`
- `insertProgramSchema`, `selectProgramSchema`
- `insertStudentSchema`, `selectStudentSchema`
- `insertEnrollmentSchema`, `selectEnrollmentSchema`
- `insertBatchSchema`, `selectBatchSchema`
- `insertTutorSchema`, `selectTutorSchema`
- `insertAccountTokenSchema`, `selectAccountTokenSchema`

---

## 2. Shared Identity & Authentication (`@rms/auth`)

Location: `packages/auth/src/`

### Password Utilities (`@rms/auth/passwords`):
- `hashPassword(plainText: string): Promise<string>`
- `verifyPassword(plainText: string, hash: string): Promise<boolean>`
- `validatePasswordStrength(password: string): { valid: boolean; errors: string[] }`

### Token Utilities (`@rms/auth/tokens`):
- `generateAccountToken(): { rawToken: string; tokenHash: string }`
- `hashToken(rawToken: string): string`
- `createActivationToken(userId: string): Promise<{ rawToken: string; expiresAt: Date }>`
- `createPasswordResetToken(userId: string): Promise<{ rawToken: string; expiresAt: Date }>`
- `verifyAndConsumeToken(rawToken: string, expectedType: TokenTypeEnum): Promise<string | null>`

### Role-Based Access Control (`@rms/auth/rbac`):
- `ADMIN_ROLES`: Constant array `['super_admin', 'admin']`
- `normalizeRoles(input: RoleInput): RoleEnum[]`
- `hasRole(userRoles: RoleInput, requiredRole: RoleEnum | RoleEnum[]): boolean`
- `hasAdminPrivileges(userRoles: RoleInput): boolean`
- `assertRole(userRoles: RoleInput, requiredRole: RoleEnum | RoleEnum[], message?: string): void`
- `AuthorizationError`: Custom error class for forbidden operations

---

## 3. Reusable UI Components & Primitives

### Radix UI Primitives (`apps/admin/components/ui/`):
- `button.tsx`: Polymorphic button supporting primary, secondary, destructive, outline, ghost variants.
- `dialog.tsx`: Accessible modal dialogs with backdrop blur.
- `dropdown-menu.tsx`: Context and action menus.
- `select.tsx`: Styled dropdown selectors.
- `tabs.tsx`: Accessible tab navigation.
- `tooltip.tsx`: Hover tooltips.
- `card.tsx`: Structured card containers with Header, Title, Content, Footer.
- `badge.tsx`: Variant badges (`default`, `secondary`, `destructive`, `outline`).

### Public Web Components (`apps/web/components/`):
- `header.tsx`: Universal navigation bar with theme toggle, external portal links, and mobile drawer.
- `footer.tsx`: Canonical multi-column footer with domain badge.
- `problem-view.tsx`: In-browser DSA problem practice view with test cases.
- `sheet-progress.tsx`: Local storage progress bar for DSA problem sheets.

---

## 4. Query Modules

### Admin Queries (`apps/admin/lib/db/queries/`):
- `colleges.ts`: `getColleges()`, `getCollegeById()`, `getCollegeByCode()`, `createCollege()`
- `programs.ts`: `getPrograms()`, `getProgramById()`, `getProgramByCode()`, `createProgram()`, `updateProgram()`
- `batches.ts`: `getBatchesByProgram()`, `getBatchesByCollege()`, `createBatch()`
- `students.ts`: `getStudents()`, `getStudentByEmail()`, `createStudent()`, `upsertStudent()`
- `enrollments.ts`: `getEnrollments()`, `getEnrollmentById()`, `updateEnrollmentStatus()`, `bulkUpdateEnrollmentStatus()`
- `users.ts`: `getUserByEmail()`, `authenticateAdmin()`, `updateUserStatus()`
- `tokens.ts`: `storeAccountToken()`, `getValidToken()`, `markTokenConsumed()`

### Web Queries (`apps/web/lib/db/queries/`):
- `programs.ts`: `getPublicPrograms()`, `getPublicProgramByCode()`

---

## 5. Client Utilities

- `cn(...inputs)` (`lib/utils.ts` in apps): Merges Tailwind classes safely using `clsx` and `tailwind-merge`.
- `anonymous-progress.ts` (`apps/web/lib/client/`):
  - `getAnonymousProgress(): AnonymousProgressState`
  - `markProblemCompleted(problemId: string): void`
  - `markProblemIncomplete(problemId: string): void`
  - `resetAnonymousProgress(): void`
