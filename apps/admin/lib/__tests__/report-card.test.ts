import { describe, it, expect } from 'vitest';
import { makeWindow, resolvePeriod } from '@/lib/analytics/periods';
import { formatIstDay, periodQuery } from '@/lib/analytics/period-format';
import {
  batchAverages,
  bucketActivity,
  buildWeekProgress,
  collegeAttentionList,
  collegeReportCsv,
  collegeTotals,
  type CollegeBatchReport
} from '@/lib/analytics/report-card';
import {
  buildStudentPeriodReport,
  completionKey,
  type StudentActivityAggregate
} from '@/lib/analytics/student-period-metrics';

const NOW = new Date('2026-11-25T04:30:00Z'); // Wed 25 Nov 2026, IST

describe('bucketActivity', () => {
  it('uses one bucket per day for short periods and ignores days outside the window', () => {
    const w = makeWindow('2026-11-16', '2026-11-22');
    const buckets = bucketActivity(
      [
        { date: '2026-11-16', activityType: 'lecture_completed', count: 2 },
        { date: '2026-11-16', activityType: 'dsa_solved', count: 1 },
        { date: '2026-11-18', activityType: 'quiz_completed', count: 1 },
        { date: '2026-11-19', activityType: 'external_assessment', count: 1 },
        { date: '2026-11-30', activityType: 'dsa_solved', count: 5 }
      ],
      w
    );
    expect(buckets).toHaveLength(7);
    expect(buckets[0]).toEqual({ from: '2026-11-16', to: '2026-11-16', lectures: 2, dsa: 1, quizzes: 0, activeDays: 1 });
    expect(buckets[2].quizzes).toBe(1);
    // External imports are not a learning action and do not make a day active.
    expect(buckets[3]).toMatchObject({ lectures: 0, dsa: 0, quizzes: 0, activeDays: 0 });
  });

  it('groups long periods into Monday-start weeks clipped to the period', () => {
    const w = makeWindow('2026-10-01', '2026-11-04'); // Thu 1 Oct .. Wed 4 Nov
    const buckets = bucketActivity(
      [
        { date: '2026-10-05', activityType: 'dsa_solved', count: 1 },
        { date: '2026-10-06', activityType: 'dsa_solved', count: 2 }
      ],
      w
    );
    expect(buckets[0]).toMatchObject({ from: '2026-10-01', to: '2026-10-04' });
    expect(buckets[1]).toMatchObject({ from: '2026-10-05', to: '2026-10-11', dsa: 3, activeDays: 2 });
    expect(buckets[buckets.length - 1]).toMatchObject({ from: '2026-11-02', to: '2026-11-04' });
  });
});

describe('buildWeekProgress', () => {
  it('counts done items per week and kind, listing what is pending', () => {
    const weeks = buildWeekProgress(
      7,
      [
        { kind: 'lecture', refId: 'l1', title: 'Arrays', weekNumber: 1, dueAt: null },
        { kind: 'quiz', refId: 'q1', title: 'Arrays quiz', weekNumber: 1, dueAt: null },
        { kind: 'project', refId: 'p1', title: 'Todo app', weekNumber: 2, dueAt: null }
      ],
      new Set([completionKey(7, 'lecture', 'l1'), completionKey(8, 'quiz', 'q1')])
    );
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ weekNumber: 1, total: 2, done: 1, pendingTitles: ['Arrays quiz'] });
    expect(weeks[0].byKind.lecture).toEqual({ total: 1, done: 1 });
    expect(weeks[1]).toMatchObject({ weekNumber: 2, total: 1, done: 0 });
  });
});

const agg = (studentId: number, activeDays: number, extra: Partial<StudentActivityAggregate> = {}): StudentActivityAggregate => ({
  studentId,
  activeDays,
  prevActiveDays: activeDays,
  lecturesCompleted: activeDays,
  dsaSolved: 0,
  xp: activeDays * 10,
  prevXp: 0,
  lastActiveDate: activeDays > 0 ? '2026-11-20' : null,
  ...extra
});

function batchReport(id: string, name: string, studentIds: number[], activity: StudentActivityAggregate[]): CollegeBatchReport {
  const period = resolvePeriod('last_week', NOW);
  const report = buildStudentPeriodReport({
    period,
    now: NOW,
    students: studentIds.map((sid) => ({
      studentId: sid,
      fullName: `Student ${sid}`,
      email: `s${sid}@college.edu`,
      collegeRollNumber: `R${sid}`,
      branch: 'CSE',
      lastLoginAt: null
    })),
    activity,
    quizAttempts: [],
    submissions: [],
    dueItems: [],
    completions: new Set()
  });
  return { batch: { id, name, status: 'active', programName: 'CRP' }, summary: report.summary, rows: report.rows };
}

describe('college rollup', () => {
  const a = batchReport('a', 'Alpha', [1, 2, 3], [agg(1, 5), agg(2, 1)]);
  const b = batchReport('b', 'Beta', [3, 4], [agg(3, 4)]);

  it('counts a student in two batches once in college totals', () => {
    const t = collegeTotals([a, b]);
    expect(t).toMatchObject({ batches: 2, students: 4, lecturesCompleted: 10 });
    // Student 3 is inactive in Alpha but active in Beta: active at college level.
    expect(t.activeStudents).toBe(3);
    expect(t.engagementRate).toBe(75);
    // Flagged anywhere: 2 (low engagement in Alpha), 3 (inactive in Alpha), 4 (inactive in Beta).
    expect(t.studentsFlagged).toBe(3);
    expect(t.studentsFlaggedHigh).toBe(2);
  });

  it('lists flagged students high severity first, with their batch', () => {
    const list = collegeAttentionList([a, b]);
    expect(list.map((e) => `${e.batchName}:${e.row.studentId}`)).toEqual(['Alpha:3', 'Beta:4', 'Alpha:2']);
  });

  it('batch averages', () => {
    expect(batchAverages({ summary: a.summary, rows: a.rows })).toMatchObject({ activeDays: 2, xp: 20 });
  });

  it('college CSV has a batch column and safe cells', () => {
    const csv = collegeReportCsv([a, b], { collegeName: '=Evil College', period: resolvePeriod('last_week', NOW) });
    expect(csv.split('\n')[0]).toBe("College,'=Evil College");
    expect(csv).toContain('Alpha,Student 1,R1,s1@college.edu,CSE,5,7,');
    expect(csv).toContain('Beta,Student 4,R4');
  });
});

describe('period-format', () => {
  it('formats IST days and builds query strings', () => {
    expect(formatIstDay('2026-11-02')).toBe('02 Nov 2026');
    expect(formatIstDay(null)).toBe('');
    expect(periodQuery({ key: 'last_week', from: '2026-11-16', to: '2026-11-22' })).toBe('period=last_week');
    expect(periodQuery({ key: 'custom', from: '2026-11-01', to: '2026-11-10' })).toBe(
      'period=custom&from=2026-11-01&to=2026-11-10'
    );
  });
});
