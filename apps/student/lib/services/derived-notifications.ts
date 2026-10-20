import 'server-only';

import {
  db,
  notifications,
  assignmentSubmissions,
  assignments,
  contentItems,
  batchCurriculum,
  batches,
  studentStats
} from '@rms/db';
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import type { DomainEvent } from '@/lib/types/notifications';
import { inAppNotificationConsumer } from '@/lib/events/dispatcher';
import { getBatchProgressSummary } from '@/lib/db/queries/progress';
import { getTodayDateIst } from '@/lib/services/activity-reward';

/**
 * Derived notifications are facts already recorded elsewhere (a tutor review written by the admin portal,
 * a quiz deadline in the batch curriculum, a streak in student_stats) that the student portal turns into
 * in-app notifications on its own, so no other surface has to know about the notifications table.
 *
 * Each notification's `actionUrl` doubles as its dedupe key: it is unique per review, per quiz deadline and
 * per streak day, so re-running the sync never inserts the same notification twice.
 */

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;
export const REVIEW_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
export const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Must cover every lookback above so an already-sent notification is always seen. */
export const DEDUPE_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

const DERIVED_TYPES = ['PROJECT_REVIEWED', 'ASSESSMENT_DUE_SOON', 'STREAK_MILESTONE'] as const;

export interface ReviewedSubmissionFact {
  submissionId: string;
  batchId: string;
  contentItemId: string;
  assignmentTitle: string;
  status: 'approved' | 'resubmission_requested';
  score: number | null;
  tutorFeedback: string | null;
  reviewedAt: Date;
}

export interface DueQuizFact {
  batchId: string;
  batchName: string;
  contentItemId: string;
  quizTitle: string;
  dueAt: Date;
}

export interface DerivedNotificationInput {
  studentId: number;
  userId: string;
  reviewedSubmissions: ReviewedSubmissionFact[];
  /** Quizzes due inside the window that the student has not completed yet. */
  dueQuizzes: DueQuizFact[];
  streak: { currentStreak: number; lastActivityDateIst: string | null } | null;
  todayIst: string;
  /** actionUrls of derived notifications the student already has. */
  existingActionUrls: Set<string>;
}

export function reviewActionUrl(fact: Pick<ReviewedSubmissionFact, 'contentItemId' | 'batchId' | 'reviewedAt'>): string {
  return `/content/${encodeURIComponent(fact.contentItemId)}?batchId=${encodeURIComponent(fact.batchId)}&review=${fact.reviewedAt.getTime()}`;
}

export function dueQuizActionUrl(fact: Pick<DueQuizFact, 'contentItemId' | 'batchId'>): string {
  return `/assessments?batchId=${encodeURIComponent(fact.batchId)}&quiz=${encodeURIComponent(fact.contentItemId)}`;
}

export function streakActionUrl(todayIst: string): string {
  return `/overview?streakDay=${todayIst}`;
}

/**
 * Pure planner: which derived notifications are due and not yet sent. Kept free of I/O so it is unit tested.
 */
export function planDerivedNotifications(input: DerivedNotificationInput): DomainEvent[] {
  const events: DomainEvent[] = [];
  const seen = new Set(input.existingActionUrls);
  const push = (event: DomainEvent & { actionUrl: string }) => {
    if (seen.has(event.actionUrl)) return;
    seen.add(event.actionUrl);
    events.push(event);
  };

  for (const review of input.reviewedSubmissions) {
    push({
      type: 'PROJECT_REVIEWED',
      studentId: input.studentId,
      userId: input.userId,
      assignmentTitle: review.assignmentTitle,
      status: review.status,
      score: review.score ?? undefined,
      tutorFeedback: review.tutorFeedback ?? undefined,
      actionUrl: reviewActionUrl(review)
    });
  }

  for (const quiz of input.dueQuizzes) {
    push({
      type: 'ASSESSMENT_DUE_SOON',
      studentId: input.studentId,
      userId: input.userId,
      quizTitle: quiz.quizTitle,
      dueAt: quiz.dueAt,
      actionUrl: dueQuizActionUrl(quiz)
    });
  }

  const streak = input.streak;
  if (
    streak &&
    streak.lastActivityDateIst === input.todayIst &&
    (STREAK_MILESTONES as readonly number[]).includes(streak.currentStreak)
  ) {
    push({
      type: 'STREAK_MILESTONE',
      studentId: input.studentId,
      userId: input.userId,
      streakCount: streak.currentStreak,
      actionUrl: streakActionUrl(input.todayIst)
    });
  }

  return events;
}

