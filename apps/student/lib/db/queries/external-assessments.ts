import 'server-only';

import {
  db,
  externalAssessmentRecords,
  batches,
  enrollments
} from '@rms/db';
import { eq, and, inArray, desc } from 'drizzle-orm';
import type {
  ExternalAssessmentRecord,
  PerformanceTier
} from '@/lib/types/external-assessments';

/**
 * Derives the standardized performance tier from percentile and percentage metrics.
 * - Elite: >= 90th percentile or >= 90% score
 * - Advanced: >= 75th percentile or >= 75% score
 * - Proficient: >= 60th percentile or >= 60% score
 * - Developing: < 60th percentile / score
 */
export function calculatePerformanceTier(
  percentage: number,
  percentile?: number | null
): PerformanceTier {
  const p = percentile !== null && percentile !== undefined ? percentile : -1;
  if (p >= 90 || percentage >= 90) return 'elite';
  if (p >= 75 || percentage >= 75) return 'advanced';
  if (p >= 60 || percentage >= 60) return 'proficient';
  return 'developing';
}

/**
 * Fetches all external assessment report cards for an authenticated student,
 * strictly enforcing batch enrollment boundaries and student identity isolation.
 */
export async function getStudentExternalAssessments(
  studentId: number
): Promise<ExternalAssessmentRecord[]> {
  // 1. Authorize student enrollment: fetch active or confirmed batch memberships
  const studentEnrollments = await db
    .select({
      batchId: enrollments.batchId,
      batchName: batches.name
    })
    .from(enrollments)
    .innerJoin(batches, eq(batches.id, enrollments.batchId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        inArray(enrollments.status, ['active', 'confirmed'])
      )
    );

  if (studentEnrollments.length === 0) {
    return [];
  }

  const validEnrollments = studentEnrollments.filter(
    (e): e is { batchId: string; batchName: string } => Boolean(e.batchId)
  );

  if (validEnrollments.length === 0) {
    return [];
  }

  const enrolledBatchIds = validEnrollments.map((e) => e.batchId);
  const batchNameMap = new Map<string, string>(
    validEnrollments.map((e) => [e.batchId, e.batchName])
  );

  // 2. Query external assessment records matching the student ID and enrolled batches
  const rows = await db
    .select({
      id: externalAssessmentRecords.id,
      assessmentCode: externalAssessmentRecords.assessmentCode,
      assessmentName: externalAssessmentRecords.assessmentName,
      provider: externalAssessmentRecords.provider,
      batchId: externalAssessmentRecords.batchId,
      maxScore: externalAssessmentRecords.maxScore,
      obtainedScore: externalAssessmentRecords.obtainedScore,
      percentile: externalAssessmentRecords.percentile,
      importedAt: externalAssessmentRecords.importedAt
    })
    .from(externalAssessmentRecords)
    .where(
      and(
        eq(externalAssessmentRecords.studentId, studentId),
        inArray(externalAssessmentRecords.batchId, enrolledBatchIds)
      )
    )
    .orderBy(
      desc(externalAssessmentRecords.importedAt),
      desc(externalAssessmentRecords.id)
    );

  // 3. Map into presentation records with calculated percentage and performance tier
  return rows.map((row) => {
    const percentage =
      row.maxScore > 0
        ? Math.round((row.obtainedScore / row.maxScore) * 100)
        : 0;

    return {
      id: row.id,
      assessmentCode: row.assessmentCode,
      assessmentName: row.assessmentName,
      provider: row.provider,
      batchId: row.batchId,
      batchName: batchNameMap.get(row.batchId) || 'Enrolled Batch',
      maxScore: row.maxScore,
      obtainedScore: row.obtainedScore,
      percentage,
      percentile: row.percentile ?? null,
      importedAt: new Date(row.importedAt),
      performanceTier: calculatePerformanceTier(percentage, row.percentile)
    };
  });
}
