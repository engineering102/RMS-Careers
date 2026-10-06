import 'server-only';

import {
  db,
  students,
  colleges,
  studentStats,
  studentDsaProgress,
  activities
} from '@rms/db';
import { eq, and, sql, gte, inArray } from 'drizzle-orm';
import { STUDENT_DSA_SHEETS } from '@/lib/data/dsa-sheets';
import {
  getLast30DaysIst,
  formatIstDateReadable,
  calculateHeatmapIntensity
} from '@/lib/types/overview';
import type {
  StudentProfileData,
  StudentAcademicProfile,
  StudentCareerProfile,
  TopicProgress,
  CategoryXpBreakdown,
  StudentStatsSummary
} from '@/lib/types/profile';

/**
 * Derives comprehensive profile details and learning analytics for an authenticated student.
 * Guarantees student isolation: strictly filters all mutations and reads by studentId.
 */
export async function getStudentProfileData(studentId: number): Promise<StudentProfileData | null> {
  if (!studentId) return null;

  // 1. Fetch Academic & Career info
  const [studentRecord] = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      collegeRollNumber: students.collegeRollNumber,
      branch: students.branch,
      year: students.year,
      githubUrl: students.githubUrl,
      linkedinUrl: students.linkedinUrl,
      portfolioUrl: students.portfolioUrl,
      targetCompanies: students.targetCompanies,
      primaryLanguage: students.primaryLanguage,
      createdAt: students.createdAt,
      collegeName: colleges.name,
      collegeCode: colleges.code
    })
    .from(students)
    .leftJoin(colleges, eq(colleges.id, students.collegeId))
    .where(eq(students.id, studentId))
    .limit(1);

  if (!studentRecord) {
    return null;
  }

  const academic: StudentAcademicProfile = {
    studentId: studentRecord.id,
    fullName: studentRecord.fullName,
    email: studentRecord.email,
    phone: studentRecord.phone,
    collegeName: studentRecord.collegeName || 'RMS Partner College',
    collegeCode: studentRecord.collegeCode,
    branch: studentRecord.branch,
    year: studentRecord.year,
    collegeRollNumber: studentRecord.collegeRollNumber,
    createdAt: new Date(studentRecord.createdAt)
  };

  const career: StudentCareerProfile = {
    githubUrl: studentRecord.githubUrl,
    linkedinUrl: studentRecord.linkedinUrl,
    portfolioUrl: studentRecord.portfolioUrl,
    targetCompanies: studentRecord.targetCompanies,
    primaryLanguage: studentRecord.primaryLanguage
  };

  // 2. Fetch Gamification & Streak stats
  const [statsRecord] = await db
    .select()
    .from(studentStats)
    .where(eq(studentStats.studentId, studentId))
    .limit(1);

  const stats: StudentStatsSummary = {
    totalXp: statsRecord?.totalXp || 0,
    currentLevel: statsRecord?.currentLevel || 1,
    currentStreak: statsRecord?.currentStreak || 0,
    longestStreak: statsRecord?.longestStreak || 0,
    dsaSolvedCount: statsRecord?.dsaSolvedCount || 0
  };

  // 3. Compute Topic Completion Progress Bars
  // Fetch all completed problem slugs for this student
  const solvedRows = await db
    .select({ problemSlug: studentDsaProgress.problemSlug })
    .from(studentDsaProgress)
    .where(
      and(
        eq(studentDsaProgress.studentId, studentId),
        eq(studentDsaProgress.isCompleted, true)
      )
    );

  const solvedSlugs = new Set(solvedRows.map((r) => r.problemSlug));

  const topicProgress: TopicProgress[] = STUDENT_DSA_SHEETS.map((sheet) => {
    const totalQuestions = sheet.questions.length;
    const solvedQuestions = sheet.questions.filter((q) => solvedSlugs.has(q.slug)).length;
    const percentage =
      totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;

    return {
      topicSlug: sheet.slug,
      topicTitle: sheet.title,
      totalQuestions,
      solvedQuestions,
      percentage
    };
  });

  // 4. Compute Category XP Breakdown
  const categoryXpRows = await db
    .select({
      activityType: activities.activityType,
      totalXp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`
    })
    .from(activities)
    .where(eq(activities.studentId, studentId))
    .groupBy(activities.activityType);

  let dsaXp = 0;
  let quizzesXp = 0;
  let projectsXp = 0;
  let externalXp = 0;

  categoryXpRows.forEach((r) => {
    const xp = Number(r.totalXp || 0);
    switch (r.activityType) {
      case 'dsa_solved':
        dsaXp += xp;
        break;
      case 'quiz_completed':
        quizzesXp += xp;
        break;
      case 'assignment_approved':
        projectsXp += xp;
        break;
      case 'external_assessment':
        externalXp += xp;
        break;
    }
  });

  const totalCategorizedXp = dsaXp + quizzesXp + projectsXp + externalXp;

  const xpBreakdown: CategoryXpBreakdown[] = [
    {
      category: 'dsa',
      label: 'DSA Practice',
      xp: dsaXp,
      percentage: totalCategorizedXp > 0 ? Math.round((dsaXp / totalCategorizedXp) * 100) : 0
    },
    {
      category: 'quizzes',
      label: 'Quizzes & Knowledge Checks',
      xp: quizzesXp,
      percentage: totalCategorizedXp > 0 ? Math.round((quizzesXp / totalCategorizedXp) * 100) : 0
    },
    {
      category: 'projects',
      label: 'Projects & Builds',
      xp: projectsXp,
      percentage: totalCategorizedXp > 0 ? Math.round((projectsXp / totalCategorizedXp) * 100) : 0
    },
    {
      category: 'external',
      label: 'External Assessments',
      xp: externalXp,
      percentage: totalCategorizedXp > 0 ? Math.round((externalXp / totalCategorizedXp) * 100) : 0
    }
  ];

  // 5. Compute 30-Day Activity Heatmap
  const last30Days = getLast30DaysIst();
  const startDate = last30Days[0];
  const endDate = last30Days[last30Days.length - 1];

  const recentActivities = await db
    .select({
      activityDateIst: activities.activityDateIst,
      count: sql<number>`count(*)::int`,
      totalXp: sql<number>`coalesce(sum(${activities.xpAwarded}), 0)::int`
    })
    .from(activities)
    .where(
      and(
        eq(activities.studentId, studentId),
        gte(activities.activityDateIst, startDate)
      )
    )
    .groupBy(activities.activityDateIst);

  const activityMap = new Map<string, { count: number; xp: number }>();
  recentActivities.forEach((row) => {
    activityMap.set(row.activityDateIst, {
      count: Number(row.count),
      xp: Number(row.totalXp)
    });
  });

  let totalPeriodXp = 0;
  let totalActiveDays = 0;

  const heatmapDays = last30Days.map((dateStr) => {
    const act = activityMap.get(dateStr) || { count: 0, xp: 0 };
    if (act.count > 0) {
      totalActiveDays++;
      totalPeriodXp += act.xp;
    }
    return {
      date: dateStr,
      formattedDate: formatIstDateReadable(dateStr),
      count: act.count,
      xp: act.xp,
      intensity: calculateHeatmapIntensity(act.count, act.xp)
    };
  });

  return {
    academic,
    career,
    stats,
    topicProgress,
    heatmap: {
      days: heatmapDays,
      totalActiveDays,
      totalPeriodXp,
      startDate,
      endDate
    },
    xpBreakdown
  };
}
