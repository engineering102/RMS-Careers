import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getBatchLeaderboard,
  getCollegeLeaderboard,
  getLeaderboardData
} from '@/lib/db/queries/leaderboards';
import { getStartOfWeekIst } from '@/lib/services/activity-reward';

const TEST_STUDENT_ID = 101;
const PEER_STUDENT_ID_1 = 102;
const PEER_STUDENT_ID_2 = 103;
const TEST_COLLEGE_ID = 'col-1111-2222-3333-4444';
const OTHER_COLLEGE_ID = 'col-9999-9999-9999-9999';
const TEST_BATCH_ID = 'bat-1111-1111-1111-1111';
const UNENROLLED_BATCH_ID = 'bat-8888-8888-8888-8888';

let mockEnrollments: any[] = [];
let mockBatches: any[] = [];
let mockColleges: any[] = [];
let mockStudents: any[] = [];
let mockStudentStats: any[] = [];
let mockActivities: any[] = [];

vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');

  return {
    ...actual,
    db: {
      select: () => ({
        from: (table: any) => {
          // Colleges
          if (table === actual.colleges) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockColleges)
              })
            };
          }

          // Enrollments with innerJoin(batches)
          if (table === actual.enrollments) {
            const makeEnrollmentsChain = () => {
              const p = Promise.resolve(mockEnrollments);
              (p as any).limit = () => Promise.resolve(mockEnrollments);
              (p as any).innerJoin = (joinTable: any) => {
                if (joinTable === actual.students) {
                  return {
                    leftJoin: () => ({
                      leftJoin: () => ({
                        where: () => ({
                          groupBy: () => ({
                            orderBy: () => ({
                              limit: () => Promise.resolve(mockActivities)
                            })
                          })
                        })
                      })
                    })
                  };
                }
                return makeEnrollmentsChain();
              };
              (p as any).where = () => {
                const subP = Promise.resolve(mockEnrollments);
                (subP as any).limit = () => Promise.resolve(mockEnrollments);
                return subP;
              };
              return p;
            };
            return makeEnrollmentsChain();
          }

          // Students query (for college weekly)
          if (table === actual.students) {
            return {
              leftJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    groupBy: () => ({
                      orderBy: () => ({
                        limit: () => Promise.resolve(mockActivities)
                      })
                    })
                  })
                })
              })
            };
          }

          // StudentStats query
          if (table === actual.studentStats) {
            return {
              innerJoin: () => ({
                innerJoin: () => ({
                  where: () => ({
                    orderBy: () => ({
                      limit: () => Promise.resolve(mockStudentStats)
                    })
                  })
                }),
                where: () => ({
                  orderBy: () => ({
                    limit: () => Promise.resolve(mockStudentStats)
                  })
                })
              }),
              where: () => ({
                limit: () => Promise.resolve(mockStudentStats)
              })
            };
          }

          return {
            where: () => Promise.resolve([])
          };
        }
      })
    }
  };
});

