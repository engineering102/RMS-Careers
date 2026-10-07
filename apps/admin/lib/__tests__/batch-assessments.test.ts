import { describe, it, expect, vi, beforeEach } from 'vitest';
import util from 'node:util';

vi.mock('server-only', () => ({}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

const sampleBatchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const otherBatchId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const sampleQuizId = 'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq';
const sampleContentItemId = 'cccccccc-1111-2222-3333-444444444444';
const sampleAttemptId = 'aaaaaaaa-1111-2222-3333-444444444444';

// Mock database state
let mockBatches: any[] = [];
let mockEnrollments: any[] = [];
let mockStudents: any[] = [];
let mockContentItems: any[] = [];
let mockBatchCurriculum: any[] = [];
let mockQuizzes: any[] = [];
let mockQuizQuestions: any[] = [];
let mockQuizAttempts: any[] = [];

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
                return mockBatches;
              }

              // 2. enrollments table (count query)
              if (currentTable === actual.enrollments) {
                return [{ count: mockEnrollments.length }];
              }

              // 3. batchCurriculum table joined with contentItems & quizzes
              if (currentTable === actual.batchCurriculum) {
                // If checking single assignment existence
                if (fields && 'id' in fields && !('title' in fields)) {
                  if (mockBatchCurriculum.length > 0) {
                    return [{ id: mockBatchCurriculum[0].id }];
                  }
                  return [];
                }

                // Overview assigned items join
                return mockBatchCurriculum.map((bc) => {
                  const content = mockContentItems.find((ci) => ci.id === bc.contentItemId) || {};
                  const quiz = mockQuizzes.find((q) => q.contentItemId === bc.contentItemId) || {};
                  return {
                    contentItemId: bc.contentItemId,
                    weekNumber: bc.weekNumber,
                    sequenceOrder: bc.sequenceOrder,
                    isRequired: bc.isRequired,
                    availableFrom: bc.availableFrom,
                    dueAt: bc.dueAt,
                    title: content.title || 'Untitled Assessment',
                    slug: content.slug || 'untitled',
                    quizId: quiz.id || 'quiz-1',
                    quizType: quiz.quizType || 'practice',
                    timeLimitMinutes: quiz.timeLimitMinutes || null,
                    passingScorePercent: quiz.passingScorePercent || 60
                  };
                });
              }

              // 4. quizAttempts table
              if (currentTable === actual.quizAttempts) {
                let attemptsToUse = [...mockQuizAttempts];
                if (queryState.whereConditions) {
                  const condStr = util.inspect(queryState.whereConditions, { depth: null });
                  attemptsToUse = attemptsToUse.filter((att) => {
                    if (condStr.includes(otherBatchId) && att.batchId !== otherBatchId) {
                      return false;
                    }
                    if (condStr.includes(sampleBatchId) && att.batchId !== sampleBatchId) {
                      return false;
                    }
                    if (condStr.includes('attempt-batch-a') && att.id !== 'attempt-batch-a') {
                      return false;
                    }
                    if (condStr.includes('attempt-batch-b') && att.id !== 'attempt-batch-b') {
                      return false;
                    }
                    if (condStr.includes(sampleAttemptId) && att.id !== sampleAttemptId) {
                      return false;
                    }
                    return true;
                  });
                }

                // Check if this is an aggregation group-by query for overview stats
                if (queryState.groupByVal) {
                  const statsByQuiz = new Map<string, any>();
                  for (const att of attemptsToUse) {
                    const existing = statsByQuiz.get(att.quizId) || {
                      quizId: att.quizId,
                      totalAttempts: 0,
                      completedAttempts: 0,
                      inProgressAttempts: 0,
                      totalScore: 0,
                      totalPercentage: 0,
                      passedCount: 0,
                      flaggedCount: 0,
                      latestActivityAt: null
                    };

                    existing.totalAttempts += 1;
                    if (att.submittedAt) {
                      existing.completedAttempts += 1;
                      existing.totalScore += att.score;
                      existing.totalPercentage += att.maxScore > 0 ? (att.score * 100) / att.maxScore : 0;
                      if (att.isPassed) existing.passedCount += 1;
                    } else {
                      existing.inProgressAttempts += 1;
                    }
                    if (att.tabBlurCount >= 3) {
                      existing.flaggedCount += 1;
                    }
                    if (!existing.latestActivityAt || att.startedAt > existing.latestActivityAt) {
                      existing.latestActivityAt = att.submittedAt || att.startedAt;
                    }

                    statsByQuiz.set(att.quizId, existing);
                  }

                  return Array.from(statsByQuiz.values()).map((s) => ({
                    quizId: s.quizId,
                    totalAttempts: s.totalAttempts,
                    completedAttempts: s.completedAttempts,
                    inProgressAttempts: s.inProgressAttempts,
                    avgScore: s.completedAttempts > 0 ? s.totalScore / s.completedAttempts : null,
                    avgPercentage: s.completedAttempts > 0 ? s.totalPercentage / s.completedAttempts : null,
                    passedCount: s.passedCount,
                    flaggedCount: s.flaggedCount,
                    latestActivityAt: s.latestActivityAt
                  }));
                }

                // Detailed attempt query (inspector or list)
                const joined = attemptsToUse.map((att) => {
                  const student = mockStudents.find((s) => s.id === att.studentId) || {};
                  const quiz = mockQuizzes.find((q) => q.id === att.quizId) || {};
                  const content = mockContentItems.find((c) => c.id === quiz.contentItemId) || {};
                  const batch = mockBatches.find((b) => b.id === att.batchId) || {};

                  return {
                    attemptId: att.id,
                    quizId: att.quizId,
                    batchId: att.batchId,
                    batchName: batch.name || 'Batch Alpha',
                    studentId: att.studentId,
                    studentName: student.fullName || 'Student Name',
                    studentEmail: student.email || 'student@test.com',
                    collegeRollNumber: student.collegeRollNumber || 'ROLL123',
                    score: att.score,
                    maxScore: att.maxScore,
                    isPassed: att.isPassed,
                    responses: att.responses || {},
                    tabBlurCount: att.tabBlurCount || 0,
                    startedAt: att.startedAt,
                    submittedAt: att.submittedAt,
                    assessmentTitle: content.title || 'Assessment Title',
                    quizTitle: content.title || 'Assessment Title',
                    quizType: quiz.quizType || 'practice',
                    timeLimitMinutes: quiz.timeLimitMinutes || null,
                    passingScorePercent: quiz.passingScorePercent || 60
                  };
                });

                return joined;
              }

              // 5. quizQuestions table
              if (currentTable === actual.quizQuestions) {
                return mockQuizQuestions;
              }

              return [];
            },

            then(resolve: any) {
              return Promise.resolve(this.execute()).then(resolve);
            }
          };

          return queryState;
        }
      })
    }
  };
});

