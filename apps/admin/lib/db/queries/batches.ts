import 'server-only';

import {
  db,
  batches,
  colleges,
  programs,
  enrollments,
  tutors,
  tutorBatchAssignments,
  type Batch,
  type TutorBatchAssignment
} from '@rms/db';
import { eq, and, desc, count, ilike, ne } from 'drizzle-orm';

export interface BatchWithDetails {
  id: string;
  name: string;
  collegeId: string;
  collegeName: string;
  collegeCode: string;
  programId: number;
  programName: string;
  programCode: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  createdAt: Date;
  enrollmentCount: number;
}

/**
 * Retrieves batches joined with college, program, and active enrollment count.
 * Single query with LEFT JOIN and GROUP BY avoids N+1 database roundtrips.
 */
export async function getBatchesWithDetails(options?: {
  collegeId?: string;
  programId?: number;
  search?: string;
}): Promise<BatchWithDetails[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    const conditions = [];
    if (options?.collegeId) {
      conditions.push(eq(batches.collegeId, options.collegeId));
    }
    if (options?.programId) {
      conditions.push(eq(batches.programId, options.programId));
    }
    if (options?.search) {
      conditions.push(ilike(batches.name, `%${options.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: batches.id,
        name: batches.name,
        collegeId: batches.collegeId,
        collegeName: colleges.name,
        collegeCode: colleges.code,
        programId: batches.programId,
        programName: programs.name,
        programCode: programs.code,
        startDate: batches.startDate,
        endDate: batches.endDate,
        status: batches.status,
        createdAt: batches.createdAt,
        enrollmentCount: count(enrollments.id)
      })
      .from(batches)
      .innerJoin(colleges, eq(batches.collegeId, colleges.id))
      .innerJoin(programs, eq(batches.programId, programs.id))
      .leftJoin(
        enrollments,
        and(
          eq(enrollments.batchId, batches.id),
          ne(enrollments.status, 'cancelled')
        )
      )
      .where(whereClause)
      .groupBy(
        batches.id,
        batches.name,
        batches.collegeId,
        colleges.name,
        colleges.code,
        batches.programId,
        programs.name,
        programs.code,
        batches.startDate,
        batches.endDate,
        batches.status,
        batches.createdAt
      )
      .orderBy(desc(batches.createdAt));

    return rows.map((r) => ({
      ...r,
      enrollmentCount: Number(r.enrollmentCount)
    }));
  } catch (error) {
    console.error('Error fetching batches with details:', error);
    return [];
  }
}

/**
 * Retrieves batches, optionally filtered by programId or collegeId.
 */
export async function getBatches(options?: {
  programId?: number;
  collegeId?: string;
}): Promise<Batch[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    const conditions = [];
    if (options?.programId) {
      conditions.push(eq(batches.programId, options.programId));
    }
    if (options?.collegeId) {
      conditions.push(eq(batches.collegeId, options.collegeId));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(batches)
        .where(and(...conditions))
        .orderBy(desc(batches.createdAt));
    }

    return await db.select().from(batches).orderBy(desc(batches.createdAt));
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
}

/**
 * Retrieves a single batch by its UUID primary key.
 */
export async function getBatchById(id: string): Promise<Batch | null> {
  if (!id) return null;
  try {
    if (!process.env.POSTGRES_URL) return null;
    const results = await db.select().from(batches).where(eq(batches.id, id)).limit(1);
    return results[0] || null;
  } catch (error) {
    console.error(`Error fetching batch by id ${id}:`, error);
    return null;
  }
}

/**
 * Creates a new training batch tied to a specific program and college.
 */
export async function createBatch(data: {
  programId: number;
  collegeId: string;
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  status?: string;
}): Promise<Batch> {
  const [created] = await db
    .insert(batches)
    .values({
      programId: data.programId,
      collegeId: data.collegeId,
      name: data.name.trim(),
      status: data.status || 'active',
      startDate: data.startDate || null,
      endDate: data.endDate || null
    })
    .returning();

  return created;
}

/**
 * Assigns a tutor to a batch.
 * Enforces uniqueness on (tutorId, batchId) via database constraint.
 * Tutors can be assigned across multiple batches and multiple colleges.
 */
export async function assignTutorToBatch(
  tutorId: string,
  batchId: string
): Promise<TutorBatchAssignment> {
  const [assignment] = await db
    .insert(tutorBatchAssignments)
    .values({
      tutorId,
      batchId
    })
    .returning();

  return assignment;
}

/**
 * Retrieves all batches assigned to a specific tutor across institutions.
 */
export async function getBatchesForTutor(tutorId: string): Promise<Batch[]> {
  try {
    if (!process.env.POSTGRES_URL || !tutorId) return [];

    const assignments = await db
      .select({
        batch: batches
      })
      .from(tutorBatchAssignments)
      .innerJoin(batches, eq(tutorBatchAssignments.batchId, batches.id))
      .where(eq(tutorBatchAssignments.tutorId, tutorId));

    return assignments.map((a) => a.batch);
  } catch (error) {
    console.error(`Error fetching batches for tutor ${tutorId}:`, error);
    return [];
  }
}
