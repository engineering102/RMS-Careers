'use server';

import { revalidatePath } from 'next/cache';
import { db, studentDsaProgress, activities, studentStats, enrollments } from '@rms/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getDsaQuestionBySlug } from '@/lib/data/dsa-sheets';
import { getTodayDateIst } from '@/lib/types/overview';
import type { RecordDsaProblemInput } from '@/lib/types/dsa';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getYesterdayDateIst(referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate);
  d.setDate(d.getDate() - 1);
  return getTodayDateIst(d);
}

/**
 * Server Action: Records or updates a solved DSA problem for the authenticated student.
 * Guarantees server-authoritative progress recording and duplicate-resistant XP allocation.
 */
export async function recordDsaProblemSolved(
  input: RecordDsaProblemInput
): Promise<ActionResult<{ isNewlySolved: boolean; xpAwarded: number }>> {
  try {
    // 1. Authorize: Session must belong to an active student
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const studentId = context.student.id;
    const { problemSlug, submissionUrl, notes, batchId } = input;

    // 2. Validate problem slug against catalog
    if (!problemSlug || typeof problemSlug !== 'string') {
      return { success: false, error: 'Invalid problem slug.', code: 'INVALID_INPUT' };
    }

    const problemItem = getDsaQuestionBySlug(problemSlug);
    if (!problemItem) {
      return { success: false, error: 'Problem not found in catalog.', code: 'NOT_FOUND' };
    }

    // 3. Sanitize optional URL and notes
    let sanitizedUrl: string | null = null;
    if (submissionUrl && submissionUrl.trim().length > 0) {
      const trimmed = submissionUrl.trim();
      if (!/^https?:\/\/.+/i.test(trimmed)) {
        return {
          success: false,
          error: 'Submission URL must start with http:// or https://',
          code: 'INVALID_URL'
        };
      }
      sanitizedUrl = trimmed;
    }

    const sanitizedNotes = notes && notes.trim().length > 0 ? notes.trim() : null;

    // 4. Validate batchId entitlement if supplied
    let verifiedBatchId: string | null = null;
    if (batchId && UUID_REGEX.test(batchId)) {
      const [enrollment] = await db
        .select({ batchId: enrollments.batchId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.batchId, batchId),
            sql`${enrollments.status} IN ('active', 'confirmed')`
          )
        )
        .limit(1);

      if (enrollment) {
        verifiedBatchId = batchId;
      }
    }

    // 5. Check if problem was already solved by this student
    const [existing] = await db
      .select({
        id: studentDsaProgress.id,
        isCompleted: studentDsaProgress.isCompleted
      })
      .from(studentDsaProgress)
      .where(
        and(
          eq(studentDsaProgress.studentId, studentId),
          eq(studentDsaProgress.problemSlug, problemSlug)
        )
      )
      .limit(1);

    if (existing && existing.isCompleted) {
      // Already solved: update submission notes and URL without awarding duplicate XP
      await db
        .update(studentDsaProgress)
        .set({
          submissionUrl: sanitizedUrl,
          notes: sanitizedNotes,
          updatedAt: new Date()
        })
        .where(eq(studentDsaProgress.id, existing.id));

      revalidatePath('/dsa');
      return {
        success: true,
        data: { isNewlySolved: false, xpAwarded: 0 },
        message: 'Submission details updated.'
      };
    }

    // 6. Newly solved: calculate XP based on problem difficulty
    const difficulty = problemItem.question.difficulty;
    let xpToAward = 10; // Default Easy
    if (difficulty === 'medium') {
      xpToAward = 25;
    } else if (difficulty === 'hard') {
      xpToAward = 50;
    }

    const now = new Date();
    const todayIst = getTodayDateIst(now);
    const yesterdayIst = getYesterdayDateIst(now);

    // 7. Insert or update progress record
    if (existing) {
      await db
        .update(studentDsaProgress)
        .set({
          isCompleted: true,
          submissionUrl: sanitizedUrl,
          notes: sanitizedNotes,
          completedAt: now,
          updatedAt: now
        })
        .where(eq(studentDsaProgress.id, existing.id));
    } else {
      await db
        .insert(studentDsaProgress)
        .values({
          studentId,
          problemSlug,
          isCompleted: true,
          submissionUrl: sanitizedUrl,
          notes: sanitizedNotes,
          completedAt: now,
          updatedAt: now
        })
        .onConflictDoNothing();
    }

    // 8. Record in activities table (idempotent XP ledger)
    await db
      .insert(activities)
      .values({
        studentId,
        batchId: verifiedBatchId,
        activityType: 'dsa_solved',
        referenceId: problemSlug,
        xpAwarded: xpToAward,
        activityDateIst: todayIst,
        createdAt: now
      })
      .onConflictDoNothing();

    // 9. Update student stats (XP, streak, and dsa_solved_count)
    const [stats] = await db
      .select({
        studentId: studentStats.studentId,
        totalXp: studentStats.totalXp,
        currentStreak: studentStats.currentStreak,
        longestStreak: studentStats.longestStreak,
        dsaSolvedCount: studentStats.dsaSolvedCount,
        lastActivityDateIst: studentStats.lastActivityDateIst
      })
      .from(studentStats)
      .where(eq(studentStats.studentId, studentId))
      .limit(1);

    if (stats) {
      const prevActivity = stats.lastActivityDateIst;
      let newCurrentStreak = stats.currentStreak;

      if (prevActivity === todayIst) {
        // Already active today; streak stays unchanged
      } else if (prevActivity === yesterdayIst) {
        // Consecutive day
        newCurrentStreak += 1;
      } else {
        // Missed day or fresh start
        newCurrentStreak = 1;
      }

      const newLongestStreak = Math.max(stats.longestStreak, newCurrentStreak);
      const newTotalXp = stats.totalXp + xpToAward;
      const newLevel = Math.floor(newTotalXp / 100) + 1;
      const newDsaCount = stats.dsaSolvedCount + 1;

      await db
        .update(studentStats)
        .set({
          totalXp: newTotalXp,
          currentLevel: newLevel,
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          dsaSolvedCount: newDsaCount,
          lastActivityDateIst: todayIst,
          updatedAt: now
        })
        .where(eq(studentStats.studentId, studentId));
    }

    // Revalidate paths for instant client freshness
    revalidatePath('/dsa');
    revalidatePath('/overview');
    if (verifiedBatchId) {
      revalidatePath(`/batches/${verifiedBatchId}`);
    }

    return {
      success: true,
      data: { isNewlySolved: true, xpAwarded: xpToAward },
      message: `Problem solved! +${xpToAward} XP`
    };
  } catch (error: any) {
    if (
      error?.message?.startsWith('REDIRECT:') ||
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message === 'NEXT_NOT_FOUND' ||
      error?.digest?.startsWith('NEXT_NOT_FOUND')
    ) {
      throw error;
    }
    console.error('[Action:recordDsaProblemSolved] Error saving DSA progress:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while saving your DSA progress.',
      code: 'INTERNAL_ERROR'
    };
  }
}
