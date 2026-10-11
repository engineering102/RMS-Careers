import { and, inArray, sql, type SQL } from 'drizzle-orm';
import { batches, colleges, enrollments, programs, students } from '@rms/db';

/**
 * Student access lifecycle policy (audit F-05). Single source of truth for "does this enrollment
 * grant access right now?", applied on every request by the entitlement guard, the batch checks used
 * by Server Actions, and the resource queries. Because it is evaluated per request against current
 * rows, deactivation takes effect on the student's next request without touching their session.
 *
 * An enrollment grants access when ALL hold:
 *  - enrollment.status is active or confirmed (completed too, where read-only history is allowed);
 *  - its program is not archived;
 *  - the student's college is not deactivated;
 *  - if it is batch-bound: the batch is active or completed (not draft/archived), the batch's college
 *    is active and the batch's program is not archived.
 *
 * Deliberately NOT decided here (needs a product decision, see the remediation report):
 *  - whether a `completed` batch becomes read-only for writes;
 *  - whether a `draft` program blocks access (students are enrolled into draft programs today).
 */
export const ACCESS_GRANTING_ENROLLMENT_STATUSES = ['active', 'confirmed'] as const;
export const ACCESS_GRANTING_BATCH_STATUSES = ['active', 'completed'] as const;

export function enrollmentGrantsAccess(options: { includeCompleted?: boolean } = {}): SQL {
  const statuses = options.includeCompleted
    ? [...ACCESS_GRANTING_ENROLLMENT_STATUSES, 'completed' as const]
    : [...ACCESS_GRANTING_ENROLLMENT_STATUSES];
  const batchStatuses = sql.join(
    ACCESS_GRANTING_BATCH_STATUSES.map((s) => sql`${s}`),
    sql`, `
  );

  return and(
    inArray(enrollments.status, statuses),
    sql`NOT EXISTS (SELECT 1 FROM ${programs} ep WHERE ep.id = ${enrollments.programId} AND ep.status = 'archived')`,
    sql`NOT EXISTS (SELECT 1 FROM ${students} es JOIN ${colleges} ec ON ec.id = es.college_id WHERE es.id = ${enrollments.studentId} AND ec.is_active = false)`,
    sql`(${enrollments.batchId} IS NULL OR EXISTS (
      SELECT 1 FROM ${batches} eb
      JOIN ${colleges} ebc ON ebc.id = eb.college_id
      JOIN ${programs} ebp ON ebp.id = eb.program_id
      WHERE eb.id = ${enrollments.batchId}
        AND eb.status IN (${batchStatuses})
        AND ebc.is_active = true
        AND ebp.status <> 'archived'))`
  )!;
}
