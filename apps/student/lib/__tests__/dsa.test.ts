import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStudentDsaData } from '../db/queries/dsa';
import { recordDsaProblemSolved } from '../actions/dsa';
import { STUDENT_DSA_SHEETS } from '../data/dsa-sheets';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
}));

// In-memory test store
let mockUsers: any[] = [];
let mockUserRoles: any[] = [];
let mockStudents: any[] = [];
let mockEnrollments: any[] = [];
let mockDsaProgress: any[] = [];
let mockActivities: any[] = [];
let mockStudentStats: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          // If table is users
          if (table === actual.users) {
            return {
              where: (clause: any) => ({
                limit: () => Promise.resolve(mockUsers)
              })
            };
          }

          // If table is userRoles
          if (table === actual.userRoles) {
            return {
              where: (clause: any) => Promise.resolve(mockUserRoles)
            };
          }

          // If table is students
          if (table === actual.students) {
            return {
              leftJoin: () => ({
                where: (clause: any) => ({
                  limit: () => Promise.resolve(mockStudents)
                })
              })
            };
          }

          // If table is enrollments
          if (table === actual.enrollments) {
            const makeQueryResult = () => {
              const p = Promise.resolve(mockEnrollments);
              (p as any).limit = () => Promise.resolve(mockEnrollments);
              return p;
            };

            return {
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => makeQueryResult()
                }),
                innerJoin: () => ({
                  where: () => makeQueryResult()
                })
              }),
              where: () => makeQueryResult()
            };
          }

          // If table is studentDsaProgress
          if (table === actual.studentDsaProgress) {
            return {
              where: (clause: any) => {
                return {
                  limit: () => Promise.resolve(mockDsaProgress),
                  then: (resolve: any) => Promise.resolve(mockDsaProgress).then(resolve)
                };
              }
            };
          }

          // If table is activities
          if (table === actual.activities) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockActivities)
              })
            };
          }

          // If table is studentStats
          if (table === actual.studentStats) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockStudentStats)
              })
            };
          }

          return {
            where: () => ({
              limit: () => Promise.resolve([])
            })
          };
        }
      }),
      insert: (table: any) => ({
        values: (values: any) => ({
          onConflictDoNothing: () => {
            if (table === actual.studentDsaProgress) {
              const existingIdx = mockDsaProgress.findIndex(
                (p) => p.studentId === values.studentId && p.problemSlug === values.problemSlug
              );
              if (existingIdx >= 0) {
                mockDsaProgress[existingIdx] = { ...mockDsaProgress[existingIdx], ...values };
              } else {
                mockDsaProgress.push({
                  id: mockDsaProgress.length + 1,
                  ...values
                });
              }
            } else if (table === actual.activities) {
              const existing = mockActivities.find(
                (a) =>
                  a.studentId === values.studentId &&
                  a.activityType === values.activityType &&
                  a.referenceId === values.referenceId
              );
              if (!existing) {
                mockActivities.push({
                  id: mockActivities.length + 1,
                  ...values
                });
              }
            }
            return Promise.resolve();
          }
        })
      }),
      update: (table: any) => ({
        set: (values: any) => ({
          where: (clause: any) => {
            if (table === actual.studentDsaProgress) {
              mockDsaProgress = mockDsaProgress.map((p) => ({ ...p, ...values }));
            } else if (table === actual.studentStats) {
              mockStudentStats = mockStudentStats.map((s) => ({ ...s, ...values }));
            }
            return Promise.resolve();
          }
        })
      })
    }
  };
});

