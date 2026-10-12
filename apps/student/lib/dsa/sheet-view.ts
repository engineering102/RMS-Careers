// Pure view helpers for the DSA sheet (filtering, per-topic progress, random pick).
// Kept free of React so the sheet behaviour can be unit tested.
import type { DSAQuestion, DSASheet, Difficulty, StudentProblemProgress } from '@/lib/types/dsa';

export type StatusFilter = 'all' | 'solved' | 'unsolved';

export interface SheetFilters {
  query: string;
  difficulty: Difficulty | 'all';
  status: StatusFilter;
}

export type ProgressMap = Record<string, StudentProblemProgress>;

export function isSolved(progressMap: ProgressMap, slug: string): boolean {
  return Boolean(progressMap[slug]?.isCompleted);
}

export function hasActiveFilters(filters: SheetFilters): boolean {
  return filters.query.trim() !== '' || filters.difficulty !== 'all' || filters.status !== 'all';
}

export function matchesFilters(question: DSAQuestion, filters: SheetFilters, progressMap: ProgressMap): boolean {
  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack = [question.title, question.pattern, question.problemStatement].join(' ').toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) return false;
  const solved = isSolved(progressMap, question.slug);
  if (filters.status === 'solved' && !solved) return false;
  if (filters.status === 'unsolved' && solved) return false;
  return true;
}

export interface SheetView {
  sheet: DSASheet;
  /** Questions that pass the filters, in catalogue order. */
  questions: DSAQuestion[];
  /** Progress over the whole topic, independent of filters. */
  solvedCount: number;
  totalCount: number;
}

/** Topics with their visible questions; topics with no matches are dropped only while filtering. */
export function buildSheetViews(sheets: DSASheet[], filters: SheetFilters, progressMap: ProgressMap): SheetView[] {
  const filtering = hasActiveFilters(filters);
  return sheets
    .map((sheet) => ({
      sheet,
      questions: sheet.questions.filter((q) => matchesFilters(q, filters, progressMap)),
      solvedCount: sheet.questions.filter((q) => isSolved(progressMap, q.slug)).length,
      totalCount: sheet.questions.length
    }))
    .filter((view) => !filtering || view.questions.length > 0);
}

export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** A random unsolved question from the visible topics, or null when everything visible is solved. */
export function pickRandomUnsolved(
  views: SheetView[],
  progressMap: ProgressMap,
  random: () => number = Math.random
): DSAQuestion | null {
  const pool = views.flatMap((v) => v.questions).filter((q) => !isSolved(progressMap, q.slug));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** Topics open on first load: the deep-linked topic, otherwise the first one with unsolved work. */
export function initialOpenSheets(sheets: DSASheet[], progressMap: ProgressMap, deepLinkSlug?: string): string[] {
  if (deepLinkSlug && sheets.some((s) => s.slug === deepLinkSlug)) return [deepLinkSlug];
  const firstOpen = sheets.find((s) => s.questions.some((q) => !isSolved(progressMap, q.slug)));
  return firstOpen ? [firstOpen.slug] : sheets.slice(0, 1).map((s) => s.slug);
}
