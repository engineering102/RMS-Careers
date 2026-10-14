// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import './helpers/jsdom-gestures';

vi.mock('@/lib/actions/dsa', () => ({ recordDsaProblemSolved: vi.fn() }));

import { ProblemDetailModal } from '../dsa/problem-detail-modal';
import type { DSAQuestion } from '@/lib/types/dsa';

const question: DSAQuestion = {
  id: 'q', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy', pattern: 'Hashing', problemStatement: 'Find two numbers.',
  examples: [], constraints: [], hints: ['Use a map'], approach: 'One pass with a hash map.', timeComplexity: 'O(N)', spaceComplexity: 'O(N)'
};

function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop && query.includes('min-width: 640px'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => cleanup());

describe('Problem detail container', () => {
  it('is a bottom sheet with a drag handle on phones', () => {
    setViewport(false);
    render(<ProblemDetailModal question={question} progress={undefined} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Two Sum' });
    expect(dialog.hasAttribute('data-vaul-drawer')).toBe(true);
    expect(dialog.getAttribute('data-vaul-drawer-direction')).toBe('bottom');
  });

  it('is a centred dialog on wider screens', () => {
    setViewport(true);
    render(<ProblemDetailModal question={question} progress={undefined} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Two Sum' });
    expect(dialog.hasAttribute('data-vaul-drawer')).toBe(false);
    expect(dialog.className).toContain('max-w-2xl');
  });
});
