import { describe, it, expect } from 'vitest';
import { DSA_PROBLEM_BANK, DSA_SHEET, getDsaQuestionBySlug, getDsaSheetBySlug } from '../data/dsa-sheets';
import { EXTRA_DSA_QUESTIONS } from '../data/dsa-problem-bank';
import { RMS_PRACTICE_QUESTIONS } from '../data/dsa-rms-problems';
import { PATTERN_PATH_SHEET } from '../data/dsa-pattern-path';
import { resolveSheet } from '../data/dsa-curated-sheets';
import { groupByPattern } from '../dsa/sheet-view';

const sheet = getDsaSheetBySlug('pattern-path-26-weeks')!;
const isStretch = (slug: string) => sheet.questions.find((q) => q.slug === slug)?.sheetNote?.startsWith('Stretch');

describe('Pattern Path sheet', () => {
  it('is in the catalog as a general sheet with 26 weekly groups in order', () => {
    expect(sheet).toBeTruthy();
    expect(sheet.category).toBe('general');
    expect(sheet.patternCount).toBe(26);
    const weeks = PATTERN_PATH_SHEET.groups.map((g) => Number(g.pattern.match(/^Week (\d+) · \S/)?.[1]));
    expect(weeks).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
  });

  it('lists 231 distinct problems: 209 core and 22 optional stretch', () => {
    expect(sheet.questions).toHaveLength(231);
    expect(new Set(sheet.questions.map((q) => q.slug)).size).toBe(231);
    const stretch = sheet.questions.filter((q) => isStretch(q.slug));
    expect(stretch).toHaveLength(22);
  });

  it('keeps the designed difficulty mix (core 79 / 124 / 6, stretch 0 / 11 / 11)', () => {
    const count = (stretch: boolean, d: string) =>
      sheet.questions.filter((q) => Boolean(isStretch(q.slug)) === stretch && q.difficulty === d).length;
    expect([count(false, 'easy'), count(false, 'medium'), count(false, 'hard')]).toEqual([79, 124, 6]);
    expect([count(true, 'easy'), count(true, 'medium'), count(true, 'hard')]).toEqual([0, 11, 11]);
  });

  it('starts gently: Weeks 1-3 have no Hard problem and at most one Medium', () => {
    const early = PATTERN_PATH_SHEET.groups.slice(0, 3).flatMap((g) => g.slugs.map((s) => DSA_PROBLEM_BANK.get(s)!));
    expect(early.filter((q) => q.difficulty === 'hard')).toEqual([]);
    expect(early.filter((q) => q.difficulty === 'medium').map((q) => q.slug)).toEqual(['count-primes']);
  });

  it('gives Weeks 1-21 a pattern card and a builds-on note for every problem, and leaves Weeks 22-26 unlabelled', () => {
    PATTERN_PATH_SHEET.groups.forEach((group, index) => {
      if (index < 21) {
        expect(group.card, group.pattern).toBeTruthy();
        for (const field of Object.values(group.card!)) expect(field.trim(), group.pattern).not.toBe('');
        expect(Object.keys(group.notes ?? {}).sort(), group.pattern).toEqual([...group.slugs].sort());
      } else {
        expect(group.card, group.pattern).toBeUndefined();
        expect(group.notes, group.pattern).toBeUndefined();
      }
    });
    expect(Object.keys(sheet.patternCards ?? {})).toHaveLength(21);
  });

  it('notes start with a ladder role and name earlier problems, not positions that the app numbers differently', () => {
    const roles = /^(Revisit|Warm-up|Lab|Twist|Combine|Stretch \(optional\)) · \S/;
    for (const q of sheet.questions.filter((q) => q.sheetNote)) {
      expect(q.sheetNote, q.slug).toMatch(roles);
      expect(q.sheetNote, q.slug).not.toMatch(/#\d/);
    }
  });

  it('shares problem records with the bank, so progress and XP carry over from other sheets', () => {
    for (const q of sheet.questions) {
      const { pattern: _pattern, sheetNote: _note, ...record } = q;
      const { pattern: _bankPattern, ...bankRecord } = DSA_PROBLEM_BANK.get(q.slug)!;
      expect(record, q.slug).toEqual(bankRecord);
    }
    // A problem first listed by the DSA Sheet still resolves there; the note stays on the path's copy only.
    expect(getDsaQuestionBySlug('two-sum')?.sheet.slug).toBe('dsa-sheet');
    expect(DSA_SHEET.questions.some((q) => q.sheetNote)).toBe(false);
  });

  it('carries each pattern card through to its view group', () => {
    const groups = groupByPattern(sheet, sheet.questions, {});
    expect(groups).toHaveLength(26);
    expect(groups[0].card?.signal).toContain('repeat until');
    expect(groups[21].card).toBeUndefined();
  });

  it('refuses a note for a problem its group does not list', () => {
    const broken = {
      ...PATTERN_PATH_SHEET,
      groups: [{ pattern: 'Week 1 · X', slugs: ['fizz-buzz'], notes: { 'two-sum': 'Lab · wrong group' } }]
    };
    expect(() => resolveSheet(broken, DSA_PROBLEM_BANK)).toThrow(/two-sum/);
  });
});

describe('RMS practice problems', () => {
  it('are new, self-contained problems with no LeetCode page', () => {
    const other = new Set([...DSA_SHEET.questions, ...EXTRA_DSA_QUESTIONS].map((q) => q.slug));
    expect(RMS_PRACTICE_QUESTIONS).toHaveLength(9);
    expect(new Set(RMS_PRACTICE_QUESTIONS.map((q) => q.slug)).size).toBe(9);
    for (const q of RMS_PRACTICE_QUESTIONS) {
      expect(other.has(q.slug), q.slug).toBe(false);
      expect(q.id).toBe(`q-${q.slug}`);
      expect(q.externalUrl, q.slug).toBeUndefined();
      // Without a LeetCode page the record must carry the whole problem.
      expect(q.problemStatement.length, q.slug).toBeGreaterThanOrEqual(80);
      expect(q.examples.length, q.slug).toBeGreaterThanOrEqual(2);
      expect(q.constraints.length, q.slug).toBeGreaterThanOrEqual(1);
      expect(q.hints, q.slug).toHaveLength(2);
      expect(q.approach.trim(), q.slug).not.toBe('');
      expect(sheet.questions.some((p) => p.slug === q.slug), `${q.slug} is not on the path`).toBe(true);
    }
  });
});
