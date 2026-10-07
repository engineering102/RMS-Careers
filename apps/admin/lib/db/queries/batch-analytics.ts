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
  quizAttempts,
  assignments,
  assignmentSubmissions,
  externalAssessmentRecords,
  type DbClient,
  type QuizTypeEnum,
  type SubmissionStatusEnum
} from '@rms/db';
import { eq, and, sql, desc, inArray, or } from 'drizzle-orm';
import { formatDate } from '@/lib/utils/format-date';

export interface BatchAcademicAnalyticsData {
  batch: {
    id: string;
    name: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    collegeId: string;
    programId: number;
  };
  college: {
    id: string;
    name: string;
    code: string;
  } | null;
  program: {
    id: number;
    name: string;
    code: string;
  } | null;
  overview: {
    enrolledStudentsCount: number;
    quizzesAssignedCount: number;
    quizzesAttemptedCount: number;
    quizParticipationRate: number; // 0-100
    quizAveragePercentage: number | null;
    quizPassRate: number | null;
    projectsAssignedCount: number;
    projectSubmissionRate: number; // 0-100
    projectApprovalRate: number; // 0-100
    externalAssessmentsCount: number;
    externalRecordsCount: number;
    externalParticipationRate: number; // 0-100
    externalAveragePercentage: number | null;
    latestAcademicActivityAt: Date | null;
  };
  assessmentPerformance: Array<{
    quizId: string;
    contentItemId: string;
    title: string;
    slug: string;
    quizType: QuizTypeEnum;
    weekNumber: number;
    isRequired: boolean;
    passingScorePercent: number;
    timeLimitMinutes: number | null;
    eligibleStudentsCount: number;
    attemptsStarted: number;
    attemptsCompleted: number;
    participationRatePercent: number;
    averageScore: number | null;
    averagePercentage: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    passRatePercent: number | null;
    flaggedAnomalyCount: number;
    latestActivityAt: Date | null;
  }>;
  projectPerformance: Array<{
    assignmentId: string;
    contentItemId: string;
    title: string;
    slug: string;
    weekNumber: number;
    isRequired: boolean;
    maxScore: number;
    dueAt: Date | null;
    assignedStudentsCount: number;
    totalSubmissionsCount: number;
    submittedCount: number;
    underReviewCount: number;
    changesRequestedCount: number;
    approvedCount: number;
    submissionRatePercent: number;
    approvalRatePercent: number;
    averageScore: number | null;
    latestSubmissionAt: Date | null;
  }>;
  externalAssessmentPerformance: Array<{
    provider: string;
    assessmentCode: string;
    assessmentName: string;
    maxScore: number;
    recordsCount: number;
    participatingStudentsCount: number;
    participationRatePercent: number;
    averageScore: number;
    averagePercentage: number;
    highestScore: number;
    averagePercentile: number | null;
    tierCounts: {
      elite: number;
      advanced: number;
      proficient: number;
      developing: number;
    };
    latestImportedAt: Date;
  }>;
  distribution: {
    quizScoreBands: {
      elite: { count: number; percent: number }; // >= 90%
      advanced: { count: number; percent: number }; // 75-89%
      proficient: { count: number; percent: number }; // 60-74%
      developing: { count: number; percent: number }; // < 60%
    };
    quizCompletionBands: {
      completedAll: { count: number; percent: number };
      completedPartial: { count: number; percent: number };
      none: { count: number; percent: number };
    };
    projectStatusDistribution: {
      approved: number;
      submittedOrUnderReview: number;
      changesRequested: number;
      notSubmitted: number;
    };
    externalTierDistribution: {
      elite: number;
      advanced: number;
      proficient: number;
      developing: number;
    };
  };
  needsAttention: Array<{
    studentId: number;
    studentName: string;
    studentEmail: string;
    collegeRollNumber: string | null;
    issues: Array<{
      category: 'quiz' | 'project' | 'external';
      severity: 'high' | 'medium';
      title: string;
      details: string;
      actionUrl: string;
    }>;
  }>;
}

export type AnalyticsReportType =
  | 'summary'
  | 'assessments'
  | 'projects'
  | 'external'
  | 'needs_attention';

function escapeCsv(val: any): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Retrieves comprehensive academic analytics for a batch.
 * Strict batch-isolation: all queries and aggregations are scoped strictly to the target batchId.
 */
