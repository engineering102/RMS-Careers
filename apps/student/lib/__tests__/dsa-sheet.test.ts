import { describe, it, expect } from 'vitest';
import {
  DSA_PROBLEM_BANK,
  DSA_SHEET,
  STUDENT_DSA_SHEETS,
  getDsaQuestionBySlug,
  getDsaSheetBySlug
} from '../data/dsa-sheets';
import { EXTRA_DSA_QUESTIONS } from '../data/dsa-problem-bank';
import { CURATED_SHEET_DEFINITIONS, resolveSheet } from '../data/dsa-curated-sheets';

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
  it('lists the DSA Sheet first, then Blind 75 and LeetCode 150, with unique slugs', () => {
    expect(STUDENT_DSA_SHEETS.map((s) => s.slug)).toEqual(['dsa-sheet', 'blind-75', 'leetcode-150']);
    expect(STUDENT_DSA_SHEETS[0]).toBe(DSA_SHEET);
    for (const sheet of STUDENT_DSA_SHEETS) {
      // A sheet slug that is also a problem slug would make /dsa?sheet=<slug> ambiguous.
      expect(DSA_PROBLEM_BANK.has(sheet.slug), sheet.slug).toBe(false);
    }
  });

  it('Blind 75 and LeetCode 150 list 75 and 150 distinct problems from the shared bank', () => {
    const blind = getDsaSheetBySlug('blind-75')!;
    const lc150 = getDsaSheetBySlug('leetcode-150')!;
    expect(blind.questions).toHaveLength(75);
    expect(new Set(blind.questions.map((q) => q.slug)).size).toBe(75);
    expect(blind.patternCount).toBe(10);
    expect(lc150.questions).toHaveLength(150);
    expect(new Set(lc150.questions.map((q) => q.slug)).size).toBe(150);
    expect(lc150.patternCount).toBe(23);
    for (const sheet of [blind, lc150]) {
      expect(sheet.category).toBe('interview');
      expect(sheet.estimatedHours).toBe(sheet.questions.length);
      for (const q of sheet.questions) {
        // Same record (title, difficulty, link) as the bank; only the pattern is the sheet's own grouping.
        const { pattern: _pattern, ...record } = q;
        const { pattern: _bankPattern, ...bankRecord } = DSA_PROBLEM_BANK.get(q.slug)!;
        expect(record, q.slug).toEqual(bankRecord);
      }
    }
  });

  it('keeps each pattern of every sheet as one contiguous run (one accordion per pattern)', () => {
    for (const sheet of STUDENT_DSA_SHEETS) {
      const runs = sheet.questions.map((q) => q.pattern).filter((p, i, all) => i === 0 || all[i - 1] !== p);
      expect(new Set(runs).size, sheet.slug).toBe(runs.length);
      expect(runs.length, sheet.slug).toBe(sheet.patternCount);
    }
  });

  it('extra bank problems are new problems with the same original-content rules', () => {
    const roadmapSlugs = new Set(DSA_SHEET.questions.map((q) => q.slug));
    expect(new Set(EXTRA_DSA_QUESTIONS.map((q) => q.slug)).size).toBe(EXTRA_DSA_QUESTIONS.length);
    const used = new Set(STUDENT_DSA_SHEETS.flatMap((s) => s.questions.map((q) => q.slug)));
    for (const q of EXTRA_DSA_QUESTIONS) {
      expect(roadmapSlugs.has(q.slug), q.slug).toBe(false);
      expect(used.has(q.slug), `${q.slug} is in no sheet`).toBe(true);
      expect(leetcodeSlug(q.externalUrl), q.slug).toBe(q.slug);
      expect(q.id).toBe(`q-${q.slug}`);
      expect(q.problemStatement.length, q.slug).toBeGreaterThanOrEqual(40);
      expect(q.hints, q.slug).toHaveLength(2);
      expect(q.approach.trim(), q.slug).not.toBe('');
      expect(q.examples, q.slug).toEqual([]);
      expect(q.constraints, q.slug).toEqual([]);
    }
  });

  it('refuses a sheet definition that names an unknown problem', () => {
    const [definition] = CURATED_SHEET_DEFINITIONS;
    const broken = { ...definition, groups: [{ pattern: 'X', slugs: ['not-a-problem'] }] };
    expect(() => resolveSheet(broken, DSA_PROBLEM_BANK)).toThrow(/not-a-problem/);
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

  it('resolves shared problems to the DSA Sheet and bank-only problems to the first sheet listing them', () => {
    expect(getDsaQuestionBySlug('two-sum')?.sheet.slug).toBe('dsa-sheet');
    expect(getDsaQuestionBySlug('meeting-rooms')?.sheet.slug).toBe('blind-75');
    expect(getDsaQuestionBySlug('merge-sorted-array')?.sheet.slug).toBe('leetcode-150');
    expect(getDsaQuestionBySlug('merge-sorted-array')?.question.difficulty).toBe('easy');
  });

  it('resolves problems by their progress slug, which can differ from the LeetCode URL slug', () => {
    expect(getDsaQuestionBySlug('trapping-rain-water')?.question.title).toBe('Trapping Rain Water');
    expect(getDsaQuestionBySlug('two-sum-ii-input-array-is-sorted')).toBeNull();
    expect(getDsaQuestionBySlug('not-a-problem')).toBeNull();
  });
});
