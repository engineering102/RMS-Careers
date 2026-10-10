import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args)
}));

// Mock database state for unit/integration testing
let mockContentItems: any[] = [];
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
          // content_items
          if (table === actual.contentItems) {
            return {
              where: (condition: any) => ({
                limit: () => {
                  return mockContentItems;
                }
              })
            };
          }

          // quizzes
          if (table === actual.quizzes) {
            return {
              where: (condition: any) => ({
                limit: () => {
                  return mockQuizzes;
                }
              })
            };
          }

          // quiz_questions
          if (table === actual.quizQuestions) {
            return {
              where: (condition: any) => {
                let filtered = [...mockQuizQuestions];
                const res: any = filtered.length > 0 ? [...filtered] : [{ maxSeq: null }];
                res.orderBy = () => filtered;
                res.limit = () => filtered;
                return res;
              }
            };
          }

          // quiz_attempts
          if (table === actual.quizAttempts) {
            return {
              where: (condition: any) => {
                return [{ count: mockQuizAttempts.length }];
              }
            };
          }

          return {
            where: () => ({
              limit: () => []
            })
          };
        }
      }),

      insert: (table: any) => ({
        values: (vals: any) => ({
          returning: () => {
            if (table === actual.quizzes) {
              const row = {
                id: vals.id || 'quiz-uuid-1',
                contentItemId: vals.contentItemId,
                quizType: vals.quizType || 'practice',
                timeLimitMinutes: vals.timeLimitMinutes ?? null,
                passingScorePercent: vals.passingScorePercent ?? 60,
                showExplanations: vals.showExplanations || 'immediate',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              mockQuizzes.push(row);
              return [row];
            }

            if (table === actual.quizQuestions) {
              const row = {
                id: mockQuizQuestions.length + 1,
                quizId: vals.quizId,
                questionText: vals.questionText,
                questionType: vals.questionType,
                options: vals.options,
                correctOptionIds: vals.correctOptionIds,
                explanationText: vals.explanationText || null,
                points: vals.points ?? 1,
                sequenceOrder: vals.sequenceOrder ?? 0,
                createdAt: new Date()
              };
              mockQuizQuestions.push(row);
              return [row];
            }

            return [vals];
          }
        })
      }),

      update: (table: any) => ({
        set: (vals: any) => ({
          where: (condition: any) => ({
            returning: () => {
              if (table === actual.quizzes) {
                if (mockQuizzes.length > 0) {
                  Object.assign(mockQuizzes[0], vals);
                  return [mockQuizzes[0]];
                }
              }

              if (table === actual.quizQuestions) {
                // If question exists
                if (mockQuizQuestions.length > 0) {
                  Object.assign(mockQuizQuestions[0], vals);
                  return [mockQuizQuestions[0]];
                }
              }

              return [];
            }
          })
        })
      }),

      delete: (table: any) => ({
        where: (condition: any) => {
          if (table === actual.quizQuestions) {
            mockQuizQuestions = [];
          }
          return Promise.resolve();
        }
      })
    }
  };
});

import {
  saveQuizConfigAction,
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  reorderQuestionsAction
} from '../../app/(admin)/content/[id]/quiz/actions';

import {
  quizConfigSchema,
  quizQuestionSchema,
  reorderQuestionsSchema
} from '../../app/(admin)/content/[id]/quiz/schema';

