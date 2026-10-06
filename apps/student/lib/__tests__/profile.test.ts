import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const TEST_STUDENT_ID = 101;
const OTHER_STUDENT_ID = 999;
const TEST_COLLEGE_ID = 'col-1111-2222-3333-4444';

let mockStudents: any[] = [];
let mockColleges: any[] = [];
let mockStudentStats: any[] = [];
let mockDsaProgress: any[] = [];
let mockActivities: any[] = [];
let mockAuthContext: any = null;

vi.mock('@/lib/db/queries/entitlements', () => ({
  requireStudentEntitlement: vi.fn(async () => {
    if (!mockAuthContext) {
      return {
        isStudent: false,
        isActive: false,
        student: null,
        enrollments: [],
        activeBatches: [],
        hasActiveEntitlement: false
      };
    }
    return mockAuthContext;
  })
}));

vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          // Students join Colleges
          if (table === actual.students) {
            return {
              leftJoin: () => ({
                where: () => ({
                  limit: () => Promise.resolve(mockStudents)
                })
              })
            };
          }

          // Student Stats
          if (table === actual.studentStats) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockStudentStats)
              })
            };
          }

          // Student DSA Progress
          if (table === actual.studentDsaProgress) {
            return {
              where: () => Promise.resolve(mockDsaProgress)
            };
          }

          // Activities (for XP category breakdown or 30-day heatmap)
          if (table === actual.activities) {
            return {
              where: () => ({
                groupBy: () => Promise.resolve(mockActivities)
              })
            };
          }

          return {
            where: () => Promise.resolve([])
          };
        }
      }),

      update: (table: any) => ({
        set: (vals: any) => ({
          where: (cond: any) => ({
            returning: () => {
              if (mockStudents.length > 0) {
                const updated = {
                  ...mockStudents[0],
                  ...vals
                };
                mockStudents[0] = updated;
                return Promise.resolve([updated]);
              }
              return Promise.resolve([]);
            }
          })
        })
      })
    }
  };
});

import { getStudentProfileData } from '@/lib/db/queries/profile';
import { updateStudentProfileAction } from '@/lib/actions/profile';

