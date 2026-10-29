import { describe, it, expect, vi, beforeEach } from 'vitest';
import util from 'node:util';

vi.mock('server-only', () => ({}));

// Reviews go through the shared atomic review (@rms/academic/review) inside dbTx.transaction. Its SQL (lock,
// version check, XP, notification) is covered by review-transactions.int.test.ts against a real database; here we
// check what the admin action passes to it and how it reports the result.
const { mockReviewSubmission, mockTransaction, fakeTx } = vi.hoisted(() => {
  const fakeTx = { tx: 'fake' };
  return {
    fakeTx,
    mockReviewSubmission: vi.fn(),
    mockTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(fakeTx))
  };
});
vi.mock('@rms/academic/review', () => ({ reviewSubmission: (...args: unknown[]) => mockReviewSubmission(...args) }));
vi.mock('@rms/db/tx', () => ({ dbTx: { transaction: (fn: (tx: unknown) => unknown) => mockTransaction(fn) } }));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

const sampleBatchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const otherBatchId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const sampleAssignmentId = 'aaaaaaaa-1111-2222-3333-444444444444';
const sampleContentItemId = 'cccccccc-1111-2222-3333-444444444444';
const sampleSubmissionId = 'ssssssss-1111-2222-3333-444444444444';
const validSubmissionId = '5a5a5a5a-1111-4222-8333-444444444444';
const tutorUserId = 'tutor-user-uuid';
const sampleTutorId = 'tutor-record-uuid';

