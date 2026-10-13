// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';

const queries = vi.hoisted(() => ({
  getBatchById: vi.fn(),
  getCollegeById: vi.fn(),
  getProgramById: vi.fn(),
  getBatchRoster: vi.fn()
}));
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
);

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/queries', () => queries);
vi.mock('@/lib/authz', () => ({ requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'a1' } }) }));
vi.mock('next/navigation', () => ({
  notFound,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../app/(admin)/batches/actions', () => ({ createBatchAction: vi.fn() }));

import BatchOverviewPage from '../../app/(admin)/batches/[batchId]/page';
import { BatchNav, batchSectionHref } from '@/components/admin/batch-nav';
import { summarizeRoster, type BatchRosterEntry } from '@/lib/batches/roster';
import { BatchesClient } from '../../app/(admin)/batches/batches-client';

beforeEach(() => {
  for (const fn of Object.values(queries)) fn.mockReset();
  notFound.mockClear();
});

afterEach(() => cleanup());

const batch = {
  id: 'b-1',
  programId: 3,
  collegeId: 'c-1',
  name: 'CSE Alpha',
  status: 'active',
  startDate: new Date('2026-10-01T00:00:00Z'),
  endDate: new Date('2027-03-31T00:00:00Z'),
  createdAt: new Date('2026-09-01T00:00:00Z')
};

function entry(id: number, status: BatchRosterEntry['status'], name = `Student ${id}`): BatchRosterEntry {
  return {
    enrollmentId: id,
    status,
    enrolledAt: new Date('2026-10-02T00:00:00Z'),
    confirmationSentAt: null,
    student: {
      id: 100 + id,
      fullName: name,
      email: `s${id}@example.test`,
      collegeRollNumber: `R-${id}`,
      branch: 'CSE',
      year: 3
    }
  };
}

describe('summarizeRoster', () => {
  it('splits by access: active/confirmed, pending, everything else', () => {
    const s = summarizeRoster([
      entry(1, 'active'),
      entry(2, 'confirmed'),
      entry(3, 'pending'),
      entry(4, 'cancelled'),
      entry(5, 'waitlisted')
    ]);
    expect(s).toEqual({ total: 5, withAccess: 2, pending: 1, other: 2 });
  });

  it('handles an empty batch', () => {
    expect(summarizeRoster([])).toEqual({ total: 0, withAccess: 0, pending: 0, other: 0 });
  });
});

describe('BatchNav', () => {
  it('links every batch section and marks the current one', () => {
    render(<BatchNav batchId="b-1" active="curriculum" />);
    const nav = screen.getByRole('navigation', { name: 'Batch sections' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/batches/b-1',
      '/batches/b-1/curriculum',
      '/batches/b-1/assessments',
      '/batches/b-1/projects',
      '/batches/b-1/external-assessments',
      '/batches/b-1/analytics'
    ]);
    expect(within(nav).getByRole('link', { name: 'Curriculum' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBeNull();
    expect(batchSectionHref('b-1', 'overview')).toBe('/batches/b-1');
  });
});

describe('Batch overview page', () => {
  beforeEach(() => {
    queries.getBatchById.mockResolvedValue(batch);
    queries.getCollegeById.mockResolvedValue({ id: 'c-1', name: 'JNTUH', code: 'JNT' });
    queries.getProgramById.mockResolvedValue({ id: 3, name: 'Full Stack', code: 'FS 1' });
    queries.getBatchRoster.mockResolvedValue([
      entry(1, 'active', 'Asha Test'),
      entry(2, 'pending', 'Ravi Test'),
      entry(3, 'cancelled', 'Old Test')
    ]);
  });

  async function renderPage(batchId = 'b-1') {
    render(await BatchOverviewPage({ params: Promise.resolve({ batchId }) }));
  }

  it('shows the batch context, the shared nav on Overview, and the roster', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'CSE Alpha' })).toBeTruthy();
    expect(screen.getByText('Full Stack (FS 1)')).toBeTruthy();
    expect(screen.getByText(/JNTUH \(JNT\)/)).toBeTruthy();
    expect(
      within(screen.getByRole('navigation', { name: 'Batch sections' }))
        .getByRole('link', { name: 'Overview' })
        .getAttribute('aria-current')
    ).toBe('page');
    expect(screen.getByRole('link', { name: 'All batches' }).getAttribute('href')).toBe('/batches');

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Asha Test')).toBeTruthy();
    expect(within(rows[1]).getByText('Pending')).toBeTruthy();
    expect(queries.getBatchRoster).toHaveBeenCalledWith('b-1');
  });

  it('labels each count by what it means for portal access', async () => {
    await renderPage();
    const stat = (label: string) => screen.getByText(label).closest('div')!;
    expect(within(stat('Students in batch')).getByText('3')).toBeTruthy();
    expect(within(stat('With portal access')).getByText('1')).toBeTruthy();
    expect(within(stat('Pending confirmation')).getByText('1')).toBeTruthy();
    expect(within(stat('Other statuses')).getByText('1')).toBeTruthy();
  });

  it('points pending students to the program-filtered Enrollments page (URL-encoded)', async () => {
    await renderPage();
    const link = screen.getByRole('link', { name: 'Review pending enrollments in FS 1' });
    expect(link.getAttribute('href')).toBe('/enrollments?program=FS%201&status=pending');
  });

  it('shows an empty state and no pending link for an empty batch', async () => {
    queries.getBatchRoster.mockResolvedValue([]);
    await renderPage();
    expect(screen.getByText('No students in this batch yet')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('link', { name: /Review pending/ })).toBeNull();
  });

  it('404s for an unknown batch without loading anything else', async () => {
    queries.getBatchById.mockResolvedValue(null);
    await expect(renderPage('missing')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(queries.getBatchRoster).not.toHaveBeenCalled();
  });
});

describe('Batches list', () => {
  it('links each batch name to its overview and offers one Open action', () => {
    render(
      <BatchesClient
        initialBatches={[
          {
            ...batch,
            collegeName: 'JNTUH',
            collegeCode: 'JNT',
            programName: 'Full Stack',
            programCode: 'FS-1',
            enrollmentCount: 2
          }
        ]}
        colleges={[]}
        programs={[]}
      />
    );
    expect(screen.getByRole('link', { name: 'CSE Alpha' }).getAttribute('href')).toBe('/batches/b-1');
    expect(screen.getByRole('link', { name: 'Open CSE Alpha' }).getAttribute('href')).toBe('/batches/b-1');
    expect(screen.queryByRole('link', { name: /Analytics|Curriculum/ })).toBeNull();
  });
});