export async function getBatchAcademicAnalytics(
  batchId: string,
  client: DbClient = db
): Promise<BatchAcademicAnalyticsData | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;

    // 1. Fetch batch
    const [batch] = await client
      .select({
        id: batches.id,
        name: batches.name,
        status: batches.status,
        startDate: batches.startDate,
        endDate: batches.endDate,
        collegeId: batches.collegeId,
        programId: batches.programId
      })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batch) {
      return null;
    }

    // 2. Fetch college and program in parallel
    const [collegeRows, programRows] = await Promise.all([
      client
        .select({ id: colleges.id, name: colleges.name, code: colleges.code })
        .from(colleges)
        .where(eq(colleges.id, batch.collegeId))
        .limit(1),
      client
        .select({ id: programs.id, name: programs.name, code: programs.code })
        .from(programs)
        .where(eq(programs.id, batch.programId))
        .limit(1)
    ]);

    const college = collegeRows[0] || null;
    const program = programRows[0] || null;

    // 3. Fetch enrolled students strictly for this batch
    const enrolledStudents = await client
      .select({
        id: students.id,
        fullName: students.fullName,
        email: students.email,
        collegeRollNumber: students.collegeRollNumber
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.batchId, batchId),
          sql`${enrollments.status} IN ('active', 'confirmed', 'completed')`
        )
      );

    const enrolledStudentsCount = enrolledStudents.length;

    // 4. Fetch assigned curriculum items for this batch (quizzes & projects)
    const [assignedQuizzes, assignedProjects] = await Promise.all([
      client
        .select({
          contentItemId: batchCurriculum.contentItemId,
          weekNumber: batchCurriculum.weekNumber,
          sequenceOrder: batchCurriculum.sequenceOrder,
          isRequired: batchCurriculum.isRequired,
          availableFrom: batchCurriculum.availableFrom,
          dueAt: batchCurriculum.dueAt,
          title: contentItems.title,
          slug: contentItems.slug,
          quizId: quizzes.id,
          quizType: quizzes.quizType,
          timeLimitMinutes: quizzes.timeLimitMinutes,
          passingScorePercent: quizzes.passingScorePercent
        })
        .from(batchCurriculum)
        .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
        .innerJoin(quizzes, eq(quizzes.contentItemId, contentItems.id))
        .where(
          and(
            eq(batchCurriculum.batchId, batchId),
            eq(contentItems.contentType, 'quiz')
          )
        )
        .orderBy(batchCurriculum.weekNumber, batchCurriculum.sequenceOrder),

      client
        .select({
          contentItemId: batchCurriculum.contentItemId,
          weekNumber: batchCurriculum.weekNumber,
          sequenceOrder: batchCurriculum.sequenceOrder,
          isRequired: batchCurriculum.isRequired,
          availableFrom: batchCurriculum.availableFrom,
          dueAt: batchCurriculum.dueAt,
          title: contentItems.title,
          slug: contentItems.slug,
          assignmentId: assignments.id,
          maxScore: assignments.maxScore
        })
        .from(batchCurriculum)
        .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
        .innerJoin(assignments, eq(assignments.contentItemId, contentItems.id))
        .where(
          and(
            eq(batchCurriculum.batchId, batchId),
            eq(contentItems.contentType, 'project')
          )
        )
        .orderBy(batchCurriculum.weekNumber, batchCurriculum.sequenceOrder)
    ]);

    // 5. Fetch all student quiz attempts for this batch
    const quizAttemptsList = await client
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        studentId: quizAttempts.studentId,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        isPassed: quizAttempts.isPassed,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt,
        tabBlurCount: quizAttempts.tabBlurCount
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.batchId, batchId));

    // 6. Fetch all project submissions for this batch
    const projectSubmissionsList = await client
      .select({
        id: assignmentSubmissions.id,
        assignmentId: assignmentSubmissions.assignmentId,
        studentId: assignmentSubmissions.studentId,
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.score,
        submittedAt: assignmentSubmissions.submittedAt,
        updatedAt: assignmentSubmissions.updatedAt
      })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.batchId, batchId));

    // 7. Fetch all external assessment records for this batch
    const externalRecordsList = await client
      .select({
        id: externalAssessmentRecords.id,
        studentId: externalAssessmentRecords.studentId,
        assessmentCode: externalAssessmentRecords.assessmentCode,
        assessmentName: externalAssessmentRecords.assessmentName,
        provider: externalAssessmentRecords.provider,
        maxScore: externalAssessmentRecords.maxScore,
        obtainedScore: externalAssessmentRecords.obtainedScore,
        percentile: externalAssessmentRecords.percentile,
        importedAt: externalAssessmentRecords.importedAt
      })
      .from(externalAssessmentRecords)
      .where(eq(externalAssessmentRecords.batchId, batchId));

    // -------------------------------------------------------------
    // Calculate Assessment Analytics
    // -------------------------------------------------------------
    const attemptsByQuiz = new Map<string, typeof quizAttemptsList>();
    for (const att of quizAttemptsList) {
      const list = attemptsByQuiz.get(att.quizId) || [];
      list.push(att);
      attemptsByQuiz.set(att.quizId, list);
    }

    let overallCompletedQuizAttempts = 0;
    let overallPassedQuizAttempts = 0;
    let overallQuizPercentageSum = 0;
    const studentsWithAnyQuizAttempt = new Set<number>();
    let latestQuizActivity: Date | null = null;

    const assessmentPerformance = assignedQuizzes.map((quiz) => {
      const attempts = attemptsByQuiz.get(quiz.quizId) || [];
      const completedAttempts = attempts.filter((a) => a.submittedAt !== null);
      const inProgressAttempts = attempts.filter((a) => a.submittedAt === null);

      let highestScore: number | null = null;
      let lowestScore: number | null = null;
      let totalScore = 0;
      let totalMaxScore = 0;
      let passedCount = 0;
      let flaggedAnomalyCount = 0;
      let latestActivity: Date | null = null;

      for (const a of attempts) {
        studentsWithAnyQuizAttempt.add(a.studentId);
        if ((a.tabBlurCount || 0) >= 3) {
          flaggedAnomalyCount++;
        }
        const actDate = a.submittedAt || a.startedAt;
        if (actDate) {
          if (!latestActivity || new Date(actDate) > new Date(latestActivity)) {
            latestActivity = new Date(actDate);
          }
          if (!latestQuizActivity || new Date(actDate) > new Date(latestQuizActivity)) {
            latestQuizActivity = new Date(actDate);
          }
        }
      }

      for (const ca of completedAttempts) {
        if (highestScore === null || ca.score > highestScore) highestScore = ca.score;
        if (lowestScore === null || ca.score < lowestScore) lowestScore = ca.score;
        totalScore += ca.score;
        totalMaxScore += ca.maxScore;
        if (ca.isPassed) passedCount++;

        overallCompletedQuizAttempts++;
        if (ca.isPassed) overallPassedQuizAttempts++;
        if (ca.maxScore > 0) {
          overallQuizPercentageSum += (ca.score / ca.maxScore) * 100;
        }
      }

      const attemptsCompleted = completedAttempts.length;
      const attemptsStarted = attempts.length;
      const participationRatePercent =
        enrolledStudentsCount > 0
          ? Math.round((new Set(attempts.map((a) => a.studentId)).size / enrolledStudentsCount) * 100)
          : 0;

      const averageScore =
        attemptsCompleted > 0 ? Math.round((totalScore / attemptsCompleted) * 10) / 10 : null;
      const averagePercentage =
        attemptsCompleted > 0 && totalMaxScore > 0
          ? Math.round((totalScore / totalMaxScore) * 100)
          : null;
      const passRatePercent =
        attemptsCompleted > 0 ? Math.round((passedCount / attemptsCompleted) * 100) : null;

      return {
        quizId: quiz.quizId,
        contentItemId: quiz.contentItemId,
        title: quiz.title,
        slug: quiz.slug,
        quizType: quiz.quizType,
        weekNumber: quiz.weekNumber,
        isRequired: quiz.isRequired,
        passingScorePercent: quiz.passingScorePercent,
        timeLimitMinutes: quiz.timeLimitMinutes,
        eligibleStudentsCount: enrolledStudentsCount,
        attemptsStarted,
        attemptsCompleted,
        participationRatePercent,
        averageScore,
        averagePercentage,
        highestScore,
        lowestScore,
        passRatePercent,
        flaggedAnomalyCount,
        latestActivityAt: latestActivity
      };
    });

    const quizzesAssignedCount = assignedQuizzes.length;
    const quizzesAttemptedCount = assessmentPerformance.filter((a) => a.attemptsStarted > 0).length;
    const quizParticipationRate =
      enrolledStudentsCount > 0
        ? Math.round((studentsWithAnyQuizAttempt.size / enrolledStudentsCount) * 100)
        : 0;
    const quizAveragePercentage =
      overallCompletedQuizAttempts > 0
        ? Math.round(overallQuizPercentageSum / overallCompletedQuizAttempts)
        : null;
    const quizPassRate =
      overallCompletedQuizAttempts > 0
        ? Math.round((overallPassedQuizAttempts / overallCompletedQuizAttempts) * 100)
        : null;

    // -------------------------------------------------------------
    // Calculate Project Performance Analytics
    // -------------------------------------------------------------
    const submissionsByAssignment = new Map<string, typeof projectSubmissionsList>();
    for (const sub of projectSubmissionsList) {
      const list = submissionsByAssignment.get(sub.assignmentId) || [];
      list.push(sub);
      submissionsByAssignment.set(sub.assignmentId, list);
    }

    let overallTotalProjectSubmissions = 0;
    let overallApprovedProjectSubmissions = 0;
    const studentsWithAnyProjectSubmission = new Set<number>();
    let latestProjectActivity: Date | null = null;

    const projectPerformance = assignedProjects.map((proj) => {
      const subs = submissionsByAssignment.get(proj.assignmentId) || [];
      let submittedCount = 0;
      let underReviewCount = 0;
      let changesRequestedCount = 0;
      let approvedCount = 0;
      let scoreSum = 0;
      let scoredCount = 0;
      let latestSubAt: Date | null = null;

      for (const s of subs) {
        studentsWithAnyProjectSubmission.add(s.studentId);
        overallTotalProjectSubmissions++;
        if (s.status === 'approved') overallApprovedProjectSubmissions++;

        if (s.status === 'submitted') submittedCount++;
        else if (s.status === 'under_review') underReviewCount++;
        else if (s.status === 'resubmission_requested') changesRequestedCount++;
        else if (s.status === 'approved') approvedCount++;

        if (s.score !== null && s.score !== undefined) {
          scoreSum += s.score;
          scoredCount++;
        }

        const subDate = s.submittedAt;
        if (subDate) {
          if (!latestSubAt || new Date(subDate) > new Date(latestSubAt)) {
            latestSubAt = new Date(subDate);
          }
          if (!latestProjectActivity || new Date(subDate) > new Date(latestProjectActivity)) {
            latestProjectActivity = new Date(subDate);
          }
        }
      }

      const totalSubmissionsCount = subs.length;
      const uniqueSubmittingStudents = new Set(subs.map((s) => s.studentId)).size;
      const submissionRatePercent =
        enrolledStudentsCount > 0
          ? Math.round((uniqueSubmittingStudents / enrolledStudentsCount) * 100)
          : 0;
      const approvalRatePercent =
        totalSubmissionsCount > 0
          ? Math.round((approvedCount / totalSubmissionsCount) * 100)
          : 0;
      const averageScore =
        scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10) / 10 : null;

      return {
        assignmentId: proj.assignmentId,
        contentItemId: proj.contentItemId,
        title: proj.title,
        slug: proj.slug,
        weekNumber: proj.weekNumber,
        isRequired: proj.isRequired,
        maxScore: proj.maxScore,
        dueAt: proj.dueAt,
        assignedStudentsCount: enrolledStudentsCount,
        totalSubmissionsCount,
        submittedCount,
        underReviewCount,
        changesRequestedCount,
        approvedCount,
        submissionRatePercent,
        approvalRatePercent,
        averageScore,
        latestSubmissionAt: latestSubAt
      };
    });

    const projectsAssignedCount = assignedProjects.length;
    const projectSubmissionRate =
      enrolledStudentsCount > 0
        ? Math.round((studentsWithAnyProjectSubmission.size / enrolledStudentsCount) * 100)
        : 0;
    const projectApprovalRate =
      overallTotalProjectSubmissions > 0
        ? Math.round((overallApprovedProjectSubmissions / overallTotalProjectSubmissions) * 100)
        : 0;

    // -------------------------------------------------------------
    // Calculate External Assessment Performance Analytics
    // -------------------------------------------------------------
    const externalByCode = new Map<
      string,
      {
        provider: string;
        assessmentCode: string;
        assessmentName: string;
        maxScore: number;
        records: typeof externalRecordsList;
      }
    >();

    const studentsWithExternalRecord = new Set<number>();
    let externalScoreSum = 0;
    let externalMaxScoreSum = 0;
    let latestExternalActivity: Date | null = null;

    for (const r of externalRecordsList) {
      studentsWithExternalRecord.add(r.studentId);
      externalScoreSum += r.obtainedScore;
      externalMaxScoreSum += r.maxScore;

      if (!latestExternalActivity || new Date(r.importedAt) > new Date(latestExternalActivity)) {
        latestExternalActivity = new Date(r.importedAt);
      }

      const existing = externalByCode.get(r.assessmentCode);
      if (existing) {
        existing.records.push(r);
      } else {
        externalByCode.set(r.assessmentCode, {
          provider: r.provider,
          assessmentCode: r.assessmentCode,
          assessmentName: r.assessmentName,
          maxScore: r.maxScore,
          records: [r]
        });
      }
    }

    const externalAssessmentPerformance = Array.from(externalByCode.values()).map((grp) => {
      let scoreSum = 0;
      let maxScoreSum = 0;
      let highestScore = 0;
      let percentileSum = 0;
      let percentileCount = 0;
      const participatingStudentIds = new Set<number>();

      const tierCounts = {
        elite: 0,
        advanced: 0,
        proficient: 0,
        developing: 0
      };

      let latestImp: Date = grp.records[0].importedAt;

      for (const rec of grp.records) {
        participatingStudentIds.add(rec.studentId);
        scoreSum += rec.obtainedScore;
        maxScoreSum += rec.maxScore;
        if (rec.obtainedScore > highestScore) highestScore = rec.obtainedScore;

        if (rec.percentile !== null && rec.percentile !== undefined) {
          percentileSum += rec.percentile;
          percentileCount++;
        }

        const pct = rec.maxScore > 0 ? (rec.obtainedScore / rec.maxScore) * 100 : 0;
        const p = rec.percentile !== null && rec.percentile !== undefined ? rec.percentile : -1;

        if (p >= 90 || pct >= 90) tierCounts.elite++;
        else if (p >= 75 || pct >= 75) tierCounts.advanced++;
        else if (p >= 60 || pct >= 60) tierCounts.proficient++;
        else tierCounts.developing++;

        if (new Date(rec.importedAt) > new Date(latestImp)) {
          latestImp = rec.importedAt;
        }
      }

      const recordsCount = grp.records.length;
      const participatingStudentsCount = participatingStudentIds.size;
      const participationRatePercent =
        enrolledStudentsCount > 0
          ? Math.round((participatingStudentsCount / enrolledStudentsCount) * 100)
          : 0;

      const averageScore = recordsCount > 0 ? Math.round((scoreSum / recordsCount) * 10) / 10 : 0;
      const averagePercentage =
        maxScoreSum > 0 ? Math.round((scoreSum / maxScoreSum) * 100) : 0;
      const averagePercentile =
        percentileCount > 0 ? Math.round((percentileSum / percentileCount) * 10) / 10 : null;

      return {
        provider: grp.provider,
        assessmentCode: grp.assessmentCode,
        assessmentName: grp.assessmentName,
        maxScore: grp.maxScore,
        recordsCount,
        participatingStudentsCount,
        participationRatePercent,
        averageScore,
        averagePercentage,
        highestScore,
        averagePercentile,
        tierCounts,
        latestImportedAt: latestImp
      };
    });

    const externalAssessmentsCount = externalAssessmentPerformance.length;
    const externalRecordsCount = externalRecordsList.length;
    const externalParticipationRate =
      enrolledStudentsCount > 0
        ? Math.round((studentsWithExternalRecord.size / enrolledStudentsCount) * 100)
        : 0;
    const externalAveragePercentage =
      externalMaxScoreSum > 0
        ? Math.round((externalScoreSum / externalMaxScoreSum) * 100)
        : null;

    // Latest overall academic activity timestamp
    const activities: Date[] = [];
    if (latestQuizActivity) activities.push(latestQuizActivity);
    if (latestProjectActivity) activities.push(latestProjectActivity);
    if (latestExternalActivity) activities.push(latestExternalActivity);

    const latestAcademicActivityAt =
      activities.length > 0
        ? activities.reduce((latest, curr) => (curr > latest ? curr : latest), activities[0])
        : null;

    // -------------------------------------------------------------
    // Calculate Performance Distributions
    // -------------------------------------------------------------
    let eliteQuizCount = 0;
    let advancedQuizCount = 0;
    let proficientQuizCount = 0;
    let developingQuizCount = 0;

    for (const att of quizAttemptsList) {
      if (att.submittedAt !== null && att.maxScore > 0) {
        const pct = (att.score / att.maxScore) * 100;
        if (pct >= 90) eliteQuizCount++;
        else if (pct >= 75) advancedQuizCount++;
        else if (pct >= 60) proficientQuizCount++;
        else developingQuizCount++;
      }
    }

    const totalScoredAttempts =
      eliteQuizCount + advancedQuizCount + proficientQuizCount + developingQuizCount;

    const quizScoreBands = {
      elite: {
        count: eliteQuizCount,
        percent: totalScoredAttempts > 0 ? Math.round((eliteQuizCount / totalScoredAttempts) * 100) : 0
      },
      advanced: {
        count: advancedQuizCount,
        percent: totalScoredAttempts > 0 ? Math.round((advancedQuizCount / totalScoredAttempts) * 100) : 0
      },
      proficient: {
        count: proficientQuizCount,
        percent: totalScoredAttempts > 0 ? Math.round((proficientQuizCount / totalScoredAttempts) * 100) : 0
      },
      developing: {
        count: developingQuizCount,
        percent: totalScoredAttempts > 0 ? Math.round((developingQuizCount / totalScoredAttempts) * 100) : 0
      }
    };

    // Quiz completion bands per student
    let completedAllCount = 0;
    let completedPartialCount = 0;
    let completedNoneCount = 0;

    const completedQuizzesPerStudent = new Map<number, Set<string>>();
    for (const att of quizAttemptsList) {
      if (att.submittedAt !== null) {
        const set = completedQuizzesPerStudent.get(att.studentId) || new Set<string>();
        set.add(att.quizId);
        completedQuizzesPerStudent.set(att.studentId, set);
      }
    }

    for (const stu of enrolledStudents) {
      const completedSet = completedQuizzesPerStudent.get(stu.id);
      const count = completedSet ? completedSet.size : 0;
      if (count === 0) {
        completedNoneCount++;
      } else if (quizzesAssignedCount > 0 && count >= quizzesAssignedCount) {
        completedAllCount++;
      } else {
        completedPartialCount++;
      }
    }

    const quizCompletionBands = {
      completedAll: {
        count: completedAllCount,
        percent: enrolledStudentsCount > 0 ? Math.round((completedAllCount / enrolledStudentsCount) * 100) : 0
      },
      completedPartial: {
        count: completedPartialCount,
        percent: enrolledStudentsCount > 0 ? Math.round((completedPartialCount / enrolledStudentsCount) * 100) : 0
      },
      none: {
        count: completedNoneCount,
        percent: enrolledStudentsCount > 0 ? Math.round((completedNoneCount / enrolledStudentsCount) * 100) : 0
      }
    };

    // Project status distribution
    let projectApprovedCount = 0;
    let projectUnderReviewCount = 0;
    let projectChangesRequestedCount = 0;

    for (const sub of projectSubmissionsList) {
      if (sub.status === 'approved') projectApprovedCount++;
      else if (sub.status === 'submitted' || sub.status === 'under_review') projectUnderReviewCount++;
      else if (sub.status === 'resubmission_requested') projectChangesRequestedCount++;
    }

    const totalPossibleProjectAssignments = enrolledStudentsCount * projectsAssignedCount;
    const projectNotSubmittedCount = Math.max(
      0,
      totalPossibleProjectAssignments - projectSubmissionsList.length
    );

    const projectStatusDistribution = {
      approved: projectApprovedCount,
      submittedOrUnderReview: projectUnderReviewCount,
      changesRequested: projectChangesRequestedCount,
      notSubmitted: projectNotSubmittedCount
    };

    // External tier distribution
    const externalTierDistribution = {
      elite: externalAssessmentPerformance.reduce((acc, p) => acc + p.tierCounts.elite, 0),
      advanced: externalAssessmentPerformance.reduce((acc, p) => acc + p.tierCounts.advanced, 0),
      proficient: externalAssessmentPerformance.reduce((acc, p) => acc + p.tierCounts.proficient, 0),
      developing: externalAssessmentPerformance.reduce((acc, p) => acc + p.tierCounts.developing, 0)
    };

    // -------------------------------------------------------------
    // Calculate "Needs Attention" List (Deterministic Rules)
    // -------------------------------------------------------------
    const needsAttentionMap = new Map<
      number,
      {
        studentId: number;
        studentName: string;
        studentEmail: string;
        collegeRollNumber: string | null;
        issues: Array<{
          category: 'quiz' | 'project' | 'external';
          severity: 'high' | 'medium';
          title: string;
          details: string;
          actionUrl: string;
        }>;
      }
    >();

    const now = new Date();

    // Map attempts by student
    const studentAttemptsMap = new Map<number, typeof quizAttemptsList>();
    for (const a of quizAttemptsList) {
      const arr = studentAttemptsMap.get(a.studentId) || [];
      arr.push(a);
      studentAttemptsMap.set(a.studentId, arr);
    }

    // Map project submissions by student and assignmentId
    const studentSubmissionsMap = new Map<string, typeof projectSubmissionsList[number]>();
    for (const s of projectSubmissionsList) {
      studentSubmissionsMap.set(`${s.studentId}::${s.assignmentId}`, s);
    }

    // Map external records count by student
    const studentExternalCountMap = new Map<number, number>();
    for (const e of externalRecordsList) {
      studentExternalCountMap.set(e.studentId, (studentExternalCountMap.get(e.studentId) || 0) + 1);
    }

    for (const student of enrolledStudents) {
      const studentIssues: Array<{
        category: 'quiz' | 'project' | 'external';
        severity: 'high' | 'medium';
        title: string;
        details: string;
        actionUrl: string;
      }> = [];

      const attempts = studentAttemptsMap.get(student.id) || [];
      const completedAttempts = attempts.filter((a) => a.submittedAt !== null);

      // Rule 1: No Quiz Attempts when quizzes are assigned
      if (quizzesAssignedCount > 0 && completedAttempts.length === 0) {
        studentIssues.push({
          category: 'quiz',
          severity: 'high',
          title: 'No Quizzes Completed',
          details: `Student has completed 0 of ${quizzesAssignedCount} assigned quizzes.`,
          actionUrl: `/batches/${batchId}/assessments`
        });
      }

      // Rule 2: Failed Formal Quizzes
      for (const ca of completedAttempts) {
        const quizMeta = assignedQuizzes.find((q) => q.quizId === ca.quizId);
        if (quizMeta) {
          const pct = ca.maxScore > 0 ? Math.round((ca.score / ca.maxScore) * 100) : 0;
          if (!ca.isPassed || pct < quizMeta.passingScorePercent) {
            studentIssues.push({
              category: 'quiz',
              severity: 'high',
              title: `Failed Quiz: ${quizMeta.title}`,
              details: `Scored ${pct}% (${ca.score}/${ca.maxScore}) — required passing threshold is ${quizMeta.passingScorePercent}%.`,
              actionUrl: `/batches/${batchId}/assessments?quizId=${ca.quizId}`
            });
          }
        }
      }

      // Rule 3: Project Resubmission Requested & Overdue Missing Projects
      for (const proj of assignedProjects) {
        const sub = studentSubmissionsMap.get(`${student.id}::${proj.assignmentId}`);
        if (sub) {
          if (sub.status === 'resubmission_requested') {
            studentIssues.push({
              category: 'project',
              severity: 'high',
              title: `Changes Requested: ${proj.title}`,
              details: 'Tutor requested revisions on this project submission.',
              actionUrl: `/batches/${batchId}/projects?assignmentId=${proj.assignmentId}`
            });
          }
        } else {
          // If due date has passed and student never submitted
          if (proj.dueAt && new Date(proj.dueAt) < now) {
            studentIssues.push({
              category: 'project',
              severity: 'high',
              title: `Overdue Project: ${proj.title}`,
              details: `Project was due on ${formatDate(proj.dueAt)} and has not been submitted.`,
              actionUrl: `/batches/${batchId}/projects?assignmentId=${proj.assignmentId}`
            });
          }
        }
      }

      // Rule 4: No External Assessment Results when external assessments exist for batch
      if (externalRecordsCount > 0 && (studentExternalCountMap.get(student.id) || 0) === 0) {
        studentIssues.push({
          category: 'external',
          severity: 'medium',
          title: 'Missing External Assessment Data',
          details: 'No results ingested for this student while external evaluations exist for the batch.',
          actionUrl: `/batches/${batchId}/external-assessments`
        });
      }

      if (studentIssues.length > 0) {
        needsAttentionMap.set(student.id, {
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email,
          collegeRollNumber: student.collegeRollNumber,
          issues: studentIssues
        });
      }
    }

    const needsAttention = Array.from(needsAttentionMap.values());

    return {
      batch: {
        id: batch.id,
        name: batch.name,
        status: batch.status,
        startDate: batch.startDate,
        endDate: batch.endDate,
        collegeId: batch.collegeId,
        programId: batch.programId
      },
      college,
      program,
      overview: {
        enrolledStudentsCount,
        quizzesAssignedCount,
        quizzesAttemptedCount,
        quizParticipationRate,
        quizAveragePercentage,
        quizPassRate,
        projectsAssignedCount,
        projectSubmissionRate,
        projectApprovalRate,
        externalAssessmentsCount,
        externalRecordsCount,
        externalParticipationRate,
        externalAveragePercentage,
        latestAcademicActivityAt
      },
      assessmentPerformance,
      projectPerformance,
      externalAssessmentPerformance,
      distribution: {
        quizScoreBands,
        quizCompletionBands,
        projectStatusDistribution,
        externalTierDistribution
      },
      needsAttention
    };
  } catch (error) {
    console.error('Error in getBatchAcademicAnalytics:', error);
    return null;
  }
}