/**
 * Loads the facts, plans the missing notifications and persists them through the in-app consumer.
 * In-app only: these are surfaced when the student opens the portal, so an email at that moment adds nothing.
 * Best-effort; callers should not let a failure here break the page.
 */
export async function syncDerivedNotifications(params: {
  studentId: number;
  userId: string;
  batchIds: string[];
  now?: Date;
}): Promise<number> {
  const { studentId, userId, batchIds } = params;
  if (!studentId || !userId || !process.env.POSTGRES_URL) return 0;

  const now = params.now ?? new Date();

  const [reviewRows, dueRows, [statsRow], existingRows] = await Promise.all([
    db
      .select({
        submissionId: assignmentSubmissions.id,
        batchId: assignmentSubmissions.batchId,
        contentItemId: assignments.contentItemId,
        assignmentTitle: contentItems.title,
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.score,
        tutorFeedback: assignmentSubmissions.tutorFeedback,
        reviewedAt: assignmentSubmissions.reviewedAt
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .innerJoin(contentItems, eq(contentItems.id, assignments.contentItemId))
      .where(
        and(
          eq(assignmentSubmissions.studentId, studentId),
          inArray(assignmentSubmissions.status, ['approved', 'resubmission_requested']),
          isNotNull(assignmentSubmissions.reviewedAt),
          gte(assignmentSubmissions.reviewedAt, new Date(now.getTime() - REVIEW_LOOKBACK_MS))
        )
      ),

    batchIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            batchId: batchCurriculum.batchId,
            batchName: batches.name,
            contentItemId: batchCurriculum.contentItemId,
            quizTitle: contentItems.title,
            dueAt: batchCurriculum.dueAt
          })
          .from(batchCurriculum)
          .innerJoin(batches, eq(batches.id, batchCurriculum.batchId))
          .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
          .where(
            and(
              inArray(batchCurriculum.batchId, batchIds),
              eq(contentItems.contentType, 'quiz'),
              isNotNull(batchCurriculum.dueAt),
              gte(batchCurriculum.dueAt, now),
              lte(batchCurriculum.dueAt, new Date(now.getTime() + DUE_SOON_WINDOW_MS))
            )
          ),

    db
      .select({
        currentStreak: studentStats.currentStreak,
        lastActivityDateIst: studentStats.lastActivityDateIst
      })
      .from(studentStats)
      .where(eq(studentStats.studentId, studentId))
      .limit(1),

    db
      .select({ actionUrl: notifications.actionUrl })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.type, [...DERIVED_TYPES]),
          gte(notifications.createdAt, new Date(now.getTime() - DEDUPE_LOOKBACK_MS))
        )
      )
  ]);

  const existingActionUrls = new Set(
    existingRows.map((r) => r.actionUrl).filter((url): url is string => Boolean(url))
  );

  // Only pay for the workspace completion check when a due quiz has not been notified yet.
  const pendingDue = dueRows.filter(
    (row) => row.dueAt && !existingActionUrls.has(dueQuizActionUrl(row))
  );
  let dueQuizzes: DueQuizFact[] = [];
  if (pendingDue.length > 0) {
    const dueBatchIds = Array.from(new Set(pendingDue.map((r) => r.batchId)));
    const summaries = await Promise.all(
      dueBatchIds.map((id) => getBatchProgressSummary(studentId, id).catch(() => null))
    );
    const completed = new Set<string>();
    summaries.forEach((summary, index) => {
      if (!summary) return;
      for (const [contentItemId, record] of Object.entries(summary.itemsMap)) {
        if (record.status === 'completed') completed.add(`${dueBatchIds[index]}:${contentItemId}`);
      }
    });
    dueQuizzes = pendingDue
      .filter((r) => !completed.has(`${r.batchId}:${r.contentItemId}`))
      .map((r) => ({
        batchId: r.batchId,
        batchName: r.batchName,
        contentItemId: r.contentItemId,
        quizTitle: r.quizTitle,
        dueAt: r.dueAt as Date
      }));
  }

  const events = planDerivedNotifications({
    studentId,
    userId,
    reviewedSubmissions: reviewRows.map((r) => ({
      submissionId: r.submissionId,
      batchId: r.batchId,
      contentItemId: r.contentItemId,
      assignmentTitle: r.assignmentTitle,
      status: r.status as ReviewedSubmissionFact['status'],
      score: r.score,
      tutorFeedback: r.tutorFeedback,
      reviewedAt: new Date(r.reviewedAt as Date)
    })),
    dueQuizzes,
    streak: statsRow ?? null,
    todayIst: getTodayDateIst(now),
    existingActionUrls
  });

  for (const event of events) {
    await inAppNotificationConsumer.handle(event);
  }

  return events.length;
}
