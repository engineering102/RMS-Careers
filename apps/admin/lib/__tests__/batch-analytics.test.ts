import { describe, it, expect, vi, beforeEach } from 'vitest';
import util from 'node:util';
import {
  getBatchAcademicAnalytics,
  exportBatchAnalyticsReportCsv
} from '@/lib/db/queries/batch-analytics';
import { exportBatchAnalyticsCsvAction } from '../../app/(admin)/batches/[batchId]/analytics/actions';

vi.mock('server-only', () => ({}));

// Auth mock
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

// Constants
const batchIdA = '11111111-1111-1111-1111-111111111111';
const batchIdB = '22222222-2222-2222-2222-222222222222';
const invalidBatchId = '99999999-9999-9999-9999-999999999999';

const adminUser = {
  user: {
    id: 'admin-uuid',
    name: 'Admin Academic',
    email: 'admin@rms.dev',
    role: 'admin'
  }
};

const superAdminUser = {
  user: {
    id: 'super-uuid',
    name: 'Super Admin',
    email: 'super@rms.dev',
    role: 'super_admin'
  }
};

const studentUser = {
  user: {
    id: 'student-uuid',
    name: 'Student User',
    email: 'student@rms.dev',
    role: 'student'
  }
};

// Mock database state
let mockBatches: any[] = [];
let mockColleges: any[] = [];
let mockPrograms: any[] = [];
let mockEnrollments: any[] = [];
let mockStudents: any[] = [];
let mockContentItems: any[] = [];
let mockBatchCurriculum: any[] = [];
let mockQuizzes: any[] = [];
let mockQuizAttempts: any[] = [];
let mockAssignments: any[] = [];
let mockAssignmentSubmissions: any[] = [];
let mockExternalAssessmentRecords: any[] = [];

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

            innerJoin(joinTable: any, _condition: any) {
              queryState.joinedTables.push(joinTable);
              return queryState;
            },

            leftJoin(joinTable: any, _condition: any) {
              queryState.joinedTables.push(joinTable);
              return queryState;
            },

            where(condition: any) {
              queryState.whereConditions = condition;
              return queryState;
            },

            orderBy(...orders: any[]) {
              queryState.orderByVal = orders;
              return queryState;
            },

            limit(num: number) {
              return this.execute().slice(0, num);
            },

            then(resolve: any, reject?: any) {
              try {
                return Promise.resolve(this.execute()).then(resolve, reject);
              } catch (err) {
                if (reject) return Promise.reject(err).catch(reject);
                throw err;
              }
            },

            execute() {
              // 1. batches query
              if (currentTable === actual.batches) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  if (condStr.includes(batchIdA)) {
                    return mockBatches.filter((b) => b.id === batchIdA);
                  }
                  if (condStr.includes(batchIdB)) {
                    return mockBatches.filter((b) => b.id === batchIdB);
                  }
                }
                return [];
              }

              // 2. colleges query
              if (currentTable === actual.colleges) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  return mockColleges.filter((c) => condStr.includes(c.id));
                }
                return mockColleges;
              }

              // 3. programs query
              if (currentTable === actual.programs) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  return mockPrograms.filter((p) => condStr.includes(p.id));
                }
                return mockPrograms;
              }

              // 4. enrollments table (joined with students)
              if (currentTable === actual.enrollments) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  const targetBatch = condStr.includes(batchIdA) ? batchIdA : batchIdB;
                  const filtered = mockEnrollments.filter((e) => e.batchId === targetBatch);
                  return filtered.map((e) => {
                    const s = mockStudents.find((st) => st.id === e.studentId);
                    return {
                      id: s?.id,
                      fullName: s?.fullName,
                      email: s?.email,
                      collegeRollNumber: s?.collegeRollNumber
                    };
                  });
                }
                return [];
              }

              // 5. batchCurriculum table (joined with contentItems and quizzes/assignments)
              if (currentTable === actual.batchCurriculum) {
                const condStr = queryState.whereConditions
                  ? util.inspect(queryState.whereConditions, { depth: null })
                  : '';
                const targetBatch = condStr.includes(batchIdA) ? batchIdA : batchIdB;

                // Checking if joined with quizzes
                if (queryState.joinedTables.includes(actual.quizzes)) {
                  const curriculumItems = mockBatchCurriculum.filter(
                    (bc) => bc.batchId === targetBatch
                  );
                  return curriculumItems
                    .map((bc) => {
                      const ci = mockContentItems.find(
                        (item) => item.id === bc.contentItemId && item.contentType === 'quiz'
                      );
                      if (!ci) return null;
                      const q = mockQuizzes.find((quiz) => quiz.contentItemId === ci.id);
                      if (!q) return null;
                      return {
                        contentItemId: bc.contentItemId,
                        weekNumber: bc.weekNumber,
                        sequenceOrder: bc.sequenceOrder,
                        isRequired: bc.isRequired,
                        availableFrom: bc.availableFrom,
                        dueAt: bc.dueAt,
                        title: ci.title,
                        slug: ci.slug,
                        quizId: q.id,
                        quizType: q.quizType,
                        timeLimitMinutes: q.timeLimitMinutes,
                        passingScorePercent: q.passingScorePercent
                      };
                    })
                    .filter(Boolean);
                }

                // Checking if joined with assignments
                if (queryState.joinedTables.includes(actual.assignments)) {
                  const curriculumItems = mockBatchCurriculum.filter(
                    (bc) => bc.batchId === targetBatch
                  );
                  return curriculumItems
                    .map((bc) => {
                      const ci = mockContentItems.find(
                        (item) => item.id === bc.contentItemId && item.contentType === 'project'
                      );
                      if (!ci) return null;
                      const a = mockAssignments.find((asg) => asg.contentItemId === ci.id);
                      if (!a) return null;
                      return {
                        contentItemId: bc.contentItemId,
                        weekNumber: bc.weekNumber,
                        sequenceOrder: bc.sequenceOrder,
                        isRequired: bc.isRequired,
                        availableFrom: bc.availableFrom,
                        dueAt: bc.dueAt,
                        title: ci.title,
                        slug: ci.slug,
                        assignmentId: a.id,
                        maxScore: a.maxScore
                      };
                    })
                    .filter(Boolean);
                }

                return [];
              }

              // 6. quizAttempts table
              if (currentTable === actual.quizAttempts) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  const targetBatch = condStr.includes(batchIdA) ? batchIdA : batchIdB;
                  return mockQuizAttempts.filter((qa) => qa.batchId === targetBatch);
                }
                return mockQuizAttempts;
              }

              // 7. assignmentSubmissions table
              if (currentTable === actual.assignmentSubmissions) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  const targetBatch = condStr.includes(batchIdA) ? batchIdA : batchIdB;
                  return mockAssignmentSubmissions.filter((sub) => sub.batchId === targetBatch);
                }
                return mockAssignmentSubmissions;
              }

              // 8. externalAssessmentRecords table
              if (currentTable === actual.externalAssessmentRecords) {
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  const targetBatch = condStr.includes(batchIdA) ? batchIdA : batchIdB;
                  return mockExternalAssessmentRecords.filter((rec) => rec.batchId === targetBatch);
                }
                return mockExternalAssessmentRecords;
              }

              return [];
            }
          };

          return queryState;
        }
      })
    }
  };
});

