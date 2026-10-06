import type { ActivityTypeEnum } from '@rms/db';

export type ActivityType = ActivityTypeEnum;

/**
 * Standard calibrated XP values per learning modality per specification.
 */
export const XP_VALUES = {
  DSA_EASY: 10,
  DSA_MEDIUM: 25,
  DSA_HARD: 50,
  LECTURE_WATCHED: 5,
  PRACTICE_QUIZ_PASS: 20,
  FORMAL_ASSESSMENT_PASS: 20,
  PROJECT_APPROVED: 150,
  EXTERNAL_ASSESSMENT: 50
} as const;

export interface StreakEvaluationResult {
  currentStreak: number;
  longestStreak: number;
  streakAdvanced: boolean;
  isConsecutiveDay: boolean;
  isSameDay: boolean;
  isStreakBroken: boolean;
  lastActivityDateIst: string;
}

export interface RecordActivityParams {
  studentId: number;
  collegeId: string;
  batchId?: string;
  activityType: ActivityType;
  referenceId: string;
  xpAmount: number;
}

export interface RecordActivityResult {
  xpAwarded: number;
  streakAdvanced: boolean;
  isDuplicate: boolean;
  currentStreak: number;
  longestStreak?: number;
  totalXp: number;
  currentLevel: number;
}

export interface LearningActivityRecord {
  id: number;
  studentId: number;
  batchId: string | null;
  batchName: string | null;
  activityType: ActivityType;
  referenceId: string;
  title: string;
  xpAwarded: number;
  activityDateIst: string; // 'YYYY-MM-DD'
  createdAt: Date;
}

export interface StudentStreakDetails {
  currentStreak: number;
  longestStreak: number;
  lastActivityDateIst: string | null;
  isActiveToday: boolean;
  isAtRisk: boolean;
  totalXp: number;
  currentLevel: number;
}

export interface ActivityLedgerData {
  activities: LearningActivityRecord[];
  totalCount: number;
  totalXpEarned: number;
  streakDetails: StudentStreakDetails;
}
