import { z } from 'zod';
import { projectRubricSchema } from '@/lib/content/project-rubric';

const optionalText = (max: number, label: string) =>
  z.string().max(max, `${label} must not exceed ${max} characters.`).optional().default('');

/** Fields every content type has. */
const baseFields = z.object({
  id: z.string().uuid('Invalid content ID.'),
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters.')
    .max(255, 'Title must not exceed 255 characters.'),
  slug: z
    .string()
    .trim()
    .max(120, 'Slug must not exceed 120 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens.'),
  description: optionalText(2000, 'Description'),
  programId: z.number().int().positive().nullable(),
  topic: optionalText(100, 'Topic')
});

const durationMinutes = z
  .number({ invalid_type_error: 'Duration must be a number.' })
  .int('Duration must be a whole number of minutes.')
  .min(0, 'Duration cannot be negative.')
  .max(1440, 'Duration must be under 24 hours.')
  .nullable();

const readingFields = {
  resourceLink: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Resource link must start with http:// or https://')
    .optional()
    .default(''),
  notes: optionalText(50000, 'Notes'),
  durationMinutes
};

/**
 * What the builder saves, per content type. The type is the discriminant, but the server only accepts the
 * item's stored type: it is never changed from here.
 */
export const contentBuilderSchema = z.discriminatedUnion('contentType', [
  baseFields.extend({
    contentType: z.literal('lecture'),
    videoUrl: optionalText(2000, 'Video link'),
    durationMinutes
  }),
  baseFields.extend({ contentType: z.literal('notes'), ...readingFields }),
  baseFields.extend({ contentType: z.literal('resource'), ...readingFields }),
  baseFields.extend({ contentType: z.literal('project'), rubric: projectRubricSchema }),
  baseFields.extend({ contentType: z.literal('quiz') }),
  baseFields.extend({ contentType: z.literal('dsa_sheet') })
]);

export type ContentBuilderInput = z.input<typeof contentBuilderSchema>;
export type ContentBuilderData = z.output<typeof contentBuilderSchema>;
