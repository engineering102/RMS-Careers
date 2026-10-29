import 'server-only';

import {
  db,
  batches,
  colleges,
  programs,
  students,
  enrollments,
  contentItems,
  batchCurriculum,
  quizzes,
  quizQuestions,
  quizAttempts,
  type DbClient,
  type QuizTypeEnum
} from '@rms/db';
import { eq, and, or, sql, desc, asc, inArray, ilike } from 'drizzle-orm';
import { csvCell } from '@/lib/csv/escape';
import { adminScope } from '@rms/academic/scope';
import {
  getBatchAssessmentsOverview as academicGetBatchAssessmentsOverview,
  getBatchAssessmentAttempts as academicGetBatchAssessmentAttempts,
  type BatchAssessmentOverviewItem,
  type AttemptListItem,
  type AttemptFilters
} from '@rms/academic/assessments';

export type { BatchAssessmentOverviewItem, AttemptListItem, AttemptFilters } from '@rms/academic/assessments';

export interface QuestionResultDetail {
  questionId: number;
  questionText: string;
  questionType: string;
  points: number;
  earnedPoints: number;
  isCorrect: boolean;
  selectedOptionIds: string[];
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanationText: string | null;
}

export interface AttemptInspectorDetails {
  attemptId: string;
  batchId: string;
  batchName: string;
  quizId: string;
  assessmentTitle: string;
  quizType: QuizTypeEnum;
  timeLimitMinutes: number | null;
  passingScorePercent: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  collegeRollNumber: string | null;
  status: 'completed' | 'in_progress';
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  tabBlurCount: number;
  isFlagged: boolean;
  startedAt: Date;
  submittedAt: Date | null;
  durationSeconds: number | null;
  questions: QuestionResultDetail[];
}

/**
 * Aggregated overview of the assessments placed in a batch (see @rms/academic/assessments).
 */
export async function getBatchAssessmentsOverview(
  batchId: string,
  client: DbClient = db
): Promise<BatchAssessmentOverviewItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  return academicGetBatchAssessmentsOverview(client, adminScope(), batchId);
}

/**
 * Attempts for one assessment of a batch with operational filters (see @rms/academic/assessments).
 */
export async function getBatchAssessmentAttempts(
  batchId: string,
  quizId: string,
  filters: AttemptFilters = {},
  client: DbClient = db
): Promise<AttemptListItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  return academicGetBatchAssessmentAttempts(client, adminScope(), batchId, quizId, filters);
}

/**
 * Retrieves full attempt inspector details with question-level breakdown for an authorized Admin.
 * Cross-batch isolation invariant: validates that the attempt strictly belongs to batchId.
 */
export async function getBatchAttemptDetails(
  batchId: string,
  attemptId: string,
  client: DbClient = db
): Promise<AttemptInspectorDetails | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;

    // 1. Fetch attempt and verify strict batch ownership
    const [row] = await client
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        batchId: quizAttempts.batchId,
        batchName: batches.name,
        studentId: students.id,
        studentName: students.fullName,
        studentEmail: students.email,
        collegeRollNumber: students.collegeRollNumber,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        isPassed: quizAttempts.isPassed,
        responses: quizAttempts.responses,
        tabBlurCount: quizAttempts.tabBlurCount,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt,
        assessmentTitle: contentItems.title,
        quizType: quizzes.quizType,
        timeLimitMinutes: quizzes.timeLimitMinutes,
        passingScorePercent: quizzes.passingScorePercent
      })
      .from(quizAttempts)
      .innerJoin(batches, eq(batches.id, quizAttempts.batchId))
      .innerJoin(students, eq(students.id, quizAttempts.studentId))
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
      .where(
        and(
          eq(quizAttempts.id, attemptId),
          eq(quizAttempts.batchId, batchId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    // 2. Fetch authoritative questions for this quiz
    const questionsRows = await client
      .select({
        id: quizQuestions.id,
        questionText: quizQuestions.questionText,
        questionType: quizQuestions.questionType,
        options: quizQuestions.options,
        correctOptionIds: quizQuestions.correctOptionIds,
        explanationText: quizQuestions.explanationText,
        points: quizQuestions.points,
        sequenceOrder: quizQuestions.sequenceOrder
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, row.quizId))
      .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

    const studentResponses = (row.responses || {}) as Record<string, string[]>;

    // 3. Map question result details
    const questionDetails: QuestionResultDetail[] = questionsRows.map((q) => {
      const selected = Array.isArray(studentResponses[String(q.id)])
        ? studentResponses[String(q.id)]
        : Array.isArray(studentResponses[q.id])
        ? (studentResponses[q.id] as string[])
        : [];

      const correct = (Array.isArray(q.correctOptionIds) ? q.correctOptionIds : []) as string[];
      const normalizedSelected = [...selected].sort();
      const normalizedCorrect = [...correct].sort();

      const isCorrect =
        normalizedSelected.length === normalizedCorrect.length &&
        normalizedSelected.every((val, idx) => val === normalizedCorrect[idx]);

      const earnedPoints = isCorrect ? q.points : 0;

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        points: q.points,
        earnedPoints,
        isCorrect,
        selectedOptionIds: selected,
        options: (Array.isArray(q.options) ? q.options : []) as { id: string; text: string }[],
        correctOptionIds: correct,
        explanationText: q.explanationText
      };
    });

    const percentage =
      row.maxScore > 0 ? Math.round((row.score / row.maxScore) * 100) : 0;
    const status: 'completed' | 'in_progress' = row.submittedAt ? 'completed' : 'in_progress';
    const durationSeconds = row.submittedAt
      ? Math.round((new Date(row.submittedAt).getTime() - new Date(row.startedAt).getTime()) / 1000)
      : null;

    return {
      attemptId: row.attemptId,
      batchId: row.batchId!,
      batchName: row.batchName,
      quizId: row.quizId,
      assessmentTitle: row.assessmentTitle,
      quizType: row.quizType,
      timeLimitMinutes: row.timeLimitMinutes,
      passingScorePercent: row.passingScorePercent,
      studentId: row.studentId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      collegeRollNumber: row.collegeRollNumber,
      status,
      score: row.score,
      maxScore: row.maxScore,
      percentage,
      isPassed: row.isPassed,
      tabBlurCount: row.tabBlurCount || 0,
      isFlagged: (row.tabBlurCount || 0) >= 3,
      startedAt: row.startedAt,
      submittedAt: row.submittedAt,
      durationSeconds,
      questions: questionDetails
    };
  } catch (error) {
    console.error('Error fetching attempt details:', error);
    return null;
  }
}

