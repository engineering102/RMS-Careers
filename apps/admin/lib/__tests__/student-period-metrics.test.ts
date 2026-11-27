import { describe, it, expect } from 'vitest';
import { resolvePeriod, makeWindow, istToday, isValidIsoDate } from '@/lib/analytics/periods';
import {
  buildStudentPeriodReport,
  completionKey,
  studentPeriodReportCsv,
  type BuildStudentPeriodInput,
  type StudentIdentityRow
} from '@/lib/analytics/student-period-metrics';

// Wednesday 2026-11-25, 10:00 IST
const NOW = new Date('2026-11-25T04:30:00Z');

describe('periods', () => {
  it('uses the IST calendar day, not UTC', () => {
    // 2026-11-24 20:00 UTC is already 2026-11-25 01:30 in IST
    expect(istToday(new Date('2026-11-24T20:00:00Z'))).toBe('2026-11-25');
  });

  it('this week runs Monday to today', () => {
    const p = resolvePeriod('this_week', NOW);
    expect([p.from, p.to, p.days]).toEqual(['2026-11-23', '2026-11-25', 3]);
    expect([p.previous.from, p.previous.to]).toEqual(['2026-11-20', '2026-11-22']);
  });

  it('last week is the full previous Monday-Sunday', () => {
    const p = resolvePeriod('last_week', NOW);
    expect([p.from, p.to, p.days]).toEqual(['2026-11-16', '2026-11-22', 7]);
    expect([p.previous.from, p.previous.to]).toEqual(['2026-11-09', '2026-11-15']);
  });

  it('last week from a Sunday', () => {
    const p = resolvePeriod('last_week', new Date('2026-11-29T06:00:00Z'));
    expect([p.from, p.to]).toEqual(['2026-11-16', '2026-11-22']);
  });

  it('this month and last month, across a year boundary', () => {
    expect(resolvePeriod('this_month', NOW)).toMatchObject({ from: '2026-11-01', to: '2026-11-25' });
    const jan = new Date('2027-01-10T06:00:00Z');
    const lm = resolvePeriod('last_month', jan);
    expect([lm.from, lm.to, lm.days]).toEqual(['2026-12-01', '2026-12-31', 31]);
    expect([lm.previous.from, lm.previous.to]).toEqual(['2026-10-31', '2026-11-30']);
  });

  it('last 30 days includes today', () => {
    expect(resolvePeriod('last_30_days', NOW)).toMatchObject({ from: '2026-10-27', to: '2026-11-25', days: 30 });
  });

  it('custom range clamps to today and falls back on bad input', () => {
    expect(resolvePeriod('custom', NOW, { from: '2026-11-01', to: '2026-12-31' })).toMatchObject({
      key: 'custom',
      to: '2026-11-25'
    });
    expect(resolvePeriod('custom', NOW, { from: '2026-11-10', to: '2026-11-01' }).key).toBe('this_week');
    expect(resolvePeriod('custom', NOW, { from: '2026-02-30', to: '2026-03-01' }).key).toBe('this_week');
    expect(resolvePeriod('custom', NOW, { from: '2024-01-01', to: '2026-11-01' }).key).toBe('this_week');
    expect(resolvePeriod('custom', NOW, {}).key).toBe('this_week');
  });

  it('maps IST days to UTC instants', () => {
    const w = makeWindow('2026-11-23', '2026-11-23');
    expect(w.startUtc.toISOString()).toBe('2026-11-22T18:30:00.000Z');
    expect(w.endUtcExclusive.toISOString()).toBe('2026-11-23T18:30:00.000Z');
  });

  it('validates ISO dates', () => {
    expect(isValidIsoDate('2026-11-25')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('25-11-2026')).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });
});

const student = (id: number, name: string): StudentIdentityRow => ({
  studentId: id,
  fullName: name,
  email: `${name.toLowerCase()}@college.edu`,
  collegeRollNumber: `R${id}`,
  branch: 'CSE',
  lastLoginAt: null
});

function baseInput(overrides: Partial<BuildStudentPeriodInput> = {}): BuildStudentPeriodInput {
  return {
    period: resolvePeriod('last_week', NOW),
    now: NOW,
    students: [student(1, 'Asha'), student(2, 'Bala')],
    activity: [],
    quizAttempts: [],
    submissions: [],
    dueItems: [],
    completions: new Set(),
    ...overrides
  };
}

const flagCodes = (input: BuildStudentPeriodInput, id: number) =>
  buildStudentPeriodReport(input).rows.find((r) => r.studentId === id)!.flags.map((f) => f.code);

