import { z } from 'zod';

export const quizConfigSchema = z
  .object({
    quizType: z.enum(['practice', 'formal']),
    timeLimitMinutes: z.preprocess((val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().int().positive('Time limit must be at least 1 minute.').nullable()),
    passingScorePercent: z.coerce
      .number()
      .int()
      .min(1, 'Passing score must be at least 1%.')
      .max(100, 'Passing score cannot exceed 100%.')
      .default(60),
    showExplanations: z.enum(['immediate', 'after_deadline', 'never']).default('immediate')
  })
  .refine(
    (data) => {
      if (data.quizType === 'formal') {
        return typeof data.timeLimitMinutes === 'number' && data.timeLimitMinutes >= 1;
      }
      return true;
    },
    {
      message: 'Formal assessments must specify a valid time limit in minutes.',
      path: ['timeLimitMinutes']
    }
  );

export const quizQuestionOptionSchema = z.object({
  id: z.string().trim().min(1, 'Option ID cannot be empty.'),
  text: z.string().trim().min(1, 'Option text cannot be empty.').max(1000, 'Option text is too long.')
});

export const quizQuestionSchema = z
  .object({
    questionText: z
      .string()
      .trim()
      .min(3, 'Question text must be at least 3 characters.')
      .max(5000, 'Question text must not exceed 5000 characters.'),
    questionType: z.enum(['single_choice', 'multiple_choice']).default('single_choice'),
    options: z
      .array(quizQuestionOptionSchema)
      .min(2, 'At least 2 options are required.')
      .max(10, 'A question cannot have more than 10 options.'),
    correctOptionIds: z
      .array(z.string().trim().min(1))
      .min(1, 'At least one correct answer must be selected.'),
    explanationText: z
      .string()
      .trim()
      .max(3000, 'Explanation must not exceed 3000 characters.')
      .optional()
      .nullable()
      .or(z.literal('')),
    points: z.coerce
      .number()
      .int()
      .min(1, 'Points must be at least 1.')
      .max(100, 'Points cannot exceed 100.')
      .default(1),
    sequenceOrder: z.coerce.number().int().nonnegative().optional()
  })
  .superRefine((data, ctx) => {
    // 1. Verify unique option IDs
    const idSet = new Set<string>();
    for (let i = 0; i < data.options.length; i++) {
      const optId = data.options[i].id;
      if (idSet.has(optId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate option identifier "${optId}". Each option must have a unique ID.`,
          path: ['options', i, 'id']
        });
      }
      idSet.add(optId);
    }

    // 2. Verify all correctOptionIds exist in options
    for (let i = 0; i < data.correctOptionIds.length; i++) {
      const correctId = data.correctOptionIds[i];
      if (!idSet.has(correctId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Correct option ID "${correctId}" does not exist in the configured options.`,
          path: ['correctOptionIds', i]
        });
      }
    }

    // 3. Single choice must have exactly 1 correct option
    if (data.questionType === 'single_choice' && data.correctOptionIds.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Single-choice questions must have exactly one correct answer selected.',
        path: ['correctOptionIds']
      });
    }

    // 4. Multiple choice must have at least 1 correct option
    if (data.questionType === 'multiple_choice' && data.correctOptionIds.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Multiple-choice questions must have at least one correct answer selected.',
        path: ['correctOptionIds']
      });
    }
  });

export const reorderQuestionsSchema = z.object({
  questionIds: z
    .array(z.coerce.number().int())
    .min(1, 'Must provide at least one question ID to reorder.')
});

export type QuizConfigInput = z.infer<typeof quizConfigSchema>;
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
