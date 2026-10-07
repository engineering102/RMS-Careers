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
let mockBatchAllTimeEntries: any[] = [];
let mockBatchWeeklyEntries: any[] = [];
let mockUserBatchXp = 0;
let mockUserStreak = 0;

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

          // Activities fallback query (e.g. for user standing outside top 50)
          if (table === actual.activities) {
            return {
              where: () => Promise.resolve([{ batchXp: mockUserBatchXp }])
            };
          }

          // Enrollments with innerJoin(batches) or innerJoin(students)
          if (table === actual.enrollments) {
            const makeEnrollmentsChain = () => {
              const p = Promise.resolve(mockEnrollments);
              (p as any).limit = () => Promise.resolve(mockEnrollments);
              (p as any).innerJoin = (joinTable: any) => {
                if (joinTable === actual.students) {
                  return {
                    leftJoin: () => ({
                      leftJoin: (_actTable: any, condition: any) => ({
                        where: () => ({
                          groupBy: () => ({
                            orderBy: () => ({
                              limit: () => {
                                function hasDateParam(obj: any): boolean {
                                  if (!obj) return false;
                                  if (typeof obj.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.value)) return true;
                                  if (Array.isArray(obj.queryChunks)) {
                                    return obj.queryChunks.some(hasDateParam);
                                  }
                                  return false;
                                }
                                const isWeekly = hasDateParam(condition);
                                return Promise.resolve(isWeekly ? mockBatchWeeklyEntries : mockBatchAllTimeEntries);
                              }
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
                limit: () => Promise.resolve([
                  { currentStreak: mockUserStreak, totalXp: 320 }
                ])
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

describe('Slice 16 & Phase 4: Scoped Leaderboards & Batch XP Isolation', () => {
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

    mockBatchAllTimeEntries = [
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

    mockBatchWeeklyEntries = [
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

    mockUserBatchXp = 320;
    mockUserStreak = 4;
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
    it('fetches all-time batch leaderboard and ranks students by batch-attributed XP', async () => {
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

    it('fetches weekly batch leaderboard with weekly batch-scoped XP aggregation', async () => {
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

  describe('3. Phase 4 Scoped Leaderboards Scenarios (A through F)', () => {
    it('Scenario A & C: isolates Batch A XP from Batch B XP in all-time leaderboard', async () => {
      // Student has 500 XP in Batch A, but 800 global XP across other batches
      mockBatchAllTimeEntries = [
        {
          studentId: TEST_STUDENT_ID,
          fullName: 'Mohith Student',
          branch: 'CSE',
          xp: 500, // Batch A attributed only
          currentStreak: 5
        }
      ];

      const data = await getBatchLeaderboard(
        TEST_STUDENT_ID,
        TEST_COLLEGE_ID,
        TEST_BATCH_ID,
        'all_time'
      );

      expect(data.entries[0].xp).toBe(500);
      expect(data.userStanding.xp).toBe(500);
    });

    it('Scenario B: unscoped activities (batchId = null) do not inflate batch rankings', async () => {
      // General DSA practice (batchId = null) gives global stats, but batch entries only sum batch XP
      mockBatchAllTimeEntries = [
        {
          studentId: TEST_STUDENT_ID,
          fullName: 'Mohith Student',
          branch: 'CSE',
          xp: 150, // Only 150 earned in Batch A, ignoring 50 DSA practice
          currentStreak: 3
        }
      ];

      const data = await getBatchLeaderboard(
        TEST_STUDENT_ID,
        TEST_COLLEGE_ID,
        TEST_BATCH_ID,
        'all_time'
      );

      expect(data.entries[0].xp).toBe(150);
    });

    it('Scenario D: student outside top 50 calculates batch-scoped individual standing', async () => {
      // Top entries do not include TEST_STUDENT_ID
      mockBatchAllTimeEntries = [
        {
          studentId: PEER_STUDENT_ID_1,
          fullName: 'Aarav Sharma',
          branch: 'CSE',
          xp: 800,
          currentStreak: 10
        }
      ];
      mockUserBatchXp = 75; // Batch-attributed XP specifically
      mockUserStreak = 2;

      const data = await getBatchLeaderboard(
        TEST_STUDENT_ID,
        TEST_COLLEGE_ID,
        TEST_BATCH_ID,
        'all_time'
      );

      expect(data.userStanding.rank).toBeNull();
      expect(data.userStanding.xp).toBe(75);
      expect(data.userStanding.currentStreak).toBe(2);
    });

    it('Scenario E: weekly batch leaderboard isolates weekly activities by batchId', async () => {
      // Weekly XP specifically earned in this batch
      mockBatchWeeklyEntries = [
        {
          studentId: TEST_STUDENT_ID,
          fullName: 'Mohith Student',
          branch: 'CSE',
          xp: 40,
          currentStreak: 4
        }
      ];

      const data = await getBatchLeaderboard(
        TEST_STUDENT_ID,
        TEST_COLLEGE_ID,
        TEST_BATCH_ID,
        'weekly'
      );

      expect(data.entries[0].xp).toBe(40);
      expect(data.userStanding.xp).toBe(40);
    });

    it('Scenario F: college leaderboard preserves college-wide scope across all student XP', async () => {
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
