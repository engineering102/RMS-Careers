import 'server-only';

import { db, enrollments, students, programs, type Enrollment, type DbClient } from '@rms/db';
import { eq, desc, count, and, ne, sql, inArray, isNull, isNotNull } from 'drizzle-orm';

export interface DetailedEnrollment {
  id: number;
  status: Enrollment['status'];
  createdAt: Date;
  confirmationSentAt: Date | null;
  student: {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    collegeRollNumber: string | null;
    branch: string | null;
    year: number | null;
  };
  program: {
    id: number;
    name: string;
    code: string;
    capacity: number;
  };
}

export interface FetchEnrollmentsOptions {
  search?: string;
  programIdFilter?: number;
  programCodeFilter?: string;
  statusFilter?: string;
  yearFilter?: number;
  emailStatusFilter?: string;
  sort?: string;
}

export interface EnrollmentSummaryStats {
  total: number;
  pending: number;
  confirmed: number;
  waitlisted: number;
  cancelled: number;
  emailsSent: number;
  emailsFailed: number;
}

/**
 * Returns enrollment counts aggregated by status using a single SQL GROUP BY query.
 * Replaces the previous implementation that fetched all rows and iterated in JS.
 */
export async function getEnrollmentSummaryStats(): Promise<EnrollmentSummaryStats> {
  const empty: EnrollmentSummaryStats = {
    total: 0,
    pending: 0,
    confirmed: 0,
    waitlisted: 0,
    cancelled: 0,
    emailsSent: 0,
    emailsFailed: 0
  };

  try {
    if (!process.env.POSTGRES_URL) return empty;

    // Single aggregate query: count per status and email delivery
    const [statusRows, emailRows] = await Promise.all([
      db
        .select({
          status: enrollments.status,
          cnt: count()
        })
        .from(enrollments)
        .groupBy(enrollments.status),

      db
        .select({
          sent: count(enrollments.confirmationSentAt),
          total: count()
        })
        .from(enrollments)
    ]);

    const stats: EnrollmentSummaryStats = { ...empty };

    for (const row of statusRows) {
      stats.total += row.cnt;
      if (row.status === 'pending') stats.pending = row.cnt;
      else if (row.status === 'confirmed') stats.confirmed = row.cnt;
      else if (row.status === 'waitlisted') stats.waitlisted = row.cnt;
      else if (row.status === 'cancelled') stats.cancelled = row.cnt;
    }

    if (emailRows[0]) {
      stats.emailsSent = emailRows[0].sent;
      stats.emailsFailed = emailRows[0].total - emailRows[0].sent;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching enrollment summary stats:', error);
    return empty;
  }
}

export async function checkExistingEnrollment(
  studentId: number,
  programId: number,
  client: DbClient = db
): Promise<Enrollment | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;
    const results = await client
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.programId, programId)
        )
      )
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error('Error checking existing enrollment:', error);
    if (client !== db) throw error;
    return null;
  }
}

export async function createEnrollmentRecord(
  studentId: number,
  programId: number,
  client: DbClient = db
): Promise<Enrollment> {
  const [created] = await client
    .insert(enrollments)
    .values({
      studentId,
      programId,
      status: 'pending'
    })
    .returning();
  return created;
}

export async function markEnrollmentConfirmationSent(
  enrollmentId: number
): Promise<void> {
  try {
    if (!process.env.POSTGRES_URL) return;
    await db
      .update(enrollments)
      .set({ confirmationSentAt: new Date() })
      .where(eq(enrollments.id, enrollmentId));
  } catch (error) {
    console.error('Failed to update confirmationSentAt timestamp:', error);
  }
}

export async function updateEnrollmentStatus(
  enrollmentId: number,
  status: Enrollment['status']
): Promise<boolean> {
  try {
    if (!process.env.POSTGRES_URL) return false;
    await db
      .update(enrollments)
      .set({ status })
      .where(eq(enrollments.id, enrollmentId));
    return true;
  } catch (error) {
    console.error(`Error updating enrollment status for ID ${enrollmentId}:`, error);
    return false;
  }
}

