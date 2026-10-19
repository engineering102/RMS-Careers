import { describe, it, expect } from 'vitest';
import {
  currentWeekNumber,
  defaultOpenSections,
  groupWeekSections,
  initialWeekIndex
} from '../batch-workspace/week-pages';
import type { CurriculumItem, CurriculumWeek } from '../types/batch-workspace';
import type { ContentType } from '../types/library';

type ItemSpec = { type?: ContentType; done?: boolean; locked?: boolean };

function week(weekNumber: number, items: ItemSpec[]): CurriculumWeek {
  const rows = items.map(
    (i, idx) =>
      ({
        id: weekNumber * 100 + idx,
        contentType: i.type ?? 'lecture',
        isCompleted: !!i.done,
        isLocked: !!i.locked
      }) as CurriculumItem
  );
  return { weekNumber, items: rows, totalCount: rows.length, completedCount: rows.filter((r) => r.isCompleted).length };
}

describe('week sections', () => {
  it('groups items by content type in a fixed order and leaves empty sections out', () => {
    const sections = groupWeekSections(
      week(1, [
        { type: 'quiz' },
        { type: 'lecture', done: true },
        { type: 'resource' },
        { type: 'external_test', done: true },
        { type: 'notes' },
        { type: 'lecture' }
      ])
    );
    expect(sections.map((s) => s.key)).toEqual(['lectures', 'notes', 'assessments']);
    expect(sections.map((s) => [s.completedCount, s.totalCount])).toEqual([
      [1, 2],
      [0, 2],
      [1, 2]
    ]);
    // Curriculum order is kept inside a section.
    expect(sections[2].items.map((i) => i.contentType)).toEqual(['quiz', 'external_test']);
  });

  it('opens sections with unlocked unfinished work, else the first', () => {
    const mixed = groupWeekSections(
      week(1, [{ type: 'lecture', done: true }, { type: 'dsa_sheet' }, { type: 'project', locked: true }])
    );
    expect([...defaultOpenSections(mixed)]).toEqual(['dsa']);

    const allDone = groupWeekSections(week(1, [{ type: 'notes', done: true }, { type: 'quiz', done: true }]));
    expect([...defaultOpenSections(allDone)]).toEqual(['notes']);
    expect([...defaultOpenSections([])]).toEqual([]);
  });
});

describe('current week', () => {
  it('lands on the first week with unlocked unfinished work', () => {
    const weeks = [week(1, [{ done: true }]), week(2, [{ done: true }, {}]), week(3, [{}])];
    expect(currentWeekNumber(weeks)).toBe(2);
  });

  it('falls back to the next locked week, then to the last week when all is done', () => {
    expect(currentWeekNumber([week(1, [{ done: true }]), week(2, [{ locked: true }])])).toBe(2);
    expect(currentWeekNumber([week(1, [{ done: true }]), week(2, [{ done: true }])])).toBe(2);
    expect(currentWeekNumber([])).toBeNull();
  });

  it('opens a requested week when it exists, else the current week', () => {
    const weeks = [week(1, [{ done: true }]), week(3, [{}]), week(5, [{}])];
    expect(initialWeekIndex(weeks, 5)).toBe(2);
    expect(initialWeekIndex(weeks, 4)).toBe(1);
    expect(initialWeekIndex(weeks, null)).toBe(1);
    expect(initialWeekIndex(weeks)).toBe(1);
  });
});
