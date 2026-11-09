import { describe, expect, it } from 'vitest';
import { activityDayLabel, calendarDaysBetween, dueLabel, greetingFor, istDateKey } from '@/lib/format/relative-dates';

// 9 Nov 2026, 10:00 IST (04:30 UTC), a Monday.
const NOW = new Date('2026-11-09T04:30:00Z');

describe('relative dates (IST)', () => {
  it('keys dates in IST, not UTC', () => {
    // 20:00 UTC on the 9th is 01:30 on the 10th in IST.
    expect(istDateKey('2026-11-09T20:00:00Z')).toBe('2026-11-10');
    expect(calendarDaysBetween('2026-11-09', '2026-11-12')).toBe(3);
    expect(calendarDaysBetween('2026-11-09', '2026-11-08')).toBe(-1);
  });

  it('labels deadlines: overdue, today, tomorrow, weekday, date', () => {
    expect(dueLabel('2026-11-09T03:00:00Z', NOW)).toEqual({ text: 'Overdue', tone: 'overdue' });
    expect(dueLabel('2026-11-09T12:00:00Z', NOW)).toEqual({ text: 'Today', tone: 'soon' });
    expect(dueLabel('2026-11-10T12:00:00Z', NOW)).toEqual({ text: 'Tomorrow', tone: 'soon' });
    expect(dueLabel('2026-11-12T12:00:00Z', NOW).tone).toBe('later');
    expect(dueLabel('2026-11-12T12:00:00Z', NOW).text).toMatch(/Thu/);
    expect(dueLabel('2026-11-29T12:00:00Z', NOW).text).toMatch(/29 Nov/);
  });

  it('labels activity days', () => {
    expect(activityDayLabel('2026-11-09', NOW)).toBe('Today');
    expect(activityDayLabel('2026-11-08', NOW)).toBe('Yesterday');
    expect(activityDayLabel('2026-11-05', NOW)).toBe('Thursday');
    expect(activityDayLabel('2026-10-20', NOW)).toMatch(/20 Oct/);
  });

  it('greets by IST hour', () => {
    expect(greetingFor(NOW)).toBe('Good morning');
    expect(greetingFor(new Date('2026-11-09T09:00:00Z'))).toBe('Good afternoon'); // 14:30 IST
    expect(greetingFor(new Date('2026-11-09T15:00:00Z'))).toBe('Good evening'); // 20:30 IST
    expect(greetingFor(new Date('2026-11-09T21:00:00Z'))).toBe('Good evening'); // 02:30 IST
  });
});
