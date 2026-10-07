import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getProjectAssignmentForStudent,
  getStudentProjectAssignments
} from '@/lib/db/queries/projects';
import { submitProjectAssignment } from '@/lib/actions/projects';

// Mock test IDs
const TEST_STUDENT_ID = 42;
const TEST_BATCH_ID = '11111111-1111-4111-8111-111111111111';
const TEST_UNENROLLED_BATCH_ID = '99999999-9999-4999-8999-999999999999';
const TEST_CONTENT_ITEM_ID = '22222222-2222-4222-8222-222222222222';
const TEST_ASSIGNMENT_ID = '33333333-3333-4333-8333-333333333333';
const TEST_SUBMISSION_ID = '44444444-4444-4444-8444-444444444444';

// In-memory mock database state
let mockEnrollments: any[] = [];
let mockBatches: any[] = [];
let mockContentItems: any[] = [];
let mockBatchCurriculum: any[] = [];
let mockAssignments: any[] = [];
let mockAssignmentSubmissions: any[] = [];

// Mock entitlement
vi.mock('@/lib/db/queries/entitlements', () => ({
  requireStudentEntitlement: vi.fn().mockImplementation(async () => ({
    hasActiveEntitlement: true,
    user: { id: 'usr-1', email: 'student@example.com' },
    student: {
      id: TEST_STUDENT_ID,
      userId: 'usr-1',
      collegeId: 'col-1',
      fullName: 'Test Student'
    },
    enrollments: mockEnrollments
  }))
}));

// Mock database
vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');

  return {
    ...actual,
    db: {
      select: (fields?: any) => {
        const makeResult = (data: any) => {
          const p = Promise.resolve(data);
          (p as any).limit = () => Promise.resolve(data);
          return p;
        };

        return {
          from: (table: any) => {
            // enrollments
            if (table === actual.enrollments) {
              const makeEnrollmentChain = () => ({
                innerJoin: () => makeEnrollmentChain(),
                where: () => makeResult(mockEnrollments)
              });
              return makeEnrollmentChain();
            }

            // contentItems
            if (table === actual.contentItems) {
              return {
                where: () => makeResult(mockContentItems)
              };
            }

            // batchCurriculum
            if (table === actual.batchCurriculum) {
              const makeBatchCurriculumChain = () => ({
                innerJoin: () => makeBatchCurriculumChain(),
                leftJoin: () => makeBatchCurriculumChain(),
                where: () => makeResult(mockBatchCurriculum)
              });
              return makeBatchCurriculumChain();
            }

            // assignments
            if (table === actual.assignments) {
              return {
                where: () => makeResult(mockAssignments)
              };
            }

            // assignmentSubmissions
            if (table === actual.assignmentSubmissions) {
              return {
                where: () => makeResult(mockAssignmentSubmissions)
              };
            }

            return {
              where: () => makeResult([])
            };
          }
        };
      },

      insert: (table: any) => ({
        values: (val: any) => ({
          returning: (ret: any) => {
            const row = {
              id: val.id || '55555555-5555-4555-8555-555555555555',
              ...val,
              submittedAt: val.submittedAt || new Date(),
              updatedAt: val.updatedAt || new Date()
            };
            if (table === actual.assignments) {
              mockAssignments.push(row);
            } else if (table === actual.assignmentSubmissions) {
              mockAssignmentSubmissions.push(row);
            }
            return Promise.resolve([row]);
          }
        })
      }),

      update: (table: any) => ({
        set: (vals: any) => ({
          where: () => {
            if (table === actual.assignmentSubmissions && mockAssignmentSubmissions.length > 0) {
              Object.assign(mockAssignmentSubmissions[0], vals);
            }
            return Promise.resolve();
          }
        })
      })
    }
  };
});

