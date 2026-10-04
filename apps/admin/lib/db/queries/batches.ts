import 'server-only';

import {
  db,
  batches,
  tutors,
  tutorBatchAssignments,
  type Batch,
  type TutorBatchAssignment
} from '@rms/db';
import { eq, and, desc } from 'drizzle-orm';

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
}): Promise<Batch> {
  const [created] = await db
    .insert(batches)
    .values({
      programId: data.programId,
      collegeId: data.collegeId,
      name: data.name.trim(),
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
