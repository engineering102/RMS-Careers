import { z } from 'zod';
import { isContentSubject } from '@rms/db/content-subjects';
import { ASSESSMENT_CODE_MAX, ASSESSMENT_CODE_PATTERN, isExternalTestUrl } from '@/lib/content/external-test';

export const contentTypeSchema = z.enum([
  'lecture',
  'notes',
  'dsa_sheet',
  'quiz',
  'project',
  'resource',
  'external_test'
]);

export const createContentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters.')
    .max(255, 'Title must not exceed 255 characters.'),
  slug: z
    .string()
    .trim()
    .max(120, 'Slug must not exceed 120 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens.')
    .optional()
    .or(z.literal('')),
  contentType: contentTypeSchema,
  /** Quizzes only: whether the new quiz starts as practice or formal. */
  quizType: z.enum(['practice', 'formal']).optional(),
  description: z.string().trim().max(2000, 'Description must not exceed 2000 characters.').optional().or(z.literal('')),
  programId: z
    .preprocess((val) => {
      if (val === '' || val === 'global' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().int().positive().nullable())
    .optional(),
  isPublished: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return false;
    }, z.boolean())
    .default(false),
  topic: z.string().trim().max(100).optional().or(z.literal('')),
  /** Subject slug, or '' for Auto. */
  subject: z
    .string()
    .refine((v) => v === '' || isContentSubject(v), 'Pick a subject from the list.')
    .optional(),
  /** Show in the student Library. Left unset, the item is reached only through a batch curriculum. */
  inLibrary: z.boolean().optional(),
  resourceLink: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Document link must start with http:// or https://')
    .optional(),
  videoUrl: z.string().trim().url('Must be a valid video URL.').optional().or(z.literal('')),
  durationMinutes: z
    .preprocess((val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().int().nonnegative().max(1440, 'Duration must be under 24 hours.').nullable())
    .optional(),
  notesMarkdown: z.string().max(50000, 'Notes must not exceed 50000 characters.').optional(),
  /** External tests only. */
  externalProvider: z.string().trim().max(60, 'Platform must not exceed 60 characters.').optional(),
  externalUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === '' || isExternalTestUrl(v), 'Test link must be an https:// address.')
    .optional(),
  assessmentCode: z
    .string()
    .trim()
    .max(ASSESSMENT_CODE_MAX, `Assessment code must not exceed ${ASSESSMENT_CODE_MAX} characters.`)
    .regex(ASSESSMENT_CODE_PATTERN, 'Use letters, numbers, dots, hyphens or underscores only.')
    .optional()
});

export const updateContentSchema = createContentSchema.partial().extend({
  id: z.string().uuid('Invalid content ID.')
});

export const contentLifecycleActionSchema = z.object({
  id: z.string().uuid('Invalid content ID.'),
  action: z.enum(['publish', 'unpublish', 'archive', 'unarchive'])
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type ContentLifecycleActionInput = z.infer<typeof contentLifecycleActionSchema>;