describe('Slice 18 — Profile & Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockStudents = [
      {
        id: TEST_STUDENT_ID,
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@college.edu',
        phone: '+91 9876543210',
        collegeRollNumber: '22CS101',
        branch: 'Computer Science and Engineering',
        year: 3,
        githubUrl: 'https://github.com/aaravsharma',
        linkedinUrl: 'https://linkedin.com/in/aaravsharma',
        portfolioUrl: 'https://aarav.dev',
        targetCompanies: 'Google, Microsoft, Amazon',
        primaryLanguage: 'TypeScript',
        createdAt: new Date('2026-01-10T10:00:00Z'),
        collegeName: 'RMS Institute of Engineering',
        collegeCode: 'RMS-IOE'
      }
    ];

    mockStudentStats = [
      {
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        totalXp: 1850,
        currentLevel: 4,
        currentStreak: 12,
        longestStreak: 15,
        dsaSolvedCount: 28
      }
    ];

    mockDsaProgress = [
      { problemSlug: 'two-sum' },
      { problemSlug: 'contains-duplicate' }
    ];

    mockActivities = [
      { activityType: 'dsa_solved', totalXp: 850 },
      { activityType: 'quiz_completed', totalXp: 400 },
      { activityType: 'assignment_approved', totalXp: 600 }
    ];

    mockAuthContext = {
      isStudent: true,
      isActive: true,
      student: {
        id: TEST_STUDENT_ID,
        userId: 'usr-1234',
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@college.edu',
        collegeName: 'RMS Institute of Engineering',
        branch: 'Computer Science and Engineering',
        year: 3
      },
      hasActiveEntitlement: true,
      enrollments: [],
      activeBatches: []
    };
  });

  describe('1. Server Query: getStudentProfileData', () => {
    it('returns null when studentId is invalid or not found', async () => {
      const data = await getStudentProfileData(0);
      expect(data).toBeNull();

      mockStudents = [];
      const notFoundData = await getStudentProfileData(999);
      expect(notFoundData).toBeNull();
    });

    it('returns read-only academic credentials accurately', async () => {
      const data = await getStudentProfileData(TEST_STUDENT_ID);
      expect(data).toBeDefined();
      expect(data?.academic.studentId).toBe(TEST_STUDENT_ID);
      expect(data?.academic.fullName).toBe('Aarav Sharma');
      expect(data?.academic.collegeName).toBe('RMS Institute of Engineering');
      expect(data?.academic.collegeRollNumber).toBe('22CS101');
      expect(data?.academic.branch).toBe('Computer Science and Engineering');
      expect(data?.academic.year).toBe(3);
    });

    it('returns editable career profile links', async () => {
      const data = await getStudentProfileData(TEST_STUDENT_ID);
      expect(data?.career.githubUrl).toBe('https://github.com/aaravsharma');
      expect(data?.career.linkedinUrl).toBe('https://linkedin.com/in/aaravsharma');
      expect(data?.career.portfolioUrl).toBe('https://aarav.dev');
      expect(data?.career.targetCompanies).toBe('Google, Microsoft, Amazon');
      expect(data?.career.primaryLanguage).toBe('TypeScript');
    });

    it('computes topic completion progress bars based on solved DSA questions', async () => {
      const data = await getStudentProfileData(TEST_STUDENT_ID);
      expect(data?.topicProgress).toBeDefined();
      expect(data?.topicProgress.length).toBeGreaterThan(0);

      // Sheet 1 has two-sum and contains-duplicate
      const arraysSheet = data?.topicProgress.find((t) => t.topicSlug === 'arrays-and-hashing');
      expect(arraysSheet).toBeDefined();
      expect(arraysSheet?.solvedQuestions).toBe(2);
      expect(arraysSheet?.percentage).toBeGreaterThan(0);
    });

    it('computes category XP breakdown percentages accurately', async () => {
      const data = await getStudentProfileData(TEST_STUDENT_ID);
      expect(data?.xpBreakdown).toBeDefined();

      const dsaCat = data?.xpBreakdown.find((c) => c.category === 'dsa');
      expect(dsaCat?.xp).toBe(850);

      const quizCat = data?.xpBreakdown.find((c) => c.category === 'quizzes');
      expect(quizCat?.xp).toBe(400);

      const projectCat = data?.xpBreakdown.find((c) => c.category === 'projects');
      expect(projectCat?.xp).toBe(600);
    });

    it('generates 30-day activity heatmap with correct day counts', async () => {
      const data = await getStudentProfileData(TEST_STUDENT_ID);
      expect(data?.heatmap.days).toHaveLength(30);
      expect(data?.heatmap.startDate).toBeDefined();
      expect(data?.heatmap.endDate).toBeDefined();
    });
  });

  describe('2. Server Action: updateStudentProfileAction', () => {
    it('rejects unauthenticated requests with UNAUTHORIZED', async () => {
      mockAuthContext = null;

      const res = await updateStudentProfileAction({
        githubUrl: 'https://github.com/aaravsharma'
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects invalid GitHub URL formats', async () => {
      const res = await updateStudentProfileAction({
        githubUrl: 'not-a-valid-github-url'
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('VALIDATION_ERROR');
        expect(res.error).toContain('GitHub');
      }
    });

    it('rejects invalid LinkedIn URL formats', async () => {
      const res = await updateStudentProfileAction({
        linkedinUrl: 'https://twitter.com/username'
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('VALIDATION_ERROR');
        expect(res.error).toContain('LinkedIn');
      }
    });

    it('rejects invalid portfolio URL formats', async () => {
      const res = await updateStudentProfileAction({
        portfolioUrl: 'htp://bad-scheme'
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('VALIDATION_ERROR');
      }
    });

    it('successfully updates career preferences with valid inputs', async () => {
      const res = await updateStudentProfileAction({
        githubUrl: 'https://github.com/newprofile',
        linkedinUrl: 'https://linkedin.com/in/newprofile',
        portfolioUrl: 'https://newportfolio.io',
        targetCompanies: 'Apple, Meta, Netflix',
        primaryLanguage: 'Go'
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.githubUrl).toBe('https://github.com/newprofile');
        expect(res.data.primaryLanguage).toBe('Go');
      }
    });

    it('permits clearing career fields with null or empty values', async () => {
      const res = await updateStudentProfileAction({
        githubUrl: '',
        linkedinUrl: '',
        portfolioUrl: null,
        targetCompanies: null,
        primaryLanguage: null
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.githubUrl).toBeNull();
        expect(res.data.portfolioUrl).toBeNull();
      }
    });
  });
});
