import { describe, it, expect } from 'vitest';
import {
  buildSheetViews,
  hasActiveFilters,
  initialOpenSheets,
  matchesFilters,
  percentOf,
  pickRandomUnsolved,
  type ProgressMap,
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
  return { id: slug, slug, title: slug, shortDescription: '', description: '', estimatedHours: 1, patternCount: 1, questions };
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
  it('keeps every topic, with whole-topic progress, when no filter is active', () => {
    const views = buildSheetViews(SHEETS, NO_FILTERS, solved('two-sum'));
    expect(views.map((v) => v.sheet.slug)).toEqual(['arrays', 'pointers', 'lists']);
    expect(views[0]).toMatchObject({ solvedCount: 1, totalCount: 2 });
    expect(views[0].questions).toHaveLength(2);
  });

  it('searches title, pattern and statement, case-insensitively', () => {
    expect(matchesFilters(SHEETS[0].questions[0], { ...NO_FILTERS, query: 'HASH map' }, {})).toBe(true);
    expect(matchesFilters(SHEETS[0].questions[0], { ...NO_FILTERS, query: 'statement for two' }, {})).toBe(true);
    expect(matchesFilters(SHEETS[0].questions[0], { ...NO_FILTERS, query: 'kadane' }, {})).toBe(false);
  });

  it('drops topics with no matches while filtering, but keeps whole-topic progress counts', () => {
    const views = buildSheetViews(SHEETS, { ...NO_FILTERS, difficulty: 'medium', status: 'unsolved' }, solved('container'));
    expect(views.map((v) => v.sheet.slug)).toEqual(['arrays']);
    expect(views[0].questions.map((q) => q.slug)).toEqual(['max-subarray']);
    expect(views[0].totalCount).toBe(2);
  });

  it('treats whitespace-only search as no filter', () => {
    expect(hasActiveFilters({ ...NO_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, status: 'solved' })).toBe(true);
  });

  it('picks a random problem only from unsolved, visible questions', () => {
    const views = buildSheetViews(SHEETS, NO_FILTERS, solved('two-sum', 'max-subarray', 'valid-palindrome'));
    const progress = solved('two-sum', 'max-subarray', 'valid-palindrome');
    expect(pickRandomUnsolved(views, progress, () => 0)?.slug).toBe('container');
    expect(pickRandomUnsolved(views, progress, () => 0.9999)?.slug).toBe('reverse-list');
    const allSolved = solved('two-sum', 'max-subarray', 'valid-palindrome', 'container', 'reverse-list');
    expect(pickRandomUnsolved(buildSheetViews(SHEETS, NO_FILTERS, allSolved), allSolved)).toBeNull();
  });

  it('opens the deep-linked topic, else the first topic with unsolved work', () => {
    expect(initialOpenSheets(SHEETS, {}, 'lists')).toEqual(['lists']);
    expect(initialOpenSheets(SHEETS, {}, 'unknown')).toEqual(['arrays']);
    expect(initialOpenSheets(SHEETS, solved('two-sum', 'max-subarray'))).toEqual(['pointers']);
    const all = solved('two-sum', 'max-subarray', 'valid-palindrome', 'container', 'reverse-list');
    expect(initialOpenSheets(SHEETS, all)).toEqual(['arrays']);
  });

  it('computes rounded percentages and handles empty totals', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(0, 0)).toBe(0);
  });
});