export async function updateBulkEnrollmentStatus(
  enrollmentIds: number[],
  status: Enrollment['status']
): Promise<number> {
  try {
    if (!process.env.POSTGRES_URL || enrollmentIds.length === 0) return 0;
    const result = await db
      .update(enrollments)
      .set({ status })
      .where(inArray(enrollments.id, enrollmentIds))
      .returning();
    return result.length;
  } catch (error) {
    console.error('Error bulk updating enrollment status:', error);
    return 0;
  }
}

export async function getEnrollmentsCount(): Promise<number> {
  try {
    if (!process.env.POSTGRES_URL) return 0;
    const result = await db.select({ count: count() }).from(enrollments);
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error('Error fetching enrollments count:', error);
    return 0;
  }
}

/**
 * Fetches a single enrollment by ID using a direct WHERE clause.
 * Replaces the previous O(n) implementation that loaded all enrollments.
 */
export async function getEnrollmentById(id: number): Promise<DetailedEnrollment | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;
    const rows = await db
      .select({
        enrollmentId: enrollments.id,
        enrollmentStatus: enrollments.status,
        enrollmentCreatedAt: enrollments.createdAt,
        confirmationSentAt: enrollments.confirmationSentAt,
        studentId: students.id,
        studentFullName: students.fullName,
        studentEmail: students.email,
        studentPhone: students.phone,
        studentRoll: students.collegeRollNumber,
        studentBranch: students.branch,
        studentYear: students.year,
        programId: programs.id,
        programName: programs.name,
        programCode: programs.code,
        programCapacity: programs.capacity
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(programs, eq(enrollments.programId, programs.id))
      .where(eq(enrollments.id, id))
      .limit(1);

    const r = rows[0];
    if (!r) return null;

    return {
      id: r.enrollmentId,
      status: r.enrollmentStatus,
      createdAt: r.enrollmentCreatedAt,
      confirmationSentAt: r.confirmationSentAt,
      student: {
        id: r.studentId,
        fullName: r.studentFullName,
        email: r.studentEmail,
        phone: r.studentPhone,
        collegeRollNumber: r.studentRoll,
        branch: r.studentBranch,
        year: r.studentYear
      },
      program: {
        id: r.programId,
        name: r.programName,
        code: r.programCode,
        capacity: r.programCapacity
      }
    };
  } catch (error) {
    console.error(`Error fetching enrollment by id ${id}:`, error);
    return null;
  }
}

