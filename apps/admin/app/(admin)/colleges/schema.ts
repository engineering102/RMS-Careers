import { z } from 'zod';
import { COLLEGE_CODE_PATTERN, normalizeCollegeCode } from '@/lib/utils/college';

const optionalText = (label: string) =>
  z
    .string()
    .trim()
    .max(100, `${label} must not exceed 100 characters`)
    .nullish()
    .transform((v) => (v ? v : null));

export const collegeSchema = z.object({
  name: z
    .string({ required_error: 'College name is required' })
    .trim()
    .min(1, 'College name is required')
    .max(255, 'College name must not exceed 255 characters'),
  code: z
    .string({ required_error: 'College code is required' })
    .trim()
    .min(1, 'College code is required')
    .max(32, 'College code must not exceed 32 characters')
    .regex(COLLEGE_CODE_PATTERN, 'College code may only contain letters, numbers, ".", "_" and "-"')
    .transform(normalizeCollegeCode),
  city: optionalText('City'),
  state: optionalText('State')
});

export const updateCollegeSchema = collegeSchema.extend({
  id: z.string({ required_error: 'College is required' }).uuid('Invalid college identifier')
});

export const collegeStatusSchema = z.object({
  id: z.string({ required_error: 'College is required' }).uuid('Invalid college identifier'),
  isActive: z.boolean({ required_error: 'Status is required' })
});

export type CollegeInput = z.infer<typeof collegeSchema>;
