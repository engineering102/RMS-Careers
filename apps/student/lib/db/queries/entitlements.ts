import 'server-only';

import { redirect, notFound } from 'next/navigation';
import { db, students, users, userRoles, enrollments, programs, batches, colleges } from '@rms/db';
import { eq, and, sql } from 'drizzle-orm';
import { hasRole } from '@rms/auth';
import { auth } from '@/lib/auth';

export class AuthorizationError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface StudentProfileContext {
  id: number;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  collegeRollNumber: string | null;
  branch: string | null;
  year: number | null;
  collegeId: string | null;
  collegeName: string | null;
  collegeCode: string | null;
}

export interface StudentEnrollmentItem {
  enrollmentId: number;
  status: string;
  programId: number;
  programName: string;
  programCode: string;
  batchId: string | null;
  batchName: string | null;
  batchStartDate: Date | null;
  batchEndDate: Date | null;
}

export interface StudentBatchItem {
  batchId: string;
  batchName: string;
  programId: number;
  programName: string;
  programCode: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface StudentEntitlementContext {
  isStudent: boolean;
  isActive: boolean;
  student: StudentProfileContext | null;
  enrollments: StudentEnrollmentItem[];
  activeBatches: StudentBatchItem[];
  hasActiveEntitlement: boolean;
}

/**
 * Resolves full student identity, college affiliation, and active enrollments/batches.
 * Derives user ID strictly from the server-validated session context.
 */
export async function getStudentEntitlementContext(
  userId: string
): Promise<StudentEntitlementContext> {
  if (!userId || !process.env.POSTGRES_URL) {
    return {
      isStudent: false,
      isActive: false,
      student: null,
      enrollments: [],
      activeBatches: [],
      hasActiveEntitlement: false
    };
  }

  try {
    // 1. Verify user status and student role
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.status !== 'active') {
      return {
        isStudent: false,
        isActive: user?.status === 'active',
        student: null,
        enrollments: [],
        activeBatches: [],
        hasActiveEntitlement: false
      };
    }

    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    if (!hasRole(roles, 'student')) {
      return {
        isStudent: false,
        isActive: true,
        student: null,
        enrollments: [],
        activeBatches: [],
        hasActiveEntitlement: false
      };
    }

    // 2. Fetch student profile with college info
    const [studentRecord] = await db
      .select({
        id: students.id,
        userId: students.userId,
        fullName: students.fullName,
        email: students.email,
        phone: students.phone,
        collegeRollNumber: students.collegeRollNumber,
        branch: students.branch,
        year: students.year,
        collegeId: colleges.id,
        collegeName: colleges.name,
        collegeCode: colleges.code
      })
      .from(students)
      .leftJoin(colleges, eq(colleges.id, students.collegeId))
      .where(eq(students.userId, userId))
      .limit(1);

    if (!studentRecord) {
      return {
        isStudent: true,
        isActive: true,
        student: null,
        enrollments: [],
        activeBatches: [],
        hasActiveEntitlement: false
      };
    }

    // 3. Query active and confirmed enrollments
    const enrollmentRows = await db
      .select({
        enrollmentId: enrollments.id,
        status: enrollments.status,
        programId: programs.id,
        programName: programs.name,
        programCode: programs.code,
        batchId: batches.id,
        batchName: batches.name,
        batchStartDate: batches.startDate,
        batchEndDate: batches.endDate
      })
      .from(enrollments)
      .innerJoin(programs, eq(programs.id, enrollments.programId))
      .leftJoin(batches, eq(batches.id, enrollments.batchId))
      .where(
        and(
          eq(enrollments.studentId, studentRecord.id),
          sql`${enrollments.status} IN ('active', 'confirmed')`
        )
      );

    // Extract deduplicated active batches
    const batchMap = new Map<string, StudentBatchItem>();
    for (const row of enrollmentRows) {
      if (row.batchId && !batchMap.has(row.batchId)) {
        batchMap.set(row.batchId, {
          batchId: row.batchId,
          batchName: row.batchName || 'Cohort Batch',
          programId: row.programId,
          programName: row.programName,
          programCode: row.programCode,
          startDate: row.batchStartDate,
          endDate: row.batchEndDate
        });
      }
    }

    const activeBatches = Array.from(batchMap.values());

    return {
      isStudent: true,
      isActive: true,
      student: studentRecord,
      enrollments: enrollmentRows,
      activeBatches,
      hasActiveEntitlement: enrollmentRows.length > 0
    };
  } catch (error) {
    console.error('[Entitlements] Error resolving student entitlement context:', error);
    return {
      isStudent: false,
      isActive: false,
      student: null,
      enrollments: [],
      activeBatches: [],
      hasActiveEntitlement: false
    };
  }
}

