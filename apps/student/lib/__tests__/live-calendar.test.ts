import { describe, it, expect } from 'vitest';
import {
  expandOccurrences,
  formatHour,
  formatMinutes,
  gridHours,
  layoutDay,
  parseCalendarParams,
  rangeLabel,
  shiftAnchor,
  startOfWeek,
  visibleDays
} from '../live/calendar';
import { buildLiveCalendar, nextLecture } from '../live/live-calendar-data';
import type { StudentLiveSession } from '../db/queries/live-sessions';

const session = (overrides: Partial<StudentLiveSession> = {}): StudentLiveSession => ({
  id: 's-1',
  title: 'DSA Live Problem Solving',
  description: 'Patterns walkthrough',
  meetingUrl: 'https://us06web.zoom.us/j/12345678901?pwd=abc',
  joiningInstructions: null,
  recurrenceDays: [1, 3, 5],
  startTime: '19:00',
  durationMinutes: 90,
  startsOn: null,
  endsOn: null,
  ...overrides
});

// Wednesday 4 Nov 2026, 10:00 IST
const NOW = new Date('2026-11-04T04:30:00Z');

describe('calendar params and ranges', () => {
  it('defaults to the week of today and ignores malformed values', () => {
    expect(parseCalendarParams({}, '2026-11-04')).toEqual({ view: 'week', anchor: '2026-11-04' });
    expect(parseCalendarParams({ view: 'year', date: '2026-02-30' }, '2026-11-04')).toEqual({ view: 'week', anchor: '2026-11-04' });
    expect(parseCalendarParams({ view: ['month'], date: '2026-12-15' }, '2026-11-04')).toEqual({ view: 'month', anchor: '2026-12-15' });
    expect(parseCalendarParams({ date: '1900-01-01' }, '2026-11-04').anchor).toBe('2026-11-04');
  });

  it('weeks run Monday to Sunday', () => {
    expect(startOfWeek('2026-11-04')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(visibleDays('week', '2026-11-04')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08'
    ]);
    expect(visibleDays('day', '2026-11-04')).toEqual(['2026-11-04']);
  });

  it('month view covers whole weeks around the month', () => {
    const days = visibleDays('month', '2026-11-18');
    expect(days[0]).toBe('2026-10-26');
    expect(days.at(-1)).toBe('2026-12-06');
    expect(days.length % 7).toBe(0);
  });

  it('steps back and forward per view, crossing years', () => {
    expect(shiftAnchor('day', '2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftAnchor('week', '2026-11-04', -1)).toBe('2026-10-28');
    expect(shiftAnchor('month', '2026-01-31', -1)).toBe('2025-12-01');
    expect(shiftAnchor('month', '2026-12-15', 1)).toBe('2027-01-01');
  });

  it('labels the visible range', () => {
    expect(rangeLabel('day', '2026-11-04')).toBe('Wednesday, 4 November 2026');
    expect(rangeLabel('week', '2026-11-04')).toBe('2 – 8 November 2026');
    expect(rangeLabel('week', '2026-12-02')).toBe('30 November – 6 December 2026');
    expect(rangeLabel('week', '2026-12-30')).toBe('28 December 2026 – 3 January 2027');
    expect(rangeLabel('month', '2026-11-04')).toBe('November 2026');
  });
});

describe('occurrences', () => {
  it('expands weekly sessions onto their weekdays within the window', () => {
    const days = visibleDays('week', '2026-11-04');
    const events = expandOccurrences([session({ startsOn: '2026-11-04', endsOn: null })], days);
    expect(events.map((e) => e.date)).toEqual(['2026-11-04', '2026-11-06']);
    expect(events[0]).toMatchObject({
      key: 's-1:2026-11-04',
      startMinutes: 19 * 60,
      endMinutes: 20 * 60 + 30,
      start: '2026-11-04T13:30:00.000Z',
      end: '2026-11-04T15:00:00.000Z'
    });
  });

  it('skips invalid schedules and sorts across sessions by start', () => {
    const days = visibleDays('day', '2026-11-04');
    const events = expandOccurrences(
      [session({ id: 'late' }), session({ id: 'early', startTime: '09:30' }), session({ id: 'bad', startTime: '25:00' })],
      days
    );
    expect(events.map((e) => e.sessionId)).toEqual(['early', 'late']);
  });

  it('widens the grid to fit every session', () => {
    expect(gridHours([session()])).toEqual({ startHour: 8, endHour: 21 });
    expect(gridHours([session({ startTime: '06:45', durationMinutes: 60 }), session({ startTime: '21:30', durationMinutes: 60 })])).toEqual({
      startHour: 6,
      endHour: 23
    });
    expect(gridHours([session({ startTime: '23:00', durationMinutes: 120 })]).endHour).toBe(24);
  });
});

describe('layoutDay', () => {
  const at = (startMinutes: number, endMinutes: number) => ({ startMinutes, endMinutes });

  it('places non-overlapping lectures full width', () => {
    const placed = layoutDay([at(600, 660), at(660, 720)]);
    expect(placed.map((p) => [p.lane, p.lanes])).toEqual([
      [0, 1],
      [0, 1]
    ]);
  });

  it('places overlapping lectures side by side and reuses free lanes', () => {
    const placed = layoutDay([at(600, 720), at(630, 690), at(700, 760)]);
    expect(placed.map((p) => [p.item.startMinutes, p.lane, p.lanes])).toEqual([
      [600, 0, 2],
      [630, 1, 2],
      [700, 1, 2]
    ]);
  });
});

describe('formatting', () => {
  it('formats clock times', () => {
    expect(formatMinutes(0)).toBe('12:00 am');
    expect(formatMinutes(19 * 60 + 5)).toBe('7:05 pm');
    expect(formatMinutes(24 * 60 + 30)).toBe('12:30 am');
    expect(formatHour(12)).toBe('12 pm');
    expect(formatHour(8)).toBe('8 am');
  });
});

describe('buildLiveCalendar', () => {
  it('passes the Zoom link on only when the student can join', () => {
    const data = buildLiveCalendar(
      [
        session(),
        session({ id: 'bad', meetingUrl: 'javascript:alert(1)' }),
        session({ id: 'over', startsOn: '2026-10-01', endsOn: '2026-11-01' })
      ],
      { view: 'week', anchor: '2026-11-04', now: NOW, isReadOnly: false }
    );
    const byId = Object.fromEntries(data.lectures.map((l) => [l.id, l]));
    expect(byId['s-1']).toMatchObject({ linkState: 'available', joinUrl: 'https://us06web.zoom.us/j/12345678901?pwd=abc' });
    expect(byId.bad).toMatchObject({ linkState: 'unavailable', joinUrl: null });
    expect(byId.over).toMatchObject({ linkState: 'ended', joinUrl: null });
    expect(data.today).toBe('2026-11-04');
    expect(data.month).toBe('2026-11');
  });

  it('hides every link for a completed batch', () => {
    const data = buildLiveCalendar([session()], { view: 'week', anchor: '2026-11-04', now: NOW, isReadOnly: true });
    expect(data.lectures[0]).toMatchObject({ linkState: 'read_only', joinUrl: null });
  });

  it('marks occurrences that are over', () => {
    const data = buildLiveCalendar([session()], { view: 'week', anchor: '2026-11-04', now: NOW, isReadOnly: false });
    expect(data.events.map((e) => [e.date, e.ended])).toEqual([
      ['2026-11-02', true],
      ['2026-11-04', false],
      ['2026-11-06', false]
    ]);
  });

  it('finds the soonest upcoming lecture across sessions', () => {
    const next = nextLecture([session(), session({ id: 'tue', recurrenceDays: [4], startTime: '08:00' })], NOW);
    expect(next?.session.id).toBe('s-1');
    expect(next?.start.toISOString()).toBe('2026-11-04T13:30:00.000Z');
  });
});
