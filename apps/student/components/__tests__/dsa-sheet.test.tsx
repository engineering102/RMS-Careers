import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProblemRow } from '../dsa/problem-row';
import { SheetSection } from '../dsa/sheet-section';
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

  it('renders a collapsible topic header with progress and hides rows when collapsed', () => {
    const view = { sheet: { id: 's', slug: 'arrays', title: 'Arrays', shortDescription: '', description: '', estimatedHours: 1, patternCount: 1, questions: [QUESTION] }, questions: [QUESTION], solvedCount: 0, totalCount: 1 };
    const props = { view, progressMap: {}, savingSlug: null, onToggle: noop, onSelect: noop, onQuickSolve: noop };
    const closed = renderToStaticMarkup(<SheetSection {...props} isOpen={false} />);
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('0/1');
    expect(closed).not.toContain('Two Sum');
    const open = renderToStaticMarkup(<SheetSection {...props} isOpen />);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('Two Sum');
  });
});
