import 'server-only';

/**
 * Batch progress for tutors (tutor plan §5.2, T-17): the student portal's completion rules
 * (apps/student/lib/db/queries/progress.ts, resolveBatchProgressSummary) applied to a whole roster at once.
 * One query per completion source for all students, joined in memory: no per-student queries.
 *
 * Kept in step with the student function by the parity test apps/student/lib/__tests__/progress-parity.int.test.ts.
 * Sources the student portal treats as global to the student (lecture/notes/resource completions, quiz attempts, DSA
 * problems) are global here too, but only for content items placed in this batch's curriculum, so a tutor never sees
 * another batch's items. Project submissions and external results are batch-scoped, as in the student portal.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  activities,
  assignments,
  assignmentSubmissions,
  batchCurriculum,
  contentItems,
  externalAssessmentRecords,
  quizAttempts,
  quizzes,
  studentDsaProgress
} from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { isBatchInScope, type AcademicScope } from '../scope';

export type ItemProgressStatus = 'not_started' | 'in_progress' | 'needs_revision' | 'completed';

export interface CurriculumItem {
  contentItemId: string;
  title: string;
  slug: string;
  contentType: string;
  metadata: unknown;
  weekNumber: number;
  sequenceOrder: number;
  isRequired: boolean;
  availableFrom: Date | null;
  dueAt: Date | null;
}

export interface ItemProgress {
  status: ItemProgressStatus;
  completedAt: Date | null;
  score: number | null;
  maxScore: number | null;
  /** Project items: the submission's review status. */
  submissionStatus?: string;
}

export interface StudentBatchProgress {
  totalRequired: number;
  completedRequired: number;
  /** Same rounding as the student portal's overallPercentage. */
  percentage: number;
  /** Required items past their due date and not completed. */
  overdueRequired: number;
  /** Projects returned to the student for changes. */
  needsRevision: number;
  items: Record<string, ItemProgress>;
}

/** Completion rows for a set of students, as loaded by loadCompletionSources. */
export interface CompletionSources {
  lectures: { studentId: number; referenceId: string; createdAt: Date }[];
  quizAttempts: { studentId: number; contentItemId: string; isPassed: boolean; score: number; maxScore: number; submittedAt: Date | null }[];
  projects: { studentId: number; contentItemId: string; status: string; score: number | null; submittedAt: Date; reviewedAt: Date | null }[];
  dsa: { studentId: number; problemSlug: string; isCompleted: boolean; completedAt: Date | null }[];
  external: { studentId: number; codeKey: string; obtainedScore: number; maxScore: number; importedAt: Date }[];
}

const LECTURE_TYPES = new Set(['lecture', 'notes', 'resource']);

/** DSA sheet items point at one problem: metadata.slug, else the item's own slug (student portal rule). */
export function dsaSlugOf(item: Pick<CurriculumItem, 'metadata' | 'slug'>): string {
  const meta = item.metadata && typeof item.metadata === 'object' ? (item.metadata as Record<string, unknown>) : {};
  return (typeof meta.slug === 'string' ? meta.slug : item.slug) || '';
}

/** External tests match imported results by assessment code, trimmed and case-insensitive (student portal rule). */
export function externalCodeOf(item: Pick<CurriculumItem, 'metadata'>): string {
  const meta = item.metadata && typeof item.metadata === 'object' ? (item.metadata as Record<string, unknown>) : {};
  return typeof meta.assessmentCode === 'string' ? meta.assessmentCode.trim().toLowerCase() : '';
}

/** The published curriculum of one batch in student order. Empty when the batch is outside the scope. */
export async function loadBatchCurriculum(client: DbClient, scope: AcademicScope, batchId: string): Promise<CurriculumItem[]> {
  if (!isBatchInScope(scope, batchId)) return [];
  return client
    .select({
      contentItemId: batchCurriculum.contentItemId,
      title: contentItems.title,
      slug: contentItems.slug,
      contentType: contentItems.contentType,
      metadata: contentItems.metadata,
      weekNumber: batchCurriculum.weekNumber,
      sequenceOrder: batchCurriculum.sequenceOrder,
      isRequired: batchCurriculum.isRequired,
      availableFrom: batchCurriculum.availableFrom,
      dueAt: batchCurriculum.dueAt
    })
    .from(batchCurriculum)
    .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
    .where(and(eq(batchCurriculum.batchId, batchId), eq(contentItems.isPublished, true)))
    .orderBy(asc(batchCurriculum.weekNumber), asc(batchCurriculum.sequenceOrder), asc(batchCurriculum.id));
}

