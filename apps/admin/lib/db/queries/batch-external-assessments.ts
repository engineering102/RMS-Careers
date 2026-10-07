import 'server-only';

import {
  db,
  batches,
  students,
  enrollments,
  externalAssessmentRecords,
  users,
  type DbClient
} from '@rms/db';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';

export interface BatchExternalAssessmentItem {
  assessmentCode: string;
  assessmentName: string;
  provider: string;
  maxScore: number;
  recordsCount: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  latestImportedAt: Date;
}

export interface BatchExternalAssessmentStats {
  enrolledStudentsCount: number;
  participatedStudentsCount: number;
  participationRatePercent: number;
  totalAssessmentsCount: number;
  totalRecordsCount: number;
  overallAveragePercentage: number | null;
}

export interface BatchExternalAssessmentRecordItem {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  collegeRollNumber: string | null;
  batchId: string;
  assessmentCode: string;
  assessmentName: string;
  provider: string;
  maxScore: number;
  obtainedScore: number;
  percentage: number;
  percentile: number | null;
  performanceTier: 'elite' | 'advanced' | 'proficient' | 'developing';
  importedByUserId: string | null;
  importedByUserName?: string | null;
  importedAt: Date;
}

export interface ExternalAssessmentFilters {
  assessmentCode?: string;
  provider?: string;
  search?: string;
}

export interface PersistExternalAssessmentInput {
  batchId: string;
  userId?: string;
  duplicateStrategy: 'update' | 'skip';
  rows: Array<{
    studentId: number;
    assessmentCode: string;
    assessmentName: string;
    provider: string;
    maxScore: number;
    obtainedScore: number;
    percentile?: number | null;
  }>;
}

/**
 * Standard performance tier calculation consistent across RMS Careers platforms.
 */
export function calculatePerformanceTier(
  percentage: number,
  percentile?: number | null
): 'elite' | 'advanced' | 'proficient' | 'developing' {
  const p = percentile !== null && percentile !== undefined ? percentile : -1;
  if (p >= 90 || percentage >= 90) return 'elite';
  if (p >= 75 || percentage >= 75) return 'advanced';
  if (p >= 60 || percentage >= 60) return 'proficient';
  return 'developing';
}

/**
 * Retrieves aggregated external assessment metrics for a batch.
 * Strict batch-isolation: all counts and stats are scoped strictly to the target batchId.
 */
