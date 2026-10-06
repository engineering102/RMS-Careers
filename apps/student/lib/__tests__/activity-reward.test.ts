import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getTodayDateIst,
  getYesterdayDateIst,
  isConsecutiveIstDay,
  evaluateStreak,
  recordLearningActivity
} from '@/lib/services/activity-reward';
import { XP_VALUES } from '@/lib/types/activity';

const TEST_STUDENT_ID = 101;
const TEST_COLLEGE_ID = 'col-1111-2222-3333-4444';
const TEST_BATCH_ID = 'bat-5555-6666-7777-8888';

let mockActivities: any[] = [];
let mockStudentStats: any[] = [];

vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');

  return {
    ...actual,
    db: {
      select: () => ({
        from: (table: any) => {
          if (table === actual.activities) {
            return {
              where: (cond: any) => ({
                limit: () => Promise.resolve(mockActivities)
              })
            };
          }

          if (table === actual.studentStats) {
            return {
              where: (cond: any) => ({
                limit: () => Promise.resolve(mockStudentStats)
              })
            };
          }

          return {
            where: () => Promise.resolve([])
          };
        }
      }),
      insert: (table: any) => ({
        values: (values: any) => {
          const execute = () => {
            if (table === actual.activities) {
              const existing = mockActivities.find(
                (a) =>
                  a.studentId === values.studentId &&
                  a.activityType === values.activityType &&
                  a.referenceId === values.referenceId
              );
              if (!existing) {
                mockActivities.push({
                  id: mockActivities.length + 1,
                  ...values,
                  createdAt: new Date()
                });
              }
            } else if (table === actual.studentStats) {
              mockStudentStats.push({ ...values });
            }
            return Promise.resolve();
          };

          const p = execute();
          (p as any).onConflictDoNothing = () => p;
          return p;
        }
      }),
      update: (table: any) => ({
        set: (updates: any) => ({
          where: (cond: any) => {
            if (table === actual.studentStats && mockStudentStats.length > 0) {
              Object.assign(mockStudentStats[0], updates);
            }
            return Promise.resolve();
          }
        })
      })
    }
  };
});

