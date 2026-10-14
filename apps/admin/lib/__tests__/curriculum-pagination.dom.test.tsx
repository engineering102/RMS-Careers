// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const curriculumActions = vi.hoisted(() => ({
  addContentToBatchAction: vi.fn(),
  updatePlacementAction: vi.fn(),
  removePlacementAction: vi.fn(),
  reorderCurriculumAction: vi.fn()
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));

vi.mock('../../app/(admin)/batches/[batchId]/curriculum/actions', () => curriculumActions);
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}));

import { BatchCurriculumClient } from '../../app/(admin)/batches/[batchId]/curriculum/curriculum-client';
import { PaginationBar, visiblePages } from '@/components/admin/pagination-bar';

beforeEach(() => {
  for (const fn of [...Object.values(curriculumActions), ...Object.values(toast)]) fn.mockReset();
});
afterEach(() => cleanup());

describe('visiblePages', () => {
  it('shows first, last and the neighbours of the current page with gaps', () => {
    expect(visiblePages(1, 1)).toEqual([1]);
    expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
    expect(visiblePages(1, 7)).toEqual([1, 2, 'gap', 7]);
    expect(visiblePages(4, 7)).toEqual([1, 'gap', 3, 4, 5, 'gap', 7]);
    expect(visiblePages(7, 7)).toEqual([1, 'gap', 6, 7]);
  });
});

describe('PaginationBar', () => {
  it('renders only the summary for a single page', () => {
    render(<PaginationBar page={1} pageCount={1} summary="Showing 1–3 of 3 items" />);
    expect(screen.getByText('Showing 1–3 of 3 items')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('links each page and disables Previous on the first page', () => {
    render(
      <PaginationBar page={1} pageCount={3} summary="s" label="Content pages" hrefForPage={(p) => `/content?page=${p}`} />
    );
    const nav = screen.getByRole('navigation', { name: 'Content pages' });
    expect(nav).toBeTruthy();
    expect(screen.getByLabelText('Previous page').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByLabelText('Next page').getAttribute('href')).toBe('/content?page=2');
    expect(screen.getByLabelText('Page 1').getAttribute('aria-current')).toBe('page');
  });
});

const batch = {
  id: 'b-1',
  programId: 3,
  collegeId: 'c-1',
  name: 'CSE Alpha',
  status: 'active',
  startDate: null,
  endDate: null,
  createdAt: new Date('2026-09-01T00:00:00Z')
};

function placement(id: number, weekNumber: number, sequenceOrder: number) {
  return {
    id,
    batchId: 'b-1',
    contentItemId: `ci-${id}`,
    title: `Item ${id}`,
    slug: `item-${id}`,
    contentType: 'notes' as const,
    description: null,
    contentProgramId: null,
    contentProgramName: null,
    contentProgramCode: null,
    isGlobal: true,
    isPublished: true,
    lifecycleStatus: 'published' as const,
    weekNumber,
    sequenceOrder,
    isRequired: true,
    availableFrom: null,
    dueAt: null,
    createdAt: new Date('2026-10-01T00:00:00Z')
  };
}

// 26 weeks x 4 items, like a full semester (production's Alpha batch has 106 placements over 26 weeks).
const curriculum = Array.from({ length: 26 * 4 }, (_, i) => placement(i + 1, Math.floor(i / 4) + 1, i % 4));
const eligible = [
  { id: 'new-1', title: 'Sliding Window Drills', slug: 'sliding-window-drills', contentType: 'notes', description: null, programId: null, programName: null, programCode: null, isGlobal: true, topic: null, metadata: {} }
];

function renderBuilder(props: Partial<React.ComponentProps<typeof BatchCurriculumClient>> = {}) {
  render(
    <BatchCurriculumClient
      batch={batch as never}
      college={null}
      program={null}
      initialCurriculum={curriculum}
      eligibleContent={eligible as never}
      {...props}
    />
  );
  return userEvent.setup();
}

const weekHeadings = () => screen.getAllByText(/^Week \d+$/).map((el) => el.textContent);

describe('Curriculum builder week pagination', () => {
  it('shows four weeks per page with a summary of the whole schedule', async () => {
    const user = renderBuilder();
    expect(weekHeadings()).toEqual(['Week 1', 'Week 2', 'Week 3', 'Week 4']);
    expect(screen.getAllByText('Weeks 1–4 · 26 weeks, 104 items in total').length).toBeGreaterThan(0);

    await user.click(screen.getAllByLabelText('Next page')[0]);
    expect(weekHeadings()).toEqual(['Week 5', 'Week 6', 'Week 7', 'Week 8']);

    await user.click(screen.getAllByLabelText('Page 7')[0]);
    expect(weekHeadings()).toEqual(['Week 25', 'Week 26']);
  });

  it('switches to the page holding the week an item was just added to', async () => {
    curriculumActions.addContentToBatchAction.mockResolvedValue({ success: true });
    const user = renderBuilder();
    expect(weekHeadings()).toContain('Week 1');

    // The header "Add Content" defaults to the last week (26), which lives on page 7.
    await user.click(screen.getByRole('button', { name: /^Add Content$/ }));
    await user.click(screen.getByRole('button', { name: /Sliding Window Drills/ }));
    await user.click(screen.getByRole('button', { name: 'Place in Curriculum' }));

    expect(curriculumActions.addContentToBatchAction).toHaveBeenCalledWith('b-1', expect.objectContaining({ weekNumber: 26 }));
    expect(weekHeadings()).toEqual(['Week 25', 'Week 26']);
  });
});

describe('Add Content picker', () => {
  it('says how many eligible items there are, and flags a reached cap', async () => {
    const user = renderBuilder({ eligibleContentLimit: 1 });
    await user.click(screen.getByRole('button', { name: /^Add Content$/ }));
    expect(screen.getByText(/1 eligible item/)).toBeTruthy();
    expect(screen.getByText(/only the first 1 \(A–Z\) are loaded/)).toBeTruthy();
  });
});
