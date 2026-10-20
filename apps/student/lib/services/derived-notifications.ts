import 'server-only';

import {
  db,
  notifications,
  assignmentSubmissions,
  assignments,
  contentItems,
  batchCurriculum,
  batches,
  programs,
  studentStats
} from '@rms/db';
import { and, eq, gte, inArray, isNotNull, isNull, lte, notInArray, or, sql } from 'drizzle-orm';
import type { DomainEvent } from '@/lib/types/notifications';
import { inAppNotificationConsumer } from '@/lib/events/dispatcher';
import { getBatchProgressSummary } from '@/lib/db/queries/progress';
import { getTodayDateIst } from '@/lib/services/activity-reward';
import { curriculumItemHref, withQueryParams } from '@/lib/content/content-href';

/**
 * Derived notifications are facts already recorded elsewhere that the student portal turns into in-app
 * notifications itself, so the admin portal never has to know about the notifications table:
 * - a tutor review (assignment_submissions.reviewed_at)                      → PROJECT_REVIEWED
 * - a quiz/project/external test due soon (batch_curriculum.due_at)          → ASSESSMENT_DUE_SOON
 * - content added to the student's batch or program (batch_curriculum /
 *   content_items, visible from created_at / available_from)                 → CONTENT_PUBLISHED
 * - a streak milestone reached today (student_stats)                         → STREAK_MILESTONE
 *
 * Dedupe: reviews, deadlines and streaks use their `actionUrl` as the key (unique per review, per due date,
 * per streak day). Content uses a per-batch/program watermark (`scope` + `at` in the actionUrl): only items
 * that became visible after the last content notification for that scope are new, so several items added at
 * once are grouped into one notification and nothing is announced twice.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;
export const REVIEW_LOOKBACK_MS = 14 * DAY_MS;
export const DUE_SOON_WINDOW_MS = 2 * DAY_MS;
export const CONTENT_LOOKBACK_MS = 7 * DAY_MS;
/** Must cover every lookback/window above so an already-sent notification is always seen. */
export const DEDUPE_LOOKBACK_MS = 30 * DAY_MS;
/** Above this many new items in one batch/program, send one grouped notification instead of one each. */
export const CONTENT_GROUP_THRESHOLD = 3;

/** Curriculum items that count as assessments for deadline alerts. */
export const DUE_ALERT_CONTENT_TYPES = ['quiz', 'project', 'external_test'] as const;

const DERIVED_TYPES = ['PROJECT_REVIEWED', 'ASSESSMENT_DUE_SOON', 'STREAK_MILESTONE', 'CONTENT_PUBLISHED'] as const;

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

export interface DueItemFact {
  batchId: string;
  contentItemId: string;
  contentType: string;
  slug: string | null;
  title: string;
  dueAt: Date;
}

export interface PublishedContentFact {
  /** `batch:<uuid>` or `program:<id>`. */
  scope: string;
  scopeName: string;
  contentItemId: string;
  contentType: string;
  slug: string | null;
  title: string;
  /** When the item became visible to the student. */
  visibleAt: Date;
  /** Set for batch curriculum items. */
  batchId?: string;
}

export interface ExistingDerivedNotification {
  type: string;
  actionUrl: string | null;
}

export interface DerivedNotificationInput {
  studentId: number;
  userId: string;
  now: Date;
  reviewedSubmissions: ReviewedSubmissionFact[];
  /** Items due inside the window that the student has not completed yet. */
  dueItems: DueItemFact[];
  publishedContent: PublishedContentFact[];
  streak: { currentStreak: number; lastActivityDateIst: string | null } | null;
  todayIst: string;
  existing: ExistingDerivedNotification[];
}

export function reviewActionUrl(fact: Pick<ReviewedSubmissionFact, 'contentItemId' | 'batchId' | 'reviewedAt'>): string {
  return `/content/${encodeURIComponent(fact.contentItemId)}?batchId=${encodeURIComponent(fact.batchId)}&review=${fact.reviewedAt.getTime()}`;
}

/** Unique per item and due date, so a moved deadline is announced again. */
export function dueItemActionUrl(fact: DueItemFact): string {
  return withQueryParams(curriculumItemHref(fact), {
    item: fact.contentItemId,
    due: String(fact.dueAt.getTime())
  });
}

export function streakActionUrl(todayIst: string): string {
  return `/overview?streakDay=${todayIst}`;
}

export function batchScope(batchId: string): string {
  return `batch:${batchId}`;
}

export function programScope(programId: number): string {
  return `program:${programId}`;
}

function contentItemLink(fact: PublishedContentFact): string {
  return fact.batchId
    ? curriculumItemHref({ ...fact, batchId: fact.batchId })
    : `/content/${encodeURIComponent(fact.contentItemId)}`;
}

