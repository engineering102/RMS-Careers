import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStudentPracticeQuizzes,
  getPracticeQuizForRunner,
  getStudentFormalAssessments,
  getFormalAssessmentForRunner,
  getAssessmentType
} from '../db/queries/assessments';
import {
  submitPracticeQuizAttempt,
  startFormalAssessmentAttempt,
  submitFormalAssessment
} from '../actions/quiz';

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

// In-memory mock database state
let mockUsers: any[] = [];
let mockUserRoles: any[] = [];
let mockStudents: any[] = [];
let mockStudentStats: any[] = [];
let mockEnrollments: any[] = [];
let mockBatches: any[] = [];
let mockPrograms: any[] = [];
let mockContentItems: any[] = [];
let mockQuizzes: any[] = [];
let mockBatchCurriculumRows: any[] = [];
let mockQuizQuestions: any[] = [];
let mockQuizAttempts: any[] = [];
let mockActivities: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          // users
          if (table === actual.users) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockUsers)
              })
            };
          }

          // userRoles
          if (table === actual.userRoles) {
            return {
              where: () => Promise.resolve(mockUserRoles)
            };
          }

          // students
          if (table === actual.students) {
            return {
              leftJoin: () => ({
                where: () => ({
                  limit: () => Promise.resolve(mockStudents)
                })
              })
            };
          }

          // studentStats
          if (table === actual.studentStats) {
            return {
              where: (clause: any) => ({
                limit: () => Promise.resolve(mockStudentStats)
              })
            };
          }

          // enrollments
          if (table === actual.enrollments) {
            const makeResult = () => {
              const p = Promise.resolve(mockEnrollments);
              (p as any).limit = () => Promise.resolve(mockEnrollments);
              return p;
            };
            return {
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => makeResult()
                }),
                innerJoin: () => ({
                  where: () => makeResult()
                })
              }),
              where: () => makeResult()
            };
          }

          // batches
          if (table === actual.batches) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockBatches)
              })
            };
          }

          // activities
          if (table === actual.activities) {
            return {
              where: () => ({
                limit: () => Promise.resolve(mockActivities)
              })
            };
          }

          // batchCurriculum
          if (table === actual.batchCurriculum) {
            const makeBatchChain = () => ({
              innerJoin: () => makeBatchChain(),
              leftJoin: () => makeBatchChain(),
              where: () => ({
                limit: () => Promise.resolve(mockBatchCurriculumRows),
                orderBy: () => Promise.resolve(mockBatchCurriculumRows)
              })
            });
            return makeBatchChain();
          }

          // quizzes
          if (table === actual.quizzes) {
            const makeQuizChain = () => ({
              innerJoin: () => makeQuizChain(),
              leftJoin: () => makeQuizChain(),
              where: () => ({
                limit: () => Promise.resolve(mockQuizzes),
                orderBy: () => Promise.resolve(mockQuizzes)
              })
            });
            return {
              ...makeQuizChain(),
              where: () => ({
                limit: () => Promise.resolve(mockQuizzes)
              })
            };
          }

          // quizQuestions
          if (table === actual.quizQuestions) {
            return {
              where: () => {
                const pointsAgg = [
                  {
                    totalPoints: mockQuizQuestions.reduce((sum, q) => sum + q.points, 0)
                  }
                ];
                const p = Promise.resolve(pointsAgg);
                (p as any).groupBy = () => {
                  const map = new Map<string, { quizId: string; count: number; totalPoints: number }>();
                  for (const q of mockQuizQuestions) {
                    const existing = map.get(q.quizId) ?? {
                      quizId: q.quizId,
                      count: 0,
                      totalPoints: 0
                    };
                    existing.count += 1;
                    existing.totalPoints += q.points;
                    map.set(q.quizId, existing);
                  }
                  return Promise.resolve(Array.from(map.values()));
                };
                (p as any).orderBy = () => Promise.resolve(mockQuizQuestions);
                (p as any).limit = () => Promise.resolve(pointsAgg);
                return p;
              }
            };
          }

          // quizAttempts
          if (table === actual.quizAttempts) {
            return {
              where: () => {
                const p = Promise.resolve(mockQuizAttempts);
                (p as any).limit = () => Promise.resolve(mockQuizAttempts);
                (p as any).groupBy = () => {
                  const map = new Map<string, any>();
                  for (const a of mockQuizAttempts) {
                    const existing = map.get(a.quizId) ?? {
                      quizId: a.quizId,
                      attemptCount: 0,
                      bestScore: 0,
                      bestPercentage: 0,
                      hasPassed: false,
                      lastAttemptAt: null
                    };
                    existing.attemptCount += 1;
                    existing.bestScore = Math.max(existing.bestScore, a.score);
                    const pct = a.maxScore > 0 ? Math.round((a.score * 100) / a.maxScore) : 0;
                    existing.bestPercentage = Math.max(existing.bestPercentage, pct);
                    if (a.isPassed) existing.hasPassed = true;
                    existing.lastAttemptAt = a.submittedAt;
                    map.set(a.quizId, existing);
                  }
                  return Promise.resolve(Array.from(map.values()));
                };
                return p;
              }
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
          returning: () => {
            if (table === actual.quizAttempts) {
              const newAttempt = {
                id: '77777777-7777-4777-8777-' + String(mockQuizAttempts.length + 1).padStart(12, '0'),
                ...values
              };
              mockQuizAttempts.push(newAttempt);
              return Promise.resolve([newAttempt]);
            }
            return Promise.resolve([values]);
          },
          onConflictDoNothing: () => {
            if (table === actual.activities) {
              const existing = mockActivities.find(
                (a) =>
                  a.studentId === values.studentId &&
                  a.activityType === values.activityType &&
                  a.referenceId === values.referenceId
              );
              if (!existing) {
                mockActivities.push({
                  id: mockActivities.length + 1,
                  ...values,
                  createdAt: new Date()
                });
              }
            }
            return Promise.resolve();
          }
        })
      }),
      update: (table: any) => ({
        set: (setValues: any) => ({
          where: () => {
            if (table === actual.studentStats && mockStudentStats.length > 0) {
              Object.assign(mockStudentStats[0], setValues);
            }
            if (table === actual.quizAttempts && mockQuizAttempts.length > 0) {
              Object.assign(mockQuizAttempts[0], setValues);
            }
            return Promise.resolve();
          }
        })
      })
    }
  };
});