export async function getBatchExternalAssessmentsOverview(
  batchId: string,
  client: DbClient = db
): Promise<{
  assessments: BatchExternalAssessmentItem[];
  stats: BatchExternalAssessmentStats;
}> {
  try {
    if (!process.env.POSTGRES_URL) {
      return {
        assessments: [],
        stats: {
          enrolledStudentsCount: 0,
          participatedStudentsCount: 0,
          participationRatePercent: 0,
          totalAssessmentsCount: 0,
          totalRecordsCount: 0,
          overallAveragePercentage: null
        }
      };
    }

    // 1. Verify batch exists
    const [batch] = await client
      .select({ id: batches.id })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batch) {
      return {
        assessments: [],
        stats: {
          enrolledStudentsCount: 0,
          participatedStudentsCount: 0,
          participationRatePercent: 0,
          totalAssessmentsCount: 0,
          totalRecordsCount: 0,
          overallAveragePercentage: null
        }
      };
    }

    // 2. Count enrolled eligible students in batch
    const [enrolledCountRow] = await client
      .select({
        count: sql<number>`count(distinct ${enrollments.studentId})::int`
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.batchId, batchId),
          sql`${enrollments.status} IN ('active', 'confirmed', 'completed')`
        )
      );

    const enrolledStudentsCount = enrolledCountRow?.count || 0;

    // 3. Fetch all external assessment records scoped to this batch
    const records = await client
      .select({
        id: externalAssessmentRecords.id,
        studentId: externalAssessmentRecords.studentId,
        assessmentCode: externalAssessmentRecords.assessmentCode,
        assessmentName: externalAssessmentRecords.assessmentName,
        provider: externalAssessmentRecords.provider,
        maxScore: externalAssessmentRecords.maxScore,
        obtainedScore: externalAssessmentRecords.obtainedScore,
        importedAt: externalAssessmentRecords.importedAt
      })
      .from(externalAssessmentRecords)
      .where(eq(externalAssessmentRecords.batchId, batchId));

    if (records.length === 0) {
      return {
        assessments: [],
        stats: {
          enrolledStudentsCount,
          participatedStudentsCount: 0,
          participationRatePercent: 0,
          totalAssessmentsCount: 0,
          totalRecordsCount: 0,
          overallAveragePercentage: null
        }
      };
    }

    // 4. Group by assessmentCode
    const groups = new Map<
      string,
      {
        assessmentCode: string;
        assessmentName: string;
        provider: string;
        maxScore: number;
        records: typeof records;
      }
    >();

    const participatedStudentIds = new Set<number>();
    let totalScoreSum = 0;
    let totalMaxScoreSum = 0;

    for (const r of records) {
      participatedStudentIds.add(r.studentId);
      totalScoreSum += r.obtainedScore;
      totalMaxScoreSum += r.maxScore;

      const existing = groups.get(r.assessmentCode) || {
        assessmentCode: r.assessmentCode,
        assessmentName: r.assessmentName,
        provider: r.provider,
        maxScore: r.maxScore,
        records: []
      };

      existing.records.push(r);
      groups.set(r.assessmentCode, existing);
    }

    const assessments: BatchExternalAssessmentItem[] = Array.from(groups.values()).map(
      (g) => {
        const count = g.records.length;
        const sumScore = g.records.reduce((acc, curr) => acc + curr.obtainedScore, 0);
        const maxScoreVal = g.maxScore || 100;
        const highestScore = Math.max(...g.records.map((x) => x.obtainedScore));
        const avgScore = count > 0 ? Math.round((sumScore / count) * 10) / 10 : 0;
        const avgPercentage =
          maxScoreVal > 0 ? Math.round((avgScore / maxScoreVal) * 100) : 0;

        const latestImportedAt = new Date(
          Math.max(...g.records.map((x) => new Date(x.importedAt).getTime()))
        );

        return {
          assessmentCode: g.assessmentCode,
          assessmentName: g.assessmentName,
          provider: g.provider,
          maxScore: maxScoreVal,
          recordsCount: count,
          averageScore: avgScore,
          averagePercentage: avgPercentage,
          highestScore,
          latestImportedAt
        };
      }
    );

    const participatedStudentsCount = participatedStudentIds.size;
    const participationRatePercent =
      enrolledStudentsCount > 0
        ? Math.round((participatedStudentsCount / enrolledStudentsCount) * 100)
        : 0;

    const overallAveragePercentage =
      totalMaxScoreSum > 0
        ? Math.round((totalScoreSum / totalMaxScoreSum) * 100)
        : null;

    return {
      assessments,
      stats: {
        enrolledStudentsCount,
        participatedStudentsCount,
        participationRatePercent,
        totalAssessmentsCount: assessments.length,
        totalRecordsCount: records.length,
        overallAveragePercentage
      }
    };
  } catch (error) {
    console.error('Error fetching batch external assessments overview:', error);
    return {
      assessments: [],
      stats: {
        enrolledStudentsCount: 0,
        participatedStudentsCount: 0,
        participationRatePercent: 0,
        totalAssessmentsCount: 0,
        totalRecordsCount: 0,
        overallAveragePercentage: null
      }
    };
  }
}

/**
 * Retrieves external assessment records matching batch and operational filters.
 * Strict batch-isolation: only records matching batchId are returned.
 */
export async function getBatchExternalAssessmentRecords(
  batchId: string,
  filters: ExternalAssessmentFilters = {},
  client: DbClient = db
): Promise<BatchExternalAssessmentRecordItem[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    const conditions = [eq(externalAssessmentRecords.batchId, batchId)];

    if (filters.assessmentCode && filters.assessmentCode !== 'all') {
      conditions.push(eq(externalAssessmentRecords.assessmentCode, filters.assessmentCode));
    }

    if (filters.provider && filters.provider !== 'all') {
      conditions.push(eq(externalAssessmentRecords.provider, filters.provider));
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(students.fullName, term),
          ilike(students.email, term),
          ilike(students.collegeRollNumber, term),
          ilike(externalAssessmentRecords.assessmentName, term),
          ilike(externalAssessmentRecords.assessmentCode, term),
          ilike(externalAssessmentRecords.provider, term)
        )!
      );
    }

    const rows = await client
      .select({
        id: externalAssessmentRecords.id,
        studentId: externalAssessmentRecords.studentId,
        studentName: students.fullName,
        studentEmail: students.email,
        collegeRollNumber: students.collegeRollNumber,
        batchId: externalAssessmentRecords.batchId,
        assessmentCode: externalAssessmentRecords.assessmentCode,
        assessmentName: externalAssessmentRecords.assessmentName,
        provider: externalAssessmentRecords.provider,
        maxScore: externalAssessmentRecords.maxScore,
        obtainedScore: externalAssessmentRecords.obtainedScore,
        percentile: externalAssessmentRecords.percentile,
        importedByUserId: externalAssessmentRecords.importedByUserId,
        importedAt: externalAssessmentRecords.importedAt,
        importedUserName: users.name
      })
      .from(externalAssessmentRecords)
      .innerJoin(students, eq(students.id, externalAssessmentRecords.studentId))
      .leftJoin(users, eq(users.id, externalAssessmentRecords.importedByUserId))
      .where(and(...conditions))
      .orderBy(
        desc(externalAssessmentRecords.importedAt),
        desc(externalAssessmentRecords.id)
      );

    return rows.map((r) => {
      const percentage =
        r.maxScore > 0 ? Math.round((r.obtainedScore / r.maxScore) * 100) : 0;
      const performanceTier = calculatePerformanceTier(percentage, r.percentile);

      return {
        id: r.id,
        studentId: r.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        collegeRollNumber: r.collegeRollNumber,
        batchId: r.batchId,
        assessmentCode: r.assessmentCode,
        assessmentName: r.assessmentName,
        provider: r.provider,
        maxScore: r.maxScore,
        obtainedScore: r.obtainedScore,
        percentage,
        percentile: r.percentile,
        performanceTier,
        importedByUserId: r.importedByUserId,
        importedByUserName: r.importedUserName || null,
        importedAt: new Date(r.importedAt)
      };
    });
  } catch (error) {
    console.error('Error fetching batch external assessment records:', error);
    return [];
  }
}

