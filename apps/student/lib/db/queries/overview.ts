import 'server-only';

import {
  db,
  studentStats,
  batchCurriculum,
  contentItems,
  batches,
  quizzes,
  quizAttempts,
  assignments,
  assignmentSubmissions,
  activities,
  enrollments
} from '@rms/db';
import { eq, and, sql, inArray, isNotNull, gte, lte, asc } from 'drizzle-orm';
import {
  type StudentStatsOverview,
  type DeadlineContentType,
  type StudentDeadlineItem,
  type HeatmapIntensity,
  type HeatmapDay,
  type StudentOverviewData,
  getLast30DaysIst,
  formatIstDateReadable,
  calculateHeatmapIntensity
} from '@/lib/types/overview';

export type {
  StudentStatsOverview,
  DeadlineContentType,
  StudentDeadlineItem,
  HeatmapIntensity,
  HeatmapDay,
  StudentOverviewData
};

export {
  getTodayDateIst,
  getLast30DaysIst,
  formatIstDateReadable,
  calculateHeatmapIntensity
} from '@/lib/types/overview';

const DEFAULT_STATS: StudentStatsOverview = {
  totalXp: 0,
  currentLevel: 1,
  currentStreak: 0,
  longestStreak: 0,
  dsaSolvedCount: 0,
  lastActivityDateIst: null
};

/**
 * Derives the complete Overview Dashboard dataset for an authenticated student.
 * Guarantees zero leakage of inaccessible batches or other students' records.
 *
 * @param studentId The authenticated student's database ID (students.id).
 * @param activeBatchIds Optional list of active batch UUIDs already verified from entitlement context.
 */
