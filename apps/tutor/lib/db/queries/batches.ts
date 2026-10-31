import 'server-only';

import { db, batches, colleges, enrollments, programs } from '@rms/db';
import { asc, eq, sql } from 'drizzle-orm';
import { inScope, type AcademicScope } from '@rms/academic/scope';

export interface AssignedBatchSummary {
  batchId: string;
  batchName: string;
  status: string;
  programName: string;
  programCode: string;
  collegeName: string;
  /** Students with portal access to the batch (active or confirmed enrollment). */
  activeStudents: number;
}

/** The tutor's batches with their program, college and active student count; one query. */
export async function getAssignedBatchSummaries(scope: AcademicScope): Promise<AssignedBatchSummary[]> {
  if (!process.env.POSTGRES_URL) return [];
  const rows = await db
    .select({
      batchId: batches.id,
      batchName: batches.name,
      status: batches.status,
      programName: programs.name,
      programCode: programs.code,
      collegeName: colleges.name,
      activeStudents: sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.batchId} = ${batches.id} and ${enrollments.status} in ('active', 'confirmed'))`
    })
    .from(batches)
    .innerJoin(programs, eq(programs.id, batches.programId))
    .innerJoin(colleges, eq(colleges.id, batches.collegeId))
    .where(inScope(batches.id, scope))
    .orderBy(asc(colleges.name), asc(batches.name));
  return rows.map((r) => ({ ...r, activeStudents: Number(r.activeStudents) }));
}
