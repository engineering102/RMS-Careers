// Pure view helpers for the batch workspace: one curriculum week per page, split into content-type sections.
// Kept free of React so they can be unit tested.
import type { CurriculumItem, CurriculumWeek } from '@/lib/types/batch-workspace';
import type { ContentType } from '@/lib/types/library';

export type WeekSectionKey = 'lectures' | 'notes' | 'dsa' | 'assessments' | 'projects';

export interface WeekSectionGroup {
  key: WeekSectionKey;
  label: string;
  items: CurriculumItem[];
  completedCount: number;
  totalCount: number;
}

/** Section order on the page, and which content types each section holds. */
export const WEEK_SECTIONS: ReadonlyArray<{ key: WeekSectionKey; label: string; types: ContentType[] }> = [
  { key: 'lectures', label: 'Lectures', types: ['lecture'] },
  { key: 'notes', label: 'Notes & Resources', types: ['notes', 'resource'] },
  { key: 'dsa', label: 'DSA Practice', types: ['dsa_sheet'] },
  { key: 'assessments', label: 'Assessments', types: ['quiz', 'external_test'] },
  { key: 'projects', label: 'Projects', types: ['project'] }
];

/**
 * A week's items grouped into sections, in curriculum order within each. Sections with no items are left out,
 * and an unknown content type falls into Notes & Resources (the curriculum row renders it as a resource).
 */
export function groupWeekSections(week: CurriculumWeek): WeekSectionGroup[] {
  const byKey = new Map<WeekSectionKey, CurriculumItem[]>();
  for (const item of week.items) {
    const key = WEEK_SECTIONS.find((s) => s.types.includes(item.contentType))?.key ?? 'notes';
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }
  return WEEK_SECTIONS.filter((s) => byKey.has(s.key)).map((s) => {
    const items = byKey.get(s.key)!;
    return {
      key: s.key,
      label: s.label,
      items,
      completedCount: items.filter((i) => i.isCompleted).length,
      totalCount: items.length
    };
  });
}

/** Sections to expand when a week opens: those with unlocked, unfinished work, or the first when there is none. */
export function defaultOpenSections(sections: WeekSectionGroup[]): Set<WeekSectionKey> {
  const pending = sections.filter((s) => s.items.some((i) => !i.isCompleted && !i.isLocked)).map((s) => s.key);
  if (pending.length > 0) return new Set(pending);
  return new Set(sections[0] ? [sections[0].key] : []);
}

/**
 * The week a student should land on: the first week that has an unlocked, unfinished item. When everything
 * open is done, the first week that is still locked (what comes next); when the whole course is done, the last.
 */
export function currentWeekNumber(weeks: CurriculumWeek[]): number | null {
  if (weeks.length === 0) return null;
  const inProgress = weeks.find((w) => w.items.some((i) => !i.isCompleted && !i.isLocked));
  if (inProgress) return inProgress.weekNumber;
  const upcoming = weeks.find((w) => w.items.some((i) => !i.isCompleted));
  return (upcoming ?? weeks[weeks.length - 1]).weekNumber;
}

/** The index of the week to show first: a requested week when it exists, else the current week. */
export function initialWeekIndex(weeks: CurriculumWeek[], requestedWeek?: number | null): number {
  const requested = requestedWeek == null ? -1 : weeks.findIndex((w) => w.weekNumber === requestedWeek);
  if (requested >= 0) return requested;
  const current = weeks.findIndex((w) => w.weekNumber === currentWeekNumber(weeks));
  return Math.max(0, current);
}

/** The topic shared by every item in a week, or '' when items differ or have none. */
export function weekTopic(week: CurriculumWeek): string {
  const topics = new Set(week.items.map((item) => item.metadata?.topic || ''));
  return topics.size === 1 ? [...topics][0] : '';
}

export type WeekState = 'completed' | 'in_progress' | 'not_started' | 'locked';

/** A week's overall state for navigation: locked only when every unfinished item is still locked. */
export function weekState(week: CurriculumWeek): WeekState {
  if (week.totalCount > 0 && week.completedCount === week.totalCount) return 'completed';
  const unfinished = week.items.filter((i) => !i.isCompleted);
  if (unfinished.length > 0 && unfinished.every((i) => i.isLocked)) return 'locked';
  return week.completedCount > 0 ? 'in_progress' : 'not_started';
}
