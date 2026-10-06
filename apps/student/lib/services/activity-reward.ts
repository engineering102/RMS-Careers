import 'server-only';

import {
  db,
  activities,
  studentStats,
  type DbClient
} from '@rms/db';
import { eq, and } from 'drizzle-orm';
import type {
  ActivityType,
  RecordActivityParams,
  RecordActivityResult,
  StreakEvaluationResult
} from '@/lib/types/activity';

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getTodayDateIst(referenceDate: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(referenceDate);
}

/**
 * Returns yesterday's date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 * Uses exact UTC calendar arithmetic on the IST day string.
 */
export function getYesterdayDateIst(todayIst: string = getTodayDateIst()): string {
  const [year, month, day] = todayIst.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() - 1);
  const prevYear = date.getUTCFullYear();
  const prevMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const prevDay = String(date.getUTCDate()).padStart(2, '0');
  return `${prevYear}-${prevMonth}-${prevDay}`;
}

/**
 * Checks if two IST date strings (YYYY-MM-DD) represent consecutive calendar days.
 */
export function isConsecutiveIstDay(prevDateIst: string, currentDateIst: string): boolean {
  return prevDateIst === getYesterdayDateIst(currentDateIst);
}

/**
 * Returns Monday's date formatted as YYYY-MM-DD representing the start of the
 * current calendar week in Asia/Kolkata timezone.
 */
export function getStartOfWeekIst(referenceDate: Date = new Date()): string {
  const todayIst = getTodayDateIst(referenceDate);
  const [year, month, day] = todayIst.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = date.getUTCDay(); // 0 is Sun, 1 is Mon...
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setUTCDate(date.getUTCDate() - diffToMonday);

  const prevYear = date.getUTCFullYear();
  const prevMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const prevDay = String(date.getUTCDate()).padStart(2, '0');
  return `${prevYear}-${prevMonth}-${prevDay}`;
}

/**
 * Pure, deterministic streak rollover engine.
 * - Same day activity: streak unchanged.
 * - Consecutive day activity: streak incremented (+1), longest streak updated if beaten.
 * - Missed day or fresh start: streak reset to 1.
 */
export function evaluateStreak(
  currentStats: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDateIst: string | null;
  },
  todayIst: string
): StreakEvaluationResult {
  const { currentStreak, longestStreak, lastActivityDateIst } = currentStats;

  if (!lastActivityDateIst) {
    // 1. First learning activity ever
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      streakAdvanced: true,
      isConsecutiveDay: false,
      isSameDay: false,
      isStreakBroken: false,
      lastActivityDateIst: todayIst
    };
  }

  if (lastActivityDateIst === todayIst) {
    // 2. Already active earlier today in Asia/Kolkata
    return {
      currentStreak,
      longestStreak,
      streakAdvanced: false,
      isConsecutiveDay: false,
      isSameDay: true,
      isStreakBroken: false,
      lastActivityDateIst: todayIst
    };
  }

  const yesterdayIst = getYesterdayDateIst(todayIst);

  if (lastActivityDateIst === yesterdayIst) {
    // 3. Consecutive day activity: advance streak
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(longestStreak, newStreak),
      streakAdvanced: true,
      isConsecutiveDay: true,
      isSameDay: false,
      isStreakBroken: false,
      lastActivityDateIst: todayIst
    };
  }

  // 4. Missed day: streak reset to 1 (broken)
  return {
    currentStreak: 1,
    longestStreak,
    streakAdvanced: true,
    isConsecutiveDay: false,
    isSameDay: false,
    isStreakBroken: true,
    lastActivityDateIst: todayIst
  };
}

/**
 * Server-Authoritative Activity Reward & Streak Engine (`ActivityRewardService`).
 *
 * Guarantees:
 * 1. Idempotent XP allocation: Enforces duplicate-resistance via database unique index
 *    `activity_idempotency_idx` on (student_id, activity_type, reference_id).
 * 2. Atomic stats synchronization: Increments total XP, updates level, and evaluates
 *    Asia/Kolkata midnight streak transitions.
 * 3. Can be called inside an ongoing transaction or with the default database client.
 */
