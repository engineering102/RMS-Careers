import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getStudentActivityLedger,
  getStudentStreakDetails
} from '@/lib/db/queries/activities';
import { getTodayDateIst, getYesterdayDateIst } from '@/lib/services/activity-reward';

const TEST_STUDENT_ID = 42;
const OTHER_STUDENT_ID = 999;
const TEST_BATCH_ID = '11111111-1111-4111-8111-111111111111';

let mockActivities: any[] = [];
let mockBatches: any[] = [];
let mockStudentStats: any[] = [];

vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          // studentStats query
          if (table === actual.studentStats) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockStudentStats)
              })
            };
          }

          // activities query with leftJoin(batches)
          if (table === actual.activities) {
            const chain = {
              leftJoin: () => chain,
              where: () => {
                const subChain = {
                  orderBy: () => ({
                    limit: () => ({
                      offset: () => Promise.resolve(mockActivities)
                    })
                  })
                };
                return subChain;
              }
            };

            // If fields is for count(*) or coalesce(sum(...))
            if (fields && 'count' in fields) {
              return {
                where: () => Promise.resolve([{ count: mockActivities.length }])
              };
            }
            if (fields && 'totalXp' in fields) {
              const sum = mockActivities.reduce((acc, a) => acc + (a.xpAwarded || 0), 0);
              return {
                where: () => Promise.resolve([{ totalXp: sum }])
              };
            }

            return chain;
          }

          return {
            where: () => Promise.resolve([])
          };
        }
      })
    }
  };
});

describe('Slice 15: Activity Ledger & Streak Details Queries', () => {
  beforeEach(() => {
    mockActivities = [];
    mockBatches = [];
    mockStudentStats = [];
  });

  describe('getStudentStreakDetails', () => {
    it('returns default 0 values when student has no stats row', async () => {
      mockStudentStats = [];
      const details = await getStudentStreakDetails(TEST_STUDENT_ID);

      expect(details).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDateIst: null,
        isActiveToday: false,
        isAtRisk: false,
        totalXp: 0,
        currentLevel: 1
      });
    });

    it('identifies student as active today when lastActivityDateIst matches today', async () => {
      const today = getTodayDateIst();
      mockStudentStats = [
        {
          studentId: TEST_STUDENT_ID,
          totalXp: 250,
          currentLevel: 3,
          currentStreak: 5,
          longestStreak: 8,
          lastActivityDateIst: today
        }
      ];

      const details = await getStudentStreakDetails(TEST_STUDENT_ID);

      expect(details.isActiveToday).toBe(true);
      expect(details.isAtRisk).toBe(false);
      expect(details.currentStreak).toBe(5);
    });

    it('identifies streak at risk when student was active yesterday but not yet today', async () => {
      const today = getTodayDateIst();
      const yesterday = getYesterdayDateIst(today);

      mockStudentStats = [
        {
          studentId: TEST_STUDENT_ID,
          totalXp: 180,
          currentLevel: 2,
          currentStreak: 4,
          longestStreak: 6,
          lastActivityDateIst: yesterday
        }
      ];

      const details = await getStudentStreakDetails(TEST_STUDENT_ID);

      expect(details.isActiveToday).toBe(false);
      expect(details.isAtRisk).toBe(true);
      expect(details.currentStreak).toBe(4);
    });
  });

  describe('getStudentActivityLedger', () => {
    it('returns enriched activity records with formatted titles and summary metrics', async () => {
      const today = getTodayDateIst();

      mockActivities = [
        {
          id: 1,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          batchName: 'CSE 2026 Alpha',
          activityType: 'dsa_solved',
          referenceId: 'two-sum',
          xpAwarded: 10,
          activityDateIst: today,
          createdAt: new Date('2026-10-06T09:00:00Z')
        },
        {
          id: 2,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          batchName: 'CSE 2026 Alpha',
          activityType: 'lecture_completed',
          referenceId: 'lec-week-1',
          xpAwarded: 5,
          activityDateIst: today,
          createdAt: new Date('2026-10-06T08:30:00Z')
        }
      ];

      mockStudentStats = [
        {
          studentId: TEST_STUDENT_ID,
          totalXp: 15,
          currentLevel: 1,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDateIst: today
        }
      ];

      const ledger = await getStudentActivityLedger(TEST_STUDENT_ID);

      expect(ledger.totalCount).toBe(2);
      expect(ledger.totalXpEarned).toBe(15);
      expect(ledger.activities).toHaveLength(2);

      expect(ledger.activities[0]).toMatchObject({
        id: 1,
        studentId: TEST_STUDENT_ID,
        batchName: 'CSE 2026 Alpha',
        activityType: 'dsa_solved',
        referenceId: 'two-sum',
        title: 'Problem Solved: Two Sum',
        xpAwarded: 10
      });

      expect(ledger.activities[1]).toMatchObject({
        id: 2,
        studentId: TEST_STUDENT_ID,
        activityType: 'lecture_completed',
        title: 'Curriculum Lecture Completed',
        xpAwarded: 5
      });
    });

    it('returns empty ledger when student has no recorded activities', async () => {
      mockActivities = [];
      mockStudentStats = [];

      const ledger = await getStudentActivityLedger(TEST_STUDENT_ID);

      expect(ledger.activities).toEqual([]);
      expect(ledger.totalCount).toBe(0);
      expect(ledger.totalXpEarned).toBe(0);
      expect(ledger.streakDetails.currentStreak).toBe(0);
    });
  });
});