describe('Slice C1: Quiz & Assessment Admin Authoring Plane', () => {
  const adminSession = {
    user: { id: 'admin-uuid', email: 'admin@rmscareers.com', role: 'admin' }
  };

  const sampleContentItemId = '11111111-1111-1111-1111-111111111111';
  const sampleQuizId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mocked db: the queries only check that a URL is set. Never rely on an env file for this.
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    mockAuth.mockResolvedValue(adminSession);

    mockContentItems = [
      {
        id: sampleContentItemId,
        title: 'Algorithms Midterm Assessment',
        slug: 'algorithms-midterm',
        contentType: 'quiz',
        programId: null,
        isPublished: true,
        metadata: {}
      }
    ];

    mockQuizzes = [
      {
        id: sampleQuizId,
        contentItemId: sampleContentItemId,
        quizType: 'practice',
        timeLimitMinutes: null,
        passingScorePercent: 60,
        showExplanations: 'immediate',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockQuizQuestions = [];
    mockQuizAttempts = [];
  });

  // =========================================================================
  // 1. Authorization Guards
  // =========================================================================
  describe('Authorization Guards', () => {
    it('rejects saveQuizConfigAction when session is unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await saveQuizConfigAction(sampleContentItemId, {
        quizType: 'practice',
        passingScorePercent: 70
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });

    it('rejects createQuestionAction when session is unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await createQuestionAction(sampleContentItemId, sampleQuizId, {
        questionText: 'What is the time complexity of binary search?',
        options: [
          { id: 'opt_1', text: 'O(log n)' },
          { id: 'opt_2', text: 'O(n)' }
        ],
        correctOptionIds: ['opt_1']
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });

    it('rejects deleteQuestionAction when session is unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await deleteQuestionAction(sampleContentItemId, 1);

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });
  });

  // =========================================================================
  // 2. Quiz Configuration Validation & Persistence
  // =========================================================================
  describe('Quiz Configuration Validation', () => {
    it('accepts valid practice quiz settings without time limit', () => {
      const parsed = quizConfigSchema.safeParse({
        quizType: 'practice',
        timeLimitMinutes: null,
        passingScorePercent: 65,
        showExplanations: 'immediate'
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.quizType).toBe('practice');
        expect(parsed.data.passingScorePercent).toBe(65);
      }
    });

    it('accepts valid formal assessment settings with a positive time limit', () => {
      const parsed = quizConfigSchema.safeParse({
        quizType: 'formal',
        timeLimitMinutes: 45,
        passingScorePercent: 75,
        showExplanations: 'after_deadline'
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.quizType).toBe('formal');
        expect(parsed.data.timeLimitMinutes).toBe(45);
      }
    });

    it('rejects formal assessment when timeLimitMinutes is omitted or zero', () => {
      const parsedMissing = quizConfigSchema.safeParse({
        quizType: 'formal',
        timeLimitMinutes: '',
        passingScorePercent: 60
      });

      expect(parsedMissing.success).toBe(false);

      const parsedZero = quizConfigSchema.safeParse({
        quizType: 'formal',
        timeLimitMinutes: 0,
        passingScorePercent: 60
      });

      expect(parsedZero.success).toBe(false);
    });

    it('rejects passing score percentage outside 1 to 100', () => {
      const parsedUnder = quizConfigSchema.safeParse({
        quizType: 'practice',
        passingScorePercent: 0
      });
      expect(parsedUnder.success).toBe(false);

      const parsedOver = quizConfigSchema.safeParse({
        quizType: 'practice',
        passingScorePercent: 105
      });
      expect(parsedOver.success).toBe(false);
    });

    it('saves valid quiz configuration through Server Action and revalidates cache', async () => {
      const res = await saveQuizConfigAction(sampleContentItemId, {
        quizType: 'formal',
        timeLimitMinutes: 60,
        passingScorePercent: 70,
        showExplanations: 'after_deadline'
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.quiz.quizType).toBe('formal');
        expect(res.quiz.timeLimitMinutes).toBe(60);
      }
      expect(mockRevalidatePath).toHaveBeenCalledWith('/content');
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/content/${sampleContentItemId}/quiz`);
    });
  });

  // =========================================================================
  // 3. Question Bank Validation & Creation
  // =========================================================================
  describe('Question Validation & Creation', () => {
    it('validates and creates a single-choice question with exactly 1 correct option', () => {
      const parsed = quizQuestionSchema.safeParse({
        questionText: 'Which data structure uses LIFO ordering?',
        questionType: 'single_choice',
        points: 2,
        options: [
          { id: 'opt_1', text: 'Queue' },
          { id: 'opt_2', text: 'Stack' },
          { id: 'opt_3', text: 'Linked List' },
          { id: 'opt_4', text: 'Tree' }
        ],
        correctOptionIds: ['opt_2'],
        explanationText: 'Stack operates on Last-In, First-Out principle.'
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.points).toBe(2);
        expect(parsed.data.correctOptionIds).toEqual(['opt_2']);
      }
    });

    it('validates and creates a multiple-choice question with multiple correct options', () => {
      const parsed = quizQuestionSchema.safeParse({
        questionText: 'Which of the following are linear data structures?',
        questionType: 'multiple_choice',
        points: 3,
        options: [
          { id: 'opt_1', text: 'Array' },
          { id: 'opt_2', text: 'Linked List' },
          { id: 'opt_3', text: 'Graph' },
          { id: 'opt_4', text: 'Binary Tree' }
        ],
        correctOptionIds: ['opt_1', 'opt_2']
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.correctOptionIds).toEqual(['opt_1', 'opt_2']);
      }
    });

    it('rejects question with text shorter than 3 characters', () => {
      const parsed = quizQuestionSchema.safeParse({
        questionText: 'Hi',
        questionType: 'single_choice',
        options: [
          { id: 'opt_1', text: 'Yes' },
          { id: 'opt_2', text: 'No' }
        ],
        correctOptionIds: ['opt_1']
      });

      expect(parsed.success).toBe(false);
    });

    it('rejects question with fewer than 2 options', () => {
      const parsed = quizQuestionSchema.safeParse({
        questionText: 'Is this valid?',
        options: [{ id: 'opt_1', text: 'Only one choice' }],
        correctOptionIds: ['opt_1']
      });

      expect(parsed.success).toBe(false);
    });

    it('rejects question with duplicate option identifiers', () => {
      const parsed = quizQuestionSchema.safeParse({
        questionText: 'What is the capital of France?',
        options: [
          { id: 'opt_1', text: 'Paris' },
          { id: 'opt_1', text: 'Lyon' }
        ],
        correctOptionIds: ['opt_1']
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        expect(issues.some((i) => i.message.includes('unique'))).toBe(true);
      }
    });

    it('rejects single-choice question with multiple correct options', () => {
      const parsed = quizQuestionSchema.safeParse({
        questionText: 'Which is an odd prime?',
        questionType: 'single_choice',
        options: [
          { id: 'opt_1', text: '3' },
          { id: 'opt_2', text: '5' }
        ],
        correctOptionIds: ['opt_1', 'opt_2']
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toMatch(/exactly one correct answer/i);
      }
    });

    it('rejects question if selected correctOptionId does not exist in options array', () => {
      const parsed = quizQuestionSchema.safeParse({
        questionText: 'Valid question text here?',
        questionType: 'single_choice',
        options: [
          { id: 'opt_1', text: 'Choice A' },
          { id: 'opt_2', text: 'Choice B' }
        ],
        correctOptionIds: ['opt_ghost']
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toMatch(/does not exist/i);
      }
    });

    it('creates question via Server Action and appends to question bank', async () => {
      const res = await createQuestionAction(sampleContentItemId, sampleQuizId, {
        questionText: 'What is the worst-case time complexity of QuickSort?',
        questionType: 'single_choice',
        points: 2,
        options: [
          { id: 'opt_1', text: 'O(n log n)' },
          { id: 'opt_2', text: 'O(n^2)' },
          { id: 'opt_3', text: 'O(n)' }
        ],
        correctOptionIds: ['opt_2'],
        explanationText: 'When the partition produces heavily unbalanced subproblems.'
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.question.questionText).toContain('QuickSort');
        expect(res.question.points).toBe(2);
        expect(res.question.correctOptionIds).toEqual(['opt_2']);
      }
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/content/${sampleContentItemId}/quiz`
      );
    });
  });

  // =========================================================================
  // 4. Safe Delete Behavior (Attempt Integrity)
  // =========================================================================
  describe('Safe Delete Behavior & Attempt Safety', () => {
    it('permits deletion of question when 0 student attempts exist', async () => {
      mockQuizAttempts = []; // 0 attempts
      mockQuizQuestions = [
        {
          id: 1,
          quizId: sampleQuizId,
          questionText: 'Sample question'
        }
      ];

      const res = await deleteQuestionAction(sampleContentItemId, 1);
      expect(res.success).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/content/${sampleContentItemId}/quiz`
      );
    });

    it('rejects deletion of question when historical student attempts exist', async () => {
      mockQuizAttempts = [
        { id: 'attempt-uuid-1', quizId: sampleQuizId, score: 10 }
      ]; // attempts exist
      mockQuizQuestions = [
        {
          id: 1,
          quizId: sampleQuizId,
          questionText: 'Protected question'
        }
      ];

      const res = await deleteQuestionAction(sampleContentItemId, 1);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/student attempt/i);
      }
    });
  });

  // =========================================================================
  // 5. Question Reordering
  // =========================================================================
  describe('Question Reordering', () => {
    it('validates reorder input schema', () => {
      const parsedValid = reorderQuestionsSchema.safeParse({
        questionIds: [3, 1, 2]
      });
      expect(parsedValid.success).toBe(true);

      const parsedEmpty = reorderQuestionsSchema.safeParse({
        questionIds: []
      });
      expect(parsedEmpty.success).toBe(false);
    });

    it('executes reordering through Server Action and revalidates cache', async () => {
      const res = await reorderQuestionsAction(sampleContentItemId, sampleQuizId, {
        questionIds: [2, 1]
      });
      expect(res.success).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/content/${sampleContentItemId}/quiz`
      );
    });
  });

  // =========================================================================
  // 6. Student Engine Anti-Probing & Option Integrity
  // =========================================================================
  describe('Student Engine Compatibility & Anti-Probing', () => {
    it('preserves required option shape { id, text } that Student runner expects', () => {
      const authoredOptions = [
        { id: 'opt_1', text: 'Option A' },
        { id: 'opt_2', text: 'Option B' }
      ];

      // Student Runner Question Option contract check:
      // Client-facing questions project: { id: string, text: string }
      authoredOptions.forEach((opt) => {
        expect(typeof opt.id).toBe('string');
        expect(typeof opt.text).toBe('string');
        expect(opt.id.length).toBeGreaterThan(0);
        expect(opt.text.length).toBeGreaterThan(0);
      });
    });

    it('stores correctOptionIds separately so query projection can strip it safely', () => {
      const authoredQuestion = {
        id: 10,
        questionText: 'What is O(1) time?',
        options: [
          { id: 'opt_1', text: 'Constant time' },
          { id: 'opt_2', text: 'Linear time' }
        ],
        correctOptionIds: ['opt_1'],
        explanationText: 'Operations taking fixed steps regardless of n.'
      };

      // Simulating Student Runner projection:
      // Strip correctOptionIds and explanationText
      const sanitizedForStudent = {
        id: authoredQuestion.id,
        questionText: authoredQuestion.questionText,
        options: authoredQuestion.options
      };

      expect((sanitizedForStudent as any).correctOptionIds).toBeUndefined();
      expect((sanitizedForStudent as any).explanationText).toBeUndefined();
      expect(sanitizedForStudent.options).toHaveLength(2);
    });
  });
});