export async function getStudentOverview(
  studentId: number,
  activeBatchIds?: string[]
): Promise<StudentOverviewData> {
  const thirtyDayWindow = getLast30DaysIst();
  const startDate = thirtyDayWindow[0];
  const endDate = thirtyDayWindow[thirtyDayWindow.length - 1];

  const defaultHeatmapDays: HeatmapDay[] = thirtyDayWindow.map((date) => ({
    date,
    formattedDate: formatIstDateReadable(date),
    count: 0,
    xp: 0,
    intensity: 0
  }));

  if (!studentId || !process.env.POSTGRES_URL) {
    return {
      stats: DEFAULT_STATS,
      deadlines: [],
      heatmap: {
        days: defaultHeatmapDays,
        totalActiveDays: 0,
        totalPeriodXp: 0,
        startDate,
        endDate
      }
    };
  }

  try {
    // 1. Fetch Student Stats
    const [statsRecord] = await db
      .select({
        totalXp: studentStats.totalXp,
        currentLevel: studentStats.currentLevel,
        currentStreak: studentStats.currentStreak,
        longestStreak: studentStats.longestStreak,
        dsaSolvedCount: studentStats.dsaSolvedCount,
        lastActivityDateIst: studentStats.lastActivityDateIst
      })
      .from(studentStats)
      .where(eq(studentStats.studentId, studentId))
      .limit(1);

    const stats: StudentStatsOverview = statsRecord
      ? {
          totalXp: statsRecord.totalXp ?? 0,
          currentLevel: statsRecord.currentLevel ?? 1,
          currentStreak: statsRecord.currentStreak ?? 0,
          longestStreak: statsRecord.longestStreak ?? 0,
          dsaSolvedCount: statsRecord.dsaSolvedCount ?? 0,
          lastActivityDateIst: statsRecord.lastActivityDateIst ?? null
        }
      : DEFAULT_STATS;

    // 2. Resolve accessible batch IDs if not provided
    let batchIds = activeBatchIds;
    if (!batchIds) {
      const enrollmentRows = await db
        .select({ batchId: enrollments.batchId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            sql`${enrollments.status} IN ('active', 'confirmed')`
          )
        );

      batchIds = enrollmentRows
        .map((r) => r.batchId)
        .filter((id): id is string => Boolean(id));
    }

    // 3. Fetch Upcoming Deadlines across accessible batches
    let deadlines: StudentDeadlineItem[] = [];
    if (batchIds.length > 0) {
      const now = new Date();

      const rawDeadlines = await db
        .select({
          id: batchCurriculum.id,
          batchId: batchCurriculum.batchId,
          batchName: batches.name,
          contentItemId: batchCurriculum.contentItemId,
          title: contentItems.title,
          contentType: contentItems.contentType,
          weekNumber: batchCurriculum.weekNumber,
          dueAt: batchCurriculum.dueAt
        })
        .from(batchCurriculum)
        .innerJoin(batches, eq(batches.id, batchCurriculum.batchId))
        .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
        .where(
          and(
            inArray(batchCurriculum.batchId, batchIds),
            isNotNull(batchCurriculum.dueAt),
            gte(batchCurriculum.dueAt, now)
          )
        )
        .orderBy(asc(batchCurriculum.dueAt))
        .limit(10);

      if (rawDeadlines.length > 0) {
        // Query completed quizzes and projects to flag completion status
        const completedQuizIds = new Set<string>();
        const completedAssignmentIds = new Set<string>();

        const passedQuizzes = await db
          .select({ contentItemId: quizzes.contentItemId })
          .from(quizAttempts)
          .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
          .where(
            and(
              eq(quizAttempts.studentId, studentId),
              eq(quizAttempts.isPassed, true)
            )
          );

        passedQuizzes.forEach((pq) => {
          if (pq.contentItemId) completedQuizIds.add(pq.contentItemId);
        });

        const submittedProjects = await db
          .select({ contentItemId: assignments.contentItemId })
          .from(assignmentSubmissions)
          .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
          .where(eq(assignmentSubmissions.studentId, studentId));

        submittedProjects.forEach((sp) => {
          if (sp.contentItemId) completedAssignmentIds.add(sp.contentItemId);
        });

        deadlines = rawDeadlines.map((item) => {
          let isCompleted = false;
          if (item.contentType === 'quiz') {
            isCompleted = completedQuizIds.has(item.contentItemId);
          } else if (item.contentType === 'project') {
            isCompleted = completedAssignmentIds.has(item.contentItemId);
          }

          return {
            id: item.id,
            batchId: item.batchId,
            batchName: item.batchName || 'Cohort Batch',
            contentItemId: item.contentItemId,
            title: item.title,
            contentType: item.contentType as DeadlineContentType,
            weekNumber: item.weekNumber,
            dueAt: item.dueAt as Date,
            isCompleted
          };
        });
      }
    }

    // 4. Fetch 30-Day Activity History
    const activityRows = await db
      .select({
        activityDateIst: activities.activityDateIst,
        count: sql<number>`count(*)::int`,
        totalXp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`
      })
      .from(activities)
      .where(
        and(
          eq(activities.studentId, studentId),
          gte(activities.activityDateIst, startDate),
          lte(activities.activityDateIst, endDate)
        )
      )
      .groupBy(activities.activityDateIst);

    const activityMap = new Map<string, { count: number; totalXp: number }>();
    for (const row of activityRows) {
      activityMap.set(row.activityDateIst, {
        count: Number(row.count) || 0,
        totalXp: Number(row.totalXp) || 0
      });
    }

    let totalActiveDays = 0;
    let totalPeriodXp = 0;

    const days: HeatmapDay[] = thirtyDayWindow.map((dateStr) => {
      const act = activityMap.get(dateStr) ?? { count: 0, totalXp: 0 };
      if (act.count > 0) {
        totalActiveDays++;
      }
      totalPeriodXp += act.totalXp;

      return {
        date: dateStr,
        formattedDate: formatIstDateReadable(dateStr),
        count: act.count,
        xp: act.totalXp,
        intensity: calculateHeatmapIntensity(act.totalXp, act.count)
      };
    });

    return {
      stats,
      deadlines,
      heatmap: {
        days,
        totalActiveDays,
        totalPeriodXp,
        startDate,
        endDate
      }
    };
  } catch (error) {
    console.error('[Overview] Error fetching student overview data:', error);
    return {
      stats: DEFAULT_STATS,
      deadlines: [],
      heatmap: {
        days: defaultHeatmapDays,
        totalActiveDays: 0,
        totalPeriodXp: 0,
        startDate,
        endDate
      }
    };
  }
}
