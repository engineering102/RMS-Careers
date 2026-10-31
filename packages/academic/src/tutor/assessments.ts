import 'server-only';

/**
 * Assessment participation for tutors (tutor plan §8, D-7): per student, summary numbers only. Questions, options,
 * answer keys and responses are never selected (T-19).
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { batchCurriculum, contentItems, enrollments, quizAttempts, quizzes, students, type QuizTypeEnum } from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { isBatchInScope, type AcademicScope } from '../scope';
import { ROSTER_ENROLLMENT_STATUSES } from './roster';

export interface QuizParticipant {
  studentId: number;
  fullName: string;
  collegeRollNumber: string | null;
  attempts: number;
  /** Best submitted attempt, as a percentage; null with no submitted attempt. */
  bestPercentage: number | null;
  bestScore: number | null;
  maxScore: number | null;
  passed: boolean;
  lastSubmittedAt: Date | null;
  /** Highest tab-switch count over the student's attempts. */
  tabBlurCount: number;
}

export interface QuizParticipation {
  quizId: string;
  title: string;
  quizType: QuizTypeEnum;
  timeLimitMinutes: number | null;
  passingScorePercent: number;
  weekNumber: number;
  dueAt: Date | null;
  participants: QuizParticipant[];
  /** Enrolled students with no attempt in this batch. */
  notAttempted: { studentId: number; fullName: string; collegeRollNumber: string | null }[];
}

/** One quiz of one batch. Null when the batch is outside the scope or the quiz is not in its curriculum. */
export async function getQuizParticipation(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  quizId: string
): Promise<QuizParticipation | null> {
  if (!isBatchInScope(scope, batchId)) return null;

  const [quizRows, enrolled, attemptRows] = await Promise.all([
    client
      .select({
        quizId: quizzes.id,
        title: contentItems.title,
        quizType: quizzes.quizType,
        timeLimitMinutes: quizzes.timeLimitMinutes,
        passingScorePercent: quizzes.passingScorePercent,
        weekNumber: batchCurriculum.weekNumber,
        dueAt: batchCurriculum.dueAt
      })
      .from(quizzes)
      .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
      .innerJoin(batchCurriculum, and(eq(batchCurriculum.contentItemId, quizzes.contentItemId), eq(batchCurriculum.batchId, batchId)))
      .where(eq(quizzes.id, quizId))
      .limit(1),
    client
      .selectDistinct({ studentId: students.id, fullName: students.fullName, collegeRollNumber: students.collegeRollNumber })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(and(eq(enrollments.batchId, batchId), inArray(enrollments.status, [...ROSTER_ENROLLMENT_STATUSES])))
      .orderBy(asc(students.fullName), asc(students.id)),
    client
      .select({
        studentId: quizAttempts.studentId,
        attempts: sql<number>`count(*)::int`,
        best: sql<string | null>`(array_agg(${quizAttempts.score}::text || '/' || ${quizAttempts.maxScore}::text order by
          case when ${quizAttempts.maxScore} > 0 then ${quizAttempts.score}::float / ${quizAttempts.maxScore} else 0 end desc)
          filter (where ${quizAttempts.submittedAt} is not null))[1]`,
        passed: sql<boolean>`coalesce(bool_or(${quizAttempts.isPassed} and ${quizAttempts.submittedAt} is not null), false)`,
        lastSubmittedAt: sql<string | null>`max(${quizAttempts.submittedAt})`,
        tabBlurCount: sql<number>`max(${quizAttempts.tabBlurCount})::int`
      })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.batchId, batchId), eq(quizAttempts.quizId, quizId)))
      .groupBy(quizAttempts.studentId)
  ]);

  const quiz = quizRows[0];
  if (!quiz) return null;

  const byStudent = new Map(attemptRows.map((r) => [r.studentId, r]));
  const participants: QuizParticipant[] = [];
  const notAttempted: QuizParticipation['notAttempted'] = [];
  for (const s of enrolled) {
    const a = byStudent.get(s.studentId);
    if (!a) {
      notAttempted.push(s);
      continue;
    }
    const [score, max] = a.best ? a.best.split('/').map(Number) : [null, null];
    participants.push({
      ...s,
      attempts: Number(a.attempts),
      bestScore: score,
      maxScore: max,
      bestPercentage: score !== null && max ? Math.round((score / max) * 100) : score !== null ? 0 : null,
      passed: Boolean(a.passed),
      lastSubmittedAt: a.lastSubmittedAt ? new Date(a.lastSubmittedAt) : null,
      tabBlurCount: Number(a.tabBlurCount ?? 0)
    });
  }

  return { ...quiz, dueAt: quiz.dueAt ? new Date(quiz.dueAt) : null, participants, notAttempted };
}
