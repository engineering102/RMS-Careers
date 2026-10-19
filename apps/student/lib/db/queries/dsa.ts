import 'server-only';

import { db, studentDsaProgress, students } from '@rms/db';
import { eq } from 'drizzle-orm';
import { STUDENT_DSA_SHEETS } from '@/lib/data/dsa-sheets';
import type {
  StudentDsaData,
  StudentProblemProgress,
  DsaProgressSummary,
  SheetProgressSummary
} from '@/lib/types/dsa';

export type {
  StudentDsaData,
  StudentProblemProgress,
  DsaProgressSummary,
  SheetProgressSummary
};

/**
 * Retrieves the complete server-authoritative DSA Practice Center dataset for an authenticated student.
 * Guarantees zero dependence on client localStorage.
 *
 * @param studentId Authenticated student ID (students.id).
 */
export async function getStudentDsaData(studentId: number): Promise<StudentDsaData> {
  if (!studentId || !process.env.POSTGRES_URL) {
    return buildDsaData({}, true);
  }

  try {
    // Query student's recorded DSA progress ledger from PostgreSQL
    const progressRows = await db
      .select({
        problemSlug: studentDsaProgress.problemSlug,
        isCompleted: studentDsaProgress.isCompleted,
        submissionUrl: studentDsaProgress.submissionUrl,
        notes: studentDsaProgress.notes,
        completedAt: studentDsaProgress.completedAt,
        updatedAt: studentDsaProgress.updatedAt
      })
      .from(studentDsaProgress)
      .where(eq(studentDsaProgress.studentId, studentId));

    const progressMap: Record<string, StudentProblemProgress> = {};
    for (const row of progressRows) {
      if (row.problemSlug) {
        progressMap[row.problemSlug] = {
          problemSlug: row.problemSlug,
          isCompleted: row.isCompleted,
          submissionUrl: row.submissionUrl,
          notes: row.notes,
          completedAt: row.completedAt,
          updatedAt: row.updatedAt
        };
      }
    }

    return buildDsaData(progressMap, false);
  } catch (error) {
    console.error('[DSA Query] Failed to fetch student DSA progress:', error);
    return buildDsaData({}, true);
  }
}

/** Overall, per-difficulty and per-sheet progress for a progress map. */
function buildDsaData(
  progressMap: Record<string, StudentProblemProgress>,
  progressUnavailable: boolean
): StudentDsaData {
  let totalProblems = 0;
  let totalSolved = 0;
  let easyTotal = 0;
  let easySolved = 0;
  let mediumTotal = 0;
  let mediumSolved = 0;
  let hardTotal = 0;
  let hardSolved = 0;

  const sheetSummaries: SheetProgressSummary[] = [];
  // A problem can appear in more than one sheet (same slug, one progress row). Sheet summaries count it in
  // each sheet; the overall and per-difficulty totals count it once.
  const countedSlugs = new Set<string>();

  for (const sheet of STUDENT_DSA_SHEETS) {
    let sheetSolved = 0;
    const sheetTotal = sheet.questions.length;

    for (const q of sheet.questions) {
      const isSolved = Boolean(progressMap[q.slug]?.isCompleted);
      if (isSolved) sheetSolved++;

      if (countedSlugs.has(q.slug)) continue;
      countedSlugs.add(q.slug);
      totalProblems++;
      if (isSolved) totalSolved++;

      if (q.difficulty === 'easy') {
        easyTotal++;
        if (isSolved) easySolved++;
      } else if (q.difficulty === 'medium') {
        mediumTotal++;
        if (isSolved) mediumSolved++;
      } else if (q.difficulty === 'hard') {
        hardTotal++;
        if (isSolved) hardSolved++;
      }
    }

    sheetSummaries.push({
      sheetSlug: sheet.slug,
      sheetTitle: sheet.title,
      totalProblems: sheetTotal,
      solvedCount: sheetSolved,
      percentage: sheetTotal > 0 ? Math.round((sheetSolved / sheetTotal) * 100) : 0
    });
  }

  const summary: DsaProgressSummary = {
    totalProblems,
    totalSolved,
    overallPercentage: totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0,
    easyTotal,
    easySolved,
    mediumTotal,
    mediumSolved,
    hardTotal,
    hardSolved
  };

  return {
    sheets: STUDENT_DSA_SHEETS,
    progressMap,
    summary,
    sheetSummaries,
    progressUnavailable
  };
}
