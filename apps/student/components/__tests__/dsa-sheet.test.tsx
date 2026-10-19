import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProblemRow } from '../dsa/problem-row';
import { PatternAccordion } from '../dsa/pattern-accordion';
import type { DSAQuestion } from '@/lib/types/dsa';

const QUESTION: DSAQuestion = {
  id: 'two-sum',
  slug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'easy',
  pattern: 'Hash Map Lookup',
  problemStatement: '',
  examples: [],
  constraints: [],
  hints: [],
  approach: '',
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  externalUrl: 'https://leetcode.com/problems/two-sum/'
};

const noop = () => {};

describe('DSA sheet rows', () => {
  it('offers a mark-as-solved checkbox and a practice link for an unsolved problem', () => {
    const html = renderToStaticMarkup(<ProblemRow question={QUESTION} onSelect={noop} onQuickSolve={noop} />);
    expect(html).toContain('aria-label="Mark Two Sum as solved"');
    expect(html).toContain('href="https://leetcode.com/problems/two-sum/"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Add notes for Two Sum');
  });

  it('shows a solved tick, the solution link and saved notes for a solved problem', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        question={QUESTION}
        progress={{
          problemSlug: 'two-sum',
          isCompleted: true,
          submissionUrl: 'https://leetcode.com/submissions/detail/1/',
          notes: 'hash map',
          completedAt: new Date('2026-10-12T06:00:00Z'),
          updatedAt: new Date()
        }}
        onSelect={noop}
        onQuickSolve={noop}
      />
    );
    expect(html).toContain('aria-label="Solved"');
    expect(html).not.toContain('Mark Two Sum as solved');
    expect(html).toContain('href="https://leetcode.com/submissions/detail/1/"');
    expect(html).toContain('View notes for Two Sum');
    expect(html).toContain('Solved 12 Oct');
  });

  it('renders a pattern accordion header with its progress and hides rows when collapsed', () => {
    const group = { pattern: 'Hashing', questions: [QUESTION], positions: { 'two-sum': 5 }, solvedCount: 0, totalCount: 1 };
    const props = { sheetSlug: 'blind-75', group, filtering: false, progressMap: {}, savingSlug: null, onToggle: noop, onSelect: noop, onQuickSolve: noop };
    const closed = renderToStaticMarkup(<PatternAccordion {...props} isOpen={false} />);
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('aria-controls="dsa-blind-75-hashing-panel"');
    expect(closed).toContain('id="dsa-blind-75-hashing-panel"');
    expect(closed).toContain('0 / 1 solved');
    expect(closed).not.toContain('Two Sum');
    const open = renderToStaticMarkup(<PatternAccordion {...props} isOpen />);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('Two Sum');
    expect(open).toContain('#5');
  });
});