/**
 * Persists validated external assessment records into the database for a batch.
 * Handles existing duplicates deterministically according to duplicateStrategy ('update' | 'skip').
 * Scoped strictly to the selected batchId.
 */
export async function persistExternalAssessmentImport(
  input: PersistExternalAssessmentInput,
  client: DbClient = db
): Promise<{
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  message?: string;
  error?: string;
}> {
  try {
    if (!process.env.POSTGRES_URL) {
      return {
        success: false,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: 'Database connection unavailable.'
      };
    }

    const { batchId, userId, duplicateStrategy, rows } = input;

    // 1. Verify batch exists
    const [batch] = await client
      .select({ id: batches.id })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batch) {
      return {
        success: false,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: 'Batch not found.'
      };
    }

    if (rows.length === 0) {
      return {
        success: true,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        message: 'No records to import.'
      };
    }

    // 2. Fetch all existing records in this batch to identify duplicates deterministically
    const existing = await client
      .select({
        id: externalAssessmentRecords.id,
        studentId: externalAssessmentRecords.studentId,
        assessmentCode: externalAssessmentRecords.assessmentCode
      })
      .from(externalAssessmentRecords)
      .where(eq(externalAssessmentRecords.batchId, batchId));

    const existingMap = new Map<string, number>();
    existing.forEach((e) => {
      existingMap.set(`${e.studentId}::${e.assessmentCode.toLowerCase()}`, e.id);
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const now = new Date();

    for (const r of rows) {
      const key = `${r.studentId}::${r.assessmentCode.toLowerCase()}`;
      const existingId = existingMap.get(key);

      if (existingId !== undefined) {
        if (duplicateStrategy === 'update') {
          await client
            .update(externalAssessmentRecords)
            .set({
              obtainedScore: r.obtainedScore,
              maxScore: r.maxScore,
              percentile: r.percentile || null,
              provider: r.provider,
              assessmentName: r.assessmentName,
              importedByUserId: userId || null,
              importedAt: now
            })
            .where(eq(externalAssessmentRecords.id, existingId));

          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        await client.insert(externalAssessmentRecords).values({
          studentId: r.studentId,
          batchId,
          assessmentCode: r.assessmentCode,
          assessmentName: r.assessmentName,
          provider: r.provider,
          maxScore: r.maxScore,
          obtainedScore: r.obtainedScore,
          percentile: r.percentile || null,
          importedByUserId: userId || null,
          importedAt: now
        });

        // Add to map so duplicates later in same list don't violate unique constraint
        existingMap.set(key, 999999);
        insertedCount++;
      }
    }

    return {
      success: true,
      insertedCount,
      updatedCount,
      skippedCount,
      message: `Import complete: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped.`
    };
  } catch (error: any) {
    console.error('Error persisting external assessment import:', error);
    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error: error?.message || 'Failed to persist external assessment records.'
    };
  }
}

/**
 * Deletes an external assessment record with strict batch isolation.
 */
export async function deleteExternalAssessmentRecord(
  batchId: string,
  recordId: number,
  client: DbClient = db
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.POSTGRES_URL) {
      return { success: false, error: 'Database connection unavailable.' };
    }

    // Verify record strictly belongs to batch
    const [record] = await client
      .select({ id: externalAssessmentRecords.id })
      .from(externalAssessmentRecords)
      .where(
        and(
          eq(externalAssessmentRecords.id, recordId),
          eq(externalAssessmentRecords.batchId, batchId)
        )
      )
      .limit(1);

    if (!record) {
      return {
        success: false,
        error: 'Record not found or does not belong to this batch.'
      };
    }

    await client
      .delete(externalAssessmentRecords)
      .where(eq(externalAssessmentRecords.id, recordId));

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting external assessment record:', error);
    return {
      success: false,
      error: error?.message || 'Failed to delete record.'
    };
  }
}
