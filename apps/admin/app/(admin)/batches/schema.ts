import { z } from 'zod';

export const createBatchSchema = z
  .object({
    name: z
      .string({ required_error: 'Batch name is required' })
      .trim()
      .min(1, 'Batch name is required')
      .max(255, 'Batch name must not exceed 255 characters'),
    collegeId: z
      .string({ required_error: 'College is required' })
      .uuid('Please select a valid college'),
    programId: z.coerce
      .number({ required_error: 'Program is required' })
      .int('Program ID must be an integer')
      .positive('Please select a valid program'),
    startDate: z.coerce.date({
      required_error: 'Start date is required',
      invalid_type_error: 'Valid start date is required'
    }),
    endDate: z.coerce.date({
      required_error: 'End date is required',
      invalid_type_error: 'Valid end date is required'
    }),
    status: z
      .enum(['draft', 'active', 'completed', 'archived'])
      .default('active')
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    {
      message: 'End date must not precede start date',
      path: ['endDate']
    }
  );

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
