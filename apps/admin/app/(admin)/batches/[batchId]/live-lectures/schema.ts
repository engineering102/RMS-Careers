import { z } from 'zod';
import {
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  parseZoomMeetingUrl,
  validateSchedule,
  type ScheduleError
} from '@rms/academic/live-sessions';

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must not exceed ${max} characters`)
    .nullish()
    .transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null));

const SCHEDULE_FIELD: Record<ScheduleError, { field: string; message: string }> = {
  days_required: { field: 'recurrenceDays', message: 'Choose at least one day.' },
  invalid_day: { field: 'recurrenceDays', message: 'Choose valid days.' },
  invalid_time: { field: 'startTime', message: 'Enter a start time (HH:MM).' },
  invalid_duration: {
    field: 'durationMinutes',
    message: `Duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`
  },
  invalid_date: { field: 'startsOn', message: 'Enter valid dates.' },
  window_reversed: { field: 'endsOn', message: 'The end date must be on or after the start date.' },
  no_occurrence_in_window: {
    field: 'recurrenceDays',
    message: 'None of the chosen days falls between the start and end dates. For a one-off session, choose that date’s weekday.'
  }
};

/** Live session form (tutor plan §6.2). Time zone is fixed to IST in v1. */
export const liveSessionSchema = z
  .object({
    title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
    description: optionalText('Description', 2000),
    meetingUrl: z.string({ required_error: 'Meeting link is required' }),
    joiningInstructions: optionalText('Joining instructions', 2000),
    recurrenceDays: z.array(z.number().int()).max(7),
    startTime: z.string().trim(),
    durationMinutes: z.number({ invalid_type_error: 'Enter the duration in minutes' }).int('Enter whole minutes'),
    startsOn: optionalDate,
    endsOn: optionalDate,
    isPublished: z.boolean().default(false)
  })
  .transform((value, ctx) => {
    const meeting = parseZoomMeetingUrl(value.meetingUrl);
    if (!meeting.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meetingUrl'], message: meeting.reason });
      return z.NEVER;
    }
    const recurrenceDays = [...value.recurrenceDays].sort((a, b) => a - b);
    const scheduleError = validateSchedule({ ...value, recurrenceDays });
    if (scheduleError) {
      const { field, message } = SCHEDULE_FIELD[scheduleError];
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      return z.NEVER;
    }
    return { ...value, meetingUrl: meeting.url, recurrenceDays };
  });

export type LiveSessionFormInput = z.input<typeof liveSessionSchema>;