export async function recordLearningActivity(
  txOrParams: DbClient | RecordActivityParams,
  maybeParams?: RecordActivityParams
): Promise<RecordActivityResult> {
  const isClientPassed =
    typeof txOrParams === 'object' &&
    txOrParams !== null &&
    ('insert' in txOrParams || 'transaction' in txOrParams);

  const client: DbClient = isClientPassed ? (txOrParams as DbClient) : db;
  const params: RecordActivityParams = isClientPassed
    ? (maybeParams as RecordActivityParams)
    : (txOrParams as RecordActivityParams);

  if (!params || !params.studentId || !params.activityType || !params.referenceId) {
    throw new Error('Invalid activity params: studentId, activityType, and referenceId are required.');
  }

  const now = new Date();
  const todayIst = getTodayDateIst(now);

  // 1. Idempotency Check: Check if duplicate activity row already exists
  const [existingActivity] = await client
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.studentId, params.studentId),
        eq(activities.activityType, params.activityType),
        eq(activities.referenceId, params.referenceId)
      )
    )
    .limit(1);

  if (existingActivity) {
    // Duplicate activity detected: zero additional XP, zero streak advancement
    const [existingStats] = await client
      .select({
        totalXp: studentStats.totalXp,
        currentStreak: studentStats.currentStreak,
        currentLevel: studentStats.currentLevel
      })
      .from(studentStats)
      .where(eq(studentStats.studentId, params.studentId))
      .limit(1);

    return {
      xpAwarded: 0,
      streakAdvanced: false,
      isDuplicate: true,
      currentStreak: existingStats?.currentStreak ?? 0,
      totalXp: existingStats?.totalXp ?? 0,
      currentLevel: existingStats?.currentLevel ?? 1
    };
  }

  // 2. Insert into activities table (guarded by database unique index)
  await client
    .insert(activities)
    .values({
      studentId: params.studentId,
      batchId: params.batchId ?? null,
      activityType: params.activityType,
      referenceId: params.referenceId,
      xpAwarded: params.xpAmount,
      activityDateIst: todayIst,
      createdAt: now
    })
    .onConflictDoNothing();

  // 3. Fetch existing student stats to calculate streak & level progression
  const [statsRecord] = await client
    .select({
      studentId: studentStats.studentId,
      collegeId: studentStats.collegeId,
      totalXp: studentStats.totalXp,
      currentLevel: studentStats.currentLevel,
      currentStreak: studentStats.currentStreak,
      longestStreak: studentStats.longestStreak,
      dsaSolvedCount: studentStats.dsaSolvedCount,
      lastActivityDateIst: studentStats.lastActivityDateIst
    })
    .from(studentStats)
    .where(eq(studentStats.studentId, params.studentId))
    .limit(1);

  if (!statsRecord) {
    // Initial stats creation if student had no stats row yet
    const streakResult = evaluateStreak(
      { currentStreak: 0, longestStreak: 0, lastActivityDateIst: null },
      todayIst
    );
    const totalXp = params.xpAmount;
    const currentLevel = Math.floor(totalXp / 100) + 1;
    const dsaCount = params.activityType === 'dsa_solved' ? 1 : 0;

    await client.insert(studentStats).values({
      studentId: params.studentId,
      collegeId: params.collegeId,
      totalXp,
      currentLevel,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      dsaSolvedCount: dsaCount,
      lastActivityDateIst: todayIst,
      updatedAt: now
    });

    return {
      xpAwarded: params.xpAmount,
      streakAdvanced: true,
      isDuplicate: false,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      totalXp,
      currentLevel
    };
  }

  // 4. Evaluate streak progression using Asia/Kolkata date boundary
  const streakResult = evaluateStreak(
    {
      currentStreak: statsRecord.currentStreak,
      longestStreak: statsRecord.longestStreak,
      lastActivityDateIst: statsRecord.lastActivityDateIst
    },
    todayIst
  );

  const newTotalXp = statsRecord.totalXp + params.xpAmount;
  const newLevel = Math.floor(newTotalXp / 100) + 1;
  const newDsaCount =
    params.activityType === 'dsa_solved'
      ? statsRecord.dsaSolvedCount + 1
      : statsRecord.dsaSolvedCount;

  // 5. Update student stats
  await client
    .update(studentStats)
    .set({
      totalXp: newTotalXp,
      currentLevel: newLevel,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      dsaSolvedCount: newDsaCount,
      lastActivityDateIst: todayIst,
      updatedAt: now
    })
    .where(eq(studentStats.studentId, params.studentId));

  return {
    xpAwarded: params.xpAmount,
    streakAdvanced: streakResult.streakAdvanced,
    isDuplicate: false,
    currentStreak: streakResult.currentStreak,
    longestStreak: streakResult.longestStreak,
    totalXp: newTotalXp,
    currentLevel: newLevel
  };
}