describe('Slice 15: Activity Ledger & Asia/Kolkata Streak Engine', () => {
  beforeEach(() => {
    mockActivities = [];
    mockStudentStats = [];
  });

  describe('1. IST Date & Calendar Arithmetic', () => {
    it('produces YYYY-MM-DD date strings in Asia/Kolkata timezone', () => {
      const today = getTodayDateIst();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('calculates the exact previous calendar day across standard days', () => {
      expect(getYesterdayDateIst('2026-10-06')).toBe('2026-10-05');
      expect(getYesterdayDateIst('2026-10-15')).toBe('2026-10-14');
    });

    it('calculates the exact previous calendar day across month boundaries', () => {
      expect(getYesterdayDateIst('2026-10-01')).toBe('2026-09-30');
      expect(getYesterdayDateIst('2026-05-01')).toBe('2026-04-30');
    });

    it('calculates the exact previous calendar day across leap year February', () => {
      expect(getYesterdayDateIst('2024-03-01')).toBe('2024-02-29');
      expect(getYesterdayDateIst('2023-03-01')).toBe('2023-02-28');
    });

    it('calculates the exact previous calendar day across year boundaries', () => {
      expect(getYesterdayDateIst('2026-01-01')).toBe('2025-12-31');
    });

    it('verifies consecutive IST day relationships accurately', () => {
      expect(isConsecutiveIstDay('2026-10-05', '2026-10-06')).toBe(true);
      expect(isConsecutiveIstDay('2026-10-04', '2026-10-06')).toBe(false);
      expect(isConsecutiveIstDay('2026-10-06', '2026-10-06')).toBe(false);
    });
  });

  describe('2. evaluateStreak Pure Engine', () => {
    const today = '2026-10-06';
    const yesterday = '2026-10-05';
    const twoDaysAgo = '2026-10-04';

    it('evaluates first activity ever: initializes streak to 1', () => {
      const result = evaluateStreak(
        { currentStreak: 0, longestStreak: 0, lastActivityDateIst: null },
        today
      );

      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 1,
        streakAdvanced: true,
        isConsecutiveDay: false,
        isSameDay: false,
        isStreakBroken: false,
        lastActivityDateIst: today
      });
    });

    it('evaluates same day activity: leaves streak unchanged and flags isSameDay', () => {
      const result = evaluateStreak(
        { currentStreak: 5, longestStreak: 10, lastActivityDateIst: today },
        today
      );

      expect(result).toEqual({
        currentStreak: 5,
        longestStreak: 10,
        streakAdvanced: false,
        isConsecutiveDay: false,
        isSameDay: true,
        isStreakBroken: false,
        lastActivityDateIst: today
      });
    });

    it('evaluates consecutive day activity: increments current streak and updates longest streak', () => {
      const result = evaluateStreak(
        { currentStreak: 5, longestStreak: 10, lastActivityDateIst: yesterday },
        today
      );

      expect(result).toEqual({
        currentStreak: 6,
        longestStreak: 10,
        streakAdvanced: true,
        isConsecutiveDay: true,
        isSameDay: false,
        isStreakBroken: false,
        lastActivityDateIst: today
      });
    });

    it('evaluates consecutive day activity: beats longest streak when current streak surpasses it', () => {
      const result = evaluateStreak(
        { currentStreak: 10, longestStreak: 10, lastActivityDateIst: yesterday },
        today
      );

      expect(result).toEqual({
        currentStreak: 11,
        longestStreak: 11,
        streakAdvanced: true,
        isConsecutiveDay: true,
        isSameDay: false,
        isStreakBroken: false,
        lastActivityDateIst: today
      });
    });

    it('evaluates missed day: resets current streak to 1, preserves longest streak, and flags broken', () => {
      const result = evaluateStreak(
        { currentStreak: 7, longestStreak: 14, lastActivityDateIst: twoDaysAgo },
        today
      );

      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 14,
        streakAdvanced: true,
        isConsecutiveDay: false,
        isSameDay: false,
        isStreakBroken: true,
        lastActivityDateIst: today
      });
    });
  });

  describe('3. recordLearningActivity Integration & Idempotency', () => {
    it('creates initial studentStats and awards XP for first activity', async () => {
      const result = await recordLearningActivity({
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        batchId: TEST_BATCH_ID,
        activityType: 'dsa_solved',
        referenceId: 'two-sum',
        xpAmount: XP_VALUES.DSA_EASY
      });

      expect(result).toEqual({
        xpAwarded: 10,
        streakAdvanced: true,
        isDuplicate: false,
        currentStreak: 1,
        longestStreak: 1,
        totalXp: 10,
        currentLevel: 1
      });

      expect(mockActivities).toHaveLength(1);
      expect(mockActivities[0]).toMatchObject({
        studentId: TEST_STUDENT_ID,
        batchId: TEST_BATCH_ID,
        activityType: 'dsa_solved',
        referenceId: 'two-sum',
        xpAwarded: 10
      });

      expect(mockStudentStats).toHaveLength(1);
      expect(mockStudentStats[0]).toMatchObject({
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        totalXp: 10,
        currentStreak: 1,
        longestStreak: 1,
        dsaSolvedCount: 1
      });
    });

    it('advances streak and accumulates XP for consecutive day activity', async () => {
      const today = getTodayDateIst();
      const yesterday = getYesterdayDateIst(today);

      // Pre-existing stats from yesterday
      mockStudentStats = [
        {
          studentId: TEST_STUDENT_ID,
          collegeId: TEST_COLLEGE_ID,
          totalXp: 85,
          currentLevel: 1,
          currentStreak: 3,
          longestStreak: 5,
          dsaSolvedCount: 4,
          lastActivityDateIst: yesterday
        }
      ];

      const result = await recordLearningActivity({
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        batchId: TEST_BATCH_ID,
        activityType: 'lecture_completed',
        referenceId: 'lec-week-1-intro',
        xpAmount: XP_VALUES.LECTURE_WATCHED
      });

      expect(result).toEqual({
        xpAwarded: 5,
        streakAdvanced: true,
        isDuplicate: false,
        currentStreak: 4,
        longestStreak: 5,
        totalXp: 90,
        currentLevel: 1
      });

      expect(mockStudentStats[0].currentStreak).toBe(4);
      expect(mockStudentStats[0].totalXp).toBe(90);
      expect(mockStudentStats[0].dsaSolvedCount).toBe(4); // Did not increment for lecture
    });

    it('levels up student when total XP reaches the next hundred-point threshold', async () => {
      const today = getTodayDateIst();
      const yesterday = getYesterdayDateIst(today);

      mockStudentStats = [
        {
          studentId: TEST_STUDENT_ID,
          collegeId: TEST_COLLEGE_ID,
          totalXp: 90,
          currentLevel: 1,
          currentStreak: 1,
          longestStreak: 2,
          dsaSolvedCount: 1,
          lastActivityDateIst: yesterday
        }
      ];

      const result = await recordLearningActivity({
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        batchId: TEST_BATCH_ID,
        activityType: 'quiz_completed',
        referenceId: 'quiz-arrays-basics',
        xpAmount: XP_VALUES.PRACTICE_QUIZ_PASS
      });

      // 90 + 20 = 110 XP -> Level 2
      expect(result.totalXp).toBe(110);
      expect(result.currentLevel).toBe(2);
      expect(mockStudentStats[0].currentLevel).toBe(2);
    });

    it('rejects duplicate activities idempotently without awarding XP or altering streak', async () => {
      const today = getTodayDateIst();

      // Activity already recorded
      mockActivities = [
        {
          id: 1,
          studentId: TEST_STUDENT_ID,
          activityType: 'dsa_solved',
          referenceId: 'two-sum',
          xpAwarded: 10,
          activityDateIst: today
        }
      ];

      mockStudentStats = [
        {
          studentId: TEST_STUDENT_ID,
          collegeId: TEST_COLLEGE_ID,
          totalXp: 50,
          currentLevel: 1,
          currentStreak: 2,
          longestStreak: 2,
          dsaSolvedCount: 3,
          lastActivityDateIst: today
        }
      ];

      const result = await recordLearningActivity({
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        batchId: TEST_BATCH_ID,
        activityType: 'dsa_solved',
        referenceId: 'two-sum', // duplicate
        xpAmount: XP_VALUES.DSA_EASY
      });

      expect(result).toEqual({
        xpAwarded: 0,
        streakAdvanced: false,
        isDuplicate: true,
        currentStreak: 2,
        totalXp: 50,
        currentLevel: 1
      });

      // Activities list should remain untouched (still 1 row)
      expect(mockActivities).toHaveLength(1);
      expect(mockStudentStats[0].totalXp).toBe(50);
    });
  });
});