import {
  getBatchAssessmentsOverview,
  getBatchAssessmentAttempts,
  getBatchAttemptDetails,
  generateBatchAssessmentCsv
} from '../db/queries/batch-assessments';

import {
  getAttemptDetailsAction,
  exportAssessmentCsvAction
} from '../../app/(admin)/batches/[batchId]/assessments/actions';

describe('Slice C2: Batch Assessment Operations & Attempt Monitoring', () => {
  const adminSession = {
    user: { id: 'admin-uuid', email: 'admin@rmscareers.com', role: 'admin' }
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

    mockContentItems = [
      {
        id: sampleContentItemId,
        title: 'Data Structures Formal Assessment',
        slug: 'ds-formal-assessment',
        contentType: 'quiz',
        isPublished: true
      }
    ];

    mockQuizzes = [
      {
        id: sampleQuizId,
        contentItemId: sampleContentItemId,
        quizType: 'formal',
        timeLimitMinutes: 45,
        passingScorePercent: 60,
        showExplanations: 'after_deadline'
      }
    ];

    mockBatchCurriculum = [
      {
        id: 'bc-placement-1',
        batchId: sampleBatchId,
        contentItemId: sampleContentItemId,
        weekNumber: 3,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date('2026-10-01T00:00:00Z'),
        dueAt: new Date('2026-10-15T23:59:59Z')
      }
    ];

    mockQuizQuestions = [
      {
        id: 1,
        quizId: sampleQuizId,
        questionText: 'What is the time complexity of pushing onto an array stack?',
        questionType: 'single_choice',
        options: [
          { id: 'opt_1', text: 'O(1) amortized' },
          { id: 'opt_2', text: 'O(n)' }
        ],
        correctOptionIds: ['opt_1'],
        explanationText: 'Dynamic arrays resize infrequently.',
        points: 2,
        sequenceOrder: 0
      },
      {
        id: 2,
        quizId: sampleQuizId,
        questionText: 'Which traversal visits root node first?',
        questionType: 'single_choice',
        options: [
          { id: 'opt_1', text: 'Preorder' },
          { id: 'opt_2', text: 'Inorder' }
        ],
        correctOptionIds: ['opt_1'],
        explanationText: 'Root is processed before children in preorder.',
        points: 3,
        sequenceOrder: 1
      }
    ];

    mockQuizAttempts = [
      {
        id: sampleAttemptId,
        quizId: sampleQuizId,
        studentId: 101,
        batchId: sampleBatchId,
        score: 5,
        maxScore: 5,
        isPassed: true,
        responses: { '1': ['opt_1'], '2': ['opt_1'] },
        tabBlurCount: 4, // Flagged anomaly (>= 3)
        startedAt: new Date('2026-10-05T10:00:00Z'),
        submittedAt: new Date('2026-10-05T10:25:30Z')
      },
      {
        id: 'attempt-uuid-2',
        quizId: sampleQuizId,
        studentId: 102,
        batchId: sampleBatchId,
        score: 2,
        maxScore: 5,
        isPassed: false,
        responses: { '1': ['opt_1'], '2': ['opt_2'] },
        tabBlurCount: 0,
        startedAt: new Date('2026-10-05T11:00:00Z'),
        submittedAt: new Date('2026-10-05T11:30:00Z')
      },
      {
        id: 'attempt-uuid-3',
        quizId: sampleQuizId,
        studentId: 103,
        batchId: sampleBatchId,
        score: 0,
        maxScore: 5,
        isPassed: false,
        responses: {},
        tabBlurCount: 1,
        startedAt: new Date('2026-10-05T12:00:00Z'),
        submittedAt: null // In progress attempt
      }
    ];
  });

  // =========================================================================
  // 1. Authorization Guards
  // =========================================================================
  describe('Authorization Guards', () => {
    it('rejects getAttemptDetailsAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await getAttemptDetailsAction(sampleBatchId, sampleAttemptId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });

    it('rejects exportAssessmentCsvAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await exportAssessmentCsvAction(sampleBatchId, sampleQuizId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });

    it('rejects access when requested batch does not exist', async () => {
      mockBatches = []; // Nonexistent batch

      const res = await getAttemptDetailsAction('nonexistent-batch', sampleAttemptId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/batch not found/i);
      }
    });
  });

  // =========================================================================
  // 2. Batch Assessment Overview Query & Metrics
  // =========================================================================
  describe('Batch Assessment Overview', () => {
    it('aggregates operational metrics for assessments assigned to the batch', async () => {
      const overview = await getBatchAssessmentsOverview(sampleBatchId);

      expect(overview).toHaveLength(1);
      const item = overview[0];

      expect(item.quizId).toBe(sampleQuizId);
      expect(item.title).toBe('Data Structures Formal Assessment');
      expect(item.quizType).toBe('formal');
      expect(item.weekNumber).toBe(3);
      expect(item.isRequired).toBe(true);
      expect(item.eligibleStudentsCount).toBe(3);
      expect(item.attemptsStarted).toBe(3);
      expect(item.attemptsCompleted).toBe(2);
      expect(item.attemptsInProgress).toBe(1);
      expect(item.flaggedCount).toBe(1); // 1 attempt with >= 3 tab blurs
      expect(item.passRatePercent).toBe(50); // 1 passed out of 2 completed = 50%
    });

    it('returns empty array when batch has zero assigned curriculum assessments', async () => {
      mockBatchCurriculum = []; // No assessments assigned

      const overview = await getBatchAssessmentsOverview(sampleBatchId);
      expect(overview).toEqual([]);
    });
  });

  // =========================================================================
  // 3. Attempt Listing & Proctoring Telemetry
  // =========================================================================
  describe('Attempt Listing & Proctoring Flags', () => {
    it('returns attempts matching the batch and quiz with duration and telemetry', async () => {
      const attempts = await getBatchAssessmentAttempts(sampleBatchId, sampleQuizId);

      expect(attempts).toHaveLength(3);

      const completed = attempts.find((a) => a.attemptId === sampleAttemptId);
      expect(completed).toBeDefined();
      expect(completed!.studentName).toBe('Aarav Sharma');
      expect(completed!.status).toBe('completed');
      expect(completed!.score).toBe(5);
      expect(completed!.maxScore).toBe(5);
      expect(completed!.percentage).toBe(100);
      expect(completed!.isPassed).toBe(true);
      expect(completed!.tabBlurCount).toBe(4);
      expect(completed!.isFlagged).toBe(true); // >= 3 tab blurs
      expect(completed!.durationSeconds).toBe(1530); // 25m 30s = 1530 seconds

      const inProgress = attempts.find((a) => a.attemptId === 'attempt-uuid-3');
      expect(inProgress).toBeDefined();
      expect(inProgress!.status).toBe('in_progress');
      expect(inProgress!.submittedAt).toBeNull();
      expect(inProgress!.durationSeconds).toBeNull();
      expect(inProgress!.isFlagged).toBe(false);
    });

    it('returns empty list if quiz is not assigned to the batch curriculum', async () => {
      mockBatchCurriculum = []; // Not assigned to this batch

      const attempts = await getBatchAssessmentAttempts(sampleBatchId, sampleQuizId);
      expect(attempts).toEqual([]);
    });
  });

  // =========================================================================
  // 4. Individual Attempt Inspector
  // =========================================================================
  describe('Individual Attempt Inspector', () => {
    it('provides full question-by-question breakdown with student choices and correct keys', async () => {
      const details = await getBatchAttemptDetails(sampleBatchId, sampleAttemptId);

      expect(details).not.toBeNull();
      expect(details!.studentName).toBe('Aarav Sharma');
      expect(details!.batchName).toBe('Batch 2026 CS-A');
      expect(details!.quizType).toBe('formal');
      expect(details!.tabBlurCount).toBe(4);
      expect(details!.isFlagged).toBe(true);
      expect(details!.questions).toHaveLength(2);

      // Question 1 breakdown
      const q1 = details!.questions[0];
      expect(q1.questionText).toContain('pushing onto an array stack');
      expect(q1.isCorrect).toBe(true);
      expect(q1.earnedPoints).toBe(2);
      expect(q1.selectedOptionIds).toEqual(['opt_1']);
      expect(q1.correctOptionIds).toEqual(['opt_1']);
      expect(q1.explanationText).toContain('Dynamic arrays resize');
    });

    it('safely rejects inspection if attempt does not belong to the batch', async () => {
      // Trying to query attempt in otherBatchId
      const details = await getBatchAttemptDetails(otherBatchId, sampleAttemptId);
      expect(details).toBeNull();
    });

    it('returns error in Server Action when attempt is cross-batch or missing', async () => {
      const res = await getAttemptDetailsAction(otherBatchId, sampleAttemptId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/does not belong to this batch/i);
      }
    });
  });

  // =========================================================================
  // 5. Cross-Batch Isolation & Multi-Batch Students
  // =========================================================================
  describe('Cross-Batch Isolation & Multi-Batch Students', () => {
    it('never leaks attempts from another batch for the same multi-enrolled student', async () => {
      // Student 101 is enrolled in Batch A and Batch B
      // Student has an attempt in Batch A and a separate attempt in Batch B
      mockQuizAttempts = [
        {
          id: 'attempt-batch-a',
          quizId: sampleQuizId,
          studentId: 101,
          batchId: sampleBatchId,
          score: 5,
          maxScore: 5,
          isPassed: true,
          tabBlurCount: 0,
          startedAt: new Date(),
          submittedAt: new Date()
        },
        {
          id: 'attempt-batch-b',
          quizId: sampleQuizId,
          studentId: 101,
          batchId: otherBatchId,
          score: 1,
          maxScore: 5,
          isPassed: false,
          tabBlurCount: 6,
          startedAt: new Date(),
          submittedAt: new Date()
        }
      ];

      // Query Batch A
      const batchAAttempts = await getBatchAssessmentAttempts(sampleBatchId, sampleQuizId);
      expect(batchAAttempts).toHaveLength(1);
      expect(batchAAttempts[0].attemptId).toBe('attempt-batch-a');
      expect(batchAAttempts[0].score).toBe(5);

      // Attempt from Batch B cannot be inspected from Batch A
      const crossInspect = await getBatchAttemptDetails(sampleBatchId, 'attempt-batch-b');
      expect(crossInspect).toBeNull();
    });
  });

  // =========================================================================
  // 6. Institutional CSV Export
  // =========================================================================
  describe('Institutional CSV Export', () => {
    it('generates properly formatted CSV with all institutional fields and escaping', async () => {
      const exportResult = await generateBatchAssessmentCsv(sampleBatchId, sampleQuizId);

      expect(exportResult).not.toBeNull();
      expect(exportResult!.filename).toContain('assessment_results_batch_2026_cs');
      expect(exportResult!.filename).toMatch(/\.csv$/);

      const lines = exportResult!.csvContent.split('\n');
      expect(lines.length).toBeGreaterThan(1);

      // Check Header Columns
      const header = lines[0];
      expect(header).toContain('Batch ID');
      expect(header).toContain('Batch Name');
      expect(header).toContain('Assessment Title');
      expect(header).toContain('Assessment Type');
      expect(header).toContain('Student Name');
      expect(header).toContain('Student Email');
      expect(header).toContain('Roll Number');
      expect(header).toContain('Attempt Status');
      expect(header).toContain('Score');
      expect(header).toContain('Max Score');
      expect(header).toContain('Percentage');
      expect(header).toContain('Result');
      expect(header).toContain('Tab Blur Count');
      expect(header).toContain('Flagged Anomaly');
      expect(header).toContain('Duration (Minutes)');

      // Verify row content
      const rowAarav = lines.find((l) => l.includes('Aarav Sharma'));
      expect(rowAarav).toBeDefined();
      expect(rowAarav).toContain('"Completed"');
      expect(rowAarav).toContain('"Passed"');
      expect(rowAarav).toContain('"Yes"'); // Flagged anomaly because tabBlurCount = 4
      expect(rowAarav).toContain('100%');
    });

    it('exports CSV through Server Action with admin authentication', async () => {
      const res = await exportAssessmentCsvAction(sampleBatchId, sampleQuizId);

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.filename).toBeDefined();
        expect(res.data.csvContent).toContain('Batch 2026 CS-A');
      }
    });
  });
});
