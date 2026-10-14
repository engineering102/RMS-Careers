// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/actions/dsa', () => ({ recordDsaProblemSolved: vi.fn() }));

import { DsaPracticeCenter } from '../dsa/dsa-practice-center';
import type { DSAQuestion, StudentDsaData } from '@/lib/types/dsa';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function question(slug: string, pattern: string, difficulty: DSAQuestion['difficulty'] = 'easy'): DSAQuestion {
  return {
    id: slug, slug, title: slug.replace(/-/g, ' '), difficulty, pattern, problemStatement: '', examples: [],
    constraints: [], hints: [], approach: '', timeComplexity: 'O(n)', spaceComplexity: 'O(1)'
  };
}

const data: StudentDsaData = {
  sheets: [
    {
      id: 's', slug: 'dsa-sheet', title: 'DSA Sheet', shortDescription: '', description: '', estimatedHours: 3, patternCount: 2,
      questions: [question('contains-duplicate', 'Arrays'), question('two-sum', 'Hashing'), question('group-anagrams', 'Hashing', 'medium')]
    }
  ],
  progressMap: {
    'two-sum': { problemSlug: 'two-sum', isCompleted: true, submissionUrl: null, notes: null, completedAt: null, updatedAt: new Date() }
  },
  summary: { totalProblems: 3, totalSolved: 1, overallPercentage: 33, easyTotal: 2, easySolved: 1, mediumTotal: 1, mediumSolved: 0, hardTotal: 0, hardSolved: 0 },
  sheetSummaries: []
};

describe('DSA sheet pattern groups', () => {
  it('renders each pattern as a group with its own progress and roadmap numbers', () => {
    render(<DsaPracticeCenter initialData={data} />);
    const hashing = document.getElementById('dsa-dsa-sheet-hashing')!;
    expect(within(hashing).getByRole('heading', { name: 'Hashing' })).toBeTruthy();
    expect(within(hashing).getByText('1/2')).toBeTruthy();
    expect(within(hashing).getAllByText('#2').length).toBeGreaterThan(0);
    expect(within(hashing).getAllByText('#3').length).toBeGreaterThan(0);
  });

  it('jumps to a pattern from its chip, clearing filters that would hide it', async () => {
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    const user = userEvent.setup();
    render(<DsaPracticeCenter initialData={data} />);

    // Hide the Arrays group with a search, then jump to it.
    await user.type(screen.getByRole('searchbox', { name: 'Search problems' }), 'anagram');
    expect(document.getElementById('dsa-dsa-sheet-arrays')).toBeNull();

    const chips = screen.getByRole('navigation', { name: 'Jump to pattern' });
    await user.click(within(chips).getByRole('button', { name: /Arrays/ }));

    expect(document.getElementById('dsa-dsa-sheet-arrays')).not.toBeNull();
    expect(scrolled.at(-1)).toBe(document.getElementById('dsa-dsa-sheet-arrays'));
  });
});