export async function getEnrollmentsWithDetails(
  searchOrOptions?: string | FetchEnrollmentsOptions,
  programIdFilter?: number,
  statusFilter?: string
): Promise<DetailedEnrollment[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    let search: string | undefined;
    let programCodeFilter: string | undefined;
    let yearFilter: number | undefined;
    let emailStatusFilter: string | undefined;
    let sort: string | undefined;

    if (typeof searchOrOptions === 'object' && searchOrOptions !== null) {
      search = searchOrOptions.search;
      programIdFilter = searchOrOptions.programIdFilter ?? programIdFilter;
      programCodeFilter = searchOrOptions.programCodeFilter;
      statusFilter = searchOrOptions.statusFilter ?? statusFilter;
      yearFilter = searchOrOptions.yearFilter;
      emailStatusFilter = searchOrOptions.emailStatusFilter;
      sort = searchOrOptions.sort;
    } else if (typeof searchOrOptions === 'string') {
      search = searchOrOptions;
    }

    let conditions = [];

    if (programIdFilter) {
      conditions.push(eq(enrollments.programId, programIdFilter));
    }

    if (programCodeFilter && programCodeFilter !== 'all') {
      conditions.push(sql`LOWER(${programs.code}) = ${programCodeFilter.trim().toLowerCase()}`);
    }

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(enrollments.status, statusFilter as any));
    }

    if (yearFilter && yearFilter > 0) {
      conditions.push(eq(students.year, yearFilter));
    }

    if (emailStatusFilter && emailStatusFilter !== 'all') {
      if (emailStatusFilter === 'sent') {
        conditions.push(isNotNull(enrollments.confirmationSentAt));
      } else if (emailStatusFilter === 'unsent') {
        conditions.push(isNull(enrollments.confirmationSentAt));
      }
    }

    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      conditions.push(
        sql`(${students.fullName} ILIKE ${`%${cleanSearch}%`} OR ${students.email} ILIKE ${`%${cleanSearch}%`} OR ${students.collegeRollNumber} ILIKE ${`%${cleanSearch}%`} OR ${programs.name} ILIKE ${`%${cleanSearch}%`} OR ${programs.code} ILIKE ${`%${cleanSearch}%`})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause = desc(enrollments.createdAt);
    if (sort === 'oldest') {
      orderByClause = sql`${enrollments.createdAt} ASC` as any;
    } else if (sort === 'name_asc') {
      orderByClause = sql`${students.fullName} ASC` as any;
    } else if (sort === 'name_desc') {
      orderByClause = sql`${students.fullName} DESC` as any;
    }

    const rows = await db
      .select({
        enrollmentId: enrollments.id,
        enrollmentStatus: enrollments.status,
        enrollmentCreatedAt: enrollments.createdAt,
        confirmationSentAt: enrollments.confirmationSentAt,
        studentId: students.id,
        studentFullName: students.fullName,
        studentEmail: students.email,
        studentPhone: students.phone,
        studentRoll: students.collegeRollNumber,
        studentBranch: students.branch,
        studentYear: students.year,
        programId: programs.id,
        programName: programs.name,
        programCode: programs.code,
        programCapacity: programs.capacity
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(programs, eq(enrollments.programId, programs.id))
      .where(whereClause)
      .orderBy(orderByClause);

    return rows.map((r) => ({
      id: r.enrollmentId,
      status: r.enrollmentStatus,
      createdAt: r.enrollmentCreatedAt,
      confirmationSentAt: r.confirmationSentAt,
      student: {
        id: r.studentId,
        fullName: r.studentFullName,
        email: r.studentEmail,
        phone: r.studentPhone,
        collegeRollNumber: r.studentRoll,
        branch: r.studentBranch,
        year: r.studentYear
      },
      program: {
        id: r.programId,
        name: r.programName,
        code: r.programCode,
        capacity: r.programCapacity
      }
    }));
  } catch (error) {
    console.error('Error fetching detailed enrollments:', error);
    return [];
  }
}

export async function getExistingEnrollmentsByEmails(
  programId: number,
  emails: string[]
): Promise<Set<string>> {
  const enrolledEmails = new Set<string>();
  try {
    if (!process.env.POSTGRES_URL || emails.length === 0) return enrolledEmails;

    const lowerEmails = emails.map((e) => e.trim().toLowerCase());

    const rows = await db
      .select({ email: students.email })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(
        and(
          eq(enrollments.programId, programId),
          sql`LOWER(${students.email}) IN ${lowerEmails}`
        )
      );

    rows.forEach((r) => enrolledEmails.add(r.email.toLowerCase()));
    return enrolledEmails;
  } catch (error) {
    console.error('Error fetching existing enrollments by emails:', error);
    return enrolledEmails;
  }
}

/**
 * Executes a batch transfer for a student's enrollment while preserving complete historical records.
 *
 * Transactionally:
 * 1. Transitions the existing enrollment status to 'transferred' and records `transferredAt`.
 * 2. Creates a new active enrollment linked to the destination batch.
 *
 * This preserves the historical audit trail without destroying previous enrollment records,
 * and satisfies the invariant of at most one active enrollment per student/program.
 */
export async function transferEnrollment(
  enrollmentId: number,
  newBatchId: string
): Promise<{ previousEnrollment: Enrollment; newEnrollment: Enrollment }> {
  return await db.transaction(async (tx) => {
    // 1. Fetch current enrollment
    const [current] = await tx
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!current) {
      throw new Error(`Enrollment ${enrollmentId} not found`);
    }

    if (current.status === 'transferred' || current.status === 'cancelled') {
      throw new Error(`Cannot transfer enrollment with status '${current.status}'`);
    }

    // 2. Mark existing enrollment as transferred
    const [previous] = await tx
      .update(enrollments)
      .set({
        status: 'transferred',
        transferredAt: new Date()
      })
      .where(eq(enrollments.id, enrollmentId))
      .returning();

    // 3. Insert new active enrollment record with destination batch
    const [newEnrollment] = await tx
      .insert(enrollments)
      .values({
        studentId: current.studentId,
        programId: current.programId,
        batchId: newBatchId,
        status: 'active'
      })
      .returning();

    return {
      previousEnrollment: previous,
      newEnrollment
    };
  });
}

