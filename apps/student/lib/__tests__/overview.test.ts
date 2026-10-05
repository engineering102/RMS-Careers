import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStudentOverview,
  getTodayDateIst,
  getLast30DaysIst,
  calculateHeatmapIntensity,
  formatIstDateReadable
} from '../db/queries/overview';

vi.mock('server-only', () => ({}));

// In-memory test mocks
let mockStudentStats: any[] = [];
let mockEnrollments: any[] = [];
let mockCurriculumDeadlines: any[] = [];
let mockPassedQuizzes: any[] = [];
let mockSubmittedProjects: any[] = [];
let mockActivities: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          // If table is studentStats
          if (table === actual.studentStats) {
            return {
              where: (clause: any) => ({
                limit: () => Promise.resolve(mockStudentStats)
              })
            };
          }

          // If table is enrollments
          if (table === actual.enrollments) {
            return {
              where: (clause: any) => Promise.resolve(mockEnrollments)
            };
          }

          // If table is activities
          if (table === actual.activities) {
            return {
              where: (clause: any) => ({
                groupBy: () => Promise.resolve(mockActivities)
              })
            };
          }

          // If table is quizAttempts
          if (table === actual.quizAttempts) {
            return {
              innerJoin: () => ({
                where: () => Promise.resolve(mockPassedQuizzes)
              })
            };
          }

          // If table is assignmentSubmissions
          if (table === actual.assignmentSubmissions) {
            return {
              innerJoin: () => ({
                where: () => Promise.resolve(mockSubmittedProjects)
              })
            };
          }

          // If table is batchCurriculum
          if (table === actual.batchCurriculum) {
            return {
              innerJoin: () => ({
                innerJoin: () => ({
                  where: (clause: any) => ({
                    orderBy: () => ({
                      limit: () => Promise.resolve(mockCurriculumDeadlines)
                    })
                  })
                })
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

describe('Slice 6: Student Overview Dashboard & getStudentOverview', () => {
  const studentId = 42;
  const accessibleBatchId = 'batch-uuid-101';
  const otherBatchId = 'batch-uuid-999';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    mockStudentStats = [
      {
        totalXp: 1250,
        currentLevel: 3,
        currentStreak: 7,
        longestStreak: 14,
        dsaSolvedCount: 25,
        lastActivityDateIst: '2026-10-05'
      }
    ];

    mockEnrollments = [{ batchId: accessibleBatchId }];

    mockCurriculumDeadlines = [
      {
        id: 1,
        batchId: accessibleBatchId,
        batchName: 'Alpha Batch 2026',
        contentItemId: 'content-quiz-01',
        title: 'Binary Search Practice Quiz',
        contentType: 'quiz',
        weekNumber: 2,
        dueAt: new Date(Date.now() + 86400000) // tomorrow
      },
      {
        id: 2,
        batchId: accessibleBatchId,
        batchName: 'Alpha Batch 2026',
        contentItemId: 'content-project-01',
        title: 'Fullstack Portfolio Project',
        contentType: 'project',
        weekNumber: 3,
        dueAt: new Date(Date.now() + 172800000) // 2 days
      }
    ];

    mockPassedQuizzes = [{ contentItemId: 'content-quiz-01' }];
    mockSubmittedProjects = [];

    mockActivities = [
      {
        activityDateIst: '2026-10-05',
        count: 3,
        totalXp: 75
      },
      {
        activityDateIst: '2026-10-04',
        count: 1,
        totalXp: 20
      }
    ];
  });

  describe('IST Date & Heatmap Utilities', () => {
    it('generates an exact 30-day window ending on the reference date', () => {
      const ref = new Date('2026-10-05T12:00:00Z');
      const window = getLast30DaysIst(ref);

      expect(window).toHaveLength(30);
      expect(window[window.length - 1]).toBe('2026-10-05');
      expect(window[0]).toBe('2026-09-06');
    });

    it('formats IST date string into readable month and day', () => {
      const formatted = formatIstDateReadable('2026-10-05');
      expect(formatted).toBe('Oct 5, 2026');
    });

    it('correctly calculates intensity levels based on XP and activity count', () => {
      expect(calculateHeatmapIntensity(0, 0)).toBe(0);
      expect(calculateHeatmapIntensity(15, 1)).toBe(1);
      expect(calculateHeatmapIntensity(40, 2)).toBe(2);
      expect(calculateHeatmapIntensity(80, 4)).toBe(3);
      expect(calculateHeatmapIntensity(150, 5)).toBe(4);
    });
  });

  describe('getStudentOverview Query', () => {
    it('correctly derives total XP, level, and streak from student_stats', async () => {
      const overview = await getStudentOverview(studentId, [accessibleBatchId]);

      expect(overview.stats.totalXp).toBe(1250);
      expect(overview.stats.currentLevel).toBe(3);
      expect(overview.stats.currentStreak).toBe(7);
      expect(overview.stats.longestStreak).toBe(14);
      expect(overview.stats.dsaSolvedCount).toBe(25);
      expect(overview.stats.lastActivityDateIst).toBe('2026-10-05');
    });

    it('gracefully handles missing student_stats without throwing', async () => {
      mockStudentStats = []; // no stats row in db

      const overview = await getStudentOverview(studentId, [accessibleBatchId]);

      expect(overview.stats).toEqual({
        totalXp: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        dsaSolvedCount: 0,
        lastActivityDateIst: null
      });
    });

    it('aggregates upcoming deadlines and accurately flags completion status', async () => {
      const overview = await getStudentOverview(studentId, [accessibleBatchId]);

      expect(overview.deadlines).toHaveLength(2);

      const quizDeadline = overview.deadlines.find((d) => d.contentType === 'quiz');
      expect(quizDeadline).toBeDefined();
      expect(quizDeadline?.title).toBe('Binary Search Practice Quiz');
      expect(quizDeadline?.isCompleted).toBe(true); // passed in mockPassedQuizzes

      const projectDeadline = overview.deadlines.find((d) => d.contentType === 'project');
      expect(projectDeadline).toBeDefined();
      expect(projectDeadline?.title).toBe('Fullstack Portfolio Project');
      expect(projectDeadline?.isCompleted).toBe(false); // not submitted
    });

    it('returns empty deadlines when student has no accessible batches', async () => {
      mockEnrollments = []; // no active enrollments
      const overview = await getStudentOverview(studentId, []);

      expect(overview.deadlines).toEqual([]);
    });

    it('constructs a complete 30-day activity heatmap and populates missing days with 0', async () => {
      const overview = await getStudentOverview(studentId, [accessibleBatchId]);

      expect(overview.heatmap.days).toHaveLength(30);

      // Verify today has activities from mock
      const today = getTodayDateIst();
      const todayCell = overview.heatmap.days.find((d) => d.date === today);
      if (todayCell && todayCell.date === '2026-10-05') {
        expect(todayCell.count).toBe(3);
        expect(todayCell.xp).toBe(75);
        expect(todayCell.intensity).toBe(3);
      }

      // Verify a day with no activity has 0 count and 0 XP
      const inactiveDays = overview.heatmap.days.filter((d) => d.count === 0);
      expect(inactiveDays.length).toBeGreaterThan(0);
      expect(inactiveDays[0].xp).toBe(0);
      expect(inactiveDays[0].intensity).toBe(0);

      // Verify aggregate metrics
      expect(overview.heatmap.totalActiveDays).toBe(2);
      expect(overview.heatmap.totalPeriodXp).toBe(95); // 75 + 20
    });

    it('returns safe fallback state if studentId is falsy or database URL is unset', async () => {
      delete process.env.POSTGRES_URL;

      const overview = await getStudentOverview(0);

      expect(overview.stats.totalXp).toBe(0);
      expect(overview.deadlines).toEqual([]);
      expect(overview.heatmap.days).toHaveLength(30);
      expect(overview.heatmap.totalActiveDays).toBe(0);
      expect(overview.heatmap.totalPeriodXp).toBe(0);
    });
  });
});
