import { describe, it, expect } from 'vitest';
import { LEETCODE_150_SHEET } from '../data/leetcode-150';
import { STUDENT_DSA_SHEETS, getDsaQuestionBySlug, getDsaSheetBySlug } from '../data/dsa-sheets';

const questions = LEETCODE_150_SHEET.questions;
const leetcodeSlug = (url: string | undefined) => url?.match(/^https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/$/)?.[1];

describe('LeetCode 150 Roadmap sheet', () => {
  it('is registered in the student catalog', () => {
    expect(STUDENT_DSA_SHEETS).toContain(LEETCODE_150_SHEET);
    expect(getDsaSheetBySlug('leetcode-150-roadmap')).toBe(LEETCODE_150_SHEET);
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
    expect(LEETCODE_150_SHEET.patternCount).toBe(18);
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

  it('every slug matches its LeetCode URL, except progress slugs reused from existing sheets', () => {
    const mismatched = questions
      .filter((q) => leetcodeSlug(q.externalUrl) !== q.slug)
      .map((q) => `${q.slug} -> ${leetcodeSlug(q.externalUrl)}`);
    expect(mismatched).toEqual(['two-sum-ii-sorted-array -> two-sum-ii-input-array-is-sorted']);
  });
});

describe('Problems shared across sheets', () => {
  const all = STUDENT_DSA_SHEETS.flatMap((s) => s.questions.map((q) => ({ sheet: s.slug, q })));

  it('one LeetCode problem never appears under two different slugs (one progress row and XP reward per problem)', () => {
    const slugsByUrl = new Map<string, Set<string>>();
    for (const { q } of all) {
      const key = leetcodeSlug(q.externalUrl);
      if (!key) continue;
      slugsByUrl.set(key, (slugsByUrl.get(key) ?? new Set()).add(q.slug));
    }
    const conflicts = [...slugsByUrl].filter(([, slugs]) => slugs.size > 1).map(([url, slugs]) => `${url}: ${[...slugs]}`);
    expect(conflicts).toEqual([]);
  });

  it('a shared slug has the same difficulty and link in every sheet', () => {
    const first = new Map<string, { difficulty: string; url?: string }>();
    const shared = new Set<string>();
    for (const { q } of all) {
      const prev = first.get(q.slug);
      if (!prev) {
        first.set(q.slug, { difficulty: q.difficulty, url: q.externalUrl });
        continue;
      }
      shared.add(q.slug);
      expect(q.difficulty, q.slug).toBe(prev.difficulty);
      expect(q.externalUrl, q.slug).toBe(prev.url);
    }
    // The original 10 curated problems are all part of the roadmap.
    expect(shared.size).toBe(10);
  });

  it('solving resolves a shared slug to its first sheet and new problems to the roadmap', () => {
    expect(getDsaQuestionBySlug('two-sum')?.sheet.slug).toBe('arrays-and-hashing');
    expect(getDsaQuestionBySlug('trapping-rain-water')?.sheet.slug).toBe('leetcode-150-roadmap');
    expect(getDsaQuestionBySlug('two-sum-ii-input-array-is-sorted')).toBeNull();
  });
});
