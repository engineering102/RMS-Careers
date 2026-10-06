import { z } from 'zod';

export const addContentToBatchSchema = z
  .object({
    contentItemId: z.string().uuid('Valid canonical content item ID is required.'),
    weekNumber: z.coerce
      .number()
      .int('Week must be an integer.')
      .min(1, 'Week number must be at least 1.')
      .max(104, 'Week number cannot exceed 104.'),
    sequenceOrder: z.coerce.number().int().min(1).optional(),
    isRequired: z
      .preprocess((val) => {
        if (val === 'true' || val === true) return true;
        if (val === 'false' || val === false) return false;
        return true;
      }, z.boolean())
      .default(true),
    availableFrom: z.string().optional().or(z.literal('')).or(z.null()),
    dueAt: z.string().optional().or(z.literal('')).or(z.null())
  })
  .refine(
    (data) => {
      if (data.availableFrom && data.dueAt) {
        const fromDate = new Date(data.availableFrom);
        const toDate = new Date(data.dueAt);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          return toDate >= fromDate;
        }
      }
      return true;
    },
    {
      message: 'Due date must not precede available date.',
      path: ['dueAt']
    }
  );

export const updatePlacementSchema = z
  .object({
    placementId: z.coerce.number().int().positive('Valid placement ID is required.'),
    weekNumber: z.coerce.number().int().min(1).max(104).optional(),
    sequenceOrder: z.coerce.number().int().min(1).optional(),
    isRequired: z
      .preprocess((val) => {
        if (val === 'true' || val === true) return true;
        if (val === 'false' || val === false) return false;
        return undefined;
      }, z.boolean().optional()),
    availableFrom: z.string().optional().or(z.literal('')).or(z.null()),
    dueAt: z.string().optional().or(z.literal('')).or(z.null())
  })
  .refine(
    (data) => {
      if (data.availableFrom && data.dueAt) {
        const fromDate = new Date(data.availableFrom);
        const toDate = new Date(data.dueAt);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          return toDate >= fromDate;
        }
      }
      return true;
    },
    {
      message: 'Due date must not precede available date.',
      path: ['dueAt']
    }
  );

export const reorderPlacementsSchema = z.object({
  items: z
    .array(
      z.object({
        placementId: z.number().int().positive(),
        weekNumber: z.number().int().min(1),
        sequenceOrder: z.number().int().min(1)
      })
    )
    .min(1, 'At least one placement item is required.')
});

export type AddContentToBatchInput = z.infer<typeof addContentToBatchSchema>;
export type UpdatePlacementInput = z.infer<typeof updatePlacementSchema>;
export type ReorderPlacementsInput = z.infer<typeof reorderPlacementsSchema>;
