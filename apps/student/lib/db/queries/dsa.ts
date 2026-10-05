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
  const emptySummary: DsaProgressSummary = {
    totalProblems: 0,
    totalSolved: 0,
    overallPercentage: 0,
    easyTotal: 0,
    easySolved: 0,
    mediumTotal: 0,
    mediumSolved: 0,
    hardTotal: 0,
    hardSolved: 0
  };

  const emptyData: StudentDsaData = {
    sheets: STUDENT_DSA_SHEETS,
    progressMap: {},
    summary: emptySummary,
    sheetSummaries: []
  };

  if (!studentId || !process.env.POSTGRES_URL) {
    return emptyData;
  }

  try {
    // 1. Query student's recorded DSA progress ledger from PostgreSQL
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

    // 2. Compute summary metrics across all questions
    let totalProblems = 0;
    let totalSolved = 0;
    let easyTotal = 0;
    let easySolved = 0;
    let mediumTotal = 0;
    let mediumSolved = 0;
    let hardTotal = 0;
    let hardSolved = 0;

    const sheetSummaries: SheetProgressSummary[] = [];

    for (const sheet of STUDENT_DSA_SHEETS) {
      let sheetSolved = 0;
      const sheetTotal = sheet.questions.length;
      totalProblems += sheetTotal;

      for (const q of sheet.questions) {
        const isSolved = Boolean(progressMap[q.slug]?.isCompleted);
        if (isSolved) {
          totalSolved++;
          sheetSolved++;
        }

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
      sheetSummaries
    };
  } catch (error) {
    console.error('[DSA Query] Failed to fetch student DSA progress:', error);
    return emptyData;
  }
}