function contentScopeLink(fact: PublishedContentFact): string {
  return fact.batchId ? `/batches/${encodeURIComponent(fact.batchId)}` : '/library';
}

export function contentActionUrl(href: string, scope: string, at: Date): string {
  return withQueryParams(href, { scope, at: String(at.getTime()) });
}

/** Latest `at` already announced per content scope, read back from existing CONTENT_PUBLISHED actionUrls. */
export function contentWatermarks(existing: ExistingDerivedNotification[]): Map<string, number> {
  const watermarks = new Map<string, number>();
  for (const n of existing) {
    if (n.type !== 'CONTENT_PUBLISHED' || !n.actionUrl) continue;
    const queryStart = n.actionUrl.indexOf('?');
    if (queryStart === -1) continue;
    const hashStart = n.actionUrl.indexOf('#', queryStart);
    const params = new URLSearchParams(n.actionUrl.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart));
    const scope = params.get('scope');
    const at = Number(params.get('at'));
    if (!scope || !Number.isFinite(at)) continue;
    watermarks.set(scope, Math.max(watermarks.get(scope) ?? 0, at));
  }
  return watermarks;
}

/**
 * Pure planner: which derived notifications are due and not yet sent. Kept free of I/O so it is unit tested.
 */
export function planDerivedNotifications(input: DerivedNotificationInput): DomainEvent[] {
  const events: DomainEvent[] = [];
  const seen = new Set(input.existing.map((n) => n.actionUrl).filter((url): url is string => Boolean(url)));
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

  for (const item of input.dueItems) {
    push({
      type: 'ASSESSMENT_DUE_SOON',
      studentId: input.studentId,
      userId: input.userId,
      quizTitle: item.title,
      contentType: item.contentType,
      dueAt: item.dueAt,
      actionUrl: dueItemActionUrl(item)
    });
  }

  // Content: group what is new since each scope's watermark (never older than the lookback).
  const watermarks = contentWatermarks(input.existing);
  const floor = input.now.getTime() - CONTENT_LOOKBACK_MS;
  const byScope = new Map<string, PublishedContentFact[]>();
  const seenItems = new Set<string>();
  for (const fact of input.publishedContent) {
    const visible = fact.visibleAt.getTime();
    const since = Math.max(floor, watermarks.get(fact.scope) ?? 0);
    if (visible <= since || visible > input.now.getTime()) continue;
    const key = `${fact.scope}:${fact.contentItemId}`;
    if (seenItems.has(key)) continue;
    seenItems.add(key);
    byScope.set(fact.scope, [...(byScope.get(fact.scope) ?? []), fact]);
  }
  for (const [scope, facts] of byScope) {
    const newest = [...facts].sort((a, b) => b.visibleAt.getTime() - a.visibleAt.getTime())[0];
    const grouped = facts.length > CONTENT_GROUP_THRESHOLD;
    const targets = grouped ? [newest] : facts;
    for (const fact of targets) {
      push({
        type: 'CONTENT_PUBLISHED',
        studentId: input.studentId,
        userId: input.userId,
        scopeName: fact.scopeName,
        itemCount: grouped ? facts.length : 1,
        itemTitle: fact.title,
        contentType: grouped ? undefined : fact.contentType,
        // The same `at` for every notification of this run keeps the watermark exact.
        actionUrl: contentActionUrl(
          grouped ? contentScopeLink(fact) : withQueryParams(contentItemLink(fact), { item: fact.contentItemId }),
          scope,
          input.now
        )
      });
    }
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
 * In-app only: these surface when the student opens the portal, so an email at that moment adds nothing.
 * Best-effort; callers should not let a failure here break the page.
 */
export async function syncDerivedNotifications(params: {
  studentId: number;
  userId: string;
  batchIds: string[];
  programs?: { programId: number; programName: string }[];
  now?: Date;
}): Promise<number> {
  const { studentId, userId, batchIds } = params;
  if (!studentId || !userId || !process.env.POSTGRES_URL) return 0;

  const now = params.now ?? new Date();
  const contentSince = new Date(now.getTime() - CONTENT_LOOKBACK_MS);
  const programList = Array.from(
    new Map((params.programs ?? []).map((p) => [p.programId, p])).values()
  );
  const programIds = programList.map((p) => p.programId);

  // When a curriculum item became visible: when it was placed, or its available_from if that is later.
  const curriculumVisibleAt = sql<Date>`greatest(${batchCurriculum.createdAt}, coalesce(${batchCurriculum.availableFrom}, ${batchCurriculum.createdAt}))`;

  const [reviewRows, dueRows, curriculumRows, libraryRows, [statsRow], existing] = await Promise.all([
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
            contentItemId: batchCurriculum.contentItemId,
            contentType: contentItems.contentType,
            slug: contentItems.slug,
            title: contentItems.title,
            dueAt: batchCurriculum.dueAt
          })
          .from(batchCurriculum)
          .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
          .where(
            and(
              inArray(batchCurriculum.batchId, batchIds),
              inArray(contentItems.contentType, [...DUE_ALERT_CONTENT_TYPES]),
              eq(contentItems.isPublished, true),
              or(isNull(batchCurriculum.availableFrom), lte(batchCurriculum.availableFrom, now)),
              isNotNull(batchCurriculum.dueAt),
              gte(batchCurriculum.dueAt, now),
              lte(batchCurriculum.dueAt, new Date(now.getTime() + DUE_SOON_WINDOW_MS))
            )
          ),

    batchIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            batchId: batchCurriculum.batchId,
            batchName: batches.name,
            contentItemId: batchCurriculum.contentItemId,
            contentType: contentItems.contentType,
            slug: contentItems.slug,
            title: contentItems.title,
            visibleAt: curriculumVisibleAt
          })
          .from(batchCurriculum)
          .innerJoin(batches, eq(batches.id, batchCurriculum.batchId))
          .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
          .where(
            and(
              inArray(batchCurriculum.batchId, batchIds),
              eq(contentItems.isPublished, true),
              gte(curriculumVisibleAt, contentSince),
              lte(curriculumVisibleAt, now)
            )
          ),

    programIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            programId: contentItems.programId,
            programName: programs.name,
            contentItemId: contentItems.id,
            contentType: contentItems.contentType,
            slug: contentItems.slug,
            title: contentItems.title,
            visibleAt: contentItems.createdAt
          })
          .from(contentItems)
          .innerJoin(programs, eq(programs.id, contentItems.programId))
          .where(
            and(
              inArray(contentItems.programId, programIds),
              eq(contentItems.isPublished, true),
              gte(contentItems.createdAt, contentSince),
              lte(contentItems.createdAt, now),
              // Items placed in one of the student's batches are announced for that batch instead.
              batchIds.length === 0
                ? undefined
                : notInArray(
                    contentItems.id,
                    db
                      .select({ id: batchCurriculum.contentItemId })
                      .from(batchCurriculum)
                      .where(inArray(batchCurriculum.batchId, batchIds))
                  )
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
      .select({ type: notifications.type, actionUrl: notifications.actionUrl })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.type, [...DERIVED_TYPES]),
          gte(notifications.createdAt, new Date(now.getTime() - DEDUPE_LOOKBACK_MS))
        )
      )
  ]);

  const existingUrls = new Set(existing.map((r) => r.actionUrl).filter(Boolean));

  const dueFacts: DueItemFact[] = dueRows
    .filter((r) => r.dueAt)
    .map((r) => ({
      batchId: r.batchId,
      contentItemId: r.contentItemId,
      contentType: r.contentType,
      slug: r.slug,
      title: r.title,
      dueAt: new Date(r.dueAt as Date)
    }));

  // Only pay for the workspace completion check when a due item has not been announced yet.
  const pendingDue = dueFacts.filter((f) => !existingUrls.has(dueItemActionUrl(f)));
  let dueItems: DueItemFact[] = [];
  if (pendingDue.length > 0) {
    const dueBatchIds = Array.from(new Set(pendingDue.map((f) => f.batchId)));
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
    dueItems = pendingDue.filter((f) => !completed.has(`${f.batchId}:${f.contentItemId}`));
  }

  const publishedContent: PublishedContentFact[] = [
    ...curriculumRows.map((r) => ({
      scope: batchScope(r.batchId),
      scopeName: r.batchName,
      batchId: r.batchId,
      contentItemId: r.contentItemId,
      contentType: r.contentType,
      slug: r.slug,
      title: r.title,
      visibleAt: new Date(r.visibleAt)
    })),
    ...libraryRows
      .filter((r) => r.programId !== null)
      .map((r) => ({
        scope: programScope(r.programId as number),
        scopeName: r.programName,
        contentItemId: r.contentItemId,
        contentType: r.contentType,
        slug: r.slug,
        title: r.title,
        visibleAt: new Date(r.visibleAt)
      }))
  ];

  const events = planDerivedNotifications({
    studentId,
    userId,
    now,
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
    dueItems,
    publishedContent,
    streak: statsRow ?? null,
    todayIst: getTodayDateIst(now),
    existing
  });

  for (const event of events) {
    await inAppNotificationConsumer.handle(event);
  }

  return events.length;
}