/**
 * Generates an institutional CSV string containing assessment results scoped to a batch.
 */
export async function generateBatchAssessmentCsv(
  batchId: string,
  quizId?: string,
  client: DbClient = db
): Promise<{ filename: string; csvContent: string } | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;

    const [batch] = await client
      .select({ id: batches.id, name: batches.name })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batch) return null;

    const conditions = [eq(quizAttempts.batchId, batchId)];
    if (quizId) {
      conditions.push(eq(quizAttempts.quizId, quizId));
    }

    const rows = await client
      .select({
        attemptId: quizAttempts.id,
        quizTitle: contentItems.title,
        quizType: quizzes.quizType,
        studentName: students.fullName,
        studentEmail: students.email,
        collegeRollNumber: students.collegeRollNumber,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        isPassed: quizAttempts.isPassed,
        tabBlurCount: quizAttempts.tabBlurCount,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt
      })
      .from(quizAttempts)
      .innerJoin(students, eq(students.id, quizAttempts.studentId))
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
      .where(and(...conditions))
      .orderBy(contentItems.title, students.fullName);

    const headers = [
      'Batch ID',
      'Batch Name',
      'Assessment Title',
      'Assessment Type',
      'Student Name',
      'Student Email',
      'Roll Number',
      'Attempt Status',
      'Score',
      'Max Score',
      'Percentage',
      'Result',
      'Tab Blur Count',
      'Flagged Anomaly',
      'Started At (UTC)',
      'Submitted At (UTC)',
      'Duration (Minutes)'
    ];

    const escapeCsv = csvCell;

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const percentage = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
      const status = r.submittedAt ? 'Completed' : 'In Progress';
      const result = r.submittedAt ? (r.isPassed ? 'Passed' : 'Failed') : 'Pending';
      const isFlagged = (r.tabBlurCount || 0) >= 3 ? 'Yes' : 'No';
      const durationMin = r.submittedAt
        ? (Math.round(((new Date(r.submittedAt).getTime() - new Date(r.startedAt).getTime()) / 60000) * 10) / 10).toString()
        : 'N/A';

      const line = [
        escapeCsv(batch.id),
        escapeCsv(batch.name),
        escapeCsv(r.quizTitle),
        escapeCsv(r.quizType),
        escapeCsv(r.studentName),
        escapeCsv(r.studentEmail),
        escapeCsv(r.collegeRollNumber || ''),
        escapeCsv(status),
        r.score,
        r.maxScore,
        `${percentage}%`,
        escapeCsv(result),
        r.tabBlurCount || 0,
        escapeCsv(isFlagged),
        escapeCsv(r.startedAt ? new Date(r.startedAt).toISOString() : ''),
        escapeCsv(r.submittedAt ? new Date(r.submittedAt).toISOString() : ''),
        escapeCsv(durationMin)
      ].join(',');

      csvLines.push(line);
    }

    const safeBatchName = batch.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `assessment_results_${safeBatchName}_${timestamp}.csv`;

    return {
      filename,
      csvContent: csvLines.join('\n')
    };
  } catch (error) {
    console.error('Error generating assessment CSV:', error);
    return null;
  }
}
