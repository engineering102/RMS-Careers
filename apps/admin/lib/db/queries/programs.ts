import 'server-only';

import { db, programs, enrollments, type Program } from '@rms/db';
import { eq, ilike, desc, count, and, ne, sql } from 'drizzle-orm';

export async function getPrograms(search?: string): Promise<Program[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];
    try {
      if (search) {
        return await db
          .select()
          .from(programs)
          .where(ilike(programs.name, `%${search}%`))
          .orderBy(desc(programs.createdAt));
      }
      return await db.select().from(programs).orderBy(desc(programs.createdAt));
    } catch (err: any) {
      if (err?.code === '42703') {
        const query = db
          .select({
            id: programs.id,
            name: programs.name,
            code: programs.code,
            description: programs.description,
            status: programs.status,
            capacity: programs.capacity,
            startDate: programs.startDate,
            endDate: programs.endDate,
            createdAt: programs.createdAt
          })
          .from(programs);

        const rows = search
          ? await query.where(ilike(programs.name, `%${search}%`)).orderBy(desc(programs.createdAt))
          : await query.orderBy(desc(programs.createdAt));

        return rows.map((r) => ({ ...r, collegeId: null }));
      }
      throw err;
    }
  } catch (error) {
    console.error('Error fetching programs:', error);
    return [];
  }
}

export async function getProgramByCode(code: string): Promise<Program | null> {
  try {
    if (!process.env.POSTGRES_URL || !code) return null;
    const cleanCode = code.trim().toLowerCase();
    try {
      const results = await db
        .select()
        .from(programs)
        .where(sql`LOWER(${programs.code}) = ${cleanCode}`)
        .limit(1);
      return results[0] || null;
    } catch (err: any) {
      if (err?.code === '42703') {
        const results = await db
          .select({
            id: programs.id,
            name: programs.name,
            code: programs.code,
            description: programs.description,
            status: programs.status,
            capacity: programs.capacity,
            startDate: programs.startDate,
            endDate: programs.endDate,
            createdAt: programs.createdAt
          })
          .from(programs)
          .where(sql`LOWER(${programs.code}) = ${cleanCode}`)
          .limit(1);
        return results[0] ? { ...results[0], collegeId: null } : null;
      }
      throw err;
    }
  } catch (error) {
    console.error(`Error fetching program by code ${code}:`, error);
    return null;
  }
}

/**
 * Retrieves a single program by its integer ID.
 */
export async function getProgramById(id: number): Promise<Program | null> {
  if (!id || typeof id !== 'number') return null;
  try {
    if (!process.env.POSTGRES_URL) return null;
    const results = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
    return results[0] || null;
  } catch (error) {
    console.error(`Error fetching program by id ${id}:`, error);
    return null;
  }
}

export async function getProgramEnrollmentCount(programId: number): Promise<number> {
  try {
    if (!process.env.POSTGRES_URL) return 0;
    const result = await db
      .select({ count: count() })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.programId, programId),
          ne(enrollments.status, 'cancelled')
        )
      );
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error(`Error fetching enrollment count for program ${programId}:`, error);
    return 0;
  }
}

export async function createProgram(data: {
  name: string;
  code: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  capacity: number;
  startDate?: Date | null;
  endDate?: Date | null;
}): Promise<Program> {
  const [created] = await db
    .insert(programs)
    .values({
      name: data.name,
      code: data.code.trim().toUpperCase(),
      description: data.description || null,
      status: data.status || 'draft',
      capacity: data.capacity,
      startDate: data.startDate || null,
      endDate: data.endDate || null
    })
    .returning();
  return created;
}

export async function updateProgramStatus(
  id: number,
  status: 'draft' | 'active' | 'archived'
): Promise<Program | null> {
  const [updated] = await db
    .update(programs)
    .set({ status })
    .where(eq(programs.id, id))
    .returning();
  return updated || null;
}

/**
 * Returns all programs with active enrollment counts and remaining capacity.
 * Uses a single LEFT JOIN + COUNT query — no N+1.
 */
export async function getProgramsWithCounts(): Promise<
  (Program & { enrollmentCount: number; remainingCapacity: number })[]
> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    try {
      const rows = await db
        .select({
          id: programs.id,
          name: programs.name,
          code: programs.code,
          description: programs.description,
          status: programs.status,
          capacity: programs.capacity,
          collegeId: programs.collegeId,
          startDate: programs.startDate,
          endDate: programs.endDate,
          createdAt: programs.createdAt,
          enrollmentCount: count(enrollments.id)
        })
        .from(programs)
        .leftJoin(
          enrollments,
          and(
            eq(enrollments.programId, programs.id),
            ne(enrollments.status, 'cancelled')
          )
        )
        .groupBy(programs.id)
        .orderBy(desc(programs.createdAt));

      return rows.map((row) => ({
        ...row,
        enrollmentCount: row.enrollmentCount,
        remainingCapacity:
          row.capacity > 0 ? Math.max(0, row.capacity - row.enrollmentCount) : 9999
      }));
    } catch (err: any) {
      if (err?.code === '42703') {
        const rows = await db
          .select({
            id: programs.id,
            name: programs.name,
            code: programs.code,
            description: programs.description,
            status: programs.status,
            capacity: programs.capacity,
            startDate: programs.startDate,
            endDate: programs.endDate,
            createdAt: programs.createdAt,
            enrollmentCount: count(enrollments.id)
          })
          .from(programs)
          .leftJoin(
            enrollments,
            and(
              eq(enrollments.programId, programs.id),
              ne(enrollments.status, 'cancelled')
            )
          )
          .groupBy(programs.id)
          .orderBy(desc(programs.createdAt));

        return rows.map((row) => ({
          ...row,
          collegeId: null,
          enrollmentCount: row.enrollmentCount,
          remainingCapacity:
            row.capacity > 0 ? Math.max(0, row.capacity - row.enrollmentCount) : 9999
        }));
      }
      throw err;
    }
  } catch (error) {
    console.error('Error fetching programs with counts:', error);
    return [];
  }
}