// Mock database state
let mockBatches: any[] = [];
let mockEnrollments: any[] = [];
let mockStudents: any[] = [];
let mockContentItems: any[] = [];
let mockBatchCurriculum: any[] = [];
let mockAssignments: any[] = [];
let mockAssignmentSubmissions: any[] = [];
let mockTutors: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          let currentTable = table;

          const queryState = {
            joinedTables: [table],
            whereConditions: null as any,
            orderByVal: null as any,
            groupByVal: null as any,

            innerJoin(joinTable: any, condition: any) {
              queryState.joinedTables.push(joinTable);
              return queryState;
            },

            leftJoin(joinTable: any, condition: any) {
              queryState.joinedTables.push(joinTable);
              return queryState;
            },

            where(condition: any) {
              queryState.whereConditions = condition;
              return queryState;
            },

            orderBy(order: any) {
              queryState.orderByVal = order;
              return queryState;
            },

            groupBy(group: any) {
              queryState.groupByVal = group;
              return queryState;
            },

            limit(num: number) {
              return this.execute().slice(0, num);
            },

            execute() {
              // 1. batches table
              if (currentTable === actual.batches) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  if (condStr.includes(sampleBatchId)) {
                    return mockBatches.filter((b) => b.id === sampleBatchId);
                  }
                  if (condStr.includes(otherBatchId)) {
                    return mockBatches.filter((b) => b.id === otherBatchId);
                  }
                }
                return mockBatches;
              }

              // 2. enrollments table (count query)
              if (currentTable === actual.enrollments) {
                return [{ count: mockEnrollments.length }];
              }

              // 3. tutors table
              if (currentTable === actual.tutors) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  if (condStr.includes(tutorUserId)) {
                    return mockTutors.filter((t) => t.userId === tutorUserId);
                  }
                }
                return mockTutors;
              }

              // 4. batchCurriculum table joined with contentItems & assignments
              if (currentTable === actual.batchCurriculum) {
                return mockBatchCurriculum.map((bc) => {
                  const content = mockContentItems.find((ci) => ci.id === bc.contentItemId) || {};
                  const assignment = mockAssignments.find((a) => a.contentItemId === bc.contentItemId) || {};
                  return {
                    contentItemId: bc.contentItemId,
                    weekNumber: bc.weekNumber,
                    sequenceOrder: bc.sequenceOrder,
                    isRequired: bc.isRequired,
                    availableFrom: bc.availableFrom,
                    dueAt: bc.dueAt,
                    title: content.title || 'Untitled Project',
                    slug: content.slug || 'untitled',
                    description: content.description || null,
                    assignmentId: assignment.id || sampleAssignmentId,
                    maxScore: assignment.maxScore || 100,
                    rubricCriteria: assignment.rubricCriteria || []
                  };
                });
              }

              // 5. assignmentSubmissions table
              if (currentTable === actual.assignmentSubmissions) {
                let subsToUse = [...mockAssignmentSubmissions];

                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });

                  subsToUse = subsToUse.filter((sub) => {
                    if (condStr.includes(otherBatchId) && sub.batchId !== otherBatchId) {
                      return false;
                    }
                    if (condStr.includes(sampleBatchId) && sub.batchId !== sampleBatchId) {
                      return false;
                    }
                    for (const item of mockAssignmentSubmissions) {
                      if (condStr.includes(item.id) && sub.id !== item.id) {
                        return false;
                      }
                    }
                    if (condStr.includes("value: 'submitted'") && sub.status !== 'submitted') {
                      return false;
                    }
                    if (condStr.includes("value: 'under_review'") && sub.status !== 'under_review') {
                      return false;
                    }
                    if (condStr.includes("value: 'resubmission_requested'") && sub.status !== 'resubmission_requested') {
                      return false;
                    }
                    if (condStr.includes("value: 'approved'") && sub.status !== 'approved') {
                      return false;
                    }
                    return true;
                  });
                }

                // If fields requested match overview fields (status, assignmentId)
                if (fields && 'status' in fields && !('studentName' in fields)) {
                  return subsToUse.map((s) => ({
                    id: s.id,
                    studentId: s.studentId,
                    assignmentId: s.assignmentId,
                    status: s.status,
                    submittedAt: s.submittedAt
                  }));
                }

                // Inspector / Queue detailed join
                return subsToUse.map((sub) => {
                  const student = mockStudents.find((s) => s.id === sub.studentId) || {};
                  const assignment = mockAssignments.find((a) => a.id === sub.assignmentId) || {};
                  const content = mockContentItems.find((c) => c.id === assignment.contentItemId) || {};
                  const batch = mockBatches.find((b) => b.id === sub.batchId) || {};
                  const tutor = mockTutors.find((t) => t.id === sub.reviewedByTutorId) || {};

                  return {
                    id: sub.id,
                    submissionId: sub.id,
                    batchId: sub.batchId,
                    batchName: batch.name || 'Batch Alpha',
                    assignmentId: sub.assignmentId,
                    studentId: sub.studentId,
                    studentName: student.fullName || 'Student Name',
                    studentEmail: student.email || 'student@test.com',
                    collegeRollNumber: student.collegeRollNumber || 'ROLL123',
                    status: sub.status,
                    score: sub.score,
                    maxScore: assignment.maxScore || 100,
                    rubricCriteria: assignment.rubricCriteria || [],
                    githubUrl: sub.githubUrl,
                    liveUrl: sub.liveUrl,
                    notes: sub.notes,
                    tutorFeedback: sub.tutorFeedback,
                    reviewedByTutorId: sub.reviewedByTutorId,
                    reviewedByTutorName: tutor.fullName || null,
                    reviewedAt: sub.reviewedAt,
                    submittedAt: sub.submittedAt,
                    updatedAt: sub.updatedAt,
                    projectTitle: content.title || 'Project Title',
                    projectDescription: content.description || null,
                    weekNumber: 1,
                    dueAt: new Date('2026-10-31T23:59:59Z')
                  };
                });
              }

              return [];
            },

            then(resolve: any) {
              return Promise.resolve(this.execute()).then(resolve);
            }
          };

          return queryState;
        }
      }),

      update: (table: any) => ({
        set: (vals: any) => ({
          where: (condition: any) => {
            const condStr = util.inspect(condition, { depth: null });
            for (const item of mockAssignmentSubmissions) {
              if (condStr.includes(item.id)) {
                Object.assign(item, vals);
              }
            }
            return Promise.resolve();
          }
        })
      }),

      insert: (table: any) => ({
        values: (vals: any) => Promise.resolve()
      })
    }
  };
});