/**
 * Generates formatted CSV report strings for batch academic analytics.
 * Strict batch-isolation: all data is scoped strictly to target batchId.
 */
export async function exportBatchAnalyticsReportCsv(
  batchId: string,
  reportType: AnalyticsReportType,
  client: DbClient = db
): Promise<{ filename: string; csvContent: string } | null> {
  try {
    const data = await getBatchAcademicAnalytics(batchId, client);
    if (!data) return null;

    const safeBatchName = data.batch.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);

    let filename = `batch_${safeBatchName}_report_${timestamp}.csv`;
    const lines: string[] = [];

    switch (reportType) {
      case 'summary': {
        filename = `batch_${safeBatchName}_executive_summary_${timestamp}.csv`;
        lines.push('Metric,Value,Description');
        lines.push(`${escapeCsv('Batch Name')},${escapeCsv(data.batch.name)},${escapeCsv('Identifier: ' + data.batch.id)}`);
        lines.push(`${escapeCsv('Institution')},${escapeCsv(data.college?.name || 'N/A')},${escapeCsv(data.college?.code || '')}`);
        lines.push(`${escapeCsv('Program')},${escapeCsv(data.program?.name || 'N/A')},${escapeCsv(data.program?.code || '')}`);
        lines.push(`${escapeCsv('Batch Status')},${escapeCsv(data.batch.status)},${escapeCsv('Lifecycle state')}`);
        lines.push(`${escapeCsv('Enrolled Students')},${data.overview.enrolledStudentsCount},${escapeCsv('Active or confirmed cohort size')}`);
        lines.push(`${escapeCsv('Quizzes Assigned')},${data.overview.quizzesAssignedCount},${escapeCsv('Total curriculum quizzes')}`);
        lines.push(`${escapeCsv('Quiz Participation Rate')},${data.overview.quizParticipationRate}%,${escapeCsv('Enrolled students who attempted >=1 quiz')}`);
        lines.push(`${escapeCsv('Quiz Average Score')},${data.overview.quizAveragePercentage !== null ? data.overview.quizAveragePercentage + '%' : 'N/A'},${escapeCsv('Mean score across completed quizzes')}`);
        lines.push(`${escapeCsv('Quiz Pass Rate')},${data.overview.quizPassRate !== null ? data.overview.quizPassRate + '%' : 'N/A'},${escapeCsv('Percentage of attempts meeting passing threshold')}`);
        lines.push(`${escapeCsv('Projects Assigned')},${data.overview.projectsAssignedCount},${escapeCsv('Curriculum project milestones')}`);
        lines.push(`${escapeCsv('Project Submission Rate')},${data.overview.projectSubmissionRate}%,${escapeCsv('Enrolled students submitting >=1 project')}`);
        lines.push(`${escapeCsv('Project Approval Rate')},${data.overview.projectApprovalRate}%,${escapeCsv('Percentage of submissions approved')}`);
        lines.push(`${escapeCsv('External Assessments')},${data.overview.externalAssessmentsCount},${escapeCsv('Distinct external assessment codes ingested')}`);
        lines.push(`${escapeCsv('External Records')},${data.overview.externalRecordsCount},${escapeCsv('Total ingested assessment results')}`);
        lines.push(`${escapeCsv('External Participation Rate')},${data.overview.externalParticipationRate}%,${escapeCsv('Cohort coverage in external testing')}`);
        lines.push(`${escapeCsv('External Average Score')},${data.overview.externalAveragePercentage !== null ? data.overview.externalAveragePercentage + '%' : 'N/A'},${escapeCsv('Mean normalized percentage across providers')}`);
        lines.push(`${escapeCsv('Latest Academic Activity')},${escapeCsv(data.overview.latestAcademicActivityAt ? formatDate(data.overview.latestAcademicActivityAt) : 'None')},${escapeCsv('Most recent submission or attempt')}`);
        break;
      }

      case 'assessments': {
        filename = `batch_${safeBatchName}_assessment_performance_${timestamp}.csv`;
        lines.push(
          'Week,Title,Type,Required,Passing Threshold (%),Eligible Students,Attempts Started,Attempts Completed,Participation Rate (%),Average Score,Average Percentage (%),Highest Score,Lowest Score,Pass Rate (%),Flagged Anomalies,Latest Activity'
        );
        for (const a of data.assessmentPerformance) {
          lines.push(
            [
              a.weekNumber,
              escapeCsv(a.title),
              escapeCsv(a.quizType),
              a.isRequired ? 'Yes' : 'No',
              `${a.passingScorePercent}%`,
              a.eligibleStudentsCount,
              a.attemptsStarted,
              a.attemptsCompleted,
              `${a.participationRatePercent}%`,
              a.averageScore !== null ? a.averageScore : 'N/A',
              a.averagePercentage !== null ? `${a.averagePercentage}%` : 'N/A',
              a.highestScore !== null ? a.highestScore : 'N/A',
              a.lowestScore !== null ? a.lowestScore : 'N/A',
              a.passRatePercent !== null ? `${a.passRatePercent}%` : 'N/A',
              a.flaggedAnomalyCount,
              escapeCsv(a.latestActivityAt ? formatDate(a.latestActivityAt) : 'N/A')
            ].join(',')
          );
        }
        break;
      }

      case 'projects': {
        filename = `batch_${safeBatchName}_project_performance_${timestamp}.csv`;
        lines.push(
          'Week,Title,Max Score,Required,Due Date,Assigned Students,Total Submissions,Submitted,Under Review,Changes Requested,Approved,Submission Rate (%),Approval Rate (%),Average Score,Latest Submission'
        );
        for (const p of data.projectPerformance) {
          lines.push(
            [
              p.weekNumber,
              escapeCsv(p.title),
              p.maxScore,
              p.isRequired ? 'Yes' : 'No',
              escapeCsv(p.dueAt ? formatDate(p.dueAt) : 'None'),
              p.assignedStudentsCount,
              p.totalSubmissionsCount,
              p.submittedCount,
              p.underReviewCount,
              p.changesRequestedCount,
              p.approvedCount,
              `${p.submissionRatePercent}%`,
              `${p.approvalRatePercent}%`,
              p.averageScore !== null ? p.averageScore : 'N/A',
              escapeCsv(p.latestSubmissionAt ? formatDate(p.latestSubmissionAt) : 'N/A')
            ].join(',')
          );
        }
        break;
      }

      case 'external': {
        filename = `batch_${safeBatchName}_external_assessments_${timestamp}.csv`;
        lines.push(
          'Provider,Assessment Code,Assessment Name,Max Score,Records Count,Participating Students,Participation Rate (%),Average Score,Average Percentage (%),Highest Score,Average Percentile,Elite (>=90%),Advanced (>=75%),Proficient (>=60%),Developing (<60%),Latest Imported'
        );
        for (const e of data.externalAssessmentPerformance) {
          lines.push(
            [
              escapeCsv(e.provider),
              escapeCsv(e.assessmentCode),
              escapeCsv(e.assessmentName),
              e.maxScore,
              e.recordsCount,
              e.participatingStudentsCount,
              `${e.participationRatePercent}%`,
              e.averageScore,
              `${e.averagePercentage}%`,
              e.highestScore,
              e.averagePercentile !== null ? `${e.averagePercentile}%ile` : 'N/A',
              e.tierCounts.elite,
              e.tierCounts.advanced,
              e.tierCounts.proficient,
              e.tierCounts.developing,
              escapeCsv(formatDate(e.latestImportedAt))
            ].join(',')
          );
        }
        break;
      }

      case 'needs_attention': {
        filename = `batch_${safeBatchName}_needs_attention_${timestamp}.csv`;
        lines.push('Student Name,Roll Number,Email,Category,Severity,Issue Title,Details,Action URL');
        for (const s of data.needsAttention) {
          for (const iss of s.issues) {
            lines.push(
              [
                escapeCsv(s.studentName),
                escapeCsv(s.collegeRollNumber || 'N/A'),
                escapeCsv(s.studentEmail),
                escapeCsv(iss.category),
                escapeCsv(iss.severity),
                escapeCsv(iss.title),
                escapeCsv(iss.details),
                escapeCsv(iss.actionUrl)
              ].join(',')
            );
          }
        }
        break;
      }
    }

    return {
      filename,
      csvContent: lines.join('\n')
    };
  } catch (error) {
    console.error('Error generating analytics report CSV:', error);
    return null;
  }
}
