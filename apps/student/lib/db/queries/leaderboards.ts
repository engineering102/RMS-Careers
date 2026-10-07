import 'server-only';

import {
  db,
  students,
  studentStats,
  enrollments,
  batches,
  colleges,
  activities
} from '@rms/db';
import { eq, and, inArray, desc, asc, sql, gte } from 'drizzle-orm';
import type {
  LeaderboardScope,
  LeaderboardTimeframe,
  LeaderboardEntry,
  StudentLeaderboardStanding,
  BatchOption,
  LeaderboardData
} from '@/lib/types/leaderboards';
import { getStartOfWeekIst } from '@/lib/services/activity-reward';

/**
 * Fetches the Batch Cohort Leaderboard (Weekly or All-Time).
 * Strictly guarantees that only students enrolled in the specified cohort can view its leaderboard.
 */
export async function getBatchLeaderboard(
  studentId: number,
  collegeId: string | null | undefined,
  batchId: string,
  timeframe: LeaderboardTimeframe
): Promise<LeaderboardData> {
  // 1. Authorize: Verify authenticated student is enrolled in the target batch
  const [targetBatch] = await db
    .select({
      batchId: batches.id,
      batchName: batches.name
    })
    .from(enrollments)
    .innerJoin(batches, eq(batches.id, enrollments.batchId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.batchId, batchId),
        inArray(enrollments.status, ['active', 'confirmed'])
      )
    )
    .limit(1);

  if (!targetBatch) {
    throw new Error('UnauthorizedBatchEnrollment: You are not enrolled in this batch.');
  }

  const startOfWeekIst = getStartOfWeekIst();

  let rawEntries: Array<{
    studentId: number;
    fullName: string;
    branch: string | null;
    xp: number;
    currentStreak: number;
  }> = [];

  if (timeframe === 'all_time') {
    // All-time batch leaderboard (Top 50) — strictly batch-attributed XP
    rawEntries = await db
      .select({
        studentId: students.id,
        fullName: students.fullName,
        branch: students.branch,
        xp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`,
        currentStreak: sql<number>`coalesce(${studentStats.currentStreak}, 0)::int`
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .leftJoin(studentStats, eq(studentStats.studentId, students.id))
      .leftJoin(
        activities,
        and(
          eq(activities.studentId, students.id),
          eq(activities.batchId, batchId)
        )
      )
      .where(
        and(
          eq(enrollments.batchId, batchId),
          inArray(enrollments.status, ['active', 'confirmed'])
        )
      )
      .groupBy(
        students.id,
        students.fullName,
        students.branch,
        studentStats.currentStreak
      )
      .orderBy(
        desc(sql`coalesce(sum(${activities.xpAwarded}), 0)::int`),
        desc(sql`coalesce(${studentStats.currentStreak}, 0)::int`),
        asc(students.id)
      )
      .limit(50);
  } else {
    // Weekly batch leaderboard (Top 50) — strictly batch-attributed weekly XP
    rawEntries = await db
      .select({
        studentId: students.id,
        fullName: students.fullName,
        branch: students.branch,
        xp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`,
        currentStreak: sql<number>`coalesce(${studentStats.currentStreak}, 0)::int`
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .leftJoin(studentStats, eq(studentStats.studentId, students.id))
      .leftJoin(
        activities,
        and(
          eq(activities.studentId, students.id),
          eq(activities.batchId, batchId),
          gte(activities.activityDateIst, startOfWeekIst)
        )
      )
      .where(
        and(
          eq(enrollments.batchId, batchId),
          inArray(enrollments.status, ['active', 'confirmed'])
        )
      )
      .groupBy(
        students.id,
        students.fullName,
        students.branch,
        studentStats.currentStreak
      )
      .orderBy(
        desc(sql`coalesce(sum(${activities.xpAwarded}), 0)::int`),
        desc(sql`coalesce(${studentStats.currentStreak}, 0)::int`),
        asc(students.id)
      )
      .limit(50);
  }

  // 2. Map entries with 1-indexed ranks and flag current student
  const entries: LeaderboardEntry[] = rawEntries.map((row, idx) => ({
    rank: idx + 1,
    studentId: row.studentId,
    fullName: row.fullName,
    branch: row.branch,
    xp: row.xp,
    currentStreak: row.currentStreak,
    isCurrentUser: row.studentId === studentId
  }));

  // 3. Determine current user standing
  const currentUserIndex = entries.findIndex((e) => e.studentId === studentId);
  let userStanding: StudentLeaderboardStanding;

  if (currentUserIndex !== -1) {
    const userEntry = entries[currentUserIndex];
    userStanding = {
      rank: userEntry.rank,
      xp: userEntry.xp,
      currentStreak: userEntry.currentStreak,
      totalParticipants: entries.length
    };
  } else {
    // Current user outside top 50: fetch batch-attributed individual metrics
    const [userBatchXpRow] = await db
      .select({
        batchXp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`
      })
      .from(activities)
      .where(
        and(
          eq(activities.studentId, studentId),
          eq(activities.batchId, batchId),
          timeframe === 'weekly' ? gte(activities.activityDateIst, startOfWeekIst) : sql`true`
        )
      );

    const [userStreakRow] = await db
      .select({
        currentStreak: studentStats.currentStreak
      })
      .from(studentStats)
      .where(eq(studentStats.studentId, studentId))
      .limit(1);

    userStanding = {
      rank: null,
      xp: userBatchXpRow?.batchXp ?? 0,
      currentStreak: userStreakRow?.currentStreak ?? 0,
      totalParticipants: entries.length
    };
  }

  return {
    scope: 'batch',
    timeframe,
    batchId,
    batchName: targetBatch.batchName,
    entries,
    userStanding,
    weekStartDateIst: timeframe === 'weekly' ? startOfWeekIst : undefined
  };
}

/**
 * Fetches the College-Wide Leaderboard (Weekly or All-Time).
 * Strictly guarantees that students can only view rankings within their own college.
 */
export async function getCollegeLeaderboard(
  studentId: number,
  collegeId: string | null | undefined,
  timeframe: LeaderboardTimeframe
): Promise<LeaderboardData> {
  const startOfWeekIst = getStartOfWeekIst();

  if (!collegeId) {
    return {
      scope: 'college',
      timeframe,
      collegeName: 'RMS Partner College',
      entries: [],
      userStanding: {
        rank: null,
        xp: 0,
        currentStreak: 0,
        totalParticipants: 0
      },
      weekStartDateIst: timeframe === 'weekly' ? startOfWeekIst : undefined
    };
  }

  // 1. Fetch college details
  const [collegeRow] = await db
    .select({ name: colleges.name })
    .from(colleges)
    .where(eq(colleges.id, collegeId))
    .limit(1);

  let rawEntries: Array<{
    studentId: number;
    fullName: string;
    branch: string | null;
    xp: number;
    currentStreak: number;
  }> = [];

  if (timeframe === 'all_time') {
    // All-time college leaderboard (Top 100 accelerated by college_leaderboard_idx)
    rawEntries = await db
      .select({
        studentId: students.id,
        fullName: students.fullName,
        branch: students.branch,
        xp: studentStats.totalXp,
        currentStreak: studentStats.currentStreak
      })
      .from(studentStats)
      .innerJoin(students, eq(students.id, studentStats.studentId))
      .where(eq(studentStats.collegeId, collegeId))
      .orderBy(
        desc(studentStats.totalXp),
        desc(studentStats.currentStreak),
        asc(students.id)
      )
      .limit(100);
  } else {
    // Weekly college leaderboard (Top 100)
    rawEntries = await db
      .select({
        studentId: students.id,
        fullName: students.fullName,
        branch: students.branch,
        xp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`,
        currentStreak: sql<number>`coalesce(${studentStats.currentStreak}, 0)::int`
      })
      .from(students)
      .leftJoin(studentStats, eq(studentStats.studentId, students.id))
      .leftJoin(
        activities,
        and(
          eq(activities.studentId, students.id),
          gte(activities.activityDateIst, startOfWeekIst)
        )
      )
      .where(eq(students.collegeId, collegeId))
      .groupBy(
        students.id,
        students.fullName,
        students.branch,
        studentStats.currentStreak
      )
      .orderBy(
        desc(sql`coalesce(sum(${activities.xpAwarded}), 0)::int`),
        desc(sql`coalesce(${studentStats.currentStreak}, 0)::int`),
        asc(students.id)
      )
      .limit(100);
  }

  // 2. Map entries with 1-indexed ranks and flag current student
  const entries: LeaderboardEntry[] = rawEntries.map((row, idx) => ({
    rank: idx + 1,
    studentId: row.studentId,
    fullName: row.fullName,
    branch: row.branch,
    xp: row.xp,
    currentStreak: row.currentStreak,
    isCurrentUser: row.studentId === studentId
  }));

  // 3. Determine current user standing
  const currentUserIndex = entries.findIndex((e) => e.studentId === studentId);
  let userStanding: StudentLeaderboardStanding;

  if (currentUserIndex !== -1) {
    const userEntry = entries[currentUserIndex];
    userStanding = {
      rank: userEntry.rank,
      xp: userEntry.xp,
      currentStreak: userEntry.currentStreak,
      totalParticipants: entries.length
    };
  } else {
    // Current user outside top 100
    const [userStats] = await db
      .select({
        totalXp: studentStats.totalXp,
        currentStreak: studentStats.currentStreak
      })
      .from(studentStats)
      .where(eq(studentStats.studentId, studentId))
      .limit(1);

    userStanding = {
      rank: null,
      xp: userStats?.totalXp ?? 0,
      currentStreak: userStats?.currentStreak ?? 0,
      totalParticipants: entries.length
    };
  }

  return {
    scope: 'college',
    timeframe,
    collegeName: collegeRow?.name || 'RMS Partner College',
    entries,
    userStanding,
    weekStartDateIst: timeframe === 'weekly' ? startOfWeekIst : undefined
  };
}

/**
 * Unified server query coordinating leaderboard resolution, batch eligibility, and switcher options.
 */
export async function getLeaderboardData(params: {
  studentId: number;
  collegeId?: string | null;
  scope?: LeaderboardScope;
  timeframe?: LeaderboardTimeframe;
  batchId?: string;
}): Promise<LeaderboardData> {
  const { studentId, collegeId } = params;
  const scope: LeaderboardScope = params.scope === 'college' ? 'college' : 'batch';
  const timeframe: LeaderboardTimeframe = params.timeframe === 'all_time' ? 'all_time' : 'weekly';

  // 1. Fetch all active enrolled batches for the student (for batch dropdown switcher)
  const activeBatches = await db
    .select({
      batchId: batches.id,
      batchName: batches.name
    })
    .from(enrollments)
    .innerJoin(batches, eq(batches.id, enrollments.batchId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        inArray(enrollments.status, ['active', 'confirmed'])
      )
    );

  const availableBatches: BatchOption[] = activeBatches.map((b) => ({
    batchId: b.batchId,
    batchName: b.batchName
  }));

  // 2. Resolve target batch: use query param if validly enrolled, else default to primary batch
  let targetBatchId = params.batchId;
  const isValidBatch = availableBatches.some((b) => b.batchId === targetBatchId);

  if (!isValidBatch) {
    targetBatchId = availableBatches[0]?.batchId;
  }

  // 3. Delegate to scope-specific query
  if (scope === 'college' || !targetBatchId) {
    const collegeData = await getCollegeLeaderboard(studentId, collegeId, timeframe);
    return {
      ...collegeData,
      availableBatches
    };
  }

  const batchData = await getBatchLeaderboard(studentId, collegeId, targetBatchId, timeframe);
  return {
    ...batchData,
    availableBatches
  };
}