// Mock Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// Mock global fetch for GitHub HEAD validation
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Slice 13: Project Submissions & GitHub Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEnrollments = [
      {
        id: 'enr-1',
        studentId: TEST_STUDENT_ID,
        batchId: TEST_BATCH_ID,
        batchName: 'Full Stack Cohort Alpha',
        status: 'active'
      }
    ];

    mockBatches = [
      {
        id: TEST_BATCH_ID,
        name: 'Full Stack Cohort Alpha'
      }
    ];

    mockContentItems = [
      {
        id: TEST_CONTENT_ITEM_ID,
        title: 'Capstone E-Commerce Microservices',
        description: 'Design and deploy production-grade microservices on Kubernetes.',
        contentType: 'project',
        programCode: 'FS-JAVA'
      }
    ];

    mockAssignments = [
      {
        id: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        rubricCriteria: [
          { title: 'Architecture & Design', maxPoints: 40 },
          { title: 'API Implementation', maxPoints: 40 },
          { title: 'Testing & CI/CD', maxPoints: 20 }
        ],
        maxScore: 100
      }
    ];

    mockBatchCurriculum = [
      {
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        availableFrom: new Date('2026-09-01T00:00:00Z'),
        dueAt: new Date('2026-10-30T23:59:59Z')
      }
    ];

    mockAssignmentSubmissions = [];

    // Default fetch returns 200 OK for GitHub HEAD
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });
  });

  describe('1. Data Fetching & Authorization', () => {
    it('returns complete project assignment details for enrolled student', async () => {
      const data = await getProjectAssignmentForStudent(
        TEST_STUDENT_ID,
        TEST_CONTENT_ITEM_ID,
        TEST_BATCH_ID
      );

      expect(data).not.toBeNull();
      if (!data) return;

      expect(data.assignmentId).toBe(TEST_ASSIGNMENT_ID);
      expect(data.title).toBe('Capstone E-Commerce Microservices');
      expect(data.rubricCriteria).toHaveLength(3);
      expect(data.maxScore).toBe(100);
      expect(data.batchId).toBe(TEST_BATCH_ID);
      expect(data.submission).toBeNull();
    });

    it('rejects unenrolled students with null (anti-probing)', async () => {
      const data = await getProjectAssignmentForStudent(
        TEST_STUDENT_ID,
        TEST_CONTENT_ITEM_ID,
        TEST_UNENROLLED_BATCH_ID
      );

      expect(data).toBeNull();
    });

    it('returns existing submission with correct canResubmit status', async () => {
      mockAssignmentSubmissions = [
        {
          id: TEST_SUBMISSION_ID,
          assignmentId: TEST_ASSIGNMENT_ID,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          githubUrl: 'https://github.com/student/e-commerce-backend',
          liveUrl: 'https://ecommerce.demo.app',
          notes: 'Deployed on AWS ECS.',
          status: 'submitted',
          score: null,
          tutorFeedback: null,
          reviewedByTutorId: null,
          reviewedAt: null,
          submittedAt: new Date('2026-10-01T12:00:00Z'),
          updatedAt: new Date('2026-10-01T12:00:00Z')
        }
      ];

      const data = await getProjectAssignmentForStudent(
        TEST_STUDENT_ID,
        TEST_CONTENT_ITEM_ID,
        TEST_BATCH_ID
      );

      expect(data).not.toBeNull();
      if (!data) return;

      expect(data.submission).not.toBeNull();
      expect(data.submission?.githubUrl).toBe('https://github.com/student/e-commerce-backend');
      expect(data.submission?.status).toBe('submitted');
      expect(data.submission?.canResubmit).toBe(true);
    });
  });

  describe('2. GitHub URL Validation & Verification', () => {
    it('rejects invalid GitHub URL formats', async () => {
      const invalidUrls = [
        'https://gitlab.com/user/project',
        'http://github.com/user/project',
        'https://github.com/',
        'https://github.com/user',
        'not-a-url',
        'https://github.com/user/project/issues'
      ];

      for (const badUrl of invalidUrls) {
        const result = await submitProjectAssignment({
          assignmentId: TEST_ASSIGNMENT_ID,
          contentItemId: TEST_CONTENT_ITEM_ID,
          batchId: TEST_BATCH_ID,
          githubUrl: badUrl
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('INVALID_GITHUB_URL');
        }
      }
    });

    it('rejects private or non-existent GitHub repositories (404 from GitHub)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        githubUrl: 'https://github.com/fake-user/private-repo'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('REPO_INACCESSIBLE');
        expect(result.error).toContain('repository not found or is private');
      }
    });
  });

  describe('3. Project Submission State Machine & Resubmission Rules', () => {
    it('successfully submits project repository on first attempt', async () => {
      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        githubUrl: 'https://github.com/student/e-commerce-microservices',
        liveUrl: 'https://ecommerce.demo.com',
        notes: 'Followed microservices pattern with API gateway.'
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.status).toBe('submitted');
      expect(result.data.isResubmission).toBe(false);
      expect(mockAssignmentSubmissions).toHaveLength(1);
    });

    it('allows resubmission when status is submitted (updates repository without locking)', async () => {
      mockAssignmentSubmissions = [
        {
          id: TEST_SUBMISSION_ID,
          assignmentId: TEST_ASSIGNMENT_ID,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          githubUrl: 'https://github.com/student/old-repo',
          status: 'submitted',
          submittedAt: new Date('2026-10-01T10:00:00Z')
        }
      ];

      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        githubUrl: 'https://github.com/student/updated-repo',
        notes: 'Refactored docker compose setup.'
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.isResubmission).toBe(true);
      expect(mockAssignmentSubmissions[0].githubUrl).toBe('https://github.com/student/updated-repo');
      expect(mockAssignmentSubmissions[0].status).toBe('submitted');
    });

    it('blocks resubmission when status transitions to under_review', async () => {
      mockAssignmentSubmissions = [
        {
          id: TEST_SUBMISSION_ID,
          assignmentId: TEST_ASSIGNMENT_ID,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          githubUrl: 'https://github.com/student/locked-repo',
          status: 'under_review'
        }
      ];

      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        githubUrl: 'https://github.com/student/attempted-update'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('LOCKED_UNDER_REVIEW');
        expect(result.error).toContain('under review');
      }
    });

    it('blocks resubmission when status transitions to approved', async () => {
      mockAssignmentSubmissions = [
        {
          id: TEST_SUBMISSION_ID,
          assignmentId: TEST_ASSIGNMENT_ID,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          githubUrl: 'https://github.com/student/passed-repo',
          status: 'approved',
          score: 95
        }
      ];

      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        githubUrl: 'https://github.com/student/attempted-update'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('ALREADY_APPROVED');
        expect(result.error).toContain('already been approved');
      }
    });

    it('allows resubmission when status is resubmission_requested (resets status to submitted)', async () => {
      mockAssignmentSubmissions = [
        {
          id: TEST_SUBMISSION_ID,
          assignmentId: TEST_ASSIGNMENT_ID,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          githubUrl: 'https://github.com/student/needs-work-repo',
          status: 'resubmission_requested',
          tutorFeedback: 'Please add unit tests for the auth service.'
        }
      ];

      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        githubUrl: 'https://github.com/student/needs-work-repo',
        notes: 'Added comprehensive Vitest test coverage for auth service.'
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.isResubmission).toBe(true);
      expect(result.data.status).toBe('submitted');
      expect(mockAssignmentSubmissions[0].status).toBe('submitted');
    });

    it('blocks submission if student is not actively enrolled in batch', async () => {
      mockEnrollments = [];

      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_UNENROLLED_BATCH_ID,
        githubUrl: 'https://github.com/student/valid-repo'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('UNAUTHORIZED_BATCH');
      }
    });

    it('blocks submission if project is not yet released (future availableFrom)', async () => {
      mockBatchCurriculum = [
        {
          batchId: TEST_BATCH_ID,
          contentItemId: TEST_CONTENT_ITEM_ID,
          availableFrom: new Date(Date.now() + 86400000 * 7), // 7 days in the future
          dueAt: null
        }
      ];

      const result = await submitProjectAssignment({
        assignmentId: TEST_ASSIGNMENT_ID,
        contentItemId: TEST_CONTENT_ITEM_ID,
        batchId: TEST_BATCH_ID,
        githubUrl: 'https://github.com/student/valid-repo'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NOT_YET_AVAILABLE');
      }
    });
  });
});
