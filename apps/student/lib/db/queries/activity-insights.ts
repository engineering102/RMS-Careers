import 'server-only';

import { db, activities } from '@rms/db';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { getTodayDateIst } from '@/lib/types/overview';
import type { ActivityType } from '@/lib/types/activity';
import {
  buildActivityInsights,
  insightsWindowStartIst,
  type ActivityInsightsData
} from '@/lib/types/activity-insights';

/**
 * Weekly XP trend and XP mix for the Overview, from one grouped query over the student's own ledger
 * (at most 12 weeks x 5 activity types rows), so its cost does not grow with the student's history.
 */
export async function getStudentActivityInsights(
  studentId: number,
  referenceDate: Date = new Date()
): Promise<ActivityInsightsData> {
  const todayIst = getTodayDateIst(referenceDate);

  if (!studentId || !process.env.POSTGRES_URL) {
    return buildActivityInsights([], todayIst);
  }

  const rows = await db
    .select({
      activityDateIst: activities.activityDateIst,
      activityType: activities.activityType,
      totalXp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`,
      count: sql<number>`count(*)::int`
    })
    .from(activities)
    .where(
      and(
        eq(activities.studentId, studentId),
        gte(activities.activityDateIst, insightsWindowStartIst(todayIst)),
        lte(activities.activityDateIst, todayIst)
      )
    )
    .groupBy(activities.activityDateIst, activities.activityType);

  return buildActivityInsights(
    rows.map((r) => ({
      activityDateIst: r.activityDateIst,
      activityType: r.activityType as ActivityType,
      totalXp: Number(r.totalXp) || 0,
      count: Number(r.count) || 0
    })),
    todayIst
  );
}
