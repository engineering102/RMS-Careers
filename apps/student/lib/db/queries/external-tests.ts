import 'server-only';

import { db, batchCurriculum, batches, contentItems, enrollments, externalAssessmentRecords } from '@rms/db';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { enrollmentGrantsAccess } from '@/lib/db/access-policy';
import { externalTestWindowState, readExternalTestMetadata } from '@/lib/services/external-test';
import type { ExternalTestSummary } from '@/lib/types/external-assessments';

const WINDOW_ORDER: Record<ExternalTestSummary['windowState'], number> = { open: 0, upcoming: 1, closed: 2 };

/**
 * External tests (content_type `external_test`) placed in the batches the student can currently access,
 * with the imported result for each placement. Results are matched by (student, batch, assessment code),
 * case-insensitively, exactly as the admin import stores them. The test link is only returned while the
 * batch window is open.
 */
export async function getStudentExternalTests(studentId: number, now: Date = new Date()): Promise<ExternalTestSummary[]> {
  if (!studentId || !process.env.POSTGRES_URL) return [];

  const enrollmentRows = await db
    .select({ batchId: enrollments.batchId })
    .from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), enrollmentGrantsAccess()));
  const batchIds = Array.from(new Set(enrollmentRows.map((r) => r.batchId).filter((id): id is string => Boolean(id))));
  if (batchIds.length === 0) return [];

  const rows = await db
    .select({
      placementId: batchCurriculum.id,
      contentItemId: contentItems.id,
      batchId: batches.id,
      batchName: batches.name,
      title: contentItems.title,
      description: contentItems.description,
      metadata: contentItems.metadata,
      availableFrom: batchCurriculum.availableFrom,
      dueAt: batchCurriculum.dueAt
    })
    .from(batchCurriculum)
    .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
    .innerJoin(batches, eq(batches.id, batchCurriculum.batchId))
    .where(
      and(
        eq(contentItems.contentType, 'external_test'),
        eq(contentItems.isPublished, true),
        inArray(batchCurriculum.batchId, batchIds)
      )
    )
    .orderBy(batchCurriculum.dueAt, contentItems.title);
  if (rows.length === 0) return [];

  const placementBatchIds = Array.from(new Set(rows.map((r) => r.batchId)));
  const results = await db
    .select({
      batchId: externalAssessmentRecords.batchId,
      codeKey: sql<string>`lower(${externalAssessmentRecords.assessmentCode})`,
      obtainedScore: externalAssessmentRecords.obtainedScore,
      maxScore: externalAssessmentRecords.maxScore,
      importedAt: externalAssessmentRecords.importedAt
    })
    .from(externalAssessmentRecords)
    .where(
      and(
        eq(externalAssessmentRecords.studentId, studentId),
        inArray(externalAssessmentRecords.batchId, placementBatchIds)
      )
    );
  const resultByKey = new Map(results.map((r) => [`${r.batchId}::${r.codeKey}`, r]));

  return rows
    .map((row): ExternalTestSummary => {
      const meta = readExternalTestMetadata(row.metadata);
      const availableFrom = row.availableFrom ? new Date(row.availableFrom) : null;
      const dueAt = row.dueAt ? new Date(row.dueAt) : null;
      const windowState = externalTestWindowState(availableFrom, dueAt, now);
      const result = meta.codeKey ? resultByKey.get(`${row.batchId}::${meta.codeKey}`) : undefined;
      return {
        placementId: row.placementId,
        contentItemId: row.contentItemId,
        batchId: row.batchId,
        batchName: row.batchName,
        title: row.title,
        description: row.description,
        provider: meta.provider,
        url: windowState === 'open' ? meta.url : null,
        durationMinutes: meta.durationMinutes,
        availableFrom,
        dueAt,
        windowState,
        result: result
          ? {
              obtainedScore: result.obtainedScore,
              maxScore: result.maxScore,
              percentage: result.maxScore > 0 ? Math.round((result.obtainedScore / result.maxScore) * 100) : 0,
              importedAt: new Date(result.importedAt)
            }
          : null
      };
    })
    .sort((a, b) => WINDOW_ORDER[a.windowState] - WINDOW_ORDER[b.windowState]);
}
