import 'server-only';

import {
  db,
  activities,
  studentStats,
  batches
} from '@rms/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import type {
  ActivityType,
  LearningActivityRecord,
  StudentStreakDetails,
  ActivityLedgerData
} from '@/lib/types/activity';
import { getTodayDateIst, getYesterdayDateIst } from '@/lib/services/activity-reward';

/**
 * Derives a human-friendly label for learning activities based on their modality.
 */
function deriveActivityTitle(activityType: ActivityType, referenceId: string): string {
  switch (activityType) {
    case 'dsa_solved':
      return `Problem Solved: ${referenceId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;
    case 'lecture_completed':
      return 'Curriculum Lecture Completed';
    case 'quiz_completed':
      return 'Knowledge Check Passed';
    case 'assignment_approved':
      return 'Project Deliverable Approved';
    case 'external_assessment':
      return `External Benchmark Ingested: ${referenceId}`;
    default:
      return 'Learning Activity Completed';
  }
}

/**
 * Fetches the student's current Asia/Kolkata streak status and risk indicators.
 */
export async function getStudentStreakDetails(
  studentId: number
): Promise<StudentStreakDetails> {
  const todayIst = getTodayDateIst();
  const yesterdayIst = getYesterdayDateIst(todayIst);

  const [statsRecord] = await db
    .select({
      totalXp: studentStats.totalXp,
      currentLevel: studentStats.currentLevel,
      currentStreak: studentStats.currentStreak,
      longestStreak: studentStats.longestStreak,
      lastActivityDateIst: studentStats.lastActivityDateIst
    })
    .from(studentStats)
    .where(eq(studentStats.studentId, studentId))
    .limit(1);

  if (!statsRecord) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDateIst: null,
      isActiveToday: false,
      isAtRisk: false,
      totalXp: 0,
      currentLevel: 1
    };
  }

  const lastActivity = statsRecord.lastActivityDateIst;
  const isActiveToday = lastActivity === todayIst;
  // At risk if active yesterday but haven't recorded activity yet today
  const isAtRisk = !isActiveToday && lastActivity === yesterdayIst && statsRecord.currentStreak > 0;

  return {
    currentStreak: statsRecord.currentStreak,
    longestStreak: statsRecord.longestStreak,
    lastActivityDateIst: lastActivity,
    isActiveToday,
    isAtRisk,
    totalXp: statsRecord.totalXp,
    currentLevel: statsRecord.currentLevel
  };
}

/**
 * Fetches the paginated chronological activity ledger for an authenticated student,
 * strictly guaranteeing that only the student's own records are returned.
 */
export async function getStudentActivityLedger(
  studentId: number,
  options?: {
    limit?: number;
    offset?: number;
    activityType?: ActivityType;
  }
): Promise<ActivityLedgerData> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
  const offset = Math.max(0, options?.offset ?? 0);

  const streakDetailsPromise = getStudentStreakDetails(studentId);

  // Build where conditions
  const conditions = [eq(activities.studentId, studentId)];
  if (options?.activityType) {
    conditions.push(eq(activities.activityType, options.activityType));
  }

  const whereClause = and(...conditions);

  // Query activities joined with batches
  const [rows, countResult, xpSumResult, streakDetails] = await Promise.all([
    db
      .select({
        id: activities.id,
        studentId: activities.studentId,
        batchId: activities.batchId,
        batchName: batches.name,
        activityType: activities.activityType,
        referenceId: activities.referenceId,
        xpAwarded: activities.xpAwarded,
        activityDateIst: activities.activityDateIst,
        createdAt: activities.createdAt
      })
      .from(activities)
      .leftJoin(batches, eq(batches.id, activities.batchId))
      .where(whereClause)
      .orderBy(desc(activities.createdAt), desc(activities.id))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities)
      .where(whereClause),

    db
      .select({ totalXp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int` })
      .from(activities)
      .where(whereClause),

    streakDetailsPromise
  ]);

  const activityRecords: LearningActivityRecord[] = rows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    batchId: r.batchId,
    batchName: r.batchName ?? null,
    activityType: r.activityType as ActivityType,
    referenceId: r.referenceId,
    title: deriveActivityTitle(r.activityType as ActivityType, r.referenceId),
    xpAwarded: r.xpAwarded,
    activityDateIst: r.activityDateIst,
    createdAt: new Date(r.createdAt)
  }));

  const totalCount = countResult[0]?.count ?? 0;
  const totalXpEarned = xpSumResult[0]?.totalXp ?? 0;

  return {
    activities: activityRecords,
    totalCount,
    totalXpEarned,
    streakDetails
  };
}
