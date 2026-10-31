import 'server-only';

/**
 * Batch roster for tutors (tutor plan §8): who is enrolled, how far along they are, and tutoring signals.
 * Students' contact details beyond name, roll number and email are never selected (T-19: phone, profile links,
 * target companies and preferred language stay private).
 *
 * Query budget (§14): enrollments, curriculum and last activity in parallel, then the completion sources in
 * parallel. No per-student queries.
 */
import { and, asc, eq, inArray, min, sql } from 'drizzle-orm';
import { activities, assignmentSubmissions, batches, enrollments, quizAttempts, students } from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { isBatchInScope, type AcademicScope } from '../scope';
import { computeBatchProgress, loadBatchCurriculum, loadCompletionSources, type CurriculumItem, type StudentBatchProgress } from './progress';
import { computeIndicators, type Indicator } from './indicators';

/** Enrollment statuses that give a student access to the batch, plus finished ones (kept on the roster). */
export const ROSTER_ENROLLMENT_STATUSES = ['active', 'confirmed', 'completed'] as const;

export interface RosterStudent {
  studentId: number;
  fullName: string;
  email: string;
  collegeRollNumber: string | null;
  branch: string | null;
  year: number | null;
  enrolledAt: Date;
  /** Latest thing the student did in this batch (see lastActivity). */
  lastActivityAt: Date | null;
  progress: StudentBatchProgress;
  indicators: Indicator[];
}

export interface BatchRoster {
  batchStatus: string;
  curriculum: CurriculumItem[];
  students: RosterStudent[];
}

async function rosterRows(client: DbClient, batchId: string, studentId?: number) {
  return client
    .select({
      studentId: students.id,
      fullName: students.fullName,
      email: students.email,
      collegeRollNumber: students.collegeRollNumber,
      branch: students.branch,
      year: students.year,
      enrolledAt: min(enrollments.createdAt)
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(
      and(
        eq(enrollments.batchId, batchId),
        inArray(enrollments.status, [...ROSTER_ENROLLMENT_STATUSES]),
        studentId === undefined ? undefined : eq(enrollments.studentId, studentId)
      )
    )
    .groupBy(students.id)
    .orderBy(asc(students.fullName), asc(students.id));
}

/**
 * Latest activity in this batch per student, in one statement: XP activity attributed to the batch, project
 * submissions and quiz attempts (started or submitted) in the batch. Submissions and failed attempts earn no XP, so
 * the activity ledger alone would call a student who just submitted a project inactive.
 */
async function lastActivity(client: DbClient, batchId: string, studentId?: number) {
  const only = <C extends typeof activities.studentId | typeof assignmentSubmissions.studentId | typeof quizAttempts.studentId>(column: C) =>
    studentId === undefined ? undefined : eq(column, studentId);
  const rows = await client
    .select({ studentId: activities.studentId, at: sql<string | Date | null>`max(${activities.createdAt})` })
    .from(activities)
    .where(and(eq(activities.batchId, batchId), only(activities.studentId)))
    .groupBy(activities.studentId)
    .unionAll(
      client
        .select({ studentId: assignmentSubmissions.studentId, at: sql<string | Date | null>`max(${assignmentSubmissions.submittedAt})` })
        .from(assignmentSubmissions)
        .where(and(eq(assignmentSubmissions.batchId, batchId), only(assignmentSubmissions.studentId)))
        .groupBy(assignmentSubmissions.studentId)
    )
    .unionAll(
      client
        .select({ studentId: quizAttempts.studentId, at: sql<string | Date | null>`max(coalesce(${quizAttempts.submittedAt}, ${quizAttempts.startedAt}))` })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.batchId, batchId), only(quizAttempts.studentId)))
        .groupBy(quizAttempts.studentId)
    );
  const latest = new Map<number, Date>();
  for (const r of rows) {
    if (!r.at) continue;
    const at = new Date(r.at);
    const prev = latest.get(r.studentId);
    if (!prev || at > prev) latest.set(r.studentId, at);
  }
  return latest;
}

async function buildRoster(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  studentId: number | undefined,
  now: Date
): Promise<BatchRoster | null> {
  if (!isBatchInScope(scope, batchId)) return null;
  const [batchRows, enrolled, curriculum, activity] = await Promise.all([
    client.select({ status: batches.status }).from(batches).where(eq(batches.id, batchId)).limit(1),
    rosterRows(client, batchId, studentId),
    loadBatchCurriculum(client, scope, batchId),
    lastActivity(client, batchId, studentId)
  ]);
  if (batchRows.length === 0) return null;
  const batchStatus = batchRows[0].status;

  const ids = enrolled.map((s) => s.studentId);
  const sources = await loadCompletionSources(client, scope, batchId, curriculum, ids);
  const progress = computeBatchProgress(curriculum, sources, ids, now);

  return {
    batchStatus,
    curriculum,
    students: enrolled.map((s) => {
      const p = progress.get(s.studentId)!;
      const enrolledAt = s.enrolledAt ? new Date(s.enrolledAt) : now;
      const lastActivityAt = activity.get(s.studentId) ?? null;
      return {
        ...s,
        enrolledAt,
        lastActivityAt,
        progress: p,
        indicators: computeIndicators({
          batchStatus,
          enrolledAt,
          lastActivityAt,
          overdueRequired: p.overdueRequired,
          needsRevision: p.needsRevision,
          now
        })
      };
    })
  };
}

/** The whole roster of a batch, or null when the batch is outside the scope or does not exist. */
export function getBatchRoster(client: DbClient, scope: AcademicScope, batchId: string, now: Date = new Date()) {
  return buildRoster(client, scope, batchId, undefined, now);
}

/**
 * One student's progress in one batch. Null unless the student is (or was) enrolled in that batch: a student of
 * another batch, even one the same tutor teaches, is "not found" here.
 */
export async function getRosterStudent(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  studentId: number,
  now: Date = new Date()
): Promise<(RosterStudent & { batchStatus: string; curriculum: CurriculumItem[] }) | null> {
  const roster = await buildRoster(client, scope, batchId, studentId, now);
  const student = roster?.students[0];
  if (!roster || !student) return null;
  return { ...student, batchStatus: roster.batchStatus, curriculum: roster.curriculum };
}
