import { z } from 'zod';
import { partnerEnquiryContent } from '@/lib/data/homepage-content';

const { formConfig } = partnerEnquiryContent;

const text = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters.`);
const required = (label: string, max: number) => text(max).min(1, `${label} is required.`);
const oneOf = (values: readonly string[], label: string) =>
  z.string().refine((v) => values.includes(v), `Choose a valid ${label}.`);

/**
 * Server-side validation for the institutional partner enquiry (audit F-03). Option fields must be
 * one of the values the form offers; free text is length-bounded; `consent` must be given.
 * `company_website_hp` is a honeypot: humans never see it, simple bots fill it.
 */
export const partnerEnquirySchema = z.object({
  fullName: required('Full name', 120),
  role: required('Role', 120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  mobile: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{6,18}$/, 'Enter a valid phone number.'),
  institutionName: required('Institution name', 200),
  institutionType: oneOf(formConfig.institutionTypes, 'institution type'),
  city: required('City', 100),
  state: required('State', 100),
  website: text(200)
    .optional()
    .refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v) || /^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v), 'Enter a valid website.'),
  studentStrength: oneOf(formConfig.studentStrengthOptions, 'student strength'),
  branches: text(300).optional(),
  batches: text(300).optional(),
  objectives: z.array(oneOf(formConfig.partnershipObjectives, 'objective')).max(formConfig.partnershipObjectives.length).default([]),
  timeline: oneOf(formConfig.timelineOptions, 'timeline'),
  additionalNotes: text(2000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required to submit the enquiry.' }) }),
  company_website_hp: z.string().optional()
});

export type PartnerEnquiryInput = z.input<typeof partnerEnquirySchema>;
export type PartnerEnquiry = z.output<typeof partnerEnquirySchema>;

export type PartnerEnquiryResult =
  | { success: true }
  | { success: false; error: string; code: 'invalid' | 'rate_limited' | 'not_configured' | 'delivery_failed'; fieldErrors?: Record<string, string> };
