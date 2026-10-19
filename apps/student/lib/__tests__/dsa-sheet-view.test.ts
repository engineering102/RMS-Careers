import { describe, it, expect } from 'vitest';
import {
  buildDsaHref,
  buildSheetHref,
  filterSheetCards,
  groupByPattern,
  hasActiveFilters,
  initialOpenPatterns,
  matchesFilters,
  percentOf,
  patternAnchorId,
  pickRandomUnsolved,
  resolveLegacyDsaLink,
  sheetProgress,
  type ProgressMap,
  type SheetCardData,
  type SheetFilters
} from '../dsa/sheet-view';
import type { DSAQuestion, DSASheet } from '../types/dsa';

function question(slug: string, difficulty: DSAQuestion['difficulty'], pattern = 'Pattern'): DSAQuestion {
  return {
    id: slug,
    slug,
    title: slug.replace(/-/g, ' '),
    difficulty,
    pattern,
    problemStatement: `Statement for ${slug}`,
    examples: [],
    constraints: [],
    hints: [],
    approach: '',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)'
  };
}

function sheet(slug: string, questions: DSAQuestion[]): DSASheet {
  return { id: slug, slug, title: slug, shortDescription: '', description: '', category: 'general', estimatedHours: 1, patternCount: 1, questions };
}

const SHEETS = [
  sheet('arrays', [question('two-sum', 'easy', 'Hash Map Lookup'), question('max-subarray', 'medium', "Kadane's")]),
  sheet('pointers', [question('valid-palindrome', 'easy'), question('container', 'medium')]),
  sheet('lists', [question('reverse-list', 'easy')])
];

const solved = (...slugs: string[]): ProgressMap =>
  Object.fromEntries(
    slugs.map((slug) => [
      slug,
      { problemSlug: slug, isCompleted: true, submissionUrl: null, notes: null, completedAt: null, updatedAt: new Date() }
    ])
  );

const NO_FILTERS: SheetFilters = { query: '', difficulty: 'all', status: 'all' };

