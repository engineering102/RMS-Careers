// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const programActions = vi.hoisted(() => ({
  createProgramAction: vi.fn(),
  updateProgramStatusAction: vi.fn(),
  updateProgramCollegeAction: vi.fn()
}));
const contentActions = vi.hoisted(() => ({
  createContentAction: vi.fn(),
  updateContentAction: vi.fn(),
  updateContentLifecycleAction: vi.fn()
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));

vi.mock('../../app/(admin)/programs/actions', () => programActions);
vi.mock('../../app/(admin)/content/actions', () => contentActions);
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));

import { ProgramsClient } from '../../app/(admin)/programs/programs-client';
import { ContentClient } from '../../app/(admin)/content/content-client';
import type { ContentItemWithDetails } from '@/lib/db/queries';

beforeAll(() => {
  // Radix Select relies on pointer capture and scrollIntoView, which jsdom lacks.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  for (const fn of [...Object.values(programActions), ...Object.values(contentActions), ...Object.values(toast)]) {
    fn.mockReset();
  }
});

afterEach(() => cleanup());

const dialog = () => screen.getByRole('alertdialog');

const colleges = [
  { id: 'col-a', name: 'Alpha College', code: 'ALP', isActive: true },
  { id: 'col-b', name: 'Beta College', code: 'BET', isActive: true }
];

const program = {
  id: 5,
  name: 'Full Stack',
  code: 'FS-1',
  description: null,
  status: 'active' as const,
  capacity: 0,
  collegeId: 'col-a',
  startDate: null,
  endDate: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  enrollmentCount: 2
};

async function choose(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, option: string) {
  await user.click(trigger);
  await user.click(await screen.findByRole('option', { name: option }));
}

function renderPrograms() {
  const user = userEvent.setup();
  render(<ProgramsClient initialPrograms={[program]} colleges={colleges as never} />);
  const [collegeSelect, statusSelect] = screen.getAllByRole('combobox');
  return { user, collegeSelect, statusSelect };
}

describe('Programs: archive and college change ask first', () => {
  it('choosing Archived opens a destructive confirmation and changes nothing yet', async () => {
    const { user, statusSelect } = renderPrograms();
    await choose(user, statusSelect, 'Archived');

    expect(within(dialog()).getByText('Archive Full Stack?')).toBeTruthy();
    expect(within(dialog()).getByText(/stops accepting registrations/)).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(programActions.updateProgramStatusAction).not.toHaveBeenCalled();
    expect(statusSelect.textContent).toContain('Active');
  });

  it('Cancel leaves the program Active', async () => {
    const { user, statusSelect } = renderPrograms();
    await choose(user, statusSelect, 'Archived');
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(programActions.updateProgramStatusAction).not.toHaveBeenCalled();
    expect(statusSelect.textContent).toContain('Active');
    expect(screen.getByText('ACTIVE')).toBeTruthy();
  });

  it('confirming archives once and shows the new status', async () => {
    programActions.updateProgramStatusAction.mockResolvedValue({ success: true });
    const { user, statusSelect } = renderPrograms();
    await choose(user, statusSelect, 'Archived');
    await user.click(within(dialog()).getByRole('button', { name: 'Archive program' }));

    expect(programActions.updateProgramStatusAction).toHaveBeenCalledTimes(1);
    expect(programActions.updateProgramStatusAction).toHaveBeenCalledWith(5, 'archived');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(statusSelect.textContent).toContain('Archived');
  });

  it('a failed archive keeps the dialog open and the old status', async () => {
    programActions.updateProgramStatusAction.mockResolvedValue({ success: false, error: 'Denied' });
    const { user, statusSelect } = renderPrograms();
    await choose(user, statusSelect, 'Archived');
    await user.click(within(dialog()).getByRole('button', { name: 'Archive program' }));

    expect(toast.error).toHaveBeenCalledWith('Denied');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(statusSelect.textContent).toContain('Active');
  });

  it('other status changes apply directly, without a dialog', async () => {
    programActions.updateProgramStatusAction.mockResolvedValue({ success: true });
    const { user, statusSelect } = renderPrograms();
    await choose(user, statusSelect, 'Draft');

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(programActions.updateProgramStatusAction).toHaveBeenCalledWith(5, 'draft');
    expect(statusSelect.textContent).toContain('Draft');
  });

  it('changing the college asks first, names both colleges, and Cancel keeps the old one', async () => {
    const { user, collegeSelect } = renderPrograms();
    await choose(user, collegeSelect, 'Beta College');

    expect(within(dialog()).getByText('Change the college of Full Stack?')).toBeTruthy();
    expect(within(dialog()).getByText(/from Alpha College to Beta College/)).toBeTruthy();
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(programActions.updateProgramCollegeAction).not.toHaveBeenCalled();
    expect(collegeSelect.textContent).toContain('Alpha College');
  });

  it('confirming the college change calls the existing action once', async () => {
    programActions.updateProgramCollegeAction.mockResolvedValue({ success: true });
    const { user, collegeSelect } = renderPrograms();
    await choose(user, collegeSelect, 'No college');
    await user.click(within(dialog()).getByRole('button', { name: 'Change college' }));

    expect(programActions.updateProgramCollegeAction).toHaveBeenCalledTimes(1);
    expect(programActions.updateProgramCollegeAction).toHaveBeenCalledWith(5, null);
    expect(collegeSelect.textContent).toContain('No college');
  });
});

function contentItem(lifecycleStatus: ContentItemWithDetails['lifecycleStatus']): ContentItemWithDetails {
  return {
    id: 'ci-1',
    title: 'Two Pointers',
    slug: 'two-pointers',
    contentType: 'notes',
    description: null,
    programId: null,
    programName: null,
    programCode: null,
    isPublished: lifecycleStatus === 'published',
    metadata: {},
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-02T00:00:00Z'),
    lifecycleStatus,
    batchUsageCount: 0
  };
}

describe('Content library: unpublish and archive ask first', () => {
  it('Unpublish asks (default variant) and only acts on confirm', async () => {
    contentActions.updateContentLifecycleAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ContentClient initialContentItems={[contentItem('published')]} programs={[]} />);

    await user.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(within(dialog()).getByText('Unpublish "Two Pointers"?')).toBeTruthy();
    expect(contentActions.updateContentLifecycleAction).not.toHaveBeenCalled();

    await user.click(within(dialog()).getByRole('button', { name: 'Unpublish' }));
    expect(contentActions.updateContentLifecycleAction).toHaveBeenCalledTimes(1);
    expect(contentActions.updateContentLifecycleAction).toHaveBeenCalledWith('ci-1', 'unpublish');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Archive is destructive (focus on Cancel) and Cancel does nothing', async () => {
    const user = userEvent.setup();
    render(<ContentClient initialContentItems={[contentItem('draft')]} programs={[]} />);

    await user.click(screen.getByRole('button', { name: 'Archive Two Pointers' }));
    expect(within(dialog()).getByText('Archive "Two Pointers"?')).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cancel' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(contentActions.updateContentLifecycleAction).not.toHaveBeenCalled();
  });

  it('Publish and Restore still apply directly', async () => {
    contentActions.updateContentLifecycleAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <ContentClient
        initialContentItems={[contentItem('draft'), { ...contentItem('archived'), id: 'ci-2', title: 'Old', slug: 'old' }]}
        programs={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(contentActions.updateContentLifecycleAction).toHaveBeenCalledWith('ci-1', 'publish');
    expect(contentActions.updateContentLifecycleAction).toHaveBeenCalledWith('ci-2', 'unarchive');
  });
});