describe('Slice 10: DSA Practice Center', () => {
  const validBatchId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    vi.clearAllMocks();

    mockUsers = [
      {
        id: 'usr-student-1',
        email: 'student@college.edu',
        name: 'Student One',
        status: 'active'
      }
    ];

    mockUserRoles = [
      {
        id: 1,
        userId: 'usr-student-1',
        role: 'student'
      }
    ];

    mockStudents = [
      {
        id: 101,
        userId: 'usr-student-1',
        fullName: 'Student One',
        email: 'student@college.edu',
        phone: null,
        collegeRollNumber: 'CS101',
        branch: 'CSE',
        year: 3,
        collegeId: 'col-1',
        collegeName: 'RMS Engineering College',
        collegeCode: 'RMS-ENG'
      }
    ];

    mockEnrollments = [
      {
        id: 1,
        studentId: 101,
        programId: 1,
        batchId: validBatchId,
        status: 'active'
      }
    ];

    mockDsaProgress = [];
    mockActivities = [];
    mockStudentStats = [
      {
        studentId: 101,
        collegeId: 'col-1',
        totalXp: 50,
        currentLevel: 1,
        currentStreak: 2,
        longestStreak: 5,
        dsaSolvedCount: 1,
        lastActivityDateIst: '2026-10-04'
      }
    ];

    mockAuth.mockResolvedValue({
      user: {
        id: 'usr-student-1',
        email: 'student@college.edu',
        role: 'student'
      }
    });
  });

  describe('1. getStudentDsaData Query & Ledger', () => {
    it('returns all curated sheets and 0 solved problems for a fresh student', async () => {
      const data = await getStudentDsaData(101);

      expect(data.sheets.length).toBe(STUDENT_DSA_SHEETS.length);
      expect(data.summary.totalProblems).toBe(10);
      expect(data.summary.totalSolved).toBe(0);
      expect(data.summary.overallPercentage).toBe(0);
      expect(Object.keys(data.progressMap).length).toBe(0);
    });

    it('accurately maps solved problems and computes metrics', async () => {
      mockDsaProgress = [
        {
          id: 1,
          studentId: 101,
          problemSlug: 'two-sum',
          isCompleted: true,
          submissionUrl: 'https://leetcode.com/submissions/detail/12345/',
          notes: 'Single-pass hash map',
          completedAt: new Date('2026-10-05T12:00:00Z'),
          updatedAt: new Date('2026-10-05T12:00:00Z')
        },
        {
          id: 2,
          studentId: 101,
          problemSlug: 'maximum-subarray',
          isCompleted: true,
          submissionUrl: null,
          notes: "Kadane's algorithm",
          completedAt: new Date('2026-10-05T13:00:00Z'),
          updatedAt: new Date('2026-10-05T13:00:00Z')
        }
      ];

      const data = await getStudentDsaData(101);

      expect(data.summary.totalSolved).toBe(2);
      expect(data.summary.overallPercentage).toBe(20);
      expect(data.summary.easySolved).toBe(1);
      expect(data.summary.mediumSolved).toBe(1);
      expect(data.progressMap['two-sum']?.isCompleted).toBe(true);
      expect(data.progressMap['two-sum']?.notes).toBe('Single-pass hash map');
      expect(data.progressMap['maximum-subarray']?.isCompleted).toBe(true);
      expect(data.progressMap['valid-palindrome']?.isCompleted).toBeFalsy();
    });
  });

  describe('2. recordDsaProblemSolved Server Action', () => {
    it('rejects unauthenticated requests without session', async () => {
      mockAuth.mockResolvedValue(null);

      await expect(
        recordDsaProblemSolved({ problemSlug: 'two-sum' })
      ).rejects.toThrow('REDIRECT:/login');
    });

    it('rejects invalid problem slug not found in catalog', async () => {
      const result = await recordDsaProblemSolved({ problemSlug: 'invalid-nonexistent-slug' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('rejects malformed submission URLs', async () => {
      const result = await recordDsaProblemSolved({
        problemSlug: 'two-sum',
        submissionUrl: 'ftp://invalid-url'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('http:// or https://');
      }
    });

    it('records newly solved Easy problem and awards 10 XP', async () => {
      const result = await recordDsaProblemSolved({
        problemSlug: 'two-sum',
        submissionUrl: 'https://leetcode.com/problems/two-sum/submissions/123/',
        notes: 'Hash map complement lookup',
        batchId: validBatchId
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isNewlySolved).toBe(true);
        expect(result.data.xpAwarded).toBe(10);
        expect(result.message).toContain('+10 XP');
      }

      // Verify student_dsa_progress insert
      expect(mockDsaProgress.length).toBe(1);
      expect(mockDsaProgress[0].problemSlug).toBe('two-sum');
      expect(mockDsaProgress[0].isCompleted).toBe(true);

      // Verify activities insert
      expect(mockActivities.length).toBe(1);
      expect(mockActivities[0].activityType).toBe('dsa_solved');
      expect(mockActivities[0].referenceId).toBe('two-sum');
      expect(mockActivities[0].xpAwarded).toBe(10);
      expect(mockActivities[0].batchId).toBe(validBatchId);

      // Verify studentStats update (consecutive day streak increments from 2 to 3)
      expect(mockStudentStats[0].totalXp).toBe(60);
      expect(mockStudentStats[0].currentStreak).toBe(3);
      expect(mockStudentStats[0].dsaSolvedCount).toBe(2);
    });

    it('records newly solved Medium problem and awards 25 XP', async () => {
      const result = await recordDsaProblemSolved({
        problemSlug: 'maximum-subarray'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isNewlySolved).toBe(true);
        expect(result.data.xpAwarded).toBe(25);
      }
    });

    it('is idempotent: updating an already solved problem awards 0 additional XP', async () => {
      mockDsaProgress = [
        {
          id: 1,
          studentId: 101,
          problemSlug: 'two-sum',
          isCompleted: true,
          submissionUrl: 'https://old-url.com',
          notes: 'Old notes'
        }
      ];

      const result = await recordDsaProblemSolved({
        problemSlug: 'two-sum',
        submissionUrl: 'https://new-url.com',
        notes: 'Updated new notes'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isNewlySolved).toBe(false);
        expect(result.data.xpAwarded).toBe(0);
        expect(result.message).toContain('updated');
      }

      // No new activity rows added
      expect(mockActivities.length).toBe(0);
      // Student XP remains unchanged
      expect(mockStudentStats[0].totalXp).toBe(50);
    });
  });
});
