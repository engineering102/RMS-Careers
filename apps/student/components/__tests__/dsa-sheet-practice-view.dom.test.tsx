// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import './helpers/jsdom-gestures';

const recordDsaProblemSolved = vi.fn();
vi.mock('@/lib/actions/dsa', () => ({ recordDsaProblemSolved: (...args: unknown[]) => recordDsaProblemSolved(...args) }));

import { SheetPracticeView } from '../dsa/sheet-practice-view';
import type { DSAQuestion, DSASheet, StudentProblemProgress } from '@/lib/types/dsa';

function question(slug: string, pattern: string, difficulty: DSAQuestion['difficulty'] = 'easy'): DSAQuestion {
  return {
    id: slug, slug, title: slug.replace(/-/g, ' '), difficulty, pattern, problemStatement: '', examples: [],
    constraints: [], hints: [], approach: '', timeComplexity: 'O(n)', spaceComplexity: 'O(1)'
  };
}

const SHEET: DSASheet = {
  id: 'sheet-blind-75', slug: 'blind-75', title: 'Blind 75', shortDescription: '', description: 'Essential problems.',
  category: 'interview', estimatedHours: 3, patternCount: 2,
  questions: [question('contains-duplicate', 'Array'), question('two-sum', 'String'), question('group-anagrams', 'String', 'medium')]
};

const solvedTwoSum: Record<string, StudentProblemProgress> = {
  'two-sum': { problemSlug: 'two-sum', isCompleted: true, submissionUrl: null, notes: null, completedAt: null, updatedAt: new Date() }
};

const header = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('min-width: 640px'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  recordDsaProblemSolved.mockReset();
});

describe('Selected sheet view', () => {
  it('shows each pattern as an accordion with its progress, opening the first one with unsolved work', () => {
    render(<SheetPracticeView sheet={SHEET} initialProgressMap={solvedTwoSum} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Blind 75' })).toBeTruthy();
    expect(screen.getByText('Interview Preparation')).toBeTruthy();

    const array = header(/^Array/);
    const string = header(/^String/);
    expect(array.getAttribute('aria-expanded')).toBe('true');
    expect(string.getAttribute('aria-expanded')).toBe('false');
    expect(within(string).getByText('1 / 2 solved')).toBeTruthy();
    // Collapsed panels stay in the DOM (hidden) so aria-controls resolves.
    expect(document.getElementById(string.getAttribute('aria-controls')!)?.hidden).toBe(true);
    // Sheet progress counts only this sheet's problems.
    expect(screen.getByRole('progressbar', { name: 'Sheet progress' }).getAttribute('aria-valuenow')).toBe('33');
  });

  it('toggles a pattern, showing only its own problems', async () => {
    const user = userEvent.setup();
    render(<SheetPracticeView sheet={SHEET} initialProgressMap={{}} />);
    const string = header(/^String/);
    await user.click(string);
    expect(string.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(string.getAttribute('aria-controls')!)!;
    expect(within(panel).getByText('two sum')).toBeTruthy();
    expect(within(panel).queryByText('contains duplicate')).toBeNull();
    await user.click(string);
    expect(string.getAttribute('aria-expanded')).toBe('false');
  });

  it('filters within the sheet, opening matching patterns and naming how many match', async () => {
    const user = userEvent.setup();
    render(<SheetPracticeView sheet={SHEET} initialProgressMap={{}} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search problems in Blind 75' }), 'anagram');
    expect(screen.queryByRole('button', { name: /^Array/ })).toBeNull();
    const string = header(/^String/);
    expect(string.getAttribute('aria-expanded')).toBe('true');
    expect(within(string).getByText('1 match')).toBeTruthy();
    // Whole-pattern progress stays visible while filtering.
    expect(within(string).getByText('0 / 2 solved')).toBeTruthy();

    await user.clear(screen.getByRole('searchbox', { name: 'Search problems in Blind 75' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search problems in Blind 75' }), 'zzz');
    expect(screen.getByText('No problems found')).toBeTruthy();
  });

  it('marks a problem solved and updates the pattern and sheet progress', async () => {
    recordDsaProblemSolved.mockResolvedValue({ success: true, data: { isNewlySolved: true, xpAwarded: 10 } });
    const user = userEvent.setup();
    render(<SheetPracticeView sheet={SHEET} initialProgressMap={{}} batchId="b-1" />);
    await user.click(screen.getByRole('button', { name: 'Mark contains duplicate as solved' }));

    expect(recordDsaProblemSolved).toHaveBeenCalledWith({ problemSlug: 'contains-duplicate', batchId: 'b-1' });
    expect(await screen.findByText(/contains duplicate marked as solved · \+10 XP/)).toBeTruthy();
    expect(within(header(/^Array/)).getByText('1 / 1 solved')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Sheet progress' }).getAttribute('aria-valuenow')).toBe('33');
  });

  it('reports a failed update and leaves the problem unsolved', async () => {
    recordDsaProblemSolved.mockResolvedValue({ success: false, error: 'Problem not found in catalog.' });
    const user = userEvent.setup();
    render(<SheetPracticeView sheet={SHEET} initialProgressMap={{}} />);
    await user.click(screen.getByRole('button', { name: 'Mark contains duplicate as solved' }));
    expect(await screen.findByText('Problem not found in catalog.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark contains duplicate as solved' })).toBeTruthy();
    expect(within(header(/^Array/)).getByText('0 / 1 solved')).toBeTruthy();
  });

  it('opens a deep-linked problem and its pattern', () => {
    render(<SheetPracticeView sheet={SHEET} initialProgressMap={{}} initialProblemSlug="group-anagrams" />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    // The open dialog hides the page from assistive tech, so query hidden elements too.
    expect(screen.getByRole('button', { name: /^String/, hidden: true }).getAttribute('aria-expanded')).toBe('true');
  });

  it('does not present zeros as real progress when progress failed to load', () => {
    render(<SheetPracticeView sheet={SHEET} initialProgressMap={{}} progressUnavailable />);
    expect(screen.getByText(/could not be loaded/)).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: 'Sheet progress' })).toBeNull();
  });
});
