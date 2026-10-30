import { describe, it, expect } from 'vitest';
import {
  parseZoomMeetingUrl,
  maskMeetingUrl,
  validateSchedule,
  nextOccurrence,
  hasEnded,
  describeSchedule,
  formatIstDateTime,
  istDateOf,
  isoWeekday,
  istInstant,
  type LiveSchedule
} from '../live-sessions';

const weekly = (overrides: Partial<LiveSchedule> = {}): LiveSchedule => ({
  recurrenceDays: [1, 3, 5],
  startTime: '19:00',
  durationMinutes: 90,
  startsOn: null,
  endsOn: null,
  ...overrides
});

describe('parseZoomMeetingUrl', () => {
  it.each([
    'https://zoom.us/j/1234567890',
    'https://us06web.zoom.us/j/12345678901?pwd=abcDEF.1',
    'https://zoom.us/my/rms.mentor',
    'https://zoom.us/w/123456789',
    '  https://zoom.us/j/123456789/  '
  ])('accepts %s', (raw) => {
    const result = parseZoomMeetingUrl(raw);
    expect(result.ok).toBe(true);
  });

  it('keeps the passcode and normalises the URL', () => {
    expect(parseZoomMeetingUrl('https://US06WEB.zoom.us/j/12345678901?pwd=xyz')).toEqual({
      ok: true,
      url: 'https://us06web.zoom.us/j/12345678901?pwd=xyz'
    });
  });

  it.each([
    ['', /Enter the Zoom meeting link/],
    ['zoom.us/j/1234567890', /complete link/],
    ['http://zoom.us/j/1234567890', /https/],
    ['https://user:pass@zoom.us/j/1234567890', /username or password/],
    ['https://zoom.us.evil.example/j/1234567890', /Only Zoom/],
    ['https://evilzoom.us/j/1234567890', /Only Zoom/],
    ['https://meet.google.com/abc-defg-hij', /Only Zoom/],
    ['https://zoom.us:8443/j/1234567890', /port/],
    ['https://zoom.us/j/12345', /join link/],
    ['https://zoom.us/signin', /join link/],
    ['javascript:alert(1)', /https/],
    [`https://zoom.us/j/1234567890?pwd=${'a'.repeat(2100)}`, /too long/]
  ])('rejects %j', (raw, reason) => {
    const result = parseZoomMeetingUrl(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it('masks the meeting id and drops the passcode for display', () => {
    expect(maskMeetingUrl('https://us06web.zoom.us/j/12345678901?pwd=secret')).toBe('us06web.zoom.us/j/••••8901');
    expect(maskMeetingUrl('not a url')).toBe('••••');
  });
});

describe('IST date helpers', () => {
  it('converts across the IST midnight', () => {
    expect(istDateOf(new Date('2026-11-03T18:29:00Z'))).toBe('2026-11-03');
    expect(istDateOf(new Date('2026-11-03T18:30:00Z'))).toBe('2026-11-04');
    expect(isoWeekday('2026-11-02')).toBe(1); // Monday
    expect(isoWeekday('2026-11-08')).toBe(7); // Sunday
    expect(istInstant('2026-11-04', '19:00').toISOString()).toBe('2026-11-04T13:30:00.000Z');
  });
});

describe('validateSchedule', () => {
  it('accepts a weekly and a one-off schedule', () => {
    expect(validateSchedule(weekly())).toBeNull();
    expect(validateSchedule(weekly({ recurrenceDays: [3], startsOn: '2026-11-04', endsOn: '2026-11-04' }))).toBeNull();
  });

  it.each([
    ['no days', { recurrenceDays: [] }, 'days_required'],
    ['duplicate day', { recurrenceDays: [1, 1] }, 'invalid_day'],
    ['day 0', { recurrenceDays: [0] }, 'invalid_day'],
    ['day 8', { recurrenceDays: [8] }, 'invalid_day'],
    ['24:00', { startTime: '24:00' }, 'invalid_time'],
    ['7:00', { startTime: '7:00' }, 'invalid_time'],
    ['14 minutes', { durationMinutes: 14 }, 'invalid_duration'],
    ['481 minutes', { durationMinutes: 481 }, 'invalid_duration'],
    ['fractional duration', { durationMinutes: 30.5 }, 'invalid_duration'],
    ['impossible date', { startsOn: '2026-02-31' }, 'invalid_date'],
    ['reversed window', { startsOn: '2026-11-10', endsOn: '2026-11-09' }, 'window_reversed'],
    // 4 Nov 2026 is a Wednesday; a Monday-only one-off on that date never happens.
    ['one-off on the wrong weekday', { recurrenceDays: [1], startsOn: '2026-11-04', endsOn: '2026-11-04' }, 'no_occurrence_in_window']
  ])('rejects %s', (_label, overrides, error) => {
    expect(validateSchedule(weekly(overrides as Partial<LiveSchedule>))).toBe(error);
  });
});

describe('nextOccurrence', () => {
  // Wednesday 4 Nov 2026, 10:00 IST
  const wednesdayMorning = new Date('2026-11-04T04:30:00Z');

  it('finds the next session today', () => {
    expect(nextOccurrence(weekly(), wednesdayMorning)?.start.toISOString()).toBe('2026-11-04T13:30:00.000Z');
  });

  it('still returns a session in progress, then moves to the next day', () => {
    const during = new Date('2026-11-04T14:00:00Z'); // 19:30 IST, mid-session
    expect(nextOccurrence(weekly(), during)?.start.toISOString()).toBe('2026-11-04T13:30:00.000Z');
    const after = new Date('2026-11-04T15:00:00Z'); // 20:30 IST, session over
    expect(nextOccurrence(weekly(), after)?.start.toISOString()).toBe('2026-11-06T13:30:00.000Z'); // Friday
  });

  it('wraps to next week', () => {
    const saturday = new Date('2026-11-07T04:30:00Z');
    expect(nextOccurrence(weekly(), saturday)?.start.toISOString()).toBe('2026-11-09T13:30:00.000Z'); // Monday
  });

  it('respects the window', () => {
    expect(nextOccurrence(weekly({ startsOn: '2026-11-10' }), wednesdayMorning)?.start.toISOString()).toBe('2026-11-11T13:30:00.000Z');
    expect(nextOccurrence(weekly({ endsOn: '2026-11-03' }), wednesdayMorning)).toBeNull();
    expect(hasEnded(weekly({ endsOn: '2026-11-03' }), wednesdayMorning)).toBe(true);
    expect(hasEnded(weekly(), wednesdayMorning)).toBe(false);
  });

  it('handles a one-off before, during and after', () => {
    const once = weekly({ recurrenceDays: [3], startsOn: '2026-11-04', endsOn: '2026-11-04' });
    expect(nextOccurrence(once, new Date('2026-11-01T00:00:00Z'))?.start.toISOString()).toBe('2026-11-04T13:30:00.000Z');
    expect(nextOccurrence(once, new Date('2026-11-04T15:00:00Z'))).toBeNull();
  });

  it('handles a late-evening session that crosses UTC midnight', () => {
    const late = weekly({ recurrenceDays: [4], startTime: '23:30', durationMinutes: 60 });
    // Thursday 5 Nov 2026 23:30 IST = 18:00 UTC
    expect(nextOccurrence(late, wednesdayMorning)?.start.toISOString()).toBe('2026-11-05T18:00:00.000Z');
  });

  it('returns null for an invalid schedule', () => {
    expect(nextOccurrence(weekly({ recurrenceDays: [] }), wednesdayMorning)).toBeNull();
  });
});

describe('display text', () => {
  it('describes weekly, daily and one-off schedules', () => {
    expect(describeSchedule(weekly({ recurrenceDays: [5, 1, 3] }))).toBe('Every Mon, Wed, Fri · 7:00 pm – 8:30 pm IST');
    expect(describeSchedule(weekly({ recurrenceDays: [1, 2, 3, 4, 5, 6, 7], startTime: '09:00', durationMinutes: 60 }))).toBe(
      'Every day · 9:00 am – 10:00 am IST'
    );
    expect(describeSchedule(weekly({ recurrenceDays: [3], startsOn: '2026-11-04', endsOn: '2026-11-04' }))).toBe(
      'Once · Wed · 7:00 pm – 8:30 pm IST'
    );
    expect(describeSchedule(weekly({ startTime: '23:30', durationMinutes: 60 }))).toContain('11:30 pm – 12:30 am IST');
    expect(describeSchedule(weekly({ startTime: '12:00', durationMinutes: 15 }))).toContain('12:00 pm – 12:15 pm');
  });

  it('formats an instant in IST', () => {
    expect(formatIstDateTime(new Date('2026-11-04T13:30:00Z'))).toMatch(/^Wed, 4 Nov 2026, 7:00 pm IST$/);
  });
});
