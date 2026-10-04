import 'server-only';

import { db, programs, type Program } from '@rms/db';
import { eq, desc, and, isNull, sql } from 'drizzle-orm';

/**
 * Public program data shape safe for anonymous serialization.
 * Strips internal administrative metadata.
 */
export interface PublicProgram {
  id: number;
  name: string;
  code: string;
  description: string | null;
  capacity: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}

/**
 * Retrieves all active, public (platform-wide) programs.
 *
 * Invariant:
 * - Only programs with `collegeId IS NULL` are public.
 * - Only programs with `status = 'active'` are public.
 * - Institution-specific programs (collegeId != null) are NEVER exposed.
 */
export async function getPublicPrograms(): Promise<PublicProgram[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    try {
      const rows = await db
        .select({
          id: programs.id,
          name: programs.name,
          code: programs.code,
          description: programs.description,
          capacity: programs.capacity,
          startDate: programs.startDate,
          endDate: programs.endDate,
          createdAt: programs.createdAt
        })
        .from(programs)
        .where(
          and(
            eq(programs.status, 'active'),
            isNull(programs.collegeId)
          )
        )
        .orderBy(desc(programs.createdAt));

      return rows;
    } catch (err: any) {
      // Graceful fallback for unmigrated environments where college_id does not exist yet
      if (err?.code === '42703') {
        const rows = await db
          .select({
            id: programs.id,
            name: programs.name,
            code: programs.code,
            description: programs.description,
            capacity: programs.capacity,
            startDate: programs.startDate,
            endDate: programs.endDate,
            createdAt: programs.createdAt
          })
          .from(programs)
          .where(eq(programs.status, 'active'))
          .orderBy(desc(programs.createdAt));

        return rows;
      }
      throw err;
    }
  } catch (error) {
    console.error('Error fetching public programs:', error);
    return [];
  }
}

/**
 * Retrieves an active, public program by code.
 *
 * Invariant:
 * - Returns null if the program does not exist.
 * - Returns null if the program is in draft/archived status.
 * - Returns null if the program is bound to an institution (collegeId IS NOT NULL).
 */
export async function getPublicProgramByCode(code: string): Promise<PublicProgram | null> {
  try {
    if (!process.env.POSTGRES_URL || !code) return null;
    const cleanCode = code.trim().toLowerCase();

    try {
      const results = await db
        .select({
          id: programs.id,
          name: programs.name,
          code: programs.code,
          description: programs.description,
          capacity: programs.capacity,
          startDate: programs.startDate,
          endDate: programs.endDate,
          createdAt: programs.createdAt
        })
        .from(programs)
        .where(
          and(
            sql`LOWER(${programs.code}) = ${cleanCode}`,
            eq(programs.status, 'active'),
            isNull(programs.collegeId)
          )
        )
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
            capacity: programs.capacity,
            startDate: programs.startDate,
            endDate: programs.endDate,
            createdAt: programs.createdAt
          })
          .from(programs)
          .where(
            and(
              sql`LOWER(${programs.code}) = ${cleanCode}`,
              eq(programs.status, 'active')
            )
          )
          .limit(1);

        return results[0] || null;
      }
      throw err;
    }
  } catch (error) {
    console.error(`Error fetching public program by code ${code}:`, error);
    return null;
  }
}
