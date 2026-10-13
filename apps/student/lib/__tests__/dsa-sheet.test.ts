import { describe, it, expect } from 'vitest';
import { DSA_SHEET, STUDENT_DSA_SHEETS, getDsaQuestionBySlug, getDsaSheetBySlug } from '../data/dsa-sheets';

const questions = DSA_SHEET.questions;
const leetcodeSlug = (url: string | undefined) => url?.match(/^https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/$/)?.[1];

describe('DSA Sheet', () => {
  it('is registered in the student catalog', () => {
    expect(STUDENT_DSA_SHEETS).toContain(DSA_SHEET);
    expect(getDsaSheetBySlug('dsa-sheet')).toBe(DSA_SHEET);
  });

  it('holds the 150 roadmap problems with the roadmap difficulty split (29 / 101 / 20)', () => {
    expect(questions).toHaveLength(150);
    expect(new Set(questions.map((q) => q.slug)).size).toBe(150);
    const count = (d: string) => questions.filter((q) => q.difficulty === d).length;
    expect([count('easy'), count('medium'), count('hard')]).toEqual([29, 101, 20]);
  });

  it('keeps roadmap order and its 18 patterns', () => {
    const patterns = [...new Set(questions.map((q) => q.pattern))];
    expect(patterns).toHaveLength(18);
    expect(DSA_SHEET.patternCount).toBe(18);
    expect(patterns[0]).toBe('Arrays');
    expect(patterns.at(-1)).toBe('Bit Manipulation');
    expect(questions[0].slug).toBe('contains-duplicate');
    expect(questions.at(-1)?.slug).toBe('reverse-integer');
    expect(questions.at(-1)?.title).toBe('Reverse Integer');
  });

  it('gives every problem a LeetCode link and original practice content', () => {
    for (const q of questions) {
      expect(leetcodeSlug(q.externalUrl), q.slug).toBeTruthy();
      expect(q.id).toBe(`q-${q.slug}`);
      expect(q.problemStatement.length, q.slug).toBeGreaterThanOrEqual(40);
      expect(q.hints, q.slug).toHaveLength(2);
      expect(q.approach.trim(), q.slug).not.toBe('');
      expect(q.timeComplexity.trim(), q.slug).not.toBe('');
      expect(q.spaceComplexity.trim(), q.slug).not.toBe('');
      // Statements, examples and constraints stay on LeetCode (linked), not copied here.
      expect(q.examples, q.slug).toEqual([]);
      expect(q.constraints, q.slug).toEqual([]);
    }
  });

  it('every slug matches its LeetCode URL, except a progress slug kept from the earlier curated sheets', () => {
    const mismatched = questions
      .filter((q) => leetcodeSlug(q.externalUrl) !== q.slug)
      .map((q) => `${q.slug} -> ${leetcodeSlug(q.externalUrl)}`);
    expect(mismatched).toEqual(['two-sum-ii-sorted-array -> two-sum-ii-input-array-is-sorted']);
  });
});

describe('Student DSA catalog', () => {
  it('is exactly the DSA Sheet', () => {
    expect(STUDENT_DSA_SHEETS).toEqual([DSA_SHEET]);
  });

  it('keeps every slug students may already have progress on from the earlier curated sheets', () => {
    // These were the starter sheets' problems; progress rows are keyed by slug, so they must still resolve.
    const earlierSlugs = [
      'two-sum',
      'contains-duplicate',
      'valid-anagram',
      'best-time-to-buy-and-sell-stock',
      'maximum-subarray',
      'valid-palindrome',
      'two-sum-ii-sorted-array',
      'container-with-most-water',
      'reverse-linked-list',
      'linked-list-cycle'
    ];
    for (const slug of earlierSlugs) {
      expect(getDsaQuestionBySlug(slug)?.sheet.slug, slug).toBe('dsa-sheet');
    }
  });

  it('one LeetCode problem never appears under two different slugs (one progress row and XP reward per problem)', () => {
    const slugsByUrl = new Map<string, Set<string>>();
    for (const q of STUDENT_DSA_SHEETS.flatMap((s) => s.questions)) {
      const key = leetcodeSlug(q.externalUrl);
      if (!key) continue;
      slugsByUrl.set(key, (slugsByUrl.get(key) ?? new Set()).add(q.slug));
    }
    expect([...slugsByUrl].filter(([, slugs]) => slugs.size > 1)).toEqual([]);
  });

  it('resolves problems by their progress slug, which can differ from the LeetCode URL slug', () => {
    expect(getDsaQuestionBySlug('trapping-rain-water')?.question.title).toBe('Trapping Rain Water');
    expect(getDsaQuestionBySlug('two-sum-ii-input-array-is-sorted')).toBeNull();
    expect(getDsaQuestionBySlug('not-a-problem')).toBeNull();
  });
});