import {
  getBatchProjectsOverview,
  getBatchProjectSubmissions,
  getBatchProjectSubmissionDetails
} from '../db/queries/batch-projects';
import { isBatchInScope } from '@rms/academic/scope';

import {
  getSubmissionDetailsAction,
  updateSubmissionReviewAction,
  validateGithubRepoAction
} from '../../app/(admin)/batches/[batchId]/projects/actions';

import {
  parseGithubUrl,
  verifyPublicGithubRepo
} from '../services/github-validator';

describe('Slice C3: Project Evaluation Workbench', () => {
  const adminSession = {
    user: { id: tutorUserId, email: 'tutor@rmscareers.com', role: 'admin' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    mockAuth.mockResolvedValue(adminSession);

    mockBatches = [
      {
        id: sampleBatchId,
        name: 'Batch 2026 CS-A',
        status: 'active'
      },
      {
        id: otherBatchId,
        name: 'Batch 2026 CS-B',
        status: 'active'
      }
    ];

    mockEnrollments = [
      { studentId: 101, batchId: sampleBatchId, status: 'active' },
      { studentId: 102, batchId: sampleBatchId, status: 'active' },
      { studentId: 103, batchId: sampleBatchId, status: 'active' }
    ];

    mockStudents = [
      {
        id: 101,
        fullName: 'Aarav Sharma',
        email: 'aarav@college.edu',
        collegeRollNumber: 'CS2026-001'
      },
      {
        id: 102,
        fullName: 'Bhavna Patel',
        email: 'bhavna@college.edu',
        collegeRollNumber: 'CS2026-002'
      },
      {
        id: 103,
        fullName: 'Chirag Reddy',
        email: 'chirag@college.edu',
        collegeRollNumber: 'CS2026-003'
      }
    ];

    mockTutors = [
      {
        id: sampleTutorId,
        userId: tutorUserId,
        fullName: 'Prof. Rajesh Iyer',
        isActive: true
      }
    ];

    mockContentItems = [
      {
        id: sampleContentItemId,
        title: 'Distributed Key-Value Store',
        slug: 'distributed-key-value-store',
        contentType: 'project',
        description: 'Design and implement a Raft-based distributed key-value store in Go.',
        isPublished: true
      }
    ];

    mockAssignments = [
      {
        id: sampleAssignmentId,
        contentItemId: sampleContentItemId,
        maxScore: 100,
        rubricCriteria: [
          { id: 'crit-1', title: 'Consensus Correctness', maxPoints: 50, description: 'Raft leader election and log replication' },
          { id: 'crit-2', title: 'Network Partition Fault Tolerance', maxPoints: 30, description: 'Handles split-brain cleanly' },
          { id: 'crit-3', title: 'Code Hygiene & Benchmarks', maxPoints: 20, description: 'Structured Go code with concurrency benchmarks' }
        ]
      }
    ];

    mockBatchCurriculum = [
      {
        id: 'curriculum-1',
        batchId: sampleBatchId,
        contentItemId: sampleContentItemId,
        weekNumber: 3,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date('2026-10-01T00:00:00Z'),
        dueAt: new Date('2026-10-31T23:59:59Z')
      }
    ];

    mockAssignmentSubmissions = [
      {
        id: sampleSubmissionId,
        assignmentId: sampleAssignmentId,
        studentId: 101,
        batchId: sampleBatchId,
        githubUrl: 'https://github.com/aarav-sharma/distributed-kv',
        liveUrl: 'https://kv-demo.up.railway.app',
        notes: 'Implemented leader election and log replication with persistent WAL storage.',
        status: 'submitted',
        score: null,
        tutorFeedback: null,
        reviewedByTutorId: null,
        reviewedAt: null,
        submittedAt: new Date('2026-10-05T14:30:00Z'),
        updatedAt: new Date('2026-10-05T14:30:00Z')
      },
      {
        id: 'sub-uuid-2',
        assignmentId: sampleAssignmentId,
        studentId: 102,
        batchId: sampleBatchId,
        githubUrl: 'https://github.com/bhavna/raft-kv',
        liveUrl: null,
        notes: 'Review pending.',
        status: 'under_review',
        score: null,
        tutorFeedback: 'Initial code review started.',
        reviewedByTutorId: sampleTutorId,
        reviewedAt: new Date('2026-10-06T10:00:00Z'),
        submittedAt: new Date('2026-10-04T12:00:00Z'),
        updatedAt: new Date('2026-10-06T10:00:00Z')
      },
      {
        id: 'sub-uuid-3',
        assignmentId: sampleAssignmentId,
        studentId: 103,
        batchId: sampleBatchId,
        githubUrl: 'https://github.com/chirag/kv-store',
        liveUrl: null,
        notes: null,
        status: 'approved',
        score: 95,
        tutorFeedback: 'Excellent implementation of log compaction and snapshotting.',
        reviewedByTutorId: sampleTutorId,
        reviewedAt: new Date('2026-10-06T16:00:00Z'),
        submittedAt: new Date('2026-10-03T09:00:00Z'),
        updatedAt: new Date('2026-10-06T16:00:00Z')
      }
    ];
  });

  // =========================================================================
  // 1. Authorization Guards
  // =========================================================================
  describe('Authorization Guards', () => {
    it('rejects getSubmissionDetailsAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await getSubmissionDetailsAction(sampleBatchId, sampleSubmissionId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });

    it('rejects updateSubmissionReviewAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await updateSubmissionReviewAction(sampleBatchId, validSubmissionId, {
        transition: 'claim',
        expectedVersion: 'v1'
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects validateGithubRepoAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await validateGithubRepoAction('https://github.com/test/repo');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });
  });

  // =========================================================================
  // 2. Batch Projects Overview Aggregation
  // =========================================================================
  describe('Batch Projects Overview', () => {
    it('aggregates operational metrics for projects assigned to the batch', async () => {
      const overview = await getBatchProjectsOverview(sampleBatchId);

      expect(overview).toHaveLength(1);
      const item = overview[0];

      expect(item.assignmentId).toBe(sampleAssignmentId);
      expect(item.title).toBe('Distributed Key-Value Store');
      expect(item.weekNumber).toBe(3);
      expect(item.maxScore).toBe(100);
      expect(item.assignedStudentsCount).toBe(3);
      expect(item.totalSubmissionsCount).toBe(3);
      expect(item.submittedCount).toBe(1);
      expect(item.underReviewCount).toBe(1);
      expect(item.approvedCount).toBe(1);
      expect(item.changesRequestedCount).toBe(0);
      expect(item.rubricCriteria).toHaveLength(3);
    });

    it('returns empty array when batch has no assigned projects', async () => {
      mockBatchCurriculum = [];
      const overview = await getBatchProjectsOverview(sampleBatchId);
      expect(overview).toEqual([]);
    });
  });

  // =========================================================================
  // 3. Submission Queue & Operational Filtering
  // =========================================================================
  describe('Submission Queue & Filters', () => {
    it('returns submissions matching the batch with student demographics and reviewer', async () => {
      const list = await getBatchProjectSubmissions(sampleBatchId);

      expect(list).toHaveLength(3);

      const submitted = list.find((s) => s.submissionId === sampleSubmissionId);
      expect(submitted).toBeDefined();
      expect(submitted!.studentName).toBe('Aarav Sharma');
      expect(submitted!.studentEmail).toBe('aarav@college.edu');
      expect(submitted!.collegeRollNumber).toBe('CS2026-001');
      expect(submitted!.status).toBe('submitted');
      expect(submitted!.githubUrl).toBe('https://github.com/aarav-sharma/distributed-kv');
      expect(submitted!.liveUrl).toBe('https://kv-demo.up.railway.app');

      const approved = list.find((s) => s.submissionId === 'sub-uuid-3');
      expect(approved).toBeDefined();
      expect(approved!.status).toBe('approved');
      expect(approved!.score).toBe(95);
      expect(approved!.reviewedByTutorName).toBe('Prof. Rajesh Iyer');
    });

    it('filters submissions by lifecycle status', async () => {
      const submittedOnly = await getBatchProjectSubmissions(sampleBatchId, {
        status: 'submitted'
      });
      expect(submittedOnly).toHaveLength(1);
      expect(submittedOnly[0].submissionId).toBe(sampleSubmissionId);

      const approvedOnly = await getBatchProjectSubmissions(sampleBatchId, {
        status: 'approved'
      });
      expect(approvedOnly).toHaveLength(1);
      expect(approvedOnly[0].submissionId).toBe('sub-uuid-3');
    });
  });

  // =========================================================================
  // 4. Submission Inspector & Details
  // =========================================================================
  describe('Submission Inspector', () => {
    it('provides complete inspector details with rubric and allowed transitions', async () => {
      const details = await getBatchProjectSubmissionDetails(sampleBatchId, sampleSubmissionId);

      expect(details).not.toBeNull();
      expect(details!.studentName).toBe('Aarav Sharma');
      expect(details!.batchName).toBe('Batch 2026 CS-A');
      expect(details!.projectTitle).toBe('Distributed Key-Value Store');
      expect(details!.maxScore).toBe(100);
      expect(details!.rubricCriteria).toHaveLength(3);
      expect(details!.status).toBe('submitted');
      expect(details!.allowedTransitions).toEqual(['under_review']);
    });

    it('allows under_review to transition to resubmission_requested or approved', async () => {
      const details = await getBatchProjectSubmissionDetails(sampleBatchId, 'sub-uuid-2');

      expect(details).not.toBeNull();
      expect(details!.status).toBe('under_review');
      expect(details!.allowedTransitions).toEqual(['resubmission_requested', 'approved']);
    });

    it('marks approved state as terminal with no forward transitions', async () => {
      const details = await getBatchProjectSubmissionDetails(sampleBatchId, 'sub-uuid-3');

      expect(details).not.toBeNull();
      expect(details!.status).toBe('approved');
      expect(details!.allowedTransitions).toEqual([]);
    });

    it('fetches inspector details via Server Action', async () => {
      const res = await getSubmissionDetailsAction(sampleBatchId, sampleSubmissionId);

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.studentEmail).toBe('aarav@college.edu');
      }
    });
  });

  // =========================================================================
  // 5. Cross-Batch Isolation & Multi-Batch Students
  // =========================================================================
  describe('Cross-Batch Isolation & Multi-Batch Students', () => {
    it('never leaks submissions from another batch for the same multi-enrolled student', async () => {
      // Student 101 submitted in Batch A and separately in Batch B
      mockAssignmentSubmissions = [
        {
          id: 'sub-batch-a',
          assignmentId: sampleAssignmentId,
          studentId: 101,
          batchId: sampleBatchId,
          githubUrl: 'https://github.com/student/batch-a-kv',
          status: 'submitted',
          score: null,
          submittedAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sub-batch-b',
          assignmentId: sampleAssignmentId,
          studentId: 101,
          batchId: otherBatchId,
          githubUrl: 'https://github.com/student/batch-b-kv',
          status: 'approved',
          score: 100,
          submittedAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Query Batch A
      const batchASubs = await getBatchProjectSubmissions(sampleBatchId);
      expect(batchASubs).toHaveLength(1);
      expect(batchASubs[0].submissionId).toBe('sub-batch-a');

      // Attempt from Batch B cannot be inspected from Batch A
      const crossInspect = await getBatchProjectSubmissionDetails(sampleBatchId, 'sub-batch-b');
      expect(crossInspect).toBeNull();

      // Action rejecting cross-batch inspection
      const actionRes = await getSubmissionDetailsAction(sampleBatchId, 'sub-batch-b');
      expect(actionRes.success).toBe(false);
    });

    it('narrows a review to the batch in the URL (a submission of another batch is out of scope)', async () => {
      mockReviewSubmission.mockResolvedValue({ ok: false, code: 'not_found' });

      const crossRes = await updateSubmissionReviewAction(otherBatchId, validSubmissionId, {
        transition: 'claim',
        expectedVersion: 'v1'
      });

      expect(crossRes.success).toBe(false);
      if (!crossRes.success) expect(crossRes.error).toMatch(/does not belong to this batch/i);
      const scope = mockReviewSubmission.mock.calls[0][1];
      expect(isBatchInScope(scope, otherBatchId)).toBe(true);
      expect(isBatchInScope(scope, sampleBatchId)).toBe(false);
    });
  });

  // =========================================================================
  // 6. Review action -> shared atomic review (@rms/academic/review)
  //    Transition rules: packages/academic review-rules.test.ts. Transaction, XP, notification and races:
  //    review-transactions.int.test.ts (real database).
  // =========================================================================
  describe('Review action', () => {
    it('runs the review in one transaction with the admin as attributed actor', async () => {
      mockReviewSubmission.mockResolvedValue({ ok: true, status: 'approved', version: 'v2', xpAwarded: true, notified: true });

      const res = await updateSubmissionReviewAction(sampleBatchId, validSubmissionId, {
        transition: 'approve',
        expectedVersion: 'v1',
        score: 98,
        feedback: 'Outstanding implementation and concurrency testing.'
      });

      expect(res).toEqual({ success: true, message: 'Project approved.', data: { status: 'approved', version: 'v2' } });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      const [tx, scope, actor, input] = mockReviewSubmission.mock.calls[0];
      expect(tx).toBe(fakeTx);
      expect(isBatchInScope(scope, sampleBatchId)).toBe(true);
      expect(actor).toEqual({ userId: tutorUserId, tutorId: sampleTutorId, kind: 'admin' });
      expect(input).toEqual({
        submissionId: validSubmissionId,
        transition: 'approve',
        expectedVersion: 'v1',
        score: 98,
        feedback: 'Outstanding implementation and concurrency testing.'
      });
    });

    it('records no tutor id for an admin without a tutor profile', async () => {
      mockTutors = [];
      mockReviewSubmission.mockResolvedValue({ ok: true, status: 'under_review', version: 'v2', xpAwarded: false, notified: false });

      await updateSubmissionReviewAction(sampleBatchId, validSubmissionId, { transition: 'claim', expectedVersion: 'v1' });

      expect(mockReviewSubmission.mock.calls[0][2]).toEqual({ userId: tutorUserId, tutorId: null, kind: 'admin' });
    });

    it.each([
      ['conflict', /changed by someone else/i],
      ['forbidden_transition', /invalid status transition/i],
      ['feedback_required', /feedback is required/i],
      ['invalid_score', /between 0 and/i],
      ['reason_required', /reason/i],
      ['nothing_to_correct', /change the score or the feedback/i]
    ])('reports %s with its message and code', async (code, message) => {
      mockReviewSubmission.mockResolvedValue({ ok: false, code });

      const res = await updateSubmissionReviewAction(sampleBatchId, validSubmissionId, {
        transition: 'approve',
        expectedVersion: 'v1',
        score: 90
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe(code);
        expect(res.error).toMatch(message);
      }
    });

    it.each([
      ['an unknown transition', { transition: 'publish', expectedVersion: 'v1' }],
      ['a missing version', { transition: 'claim', expectedVersion: '' }],
      ['a fractional score', { transition: 'approve', expectedVersion: 'v1', score: 9.5 }],
      ['over-long feedback', { transition: 'request_resubmission', expectedVersion: 'v1', feedback: 'x'.repeat(5001) }]
    ])('rejects %s before opening a transaction', async (_label, data) => {
      const res = await updateSubmissionReviewAction(sampleBatchId, validSubmissionId, data as never);

      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('invalid_input');
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects a submission id that is not a UUID', async () => {
      const res = await updateSubmissionReviewAction(sampleBatchId, 'not-a-uuid', { transition: 'claim', expectedVersion: 'v1' });
      expect(res.success).toBe(false);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('refuses a signed-in user without an admin role', async () => {
      mockAuth.mockResolvedValue({ user: { id: tutorUserId, role: 'tutor' } });

      const res = await updateSubmissionReviewAction(sampleBatchId, validSubmissionId, { transition: 'claim', expectedVersion: 'v1' });

      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe('unauthorized');
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('reports a generic failure when the transaction throws (nothing is committed)', async () => {
      mockReviewSubmission.mockRejectedValue(new Error('ledger unavailable'));

      const res = await updateSubmissionReviewAction(sampleBatchId, validSubmissionId, {
        transition: 'approve',
        expectedVersion: 'v1',
        score: 90
      });

      expect(res).toEqual({ success: false, error: 'Failed to update submission review.', code: 'failed' });
    });
  });

  // =========================================================================
  // 7. GitHub URL Parsing & Verification
  // =========================================================================
  describe('GitHub URL Validator & Parser', () => {
    it('correctly parses standard repository URLs', () => {
      const parsed = parseGithubUrl('https://github.com/rms-team/distributed-kv');
      expect(parsed.isValidGithubUrl).toBe(true);
      expect(parsed.owner).toBe('rms-team');
      expect(parsed.repo).toBe('distributed-kv');
      expect(parsed.isPullRequest).toBe(false);
      expect(parsed.pullNumber).toBeNull();
    });

    it('correctly parses pull request URLs', () => {
      const parsed = parseGithubUrl('https://github.com/rms-team/distributed-kv/pull/42');
      expect(parsed.isValidGithubUrl).toBe(true);
      expect(parsed.owner).toBe('rms-team');
      expect(parsed.repo).toBe('distributed-kv');
      expect(parsed.isPullRequest).toBe(true);
      expect(parsed.pullNumber).toBe(42);
    });

    it('correctly parses branch tree URLs', () => {
      const parsed = parseGithubUrl('https://github.com/rms-team/distributed-kv/tree/feature-raft');
      expect(parsed.isValidGithubUrl).toBe(true);
      expect(parsed.owner).toBe('rms-team');
      expect(parsed.repo).toBe('distributed-kv');
      expect(parsed.branch).toBe('feature-raft');
    });

    it('rejects non-github URLs gracefully', () => {
      const parsed = parseGithubUrl('https://gitlab.com/rms-team/repo');
      expect(parsed.isValidGithubUrl).toBe(false);
      expect(parsed.owner).toBeNull();
    });

    it('handles simulated fetch response during verification', async () => {
      const globalFetch = global.fetch;
      try {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200
        } as any);

        const check = await verifyPublicGithubRepo('https://github.com/rms-team/distributed-kv');
        expect(check.valid).toBe(true);
        expect(check.statusCode).toBe(200);

        // 404 test
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404
        } as any);

        const notFoundCheck = await verifyPublicGithubRepo('https://github.com/rms-team/private-repo');
        expect(notFoundCheck.valid).toBe(false);
        expect(notFoundCheck.statusCode).toBe(404);
        expect(notFoundCheck.reason).toContain('not found or is private');
      } finally {
        global.fetch = globalFetch;
      }
    });
  });
});