describe('DSA sheet view', () => {
  it('searches title, pattern and statement, case-insensitively', () => {
    expect(matchesFilters(SHEETS[0].questions[0], { ...NO_FILTERS, query: 'HASH map' }, {})).toBe(true);
    expect(matchesFilters(SHEETS[0].questions[0], { ...NO_FILTERS, query: 'statement for two' }, {})).toBe(true);
    expect(matchesFilters(SHEETS[0].questions[0], { ...NO_FILTERS, query: 'kadane' }, {})).toBe(false);
  });

  it('treats whitespace-only search as no filter', () => {
    expect(hasActiveFilters({ ...NO_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, status: 'solved' })).toBe(true);
  });

  it('picks a random problem only from unsolved, visible questions', () => {
    const visible = SHEETS.flatMap((s) => s.questions);
    const progress = solved('two-sum', 'max-subarray', 'valid-palindrome');
    expect(pickRandomUnsolved(visible, progress, () => 0)?.slug).toBe('container');
    expect(pickRandomUnsolved(visible, progress, () => 0.9999)?.slug).toBe('reverse-list');
    const allSolved = solved('two-sum', 'max-subarray', 'valid-palindrome', 'container', 'reverse-list');
    expect(pickRandomUnsolved(visible, allSolved)).toBeNull();
  });

  it('opens the deep-linked pattern, else the first pattern with unsolved work', () => {
    const roadmap = sheet('roadmap', [
      question('a1', 'easy', 'Arrays'),
      question('h1', 'easy', 'Hashing'),
      question('t1', 'medium', 'Trees')
    ]);
    expect(initialOpenPatterns(roadmap, {}, 't1')).toEqual(['Trees']);
    expect(initialOpenPatterns(roadmap, {}, 'unknown')).toEqual(['Arrays']);
    expect(initialOpenPatterns(roadmap, solved('a1'))).toEqual(['Hashing']);
    expect(initialOpenPatterns(roadmap, solved('a1', 'h1', 't1'))).toEqual(['Arrays']);
    expect(initialOpenPatterns(sheet('empty', []), {})).toEqual([]);
  });

  it('builds sheet routes and sends /dsa?sheet= links to the sheet that holds them', () => {
    expect(buildSheetHref('blind-75')).toBe('/dsa/blind-75');
    expect(buildSheetHref('blind-75', { problem: 'two-sum', batchId: 'b-1' })).toBe('/dsa/blind-75?problem=two-sum&batchId=b-1');
    // A sheet slug opens the sheet; a problem slug opens the first sheet listing it, with the problem open.
    expect(resolveLegacyDsaLink(SHEETS, 'pointers')).toBe('/dsa/pointers');
    expect(resolveLegacyDsaLink(SHEETS, 'reverse-list', 'b-1')).toBe('/dsa/lists?problem=reverse-list&batchId=b-1');
    expect(resolveLegacyDsaLink(SHEETS, 'unknown')).toBeNull();
    expect(resolveLegacyDsaLink(SHEETS, undefined, 'b-1')).toBeNull();
  });

  it('computes sheet progress from the shared progress map', () => {
    expect(sheetProgress(SHEETS[0], solved('two-sum', 'reverse-list'))).toEqual({ solved: 1, total: 2, percent: 50 });
    expect(sheetProgress(sheet('empty', []), {})).toEqual({ solved: 0, total: 0, percent: 0 });
  });

  it('filters catalog cards by name and category', () => {
    const card = (slug: string, category: SheetCardData['category'], company?: string): SheetCardData => ({
      slug, title: slug, shortDescription: `About ${slug}`, category, company,
      patternCount: 1, totalProblems: 1, solvedCount: 0, percentage: 0
    });
    const cards = [card('blind-75', 'interview'), card('dsa-sheet', 'general'), card('acme-sheet', 'company', 'Acme')];
    expect(filterSheetCards(cards, '', 'all')).toHaveLength(3);
    expect(filterSheetCards(cards, 'BLIND', 'all').map((c) => c.slug)).toEqual(['blind-75']);
    expect(filterSheetCards(cards, 'acme', 'all').map((c) => c.slug)).toEqual(['acme-sheet']);
    expect(filterSheetCards(cards, '', 'general').map((c) => c.slug)).toEqual(['dsa-sheet']);
    expect(filterSheetCards(cards, 'blind', 'company')).toEqual([]);
  });

  it('builds DSA links with optional problem and batch', () => {
    expect(buildDsaHref()).toBe('/dsa');
    expect(buildDsaHref('two-sum')).toBe('/dsa?sheet=two-sum');
    expect(buildDsaHref(null, 'b-1')).toBe('/dsa?batchId=b-1');
    expect(buildDsaHref('two sum', 'b-1')).toBe('/dsa?sheet=two+sum&batchId=b-1');
  });

  it('computes rounded percentages and handles empty totals', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(0, 0)).toBe(0);
  });

  it('groups a sheet into consecutive pattern runs with whole-pattern progress and roadmap positions', () => {
    const roadmap = sheet('roadmap', [
      question('a1', 'easy', 'Arrays'),
      question('a2', 'medium', 'Arrays'),
      question('h1', 'easy', 'Hashing'),
      question('h2', 'hard', 'Hashing'),
      question('h3', 'easy', 'Hashing')
    ]);
    const progress = solved('a1', 'h2');

    const all = groupByPattern(roadmap, roadmap.questions, progress);
    expect(all.map((g) => [g.pattern, g.solvedCount, g.totalCount])).toEqual([
      ['Arrays', 1, 2],
      ['Hashing', 1, 3]
    ]);
    expect(all[1].positions).toEqual({ h1: 3, h2: 4, h3: 5 });

    // Filtering keeps whole-pattern counts and drops groups with nothing visible.
    const visible = roadmap.questions.filter((q) => q.slug === 'h3');
    const filtered = groupByPattern(roadmap, visible, progress);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({ pattern: 'Hashing', solvedCount: 1, totalCount: 3, positions: { h3: 5 } });
  });

  it('builds stable anchor ids from pattern names', () => {
    expect(patternAnchorId('dsa-sheet', 'Heap / Priority Queue')).toBe('dsa-dsa-sheet-heap-priority-queue');
    expect(patternAnchorId('dsa-sheet', 'DP - 1D')).toBe('dsa-dsa-sheet-dp-1d');
  });
});