describe('Slice 11: Practice Knowledge Checks & Assessments', () => {
  const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
  const TEST_COLLEGE_ID = '11111111-1111-4111-8111-111111111111';
  const TEST_STUDENT_ID = 101;
  const TEST_BATCH_ID = '22222222-2222-4222-8222-222222222222';
  const TEST_PROGRAM_ID = 1;
  const TEST_QUIZ_ID = '33333333-3333-4333-8333-333333333333';
  const TEST_CONTENT_ID = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgresql://mock:mock@localhost:5432/mock';

    mockUsers = [{ id: TEST_USER_ID, email: 'student@example.com', status: 'active' }];
    mockUserRoles = [{ userId: TEST_USER_ID, role: 'student' }];
    mockStudents = [
      {
        id: TEST_STUDENT_ID,
        userId: TEST_USER_ID,
        collegeId: TEST_COLLEGE_ID,
        fullName: 'Test Student',
        enrollmentStatus: 'placed_pending'
      }
    ];

    mockStudentStats = [
      {
        studentId: TEST_STUDENT_ID,
        collegeId: TEST_COLLEGE_ID,
        totalXp: 100,
        currentLevel: 2,
        currentStreak: 2,
        longestStreak: 5,
        lastActivityDateIst: '2026-10-04'
      }
    ];

    mockEnrollments = [
      {
        studentId: TEST_STUDENT_ID,
        programId: TEST_PROGRAM_ID,
        batchId: TEST_BATCH_ID,
        status: 'active'
      }
    ];

    mockBatches = [{ id: TEST_BATCH_ID, name: 'Full Stack Cohort Alpha' }];
    mockPrograms = [{ id: TEST_PROGRAM_ID, name: 'Full Stack Web Development', code: 'FSWD' }];

    mockQuizzes = [
      {
        id: TEST_QUIZ_ID,
        contentItemId: TEST_CONTENT_ID,
        programId: TEST_PROGRAM_ID,
        programName: 'Full Stack Web Development',
        programCode: 'FSWD',
        title: 'JavaScript Asynchronous Patterns',
        slug: 'js-async-patterns',
        description: 'Test your understanding of Promises, event loop, and async/await.',
        quizType: 'practice',
        passingScorePercent: 60
      }
    ];

    mockQuizQuestions = [
      {
        id: 1,
        quizId: TEST_QUIZ_ID,
        questionText: 'Which microtask queue executes first after the call stack clears?',
        questionType: 'single_choice',
        options: [
          { id: 'opt_1', text: 'setTimeout callback' },
          { id: 'opt_2', text: 'Promise.then callback' },
          { id: 'opt_3', text: 'setInterval callback' }
        ],
        correctOptionIds: ['opt_2'],
        explanationText: 'Promise reactions are scheduled on the microtask queue, which empties before macro-tasks.',
        points: 2,
        sequenceOrder: 1
      },
      {
        id: 2,
        quizId: TEST_QUIZ_ID,
        questionText: 'Select all valid ways to handle Promise rejections in modern JavaScript:',
        questionType: 'multiple_choice',
        options: [
          { id: 'opt_a', text: 'try/catch block with await' },
          { id: 'opt_b', text: '.catch() handler' },
          { id: 'opt_c', text: 'window.alert()' }
        ],
        correctOptionIds: ['opt_a', 'opt_b'],
        explanationText: 'Both try/catch with await and .catch() are valid Promise rejection handling mechanisms.',
        points: 3,
        sequenceOrder: 2
      }
    ];

    mockQuizAttempts = [];
    mockActivities = [];
    mockBatchCurriculumRows = [];

    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, role: 'student', email: 'student@example.com' }
    });
  });

  describe('1. Authorization & Anti-Probing', () => {
    it('returns practice quizzes for an enrolled student', async () => {
      const result = await getStudentPracticeQuizzes(TEST_STUDENT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEST_QUIZ_ID);
      expect(result[0].title).toBe('JavaScript Asynchronous Patterns');
      expect(result[0].questionCount).toBe(2);
      expect(result[0].totalPoints).toBe(5);
    });

    it('returns empty array when student has no active enrollments', async () => {
      mockEnrollments = [];
      const result = await getStudentPracticeQuizzes(TEST_STUDENT_ID);
      expect(result).toEqual([]);
    });

    it('throws notFound() when querying an invalid UUID', async () => {
      await expect(
        getPracticeQuizForRunner(TEST_STUDENT_ID, 'not-a-valid-uuid')
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('throws notFound() when student has no active enrollments for runner', async () => {
      mockEnrollments = [];
      await expect(
        getPracticeQuizForRunner(TEST_STUDENT_ID, TEST_QUIZ_ID)
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('throws notFound() when quiz does not exist in database', async () => {
      mockQuizzes = [];
      await expect(
        getPracticeQuizForRunner(TEST_STUDENT_ID, TEST_QUIZ_ID)
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });
  });

  describe('2. Security & Anti-Leakage Invariants', () => {
    it('CRITICAL: excludes authoritative correctOptionIds and explanationText from runner data', async () => {
      const runnerData = await getPracticeQuizForRunner(TEST_STUDENT_ID, TEST_QUIZ_ID);

      expect(runnerData.id).toBe(TEST_QUIZ_ID);
      expect(runnerData.questions).toHaveLength(2);

      for (const question of runnerData.questions) {
        expect((question as any).correctOptionIds).toBeUndefined();
        expect((question as any).explanationText).toBeUndefined();
        expect(question.options).toHaveLength(3);
      }
    });
  });

  describe('3. Authoritative Grading & Submission via Server Action', () => {
    it('evaluates answers server-authoritatively and returns instant explanations', async () => {
      const input = {
        quizId: TEST_QUIZ_ID,
        responses: {
          1: ['opt_2'],
          2: ['opt_a', 'opt_b']
        },
        batchId: TEST_BATCH_ID
      };

      const result = await submitPracticeQuizAttempt(input);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.score).toBe(5);
      expect(result.data.maxScore).toBe(5);
      expect(result.data.percentage).toBe(100);
      expect(result.data.isPassed).toBe(true);

      const q1Result = result.data.questionResults.find((r) => r.questionId === 1);
      expect(q1Result?.isCorrect).toBe(true);
      expect(q1Result?.explanationText).toContain('Promise reactions are scheduled on the microtask queue');
    });

    it('rejects unauthenticated requests and redirects to login', async () => {
      mockAuth.mockResolvedValue(null);

      await expect(
        submitPracticeQuizAttempt({
          quizId: TEST_QUIZ_ID,
          responses: {}
        })
      ).rejects.toThrow('REDIRECT:/login');
    });

    it('rejects invalid quiz UUID format', async () => {
      const result = await submitPracticeQuizAttempt({
        quizId: 'invalid-id',
        responses: {}
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ID');
      }
    });
  });

  describe('4. XP Idempotency & Gamification Ledger', () => {
    it('awards +20 XP on the first passing attempt and updates student stats', async () => {
      const input = {
        quizId: TEST_QUIZ_ID,
        responses: {
          1: ['opt_2'],
          2: ['opt_a', 'opt_b']
        },
        batchId: TEST_BATCH_ID
      };

      const result = await submitPracticeQuizAttempt(input);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.isPassed).toBe(true);
      expect(result.data.isFirstPass).toBe(true);
      expect(result.data.xpAwarded).toBe(20);

      expect(mockActivities).toHaveLength(1);
      expect(mockActivities[0].activityType).toBe('quiz_completed');
      expect(mockStudentStats[0].totalXp).toBe(120);
    });

    it('allows unlimited retakes but bypasses XP ledger on subsequent passes', async () => {
      mockActivities = [
        {
          id: 1,
          studentId: TEST_STUDENT_ID,
          activityType: 'quiz_completed',
          referenceId: TEST_QUIZ_ID,
          xpAwarded: 20
        }
      ];

      const input = {
        quizId: TEST_QUIZ_ID,
        responses: {
          1: ['opt_2'],
          2: ['opt_a', 'opt_b']
        }
      };

      const result = await submitPracticeQuizAttempt(input);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.isPassed).toBe(true);
      expect(result.data.isFirstPass).toBe(false);
      expect(result.data.xpAwarded).toBe(0);
      expect(mockActivities).toHaveLength(1);
      expect(mockQuizAttempts).toHaveLength(1);
    });
  });
});

describe('Slice 12: Formal Timed Assessments', () => {
  const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
  const TEST_STUDENT_ID = 101;
  const TEST_BATCH_ID = '22222222-2222-4222-8222-222222222222';
  const TEST_FORMAL_QUIZ_ID = '55555555-5555-4555-8555-555555555555';
  const TEST_FORMAL_CONTENT_ID = '66666666-6666-4666-8666-666666666666';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgresql://mock:mock@localhost:5432/mock';

    mockUsers = [{ id: TEST_USER_ID, email: 'student@example.com', status: 'active' }];
    mockUserRoles = [{ userId: TEST_USER_ID, role: 'student' }];
    mockStudents = [
      {
        id: TEST_STUDENT_ID,
        userId: TEST_USER_ID,
        fullName: 'Test Student'
      }
    ];

    mockStudentStats = [
      {
        studentId: TEST_STUDENT_ID,
        totalXp: 200,
        currentLevel: 3,
        currentStreak: 4,
        longestStreak: 7,
        lastActivityDateIst: '2026-10-04'
      }
    ];

    mockEnrollments = [
      {
        studentId: TEST_STUDENT_ID,
        programId: 1,
        batchId: TEST_BATCH_ID,
        status: 'active'
      }
    ];

    mockBatches = [{ id: TEST_BATCH_ID, name: 'Full Stack Cohort Alpha' }];
    mockPrograms = [{ id: 1, name: 'Full Stack Web Development', code: 'FSWD' }];

    mockBatchCurriculumRows = [
      {
        id: TEST_FORMAL_QUIZ_ID,
        contentItemId: TEST_FORMAL_CONTENT_ID,
        programId: 1,
        programName: 'Full Stack Web Development',
        programCode: 'FSWD',
        batchId: TEST_BATCH_ID,
        batchName: 'Full Stack Cohort Alpha',
        title: 'Midterm Examination: Web Engineering',
        slug: 'midterm-web-engineering',
        description: 'Comprehensive timed formal assessment on core web protocols and React.',
        timeLimitMinutes: 45,
        passingScorePercent: 70,
        availableFrom: new Date('2026-10-01T00:00:00Z'),
        dueAt: new Date('2026-10-15T23:59:59Z')
      }
    ];

    mockQuizzes = [
      {
        id: TEST_FORMAL_QUIZ_ID,
        contentItemId: TEST_FORMAL_CONTENT_ID,
        quizType: 'formal',
        timeLimitMinutes: 45,
        passingScorePercent: 70,
        showExplanations: 'after_deadline',
        availableFrom: new Date('2026-10-01T00:00:00Z'),
        dueAt: new Date('2026-10-15T23:59:59Z')
      }
    ];

    mockQuizQuestions = [
      {
        id: 10,
        quizId: TEST_FORMAL_QUIZ_ID,
        questionText: 'What is the purpose of HTTP ETags?',
        questionType: 'single_choice',
        options: [
          { id: 'opt_etag_1', text: 'Encrypted transfer authentication' },
          { id: 'opt_etag_2', text: 'Conditional caching and web cache validation' },
          { id: 'opt_etag_3', text: 'Cross-origin request authorization' }
        ],
        correctOptionIds: ['opt_etag_2'],
        explanationText: 'ETags are entity tags used for conditional HTTP caching to avoid refetching unchanged resources.',
        points: 5,
        sequenceOrder: 1
      },
      {
        id: 11,
        quizId: TEST_FORMAL_QUIZ_ID,
        questionText: 'Which headers prevent MIME-sniffing and cross-site scripting?',
        questionType: 'multiple_choice',
        options: [
          { id: 'opt_sec_1', text: 'X-Content-Type-Options: nosniff' },
          { id: 'opt_sec_2', text: 'Content-Security-Policy' },
          { id: 'opt_sec_3', text: 'Accept-Encoding: gzip' }
        ],
        correctOptionIds: ['opt_sec_1', 'opt_sec_2'],
        explanationText: 'X-Content-Type-Options and CSP are standard HTTP security headers.',
        points: 5,
        sequenceOrder: 2
      }
    ];

    mockQuizAttempts = [];
    mockActivities = [];

    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, role: 'student', email: 'student@example.com' }
    });
  });

  describe('1. Formal Assessment Queries & Anti-Probing', () => {
    it('correctly queries scheduled formal assessments for an enrolled student', async () => {
      const assessments = await getStudentFormalAssessments(TEST_STUDENT_ID);
      expect(assessments).toHaveLength(1);
      expect(assessments[0].id).toBe(TEST_FORMAL_QUIZ_ID);
      expect(assessments[0].title).toBe('Midterm Examination: Web Engineering');
      expect(assessments[0].timeLimitMinutes).toBe(45);
      expect(assessments[0].status).toBe('available');
    });

    it('identifies assessment types via getAssessmentType', async () => {
      const type = await getAssessmentType(TEST_FORMAL_QUIZ_ID);
      expect(type).toBe('formal');
    });

    it('protects answer keys: getFormalAssessmentForRunner omits correctOptionIds and explanationText', async () => {
      const runnerData = await getFormalAssessmentForRunner(
        TEST_STUDENT_ID,
        TEST_FORMAL_QUIZ_ID,
        TEST_BATCH_ID
      );

      expect(runnerData.questions).toHaveLength(2);
      for (const q of runnerData.questions) {
        expect((q as any).correctOptionIds).toBeUndefined();
        expect((q as any).explanationText).toBeUndefined();
      }
    });

    it('throws notFound() when student is not enrolled in the formal batch', async () => {
      mockEnrollments = [];
      await expect(
        getFormalAssessmentForRunner(TEST_STUDENT_ID, TEST_FORMAL_QUIZ_ID, TEST_BATCH_ID)
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });
  });

  describe('2. Formal Attempt Lifecycle & Authoritative Timestamps', () => {
    it('initiates a formal attempt with authoritative startedAt and deadline', async () => {
      const result = await startFormalAssessmentAttempt({
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.attemptId).toBeDefined();
      expect(result.data.timeLimitMinutes).toBe(45);

      const startedAt = new Date(result.data.startedAt).getTime();
      const deadline = new Date(result.data.authoritativeDeadline).getTime();
      expect(deadline - startedAt).toBe(45 * 60 * 1000);

      // Attempt recorded in database
      expect(mockQuizAttempts).toHaveLength(1);
      expect(mockQuizAttempts[0].submittedAt).toBeNull();
    });

    it('prevents timer reset: resuming an in-progress attempt returns original startedAt', async () => {
      const originalStartedAt = new Date(Date.now() - 10 * 60 * 1000); // Started 10 mins ago

      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000011',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          startedAt: originalStartedAt,
          submittedAt: null,
          score: 0,
          maxScore: 10
        }
      ];

      const result = await startFormalAssessmentAttempt({
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.attemptId).toBe('77777777-7777-4777-8777-000000000011');
      expect(new Date(result.data.startedAt).getTime()).toBe(originalStartedAt.getTime());
    });

    it('enforces single attempt policy: rejects starting when attempt is already submitted', async () => {
      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000012',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          batchId: TEST_BATCH_ID,
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          submittedAt: new Date(Date.now() - 20 * 60 * 1000),
          score: 8,
          maxScore: 10,
          isPassed: true
        }
      ];

      const result = await startFormalAssessmentAttempt({
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('ALREADY_SUBMITTED');
      }
    });
  });

  describe('3. Submission, Scoring, Telemetry & Auto-Submission', () => {
    it('grades formal exam server-authoritatively and records tabBlurCount telemetry', async () => {
      const startedAt = new Date(Date.now() - 20 * 60 * 1000); // 20 mins ago (within 45 min limit)

      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000013',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          startedAt,
          submittedAt: null,
          score: 0,
          maxScore: 10
        }
      ];

      const input = {
        attemptId: '77777777-7777-4777-8777-000000000013',
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID,
        responses: {
          10: ['opt_etag_2'], // Correct (5 pts)
          11: ['opt_sec_1', 'opt_sec_2'] // Correct (5 pts)
        },
        tabBlurCount: 3
      };

      const result = await submitFormalAssessment(input);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.score).toBe(10);
      expect(result.data.percentage).toBe(100);
      expect(result.data.isPassed).toBe(true);
      expect(result.data.tabBlurCount).toBe(3);

      // Verify database update
      expect(mockQuizAttempts[0].submittedAt).toBeDefined();
      expect(mockQuizAttempts[0].tabBlurCount).toBe(3);
    });

    it('rejects double submission on finalized attempt', async () => {
      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000014',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          startedAt: new Date(Date.now() - 30 * 60 * 1000),
          submittedAt: new Date(Date.now() - 5 * 60 * 1000), // Already submitted
          score: 5,
          maxScore: 10
        }
      ];

      const result = await submitFormalAssessment({
        attemptId: '77777777-7777-4777-8777-000000000014',
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID,
        responses: {},
        tabBlurCount: 0
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('ALREADY_SUBMITTED');
      }
    });

    it('flags submission as auto-submitted when arriving after authoritative deadline within network latency window', async () => {
      const startedAt = new Date(Date.now() - 46 * 60 * 1000); // 46 mins ago (exceeds 45m deadline by 1m, within 2m latency grace)

      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000015',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          startedAt,
          submittedAt: null,
          score: 0,
          maxScore: 10
        }
      ];

      const result = await submitFormalAssessment({
        attemptId: '77777777-7777-4777-8777-000000000015',
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID,
        responses: { 10: ['opt_etag_2'] },
        tabBlurCount: 1,
        isAutoSubmit: false // Even if client sent false, server must override because now > deadline
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.isAutoSubmitted).toBe(true);
    });

    it('strictly rejects submission when exceeding authoritative deadline + 2 minutes network latency', async () => {
      const startedAt = new Date(Date.now() - 50 * 60 * 1000); // 50 mins ago (exceeds 45m limit + 2m grace)

      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000015',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          startedAt,
          submittedAt: null,
          score: 0,
          maxScore: 10
        }
      ];

      const result = await submitFormalAssessment({
        attemptId: '77777777-7777-4777-8777-000000000015',
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID,
        responses: { 10: ['opt_etag_2'] },
        tabBlurCount: 1,
        isAutoSubmit: true
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DEADLINE_EXCEEDED');
      }
    });
  });

  describe('4. Post-Deadline Explanation Policy & XP', () => {
    it('suppresses explanations when batch deadline has not yet passed', async () => {
      // Due date is in the future: 2026-10-15
      mockBatchCurriculumRows[0].dueAt = new Date('2026-10-15T23:59:59Z');

      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000016',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          startedAt: new Date(),
          submittedAt: null,
          score: 0,
          maxScore: 10
        }
      ];

      const result = await submitFormalAssessment({
        attemptId: '77777777-7777-4777-8777-000000000016',
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID,
        responses: { 10: ['opt_etag_2'] },
        tabBlurCount: 0
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.explanationsSuppressed).toBe(true);
      expect(result.data.questionResults).toBeUndefined();
    });

    it('awards +20 XP on first passing formal exam and evaluates daily streak', async () => {
      mockQuizAttempts = [
        {
          id: '77777777-7777-4777-8777-000000000017',
          quizId: TEST_FORMAL_QUIZ_ID,
          studentId: TEST_STUDENT_ID,
          startedAt: new Date(),
          submittedAt: null,
          score: 0,
          maxScore: 10
        }
      ];

      const result = await submitFormalAssessment({
        attemptId: '77777777-7777-4777-8777-000000000017',
        quizId: TEST_FORMAL_QUIZ_ID,
        batchId: TEST_BATCH_ID,
        responses: {
          10: ['opt_etag_2'],
          11: ['opt_sec_1', 'opt_sec_2']
        },
        tabBlurCount: 0
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.isPassed).toBe(true);
      expect(result.data.isFirstPass).toBe(true);
      expect(result.data.xpAwarded).toBe(20);

      expect(mockActivities).toHaveLength(1);
      expect(mockActivities[0].activityType).toBe('quiz_completed');
      expect(mockStudentStats[0].totalXp).toBe(220); // 200 + 20
    });
  });
});
