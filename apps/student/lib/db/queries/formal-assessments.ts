import 'server-only';

import { db, quizzes, quizQuestions, quizAttempts, contentItems, batchCurriculum } from '@rms/db';
import { dbTx, type AnyDbClient } from '@rms/db/tx';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { hasBatchAccess } from './entitlements';
import { awardActivityXp } from '@/lib/services/xp-ledger';
import type {
  FormalAssessmentRepository,
  FormalAttemptRecord,
  FormalQuizPlacement
} from '@/lib/services/formal-assessment';
import type { ExplanationPolicy } from '@/lib/types/assessments';

const attemptColumns = {
  id: quizAttempts.id,
  quizId: quizAttempts.quizId,
  studentId: quizAttempts.studentId,
  batchId: quizAttempts.batchId,
  startedAt: quizAttempts.startedAt,
  submittedAt: quizAttempts.submittedAt
};

function toAttempt(row: FormalAttemptRecord | undefined): FormalAttemptRecord | null {
  if (!row) return null;
  return {
    ...row,
    startedAt: new Date(row.startedAt),
    submittedAt: row.submittedAt ? new Date(row.submittedAt) : null
  };
}

/** Drizzle implementation of the formal assessment repository (see lib/services/formal-assessment.ts). */
export function createFormalAssessmentRepository(client: AnyDbClient = db): FormalAssessmentRepository {
  const c = client as typeof db;

  const repo: FormalAssessmentRepository = {
    async findOwnedAttempt(attemptId, studentId) {
      const [row] = await c
        .select(attemptColumns)
        .from(quizAttempts)
        .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, studentId)))
        .limit(1);
      return toAttempt(row);
    },

    async findAttemptForQuiz(quizId, studentId) {
      const [row] = await c
        .select(attemptColumns)
        .from(quizAttempts)
        .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, studentId)))
        .orderBy(quizAttempts.startedAt)
        .limit(1);
      return toAttempt(row);
    },

    hasBatchAccess(studentId, batchId) {
      return hasBatchAccess(studentId, batchId, c);
    },

    async findFormalPlacement(quizOrContentId, batchId) {
      const [row] = await c
        .select({
          quizId: quizzes.id,
          contentItemId: contentItems.id,
          batchId: batchCurriculum.batchId,
          timeLimitMinutes: quizzes.timeLimitMinutes,
          passingScorePercent: quizzes.passingScorePercent,
          showExplanations: quizzes.showExplanations,
          availableFrom: batchCurriculum.availableFrom,
          dueAt: batchCurriculum.dueAt
        })
        .from(batchCurriculum)
        .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
        .innerJoin(quizzes, eq(quizzes.contentItemId, contentItems.id))
        .where(
          and(
            or(eq(quizzes.id, quizOrContentId), eq(contentItems.id, quizOrContentId)),
            eq(batchCurriculum.batchId, batchId),
            eq(quizzes.quizType, 'formal'),
            eq(contentItems.contentType, 'quiz'),
            eq(contentItems.isPublished, true)
          )
        )
        .limit(1);
      if (!row) return null;
      const placement: FormalQuizPlacement = {
        ...row,
        showExplanations: row.showExplanations as ExplanationPolicy,
        availableFrom: row.availableFrom ? new Date(row.availableFrom) : null,
        dueAt: row.dueAt ? new Date(row.dueAt) : null
      };
      return placement;
    },

    async getQuestions(quizId) {
      return c
        .select({
          id: quizQuestions.id,
          questionText: quizQuestions.questionText,
          questionType: quizQuestions.questionType,
          correctOptionIds: quizQuestions.correctOptionIds,
          explanationText: quizQuestions.explanationText,
          points: quizQuestions.points
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId))
        .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);
    },

    async createAttempt({ quizId, studentId, batchId, maxScore, startedAt }) {
      const [row] = await c
        .insert(quizAttempts)
        .values({
          quizId,
          studentId,
          batchId,
          score: 0,
          maxScore,
          isPassed: false,
          responses: {},
          tabBlurCount: 0,
          startedAt,
          submittedAt: null
        })
        .returning({ id: quizAttempts.id });
      return row;
    },

    async finalizeAttempt(input) {
      // Compare-and-set: only an attempt that is still unsubmitted is finalised.
      const rows = await c
        .update(quizAttempts)
        .set({
          score: input.score,
          maxScore: input.maxScore,
          isPassed: input.isPassed,
          responses: input.responses,
          tabBlurCount: input.tabBlurCount,
          submittedAt: input.submittedAt
        })
        .where(
          and(
            eq(quizAttempts.id, input.attemptId),
            eq(quizAttempts.studentId, input.studentId),
            isNull(quizAttempts.submittedAt)
          )
        )
        .returning({ id: quizAttempts.id });
      return rows.length === 1;
    },

    async awardQuizXp({ studentId, batchId, quizId, xp, now }) {
      const result = await awardActivityXp(
        { studentId, batchId, activityType: 'quiz_completed', referenceId: quizId, xp, now },
        client
      );
      return { xpAwarded: result.xpAwarded };
    },

    async withStartLock(quizId, studentId, fn) {
      // Transaction-scoped advisory lock: two concurrent starts for the same (quiz, student) run one
      // after the other, so the second sees the first's attempt instead of creating a duplicate.
      return dbTx.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`formal-attempt:${quizId}:${studentId}`}, 0))`);
        return fn(createFormalAssessmentRepository(tx));
      });
    }
  };

  return repo;
}
