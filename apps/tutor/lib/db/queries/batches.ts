import 'server-only';

import { db, batches, colleges, enrollments, programs } from '@rms/db';
import { and, asc, eq, sql } from 'drizzle-orm';
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

/** The tutor's batches (or the one named) with their program, college and active student count; one query. */
export async function getAssignedBatchSummaries(scope: AcademicScope, batchId?: string): Promise<AssignedBatchSummary[]> {
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
    .where(and(inScope(batches.id, scope), batchId === undefined ? undefined : eq(batches.id, batchId)))
    .orderBy(asc(colleges.name), asc(batches.name));
  return rows.map((r) => ({ ...r, activeStudents: Number(r.activeStudents) }));
}

/** One assigned batch, or null when it is not in the scope. */
export async function getAssignedBatch(scope: AcademicScope, batchId: string): Promise<AssignedBatchSummary | null> {
  const [batch] = await getAssignedBatchSummaries(scope, batchId);
  return batch ?? null;
}