describe('Slice 16: Leaderboards & Peer Rankings', () => {
  beforeEach(() => {
    mockColleges = [{ name: 'RMS Institute of Technology' }];

    mockBatches = [
      { id: TEST_BATCH_ID, name: 'CSE 2026 Alpha' }
    ];

    mockEnrollments = [
      {
        batchId: TEST_BATCH_ID,
        batchName: 'CSE 2026 Alpha'
      }
    ];

    mockStudentStats = [
      {
        studentId: PEER_STUDENT_ID_1,
        fullName: 'Aarav Sharma',
        branch: 'CSE',
        xp: 450,
        currentStreak: 7
      },
      {
        studentId: TEST_STUDENT_ID,
        fullName: 'Mohith Student',
        branch: 'CSE',
        xp: 320,
        currentStreak: 4
      },
      {
        studentId: PEER_STUDENT_ID_2,
        fullName: 'Diya Patel',
        branch: 'ECE',
        xp: 210,
        currentStreak: 2
      }
    ];

    mockActivities = [
      {
        studentId: TEST_STUDENT_ID,
        fullName: 'Mohith Student',
        branch: 'CSE',
        xp: 80,
        currentStreak: 4
      },
      {
        studentId: PEER_STUDENT_ID_1,
        fullName: 'Aarav Sharma',
        branch: 'CSE',
        xp: 60,
        currentStreak: 7
      }
    ];
  });

  describe('1. getStartOfWeekIst Calendar Arithmetic', () => {
    it('returns Monday for any date in the week in Asia/Kolkata', () => {
      // 2026-10-06 is Tuesday -> Monday is 2026-10-05
      const mondayFromTuesday = getStartOfWeekIst(new Date('2026-10-06T12:00:00Z'));
      expect(mondayFromTuesday).toBe('2026-10-05');

      // 2026-10-05 is Monday -> Monday is 2026-10-05
      const mondayFromMonday = getStartOfWeekIst(new Date('2026-10-05T08:00:00Z'));
      expect(mondayFromMonday).toBe('2026-10-05');

      // 2026-10-11 is Sunday in Asia/Kolkata -> Monday is 2026-10-05
      const mondayFromSunday = getStartOfWeekIst(new Date('2026-10-11T12:00:00Z'));
      expect(mondayFromSunday).toBe('2026-10-05');
    });
  });

  describe('2. getBatchLeaderboard Query & Authorization', () => {
    it('fetches all-time batch leaderboard and ranks students by total XP', async () => {
      const data = await getBatchLeaderboard(
        TEST_STUDENT_ID,
        TEST_COLLEGE_ID,
        TEST_BATCH_ID,
        'all_time'
      );

      expect(data.scope).toBe('batch');
      expect(data.timeframe).toBe('all_time');
      expect(data.batchName).toBe('CSE 2026 Alpha');
      expect(data.entries).toHaveLength(3);

      // Rank 1
      expect(data.entries[0]).toMatchObject({
        rank: 1,
        studentId: PEER_STUDENT_ID_1,
        fullName: 'Aarav Sharma',
        xp: 450,
        isCurrentUser: false
      });

      // Rank 2 (Current User)
      expect(data.entries[1]).toMatchObject({
        rank: 2,
        studentId: TEST_STUDENT_ID,
        fullName: 'Mohith Student',
        xp: 320,
        isCurrentUser: true
      });

      // Standing
      expect(data.userStanding).toEqual({
        rank: 2,
        xp: 320,
        currentStreak: 4,
        totalParticipants: 3
      });
    });

    it('fetches weekly batch leaderboard with weekly XP aggregation', async () => {
      const data = await getBatchLeaderboard(
        TEST_STUDENT_ID,
        TEST_COLLEGE_ID,
        TEST_BATCH_ID,
        'weekly'
      );

      expect(data.scope).toBe('batch');
      expect(data.timeframe).toBe('weekly');
      expect(data.weekStartDateIst).toBeDefined();
      expect(data.entries).toHaveLength(2);

      // Current user is #1 in weekly XP
      expect(data.entries[0]).toMatchObject({
        rank: 1,
        studentId: TEST_STUDENT_ID,
        xp: 80,
        isCurrentUser: true
      });

      expect(data.userStanding.rank).toBe(1);
    });

    it('strictly denies access when student is not enrolled in the requested batch', async () => {
      mockEnrollments = []; // Unenrolled

      await expect(
        getBatchLeaderboard(
          TEST_STUDENT_ID,
          TEST_COLLEGE_ID,
          UNENROLLED_BATCH_ID,
          'all_time'
        )
      ).rejects.toThrow('UnauthorizedBatchEnrollment');
    });
  });

  describe('3. getCollegeLeaderboard Query & Scope', () => {
    it('fetches college leaderboard scoped strictly to student college', async () => {
      const data = await getCollegeLeaderboard(
        TEST_STUDENT_ID,
        TEST_COLLEGE_ID,
        'all_time'
      );

      expect(data.scope).toBe('college');
      expect(data.collegeName).toBe('RMS Institute of Technology');
      expect(data.entries).toHaveLength(3);
      expect(data.userStanding.rank).toBe(2);
    });
  });

  describe('4. getLeaderboardData Unified Coordination', () => {
    it('defaults to batch scope and primary enrolled batch when params are omitted', async () => {
      const data = await getLeaderboardData({
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID
      });

      expect(data.scope).toBe('batch');
      expect(data.timeframe).toBe('weekly');
      expect(data.batchId).toBe(TEST_BATCH_ID);
      expect(data.availableBatches).toHaveLength(1);
    });

    it('switches cleanly to college scope when requested', async () => {
      const data = await getLeaderboardData({
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        scope: 'college',
        timeframe: 'all_time'
      });

      expect(data.scope).toBe('college');
      expect(data.timeframe).toBe('all_time');
    });
  });
});