/** Every completion source for the students and curriculum, one query each, in parallel. */
export async function loadCompletionSources(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  curriculum: readonly CurriculumItem[],
  studentIds: readonly number[]
): Promise<CompletionSources> {
  const empty: CompletionSources = { lectures: [], quizAttempts: [], projects: [], dsa: [], external: [] };
  if (!isBatchInScope(scope, batchId) || studentIds.length === 0 || curriculum.length === 0) return empty;

  const ids = [...studentIds];
  const lectureIds = curriculum.filter((i) => LECTURE_TYPES.has(i.contentType)).map((i) => i.contentItemId);
  const quizIds = curriculum.filter((i) => i.contentType === 'quiz').map((i) => i.contentItemId);
  const projectIds = curriculum.filter((i) => i.contentType === 'project').map((i) => i.contentItemId);
  const dsaSlugs = curriculum.filter((i) => i.contentType === 'dsa_sheet').map(dsaSlugOf).filter(Boolean);
  const externalCodes = curriculum.filter((i) => i.contentType === 'external_test').map(externalCodeOf).filter(Boolean);

  const [lectures, attempts, projects, dsa, external] = await Promise.all([
    lectureIds.length
      ? client
          .select({ studentId: activities.studentId, referenceId: activities.referenceId, createdAt: activities.createdAt })
          .from(activities)
          .where(
            and(
              inArray(activities.studentId, ids),
              eq(activities.activityType, 'lecture_completed'),
              inArray(activities.referenceId, lectureIds)
            )
          )
      : [],
    quizIds.length
      ? client
          .select({
            studentId: quizAttempts.studentId,
            contentItemId: quizzes.contentItemId,
            isPassed: quizAttempts.isPassed,
            score: quizAttempts.score,
            maxScore: quizAttempts.maxScore,
            submittedAt: quizAttempts.submittedAt
          })
          .from(quizAttempts)
          .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
          .where(and(inArray(quizAttempts.studentId, ids), inArray(quizzes.contentItemId, quizIds)))
      : [],
    projectIds.length
      ? client
          .select({
            studentId: assignmentSubmissions.studentId,
            contentItemId: assignments.contentItemId,
            status: assignmentSubmissions.status,
            score: assignmentSubmissions.score,
            submittedAt: assignmentSubmissions.submittedAt,
            reviewedAt: assignmentSubmissions.reviewedAt
          })
          .from(assignmentSubmissions)
          .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
          .where(
            and(
              inArray(assignmentSubmissions.studentId, ids),
              eq(assignmentSubmissions.batchId, batchId),
              inArray(assignments.contentItemId, projectIds)
            )
          )
      : [],
    dsaSlugs.length
      ? client
          .select({
            studentId: studentDsaProgress.studentId,
            problemSlug: studentDsaProgress.problemSlug,
            isCompleted: studentDsaProgress.isCompleted,
            completedAt: studentDsaProgress.completedAt
          })
          .from(studentDsaProgress)
          .where(and(inArray(studentDsaProgress.studentId, ids), inArray(studentDsaProgress.problemSlug, dsaSlugs)))
      : [],
    externalCodes.length
      ? client
          .select({
            studentId: externalAssessmentRecords.studentId,
            codeKey: sql<string>`lower(${externalAssessmentRecords.assessmentCode})`,
            obtainedScore: externalAssessmentRecords.obtainedScore,
            maxScore: externalAssessmentRecords.maxScore,
            importedAt: externalAssessmentRecords.importedAt
          })
          .from(externalAssessmentRecords)
          .where(
            and(
              inArray(externalAssessmentRecords.studentId, ids),
              eq(externalAssessmentRecords.batchId, batchId),
              inArray(sql`lower(${externalAssessmentRecords.assessmentCode})`, externalCodes)
            )
          )
      : []
  ]);

  return {
    lectures: lectures as CompletionSources['lectures'],
    quizAttempts: attempts as CompletionSources['quizAttempts'],
    projects: projects as CompletionSources['projects'],
    dsa: dsa.map((d) => ({ ...d, isCompleted: Boolean(d.isCompleted) })) as CompletionSources['dsa'],
    external: external as CompletionSources['external']
  };
}

function groupBy<T extends { studentId: number }>(rows: readonly T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const list = map.get(row.studentId);
    if (list) list.push(row);
    else map.set(row.studentId, [row]);
  }
  return map;
}