/**
 * Server-side guard: Asserts that the current session belongs to an active, valid student.
 * Redirects unauthenticated users to /login and unauthorized roles to /login?error=Unauthorized.
 */
export async function requireStudentEntitlement(): Promise<StudentEntitlementContext> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (session.user.role !== 'student') {
    redirect('/login?error=Unauthorized');
  }

  const context = await getStudentEntitlementContext(session.user.id);

  if (!context.isStudent || !context.student) {
    redirect('/login?error=Unauthorized');
  }

  return context;
}

/**
 * Server-side guard: Asserts that a student has active entitlement to a specific batch.
 * Throws 404 (via Next.js notFound()) on unauthorized attempts to prevent batch existence probing.
 */
export async function assertBatchEntitlement(
  studentId: number,
  batchId: string,
  options?: { allowCompleted?: boolean }
): Promise<{
  enrollmentId: number;
  enrollmentStatus: string;
  batchId: string;
  batchName: string;
  programId: number;
  programName: string;
}> {
  if (!studentId || !batchId || !process.env.POSTGRES_URL) {
    notFound();
  }

  const allowCompleted = options?.allowCompleted ?? true;
  const statusCondition = allowCompleted
    ? sql`${enrollments.status} IN ('active', 'confirmed', 'completed')`
    : sql`${enrollments.status} IN ('active', 'confirmed')`;

  try {
    const [row] = await db
      .select({
        enrollmentId: enrollments.id,
        enrollmentStatus: enrollments.status,
        batchId: batches.id,
        batchName: batches.name,
        programId: programs.id,
        programName: programs.name
      })
      .from(enrollments)
      .innerJoin(batches, eq(batches.id, enrollments.batchId))
      .innerJoin(programs, eq(programs.id, enrollments.programId))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.batchId, batchId),
          statusCondition
        )
      )
      .limit(1);

    if (!row) {
      notFound();
    }

    return {
      enrollmentId: row.enrollmentId,
      enrollmentStatus: row.enrollmentStatus || (row as any).status || 'active',
      batchId: row.batchId,
      batchName: row.batchName,
      programId: row.programId,
      programName: row.programName
    };
  } catch (error: any) {
    if (error?.message === 'NEXT_NOT_FOUND' || error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error;
    }
    console.error('[Entitlements] Batch entitlement check failed:', error);
    notFound();
  }
}

/**
 * Resolves the active cohort for the student using the strict precedence hierarchy:
 * 1. Explicit route parameter (/batches/[batchId])
 * 2. Query parameter (?batchId=...)
 * 3. Validated cookie (rms_active_cohort)
 * 4. Fallback: first active batch (activeBatches[0])
 * 5. null (no active batches)
 *
 * Security: Validates that candidate batch IDs belong strictly to the student's activeBatches.
 */
export function resolveActiveCohort(
  batchesOrContext: StudentBatchItem[] | StudentEntitlementContext | null | undefined,
  options?: {
    routeBatchId?: string | null;
    queryBatchId?: string | null;
    cookieBatchId?: string | null;
  }
): StudentBatchItem | null {
  if (!batchesOrContext) {
    return null;
  }

  const activeBatches = Array.isArray(batchesOrContext)
    ? batchesOrContext
    : (batchesOrContext.activeBatches ?? []);

  if (activeBatches.length === 0) {
    return null;
  }

  // 1. Explicit route param
  if (options?.routeBatchId) {
    const match = activeBatches.find((b) => b.batchId === options.routeBatchId);
    if (match) return match;
  }

  // 2. Query param
  if (options?.queryBatchId) {
    const match = activeBatches.find((b) => b.batchId === options.queryBatchId);
    if (match) return match;
  }

  // 3. Validated cookie
  if (options?.cookieBatchId) {
    const match = activeBatches.find((b) => b.batchId === options.cookieBatchId);
    if (match) return match;
  }

  // 4. Fallback: first active batch
  return activeBatches[0] ?? null;
}

export {
  ACTIVE_COHORT_COOKIE_NAME,
  ACTIVE_COHORT_COOKIE_MAX_AGE
} from '@/lib/constants/cohort';

