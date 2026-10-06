import { z } from 'zod';

export const contentTypeSchema = z.enum([
  'lecture',
  'notes',
  'dsa_sheet',
  'quiz',
  'project',
  'resource'
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
  resourceLink: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
  videoUrl: z.string().trim().url('Must be a valid video URL.').optional().or(z.literal('')),
  durationMinutes: z
    .preprocess((val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().int().nonnegative().nullable())
    .optional(),
  notesMarkdown: z.string().optional()
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