describe('Phase 3 Slice C5 — Batch Academic Analytics & Reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    // Default batches
    mockBatches = [
      {
        id: batchIdA,
        name: 'Batch Alpha 2026',
        code: 'ALPHA-26',
        collegeId: 'college-1',
        programId: 'program-1',
        status: 'active',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30')
      },
      {
        id: batchIdB,
        name: 'Batch Beta 2026',
        code: 'BETA-26',
        collegeId: 'college-2',
        programId: 'program-2',
        status: 'active',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-12-31')
      }
    ];

    mockColleges = [
      { id: 'college-1', name: 'Institute of Tech Alpha', code: 'ITA' },
      { id: 'college-2', name: 'National Engineering Beta', code: 'NEB' }
    ];

    mockPrograms = [
      { id: 'program-1', name: 'Computer Science & Engineering', code: 'CSE' },
      { id: 'program-2', name: 'Information Technology', code: 'IT' }
    ];

    // Students for Batch A (3 students: 101, 102, 103)
    // Student for Batch B (1 student: 201)
    mockStudents = [
      {
        id: 101,
        fullName: 'Alice Smith',
        email: 'alice@alpha.edu',
        collegeRollNumber: 'CS-001'
      },
      {
        id: 102,
        fullName: 'Bob Jones',
        email: 'bob@alpha.edu',
        collegeRollNumber: 'CS-002'
      },
      {
        id: 103,
        fullName: 'Charlie Brown',
        email: 'charlie@alpha.edu',
        collegeRollNumber: 'CS-003'
      },
      {
        id: 201,
        fullName: 'Diana Prince',
        email: 'diana@beta.edu',
        collegeRollNumber: 'IT-001'
      }
    ];

    mockEnrollments = [
      { id: 1, batchId: batchIdA, studentId: 101, status: 'active' },
      { id: 2, batchId: batchIdA, studentId: 102, status: 'active' },
      { id: 3, batchId: batchIdA, studentId: 103, status: 'active' },
      { id: 4, batchId: batchIdB, studentId: 201, status: 'active' }
    ];

    // Content Items for Batch A
    mockContentItems = [
      {
        id: 'ci-quiz-1',
        title: 'Data Structures Sprint',
        slug: 'data-structures-sprint',
        contentType: 'quiz'
      },
      {
        id: 'ci-quiz-2',
        title: 'Algorithms Mastery',
        slug: 'algorithms-mastery',
        contentType: 'quiz'
      },
      {
        id: 'ci-proj-1',
        title: 'Microservices Portfolio Engine',
        slug: 'microservices-portfolio-engine',
        contentType: 'project'
      }
    ];

    // Quizzes for Batch A
    mockQuizzes = [
      {
        id: 'quiz-1',
        contentItemId: 'ci-quiz-1',
        quizType: 'formal',
        timeLimitMinutes: 60,
        passingScorePercent: 60
      },
      {
        id: 'quiz-2',
        contentItemId: 'ci-quiz-2',
        quizType: 'practice',
        timeLimitMinutes: 45,
        passingScorePercent: 70
      }
    ];

    // Projects for Batch A
    mockAssignments = [
      {
        id: 'asg-1',
        contentItemId: 'ci-proj-1',
        maxScore: 100
      }
    ];

    mockBatchCurriculum = [
      {
        id: 1,
        batchId: batchIdA,
        contentItemId: 'ci-quiz-1',
        weekNumber: 1,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date('2026-01-10'),
        dueAt: new Date('2026-01-20')
      },
      {
        id: 2,
        batchId: batchIdA,
        contentItemId: 'ci-quiz-2',
        weekNumber: 2,
        sequenceOrder: 2,
        isRequired: false,
        availableFrom: new Date('2026-01-25'),
        dueAt: new Date('2026-02-05')
      },
      {
        id: 3,
        batchId: batchIdA,
        contentItemId: 'ci-proj-1',
        weekNumber: 3,
        sequenceOrder: 3,
        isRequired: true,
        availableFrom: new Date('2026-02-01'),
        dueAt: new Date(Date.now() - 86400000) // Overdue (yesterday)
      }
    ];

    // Quiz attempts for Batch A:
    // Alice (101) passed Quiz 1 (score 80/100)
    // Bob (102) failed Quiz 1 (score 50/100, isPassed: false, tabBlurCount: 3 -> anomalous)
    // Charlie (103) has not attempted Quiz 1
    mockQuizAttempts = [
      {
        id: 'qa-1',
        batchId: batchIdA,
        quizId: 'quiz-1',
        studentId: 101,
        score: 80,
        maxScore: 100,
        isPassed: true,
        startedAt: new Date('2026-03-01T09:00:00Z'),
        submittedAt: new Date('2026-03-01T10:00:00Z'),
        tabBlurCount: 0
      },
      {
        id: 'qa-2',
        batchId: batchIdA,
        quizId: 'quiz-1',
        studentId: 102,
        score: 50,
        maxScore: 100,
        isPassed: false,
        startedAt: new Date('2026-03-02T09:00:00Z'),
        submittedAt: new Date('2026-03-02T10:00:00Z'),
        tabBlurCount: 3
      },
      // Cross-batch attempt for Batch B
      {
        id: 'qa-cross',
        batchId: batchIdB,
        quizId: 'quiz-b',
        studentId: 201,
        score: 95,
        maxScore: 100,
        isPassed: true,
        startedAt: new Date('2026-03-05T09:00:00Z'),
        submittedAt: new Date('2026-03-05T10:00:00Z'),
        tabBlurCount: 0
      }
    ];

    // Project submissions for Batch A:
    // Alice (101): approved (score 90)
    // Bob (102): resubmission_requested (score 45)
    // Charlie (103): not submitted (overdue)
    mockAssignmentSubmissions = [
      {
        id: 1,
        batchId: batchIdA,
        assignmentId: 'asg-1',
        studentId: 101,
        status: 'approved',
        score: 90,
        submittedAt: new Date('2026-03-03T10:00:00Z'),
        updatedAt: new Date('2026-03-03T10:00:00Z')
      },
      {
        id: 2,
        batchId: batchIdA,
        assignmentId: 'asg-1',
        studentId: 102,
        status: 'resubmission_requested',
        score: 45,
        submittedAt: new Date('2026-03-04T10:00:00Z'),
        updatedAt: new Date('2026-03-04T10:00:00Z')
      },
      // Cross-batch submission for Batch B
      {
        id: 99,
        batchId: batchIdB,
        assignmentId: 'asg-b',
        studentId: 201,
        status: 'approved',
        score: 100,
        submittedAt: new Date('2026-03-04T10:00:00Z'),
        updatedAt: new Date('2026-03-04T10:00:00Z')
      }
    ];

    // External assessments for Batch A:
    // Alice (101): 92%, percentile 98.5
    // Bob (102): 65%, missing percentile (null)
    // Charlie (103): not recorded
    mockExternalAssessmentRecords = [
      {
        id: 1,
        batchId: batchIdA,
        studentId: 101,
        provider: 'HackerRank',
        assessmentCode: 'HR-DSA-CORE',
        assessmentName: 'HackerRank Problem Solving',
        maxScore: 100,
        obtainedScore: 92,
        percentile: 98.5,
        importedAt: new Date('2026-02-15T10:00:00Z')
      },
      {
        id: 2,
        batchId: batchIdA,
        studentId: 102,
        provider: 'HackerRank',
        assessmentCode: 'HR-DSA-CORE',
        assessmentName: 'HackerRank Problem Solving',
        maxScore: 100,
        obtainedScore: 65,
        percentile: null, // missing percentile
        importedAt: new Date('2026-02-16T10:00:00Z')
      },
      // Cross-batch external record for Batch B
      {
        id: 99,
        batchId: batchIdB,
        studentId: 201,
        provider: 'Codility',
        assessmentCode: 'COD-TEST',
        assessmentName: 'Codility Silver Test',
        maxScore: 100,
        obtainedScore: 100,
        percentile: 99.0,
        importedAt: new Date('2026-02-20T10:00:00Z')
      }
    ];
  });

  // =========================================================================
  // 1. AUTHORIZATION TESTS
  // =========================================================================
  describe('Authorization and Role Verification', () => {
    it('rejects unauthenticated user when calling export action', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await exportBatchAnalyticsCsvAction(batchIdA, 'summary');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/unauthorized|authentication/i);
    });

    it('rejects unauthorized role (student) when calling export action', async () => {
      mockAuth.mockResolvedValue(studentUser);

      const res = await exportBatchAnalyticsCsvAction(batchIdA, 'summary');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/forbidden|academic operations/i);
    });

    it('allows authorized admin role to call export action', async () => {
      mockAuth.mockResolvedValue(adminUser);

      const res = await exportBatchAnalyticsCsvAction(batchIdA, 'summary');
      expect(res.success).toBe(true);
      expect(res.csvContent).toBeDefined();
    });

    it('allows super_admin role to call export action', async () => {
      mockAuth.mockResolvedValue(superAdminUser);

      const res = await exportBatchAnalyticsCsvAction(batchIdA, 'assessments');
      expect(res.success).toBe(true);
      expect(res.csvContent).toBeDefined();
    });
  });

  // =========================================================================
  // 2. BATCH ISOLATION TESTS
  // =========================================================================
  describe('Batch Isolation & Manipulated IDs', () => {
    it('returns null when querying analytics for non-existent batch', async () => {
      const data = await getBatchAcademicAnalytics(invalidBatchId);
      expect(data).toBeNull();
    });

    it('rejects non-existent batch in export server action', async () => {
      mockAuth.mockResolvedValue(adminUser);

      const res = await exportBatchAnalyticsCsvAction(invalidBatchId, 'summary');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/failed to generate report|batch not found/i);
    });

    it('strictly isolates enrolled students: Batch A only sees 3 students, never Batch B student', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();
      expect(data?.overview.enrolledStudentsCount).toBe(3);
    });

    it('strictly isolates quiz attempts: Batch A never counts Batch B attempts', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const quiz1 = data?.assessmentPerformance.find((a) => a.quizId === 'quiz-1');
      expect(quiz1).toBeDefined();
      expect(quiz1?.attemptsCompleted).toBe(2); // Only Alice and Bob, not Diana
    });

    it('strictly isolates projects: Batch A never counts Batch B submissions', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const proj1 = data?.projectPerformance.find((p) => p.assignmentId === 'asg-1');
      expect(proj1).toBeDefined();
      expect(proj1?.totalSubmissionsCount).toBe(2); // Only Alice and Bob, not Diana
    });

    it('strictly isolates external assessment records: Batch A never counts Batch B external records', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const hackerRank = data?.externalAssessmentPerformance.find((e) => e.provider === 'HackerRank');
      expect(hackerRank).toBeDefined();
      expect(hackerRank?.recordsCount).toBe(2);

      // Codility was imported only for Batch B
      const codility = data?.externalAssessmentPerformance.find((e) => e.provider === 'Codility');
      expect(codility).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. ASSESSMENT ANALYTICS TESTS
  // =========================================================================
  describe('Assessment Analytics Calculations', () => {
    it('calculates eligible count, attempted count, and participation rate correctly', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const quiz1 = data?.assessmentPerformance.find((a) => a.quizId === 'quiz-1');
      expect(quiz1?.eligibleStudentsCount).toBe(3); // 3 enrolled students
      expect(quiz1?.attemptsStarted).toBe(2);
      expect(quiz1?.participationRatePercent).toBe(67); // 2 out of 3 = 66.67% -> rounded to 67%
    });

    it('calculates average score, average percentage, highest and lowest scores correctly', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const quiz1 = data?.assessmentPerformance.find((a) => a.quizId === 'quiz-1');
      // Alice = 80/100, Bob = 50/100 -> avg score = 65, avg pct = 65%
      expect(quiz1?.averageScore).toBe(65);
      expect(quiz1?.averagePercentage).toBe(65);
      expect(quiz1?.highestScore).toBe(80);
      expect(quiz1?.lowestScore).toBe(50);
    });

    it('calculates pass rate correctly based on passingScore', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const quiz1 = data?.assessmentPerformance.find((a) => a.quizId === 'quiz-1');
      // 1 passed (Alice), 1 failed (Bob) out of 2 completed -> 50%
      expect(quiz1?.passRatePercent).toBe(50);
      expect(quiz1?.flaggedAnomalyCount).toBe(1); // Bob had tabBlurCount = 3
    });

    it('handles empty assessments with 0 attempts gracefully', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const quiz2 = data?.assessmentPerformance.find((a) => a.quizId === 'quiz-2');
      expect(quiz2).toBeDefined();
      expect(quiz2?.attemptsStarted).toBe(0);
      expect(quiz2?.attemptsCompleted).toBe(0);
      expect(quiz2?.participationRatePercent).toBe(0);
      expect(quiz2?.averageScore).toBeNull();
      expect(quiz2?.averagePercentage).toBeNull();
      expect(quiz2?.highestScore).toBeNull();
      expect(quiz2?.lowestScore).toBeNull();
      expect(quiz2?.passRatePercent).toBeNull();
    });
  });

  // =========================================================================
  // 4. PROJECT ANALYTICS TESTS
  // =========================================================================
  describe('Project Analytics Calculations', () => {
    it('calculates project submission count and status breakdown correctly', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const proj = data?.projectPerformance.find((p) => p.assignmentId === 'asg-1');
      expect(proj).toBeDefined();
      expect(proj?.assignedStudentsCount).toBe(3);
      expect(proj?.totalSubmissionsCount).toBe(2);
      expect(proj?.approvedCount).toBe(1); // Alice
      expect(proj?.changesRequestedCount).toBe(1); // Bob
      expect(proj?.submittedCount).toBe(0);
      expect(proj?.underReviewCount).toBe(0);
    });

    it('calculates submission rate and approval rate correctly', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const proj = data?.projectPerformance.find((p) => p.assignmentId === 'asg-1');
      // 2 submitted out of 3 eligible = 66.67% -> 67%
      expect(proj?.submissionRatePercent).toBe(67);
      // 1 approved out of 2 submitted = 50%
      expect(proj?.approvalRatePercent).toBe(50);
      // Average score = (90 + 45)/2 = 67.5
      expect(proj?.averageScore).toBe(67.5);
    });

    it('handles cohort project overview metrics accurately', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      expect(data?.overview.projectSubmissionRate).toBe(67);
      expect(data?.overview.projectApprovalRate).toBe(50);
    });
  });

  // =========================================================================
  // 5. EXTERNAL ASSESSMENT ANALYTICS TESTS
  // =========================================================================
  describe('External Assessment Analytics Calculations', () => {
    it('aggregates provider and assessment metrics accurately', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const ext = data?.externalAssessmentPerformance.find((e) => e.provider === 'HackerRank');
      expect(ext).toBeDefined();
      expect(ext?.assessmentCode).toBe('HR-DSA-CORE');
      expect(ext?.assessmentName).toBe('HackerRank Problem Solving');
      expect(ext?.recordsCount).toBe(2);
      // 2 students covered out of 3 enrolled = 67%
      expect(ext?.participationRatePercent).toBe(67);
    });

    it('computes average percentage and highest score correctly', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const ext = data?.externalAssessmentPerformance.find((e) => e.provider === 'HackerRank');
      // Alice = 92%, Bob = 65% -> average = 79%
      expect(ext?.averagePercentage).toBe(79);
      expect(ext?.highestScore).toBe(92);
    });

    it('handles present and missing percentiles appropriately without crashing', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const ext = data?.externalAssessmentPerformance.find((e) => e.provider === 'HackerRank');
      // Alice has 98.50%, Bob has null -> average of existing = 98.5
      expect(ext?.averagePercentile).toBe(98.5);
    });

    it('aggregates performance tier counts accurately', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const ext = data?.externalAssessmentPerformance.find((e) => e.provider === 'HackerRank');
      expect(ext?.tierCounts.elite).toBe(1); // Alice (92%)
      expect(ext?.tierCounts.proficient).toBe(1); // Bob (65%)
      expect(ext?.tierCounts.advanced).toBe(0);
      expect(ext?.tierCounts.developing).toBe(0);
    });
  });

  // =========================================================================
  // 6. COHORT DISTRIBUTIONS TESTS
  // =========================================================================
  describe('Cohort Distribution Models', () => {
    it('populates score bands based on quiz attempts', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const bands = data?.distribution.quizScoreBands;
      expect(bands).toBeDefined();
      // Alice: 80% (advanced band), Bob: 50% (developing band)
      expect(bands?.advanced.count).toBe(1);
      expect(bands?.developing.count).toBe(1);
    });

    it('populates project milestone distribution accurately', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const projStatus = data?.distribution.projectStatusDistribution;
      expect(projStatus).toBeDefined();
      expect(projStatus?.approved).toBe(1);
      expect(projStatus?.changesRequested).toBe(1);
      expect(projStatus?.notSubmitted).toBe(1);
    });
  });

  // =========================================================================
  // 7. DETERMINISTIC NEEDS ATTENTION VIEW TESTS
  // =========================================================================
  describe('Needs Attention Deterministic Intervention Engine', () => {
    it('identifies students with failed formal assessments', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      // Bob (102) failed Quiz 1 (50% < 60% pass score)
      const bob = data?.needsAttention.find((item) => item.studentId === 102);
      expect(bob).toBeDefined();
      const failedQuizIssue = bob?.issues.find(
        (i) => i.category === 'quiz' && i.title.includes('Failed Quiz: Data Structures Sprint')
      );
      expect(failedQuizIssue).toBeDefined();
      expect(failedQuizIssue?.severity).toBe('high');
      expect(failedQuizIssue?.actionUrl).toContain('/assessments?quizId=quiz-1');
    });

    it('identifies students with no assessment attempts recorded', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      // Charlie (103) attempted 0 quizzes
      const charlie = data?.needsAttention.find((item) => item.studentId === 103);
      expect(charlie).toBeDefined();
      const noQuizIssue = charlie?.issues.find(
        (i) => i.category === 'quiz' && i.title.includes('No Quizzes Completed')
      );
      expect(noQuizIssue).toBeDefined();
      expect(noQuizIssue?.severity).toBe('high');
    });

    it('identifies students with project resubmissions requested', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      // Bob (102) has resubmission_requested on asg-1
      const bob = data?.needsAttention.find((item) => item.studentId === 102);
      expect(bob).toBeDefined();
      const resubIssue = bob?.issues.find(
        (i) => i.category === 'project' && i.title.includes('Changes Requested')
      );
      expect(resubIssue).toBeDefined();
      expect(resubIssue?.actionUrl).toContain('/projects?assignmentId=asg-1');
    });

    it('identifies students with overdue unsubmitted projects', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      // Charlie (103) has not submitted asg-1 and it is overdue
      const charlie = data?.needsAttention.find((item) => item.studentId === 103);
      expect(charlie).toBeDefined();
      const overdueIssue = charlie?.issues.find(
        (i) => i.category === 'project' && i.title.includes('Overdue Project')
      );
      expect(overdueIssue).toBeDefined();
    });

    it('identifies students missing external assessment benchmark data', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      // Charlie (103) has no external assessment records while HackerRank was imported for the batch
      const charlie = data?.needsAttention.find((item) => item.studentId === 103);
      expect(charlie).toBeDefined();
      const extIssue = charlie?.issues.find(
        (i) => i.category === 'external' && i.title.includes('Missing External Assessment Data')
      );
      expect(extIssue).toBeDefined();
    });

    it('never leaks students from another batch into the Needs Attention roster', async () => {
      const data = await getBatchAcademicAnalytics(batchIdA);
      expect(data).not.toBeNull();

      const batchBStudentInA = data?.needsAttention.find((i) => i.studentId === 201);
      expect(batchBStudentInA).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. CSV EXPORTS & INTEGRATION TESTS
  // =========================================================================
  describe('Batch-Scoped Academic CSV Exports', () => {
    it('generates executive summary report with expected headers and metrics', async () => {
      const report = await exportBatchAnalyticsReportCsv(batchIdA, 'summary');
      expect(report).not.toBeNull();
      expect(report?.filename).toContain('executive_summary');
      expect(report?.csvContent).toContain('Metric,Value,Description');
      expect(report?.csvContent).toContain('Enrolled Students,3');
      expect(report?.csvContent).toContain('Quizzes Assigned,2');
      expect(report?.csvContent).toContain('Quiz Participation Rate,67%');
      expect(report?.csvContent).toContain('Project Submission Rate,67%');
      expect(report?.csvContent).toContain('Project Approval Rate,50%');
    });

    it('generates assessments performance report with expected columns', async () => {
      const report = await exportBatchAnalyticsReportCsv(batchIdA, 'assessments');
      expect(report).not.toBeNull();
      expect(report?.filename).toContain('assessment_performance');
      expect(report?.csvContent).toContain(
        'Week,Title,Type,Required,Passing Threshold (%),Eligible Students,Attempts Started,Attempts Completed,Participation Rate (%),Average Score,Average Percentage (%),Highest Score,Lowest Score,Pass Rate (%),Flagged Anomalies,Latest Activity'
      );
      expect(report?.csvContent).toContain('Data Structures Sprint');
      expect(report?.csvContent).toContain('67%');
    });

    it('generates project performance report with milestone metrics', async () => {
      const report = await exportBatchAnalyticsReportCsv(batchIdA, 'projects');
      expect(report).not.toBeNull();
      expect(report?.filename).toContain('project_performance');
      expect(report?.csvContent).toContain(
        'Week,Title,Max Score,Required,Due Date,Assigned Students,Total Submissions,Submitted,Under Review,Changes Requested,Approved,Submission Rate (%),Approval Rate (%),Average Score,Latest Submission'
      );
      expect(report?.csvContent).toContain('Microservices Portfolio Engine');
      expect(report?.csvContent).toContain('67%');
    });

    it('generates external assessment benchmark report with expected headers', async () => {
      const report = await exportBatchAnalyticsReportCsv(batchIdA, 'external');
      expect(report).not.toBeNull();
      expect(report?.filename).toContain('external_assessments');
      expect(report?.csvContent).toContain(
        'Provider,Assessment Code,Assessment Name,Max Score,Records Count,Participating Students,Participation Rate (%),Average Score,Average Percentage (%),Highest Score,Average Percentile,Elite (>=90%),Advanced (>=75%),Proficient (>=60%),Developing (<60%),Latest Imported'
      );
      expect(report?.csvContent).toContain('HackerRank');
      expect(report?.csvContent).toContain('HR-DSA-CORE');
      expect(report?.csvContent).not.toContain('Codility'); // Codility is Batch B only
    });

    it('generates Needs Attention intervention roster with deterministic reasons', async () => {
      const report = await exportBatchAnalyticsReportCsv(batchIdA, 'needs_attention');
      expect(report).not.toBeNull();
      expect(report?.filename).toContain('needs_attention');
      expect(report?.csvContent).toContain('Student Name,Roll Number,Email,Category,Severity,Issue Title,Details,Action URL');
      expect(report?.csvContent).toContain('Bob Jones');
      expect(report?.csvContent).toContain('Charlie Brown');
      expect(report?.csvContent).not.toContain('Diana Prince'); // Diana is Batch B only
    });

    it('handles empty batches gracefully in CSV exports without errors', async () => {
      const report = await exportBatchAnalyticsReportCsv(invalidBatchId, 'summary');
      expect(report).toBeNull();
    });

    it('escapes quotes and special characters according to RFC 4180', async () => {
      // Modify a student name to contain quotes and commas
      mockStudents[0].fullName = 'Smith, "Alice"';
      const report = await exportBatchAnalyticsReportCsv(batchIdA, 'needs_attention');
      expect(report).not.toBeNull();
      expect(report?.csvContent).toBeDefined();
    });
  });
});