describe('buildStudentPeriodReport', () => {
  it('flags a student with no activity in a 7-day period as inactive', () => {
    const input = baseInput({
      activity: [
        { studentId: 1, activeDays: 5, prevActiveDays: 4, lecturesCompleted: 6, dsaSolved: 3, xp: 120, prevXp: 90, lastActiveDate: '2026-11-21' }
      ]
    });
    expect(flagCodes(input, 1)).toEqual([]);
    expect(flagCodes(input, 2)).toEqual(['inactive']);
  });

  it('does not raise engagement flags on periods shorter than 7 days', () => {
    const input = baseInput({ period: resolvePeriod('this_week', NOW) });
    expect(flagCodes(input, 2)).toEqual([]);
  });

  it('flags low engagement and a sharp drop', () => {
    const input = baseInput({
      activity: [
        { studentId: 1, activeDays: 1, prevActiveDays: 6, lecturesCompleted: 1, dsaSolved: 0, xp: 10, prevXp: 80, lastActiveDate: '2026-11-17' }
      ]
    });
    expect(flagCodes(input, 1)).toEqual(['low_engagement', 'sharp_drop']);
  });

  it('flags overdue quizzes and projects, and falling behind on lectures', () => {
    const due = (kind: 'lecture' | 'quiz' | 'project', refId: string, iso: string) => ({
      kind,
      refId,
      title: `${kind} ${refId}`,
      weekNumber: 1,
      dueAt: new Date(iso)
    });
    const input = baseInput({
      activity: [
        { studentId: 1, activeDays: 4, prevActiveDays: 4, lecturesCompleted: 2, dsaSolved: 0, xp: 40, prevXp: 40, lastActiveDate: '2026-11-20' },
        { studentId: 2, activeDays: 4, prevActiveDays: 4, lecturesCompleted: 2, dsaSolved: 0, xp: 40, prevXp: 40, lastActiveDate: '2026-11-20' }
      ],
      dueItems: [
        due('lecture', 'l1', '2026-11-10T12:00:00Z'),
        due('lecture', 'l2', '2026-11-12T12:00:00Z'),
        due('lecture', 'l3', '2026-11-18T12:00:00Z'),
        due('quiz', 'q1', '2026-11-19T12:00:00Z'),
        due('project', 'p1', '2026-11-20T12:00:00Z'),
        // Due after the period ends: not counted for last week.
        due('quiz', 'q2', '2026-11-24T12:00:00Z')
      ],
      completions: new Set([
        completionKey(1, 'lecture', 'l1'),
        completionKey(1, 'lecture', 'l2'),
        completionKey(1, 'quiz', 'q1'),
        completionKey(1, 'project', 'p1'),
        completionKey(2, 'lecture', 'l1')
      ])
    });
    const report = buildStudentPeriodReport(input);
    const asha = report.rows.find((r) => r.studentId === 1)!;
    const bala = report.rows.find((r) => r.studentId === 2)!;

    expect(asha.dueItemsTotal).toBe(5);
    expect(asha.dueItemsDone).toBe(4);
    expect(asha.flags.map((f) => f.code)).toEqual([]); // 2 of 3 lectures is not behind
    expect(bala.flags.map((f) => f.code).sort()).toEqual(['falling_behind', 'overdue_project', 'overdue_quiz']);
    expect(bala.overdueItems.map((i) => i.title)).toEqual(['lecture l2', 'lecture l3', 'quiz q1', 'project p1']);
    // Flagged students sort first
    expect(report.rows[0].studentId).toBe(2);
  });

  it('ignores items due later than now even inside a current period', () => {
    const input = baseInput({
      period: resolvePeriod('this_month', NOW),
      dueItems: [{ kind: 'quiz', refId: 'q9', title: 'Later', weekNumber: 4, dueAt: new Date('2026-11-25T12:00:00Z') }]
    });
    expect(buildStudentPeriodReport(input).rows[0].dueItemsTotal).toBe(0);
  });

  it('computes quiz averages, failing quizzes and the summary', () => {
    const input = baseInput({
      activity: [
        { studentId: 1, activeDays: 3, prevActiveDays: 0, lecturesCompleted: 2, dsaSolved: 5, xp: 70, prevXp: 0, lastActiveDate: '2026-11-22' }
      ],
      quizAttempts: [
        { studentId: 1, score: 3, maxScore: 10, isPassed: false },
        { studentId: 1, score: 5, maxScore: 10, isPassed: false },
        { studentId: 1, score: 10, maxScore: 10, isPassed: true }
      ],
      submissions: [{ studentId: 1, submittedInPeriod: true, approvedInPeriod: false }]
    });
    const report = buildStudentPeriodReport(input);
    const asha = report.rows.find((r) => r.studentId === 1)!;
    expect(asha.quizAveragePercent).toBe(60);
    expect(asha.trend).toBe('up');
    expect(asha.flags.map((f) => f.code)).toEqual(['failing_quizzes']);
    expect(report.summary).toMatchObject({
      enrolledStudents: 2,
      activeStudents: 1,
      prevActiveStudents: 0,
      engagementRate: 50,
      averageActiveDays: 1.5,
      dsaSolved: 5,
      quizzesSubmitted: 3,
      quizAveragePercent: 60,
      projectsSubmitted: 1,
      studentsFlaggedHigh: 1, // Bala inactive
      studentsFlagged: 2
    });
  });

  it('handles an empty batch', () => {
    const report = buildStudentPeriodReport(baseInput({ students: [] }));
    expect(report.rows).toEqual([]);
    expect(report.summary.engagementRate).toBe(0);
    expect(report.summary.quizAveragePercent).toBeNull();
  });
});

describe('studentPeriodReportCsv', () => {
  it('neutralises formula cells and includes the period', () => {
    const input = baseInput({ students: [{ ...student(1, 'Asha'), fullName: '=HYPERLINK("x")' }] });
    const report = buildStudentPeriodReport(input);
    const csv = studentPeriodReportCsv(report, {
      batchName: 'Batch 01',
      collegeName: 'Test College',
      period: input.period
    });
    expect(csv).toContain('Last week: 2026-11-16 to 2026-11-22 (IST)');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('Inactive: No learning activity in 7 days.');
  });
});
