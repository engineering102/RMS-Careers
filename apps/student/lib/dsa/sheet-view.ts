// Pure view helpers for DSA Practice: the sheet catalog, and a selected sheet's filtering, pattern groups and links.
// Kept free of React so the sheet behaviour can be unit tested.
import type { DSAQuestion, DSASheet, Difficulty, DsaSheetCategory, StudentProblemProgress } from '@/lib/types/dsa';

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

export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** A random unsolved question from the visible ones, or null when everything visible is solved. */
export function pickRandomUnsolved(
  visible: DSAQuestion[],
  progressMap: ProgressMap,
  random: () => number = Math.random
): DSAQuestion | null {
  const pool = visible.filter((q) => !isSolved(progressMap, q.slug));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** Link into the DSA page, focused on a topic or problem and attributed to a batch when given. */
export function buildDsaHref(slug?: string | null, batchId?: string | null): string {
  const params = new URLSearchParams();
  if (slug) params.set('sheet', slug);
  if (batchId) params.set('batchId', batchId);
  const query = params.toString();
  return query ? `/dsa?${query}` : '/dsa';
}

/** A selected sheet's route, optionally opening one problem and attributing XP to a batch. */
export function buildSheetHref(sheetSlug: string, options: { problem?: string | null; batchId?: string | null } = {}): string {
  const params = new URLSearchParams();
  if (options.problem) params.set('problem', options.problem);
  if (options.batchId) params.set('batchId', options.batchId);
  const query = params.toString();
  return `/dsa/${encodeURIComponent(sheetSlug)}${query ? `?${query}` : ''}`;
}

/**
 * Where a `/dsa?sheet=<slug>` link (from the batch curriculum, deadlines, resume card or library) now lives: a sheet
 * slug opens that sheet; a problem slug opens the first sheet (in catalog order) that lists it, with the problem open.
 * Null when the slug matches neither, so the catalog shows.
 */
export function resolveLegacyDsaLink(sheets: DSASheet[], slug?: string, batchId?: string): string | null {
  if (!slug) return null;
  if (sheets.some((s) => s.slug === slug)) return buildSheetHref(slug, { batchId });
  const home = sheets.find((s) => s.questions.some((q) => q.slug === slug));
  return home ? buildSheetHref(home.slug, { problem: slug, batchId }) : null;
}

export interface PatternGroup {
  pattern: string;
  /** Questions of this pattern that pass the filters, in roadmap order. */
  questions: DSAQuestion[];
  /** 1-based roadmap position of each visible question, keyed by slug. */
  positions: Record<string, number>;
  /** Progress over the whole pattern, independent of filters. */
  solvedCount: number;
  totalCount: number;
}

/**
 * Splits a sheet into consecutive pattern groups in roadmap order (the sheet lists each pattern as one
 * contiguous run). Groups with no visible question are dropped; counts always cover the whole pattern.
 */
export function groupByPattern(sheet: DSASheet, visible: DSAQuestion[], progressMap: ProgressMap): PatternGroup[] {
  const visibleSlugs = new Set(visible.map((q) => q.slug));
  const groups: PatternGroup[] = [];
  sheet.questions.forEach((q, index) => {
    let group = groups[groups.length - 1];
    if (!group || group.pattern !== q.pattern) {
      group = { pattern: q.pattern, questions: [], positions: {}, solvedCount: 0, totalCount: 0 };
      groups.push(group);
    }
    group.totalCount += 1;
    if (isSolved(progressMap, q.slug)) group.solvedCount += 1;
    if (visibleSlugs.has(q.slug)) {
      group.questions.push(q);
      group.positions[q.slug] = index + 1;
    }
  });
  return groups.filter((g) => g.questions.length > 0);
}

/** DOM id of a pattern group, for the pattern jump chips. */
export function patternAnchorId(sheetSlug: string, pattern: string): string {
  return `dsa-${sheetSlug}-${pattern.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

/**
 * Patterns open on first load: the one holding the deep-linked problem, otherwise the first with unsolved work
 * (or the first pattern when everything is solved). Opening one keeps a long sheet short.
 */
export function initialOpenPatterns(sheet: DSASheet, progressMap: ProgressMap, deepLinkSlug?: string): string[] {
  const linked = deepLinkSlug && sheet.questions.find((q) => q.slug === deepLinkSlug);
  if (linked) return [linked.pattern];
  const firstOpen = sheet.questions.find((q) => !isSolved(progressMap, q.slug));
  return firstOpen ? [firstOpen.pattern] : sheet.questions.slice(0, 1).map((q) => q.pattern);
}

export interface SheetProgress {
  solved: number;
  total: number;
  percent: number;
}

/** Progress over every problem in a sheet (a problem listed in several sheets counts in each). */
export function sheetProgress(sheet: DSASheet, progressMap: ProgressMap): SheetProgress {
  const solved = sheet.questions.filter((q) => isSolved(progressMap, q.slug)).length;
  return { solved, total: sheet.questions.length, percent: percentOf(solved, sheet.questions.length) };
}

export const SHEET_CATEGORY_LABELS: Record<DsaSheetCategory, string> = {
  general: 'General DSA',
  interview: 'Interview Preparation',
  company: 'Company Specific'
};

/** What a catalog card shows; built on the server so the catalog does not ship every problem to the browser. */
export interface SheetCardData {
  slug: string;
  title: string;
  shortDescription: string;
  category: DsaSheetCategory;
  company?: string;
  patternCount: number;
  totalProblems: number;
  solvedCount: number;
  percentage: number;
}

export function filterSheetCards(
  cards: SheetCardData[],
  query: string,
  category: DsaSheetCategory | 'all'
): SheetCardData[] {
  const q = query.trim().toLowerCase();
  return cards.filter(
    (card) =>
      (category === 'all' || card.category === category) &&
      (!q || [card.title, card.company ?? '', card.shortDescription].join(' ').toLowerCase().includes(q))
  );
}