/** Pure: the student portal's per-item rules, for each student. Every requested student gets an entry. */
export function computeBatchProgress(
  curriculum: readonly CurriculumItem[],
  sources: CompletionSources,
  studentIds: readonly number[],
  now: Date = new Date()
): Map<number, StudentBatchProgress> {
  const lectures = groupBy(sources.lectures);
  const attempts = groupBy(sources.quizAttempts);
  const projects = groupBy(sources.projects);
  const dsa = groupBy(sources.dsa);
  const external = groupBy(sources.external);
  const result = new Map<number, StudentBatchProgress>();

  for (const studentId of studentIds) {
    const lectureDone = new Map((lectures.get(studentId) ?? []).map((r) => [r.referenceId, r.createdAt]));
    const projectByItem = new Map((projects.get(studentId) ?? []).map((r) => [r.contentItemId, r]));
    const dsaBySlug = new Map((dsa.get(studentId) ?? []).map((r) => [r.problemSlug, r]));
    const externalByCode = new Map((external.get(studentId) ?? []).map((r) => [r.codeKey, r]));
    const quizByItem = new Map<string, { passed: CompletionSources['quizAttempts'][number] | null; first: CompletionSources['quizAttempts'][number] }>();
    for (const a of attempts.get(studentId) ?? []) {
      const entry = quizByItem.get(a.contentItemId);
      if (!entry) quizByItem.set(a.contentItemId, { passed: a.isPassed ? a : null, first: a });
      else if (a.isPassed && !entry.passed) entry.passed = a;
    }

    const items: Record<string, ItemProgress> = {};
    let totalRequired = 0;
    let completedRequired = 0;
    let overdueRequired = 0;
    let needsRevision = 0;

    for (const item of curriculum) {
      let progress: ItemProgress = { status: 'not_started', completedAt: null, score: null, maxScore: null };
      if (LECTURE_TYPES.has(item.contentType)) {
        const at = lectureDone.get(item.contentItemId);
        if (at) progress = { ...progress, status: 'completed', completedAt: at };
      } else if (item.contentType === 'quiz') {
        const q = quizByItem.get(item.contentItemId);
        if (q) {
          const shown = q.passed ?? q.first;
          progress = {
            status: q.passed ? 'completed' : 'in_progress',
            completedAt: q.passed ? q.passed.submittedAt : null,
            score: shown.score,
            maxScore: shown.maxScore
          };
        }
      } else if (item.contentType === 'project') {
        const p = projectByItem.get(item.contentItemId);
        if (p) {
          progress = { ...progress, score: p.score, submissionStatus: p.status };
          if (p.status === 'approved') progress = { ...progress, status: 'completed', completedAt: p.reviewedAt ?? p.submittedAt };
          else if (p.status === 'resubmission_requested') progress = { ...progress, status: 'needs_revision' };
          else if (p.status === 'submitted' || p.status === 'under_review') progress = { ...progress, status: 'in_progress' };
        }
      } else if (item.contentType === 'dsa_sheet') {
        const d = dsaBySlug.get(dsaSlugOf(item));
        if (d?.isCompleted) progress = { ...progress, status: 'completed', completedAt: d.completedAt };
      } else if (item.contentType === 'external_test') {
        const code = externalCodeOf(item);
        const r = code ? externalByCode.get(code) : undefined;
        if (r) progress = { status: 'completed', completedAt: r.importedAt, score: r.obtainedScore, maxScore: r.maxScore };
      }

      items[item.contentItemId] = progress;
      if (progress.status === 'needs_revision') needsRevision++;
      if (item.isRequired ?? true) {
        totalRequired++;
        if (progress.status === 'completed') completedRequired++;
        else if (item.dueAt && item.dueAt.getTime() < now.getTime()) overdueRequired++;
      }
    }

    result.set(studentId, {
      totalRequired,
      completedRequired,
      percentage: totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0,
      overdueRequired,
      needsRevision,
      items
    });
  }
  return result;
}

/** Curriculum plus per-student progress for one batch: two round trips whatever the roster size. */
export async function getBatchProgress(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  studentIds: readonly number[],
  now: Date = new Date()
): Promise<{ curriculum: CurriculumItem[]; progress: Map<number, StudentBatchProgress> }> {
  const curriculum = await loadBatchCurriculum(client, scope, batchId);
  const sources = await loadCompletionSources(client, scope, batchId, curriculum, studentIds);
  return { curriculum, progress: computeBatchProgress(curriculum, sources, studentIds, now) };
}
