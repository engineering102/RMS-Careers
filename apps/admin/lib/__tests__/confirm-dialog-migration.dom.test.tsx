// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const curriculumActions = vi.hoisted(() => ({
  addContentToBatchAction: vi.fn(),
  updatePlacementAction: vi.fn(),
  removePlacementAction: vi.fn(),
  reorderCurriculumAction: vi.fn()
}));
const externalActions = vi.hoisted(() => ({
  previewExternalAssessmentCsvAction: vi.fn(),
  confirmExternalAssessmentImportAction: vi.fn(),
  deleteExternalAssessmentRecordAction: vi.fn()
}));
const collegeActions = vi.hoisted(() => ({
  createCollegeAction: vi.fn(),
  updateCollegeAction: vi.fn(),
  setCollegeActiveAction: vi.fn()
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));

vi.mock('../../app/(admin)/batches/[batchId]/curriculum/actions', () => curriculumActions);
vi.mock('../../app/(admin)/batches/[batchId]/external-assessments/actions', () => externalActions);
vi.mock('../../app/(admin)/colleges/actions', () => collegeActions);
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}));

import { BatchCurriculumClient } from '../../app/(admin)/batches/[batchId]/curriculum/curriculum-client';
import { BatchExternalAssessmentsClient } from '../../app/(admin)/batches/[batchId]/external-assessments/external-assessments-client';
import { CollegesClient } from '../../app/(admin)/colleges/colleges-client';

beforeEach(() => {
  for (const group of [curriculumActions, externalActions, collegeActions, toast]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
});

afterEach(() => cleanup());

const dialog = () => screen.getByRole('alertdialog');

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

describe('Curriculum: remove placement', () => {
  const placement = {
    id: 11,
    batchId: 'b-1',
    contentItemId: 'ci-1',
    title: 'Two Pointers',
    slug: 'two-pointers',
    contentType: 'notes' as const,
    description: null,
    contentProgramId: null,
    contentProgramName: null,
    contentProgramCode: null,
    isGlobal: true,
    isPublished: true,
    lifecycleStatus: 'published' as const,
    weekNumber: 2,
    sequenceOrder: 0,
    isRequired: true,
    availableFrom: null,
    dueAt: null,
    createdAt: new Date('2026-10-01T00:00:00Z')
  };

  function renderCurriculum() {
    render(
      <BatchCurriculumClient
        batch={batch as never}
        college={null}
        program={null}
        initialCurriculum={[placement]}
        eligibleContent={[]}
      />
    );
    return userEvent.setup();
  }

  it('asks in a destructive alertdialog that keeps the safety notes; Cancel removes nothing', async () => {
    const user = renderCurriculum();
    const trigger = screen.getByRole('button', { name: 'Remove Two Pointers from week 2' });
    await user.click(trigger);

    expect(within(dialog()).getByText('Remove Placement from Batch')).toBeTruthy();
    expect(dialog().textContent).toMatch(/remove Two Pointers from Week 2\?/);
    expect(within(dialog()).getByText(/canonical content item in the Content Library is preserved/)).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cancel' }));

    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(curriculumActions.removePlacementAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('confirming calls the existing action once with the same arguments; failure keeps it open', async () => {
    curriculumActions.removePlacementAction.mockResolvedValue({ success: false, error: 'Locked' });
    const user = renderCurriculum();
    await user.click(screen.getByRole('button', { name: 'Remove Two Pointers from week 2' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Remove Placement' }));

    expect(curriculumActions.removePlacementAction).toHaveBeenCalledTimes(1);
    expect(curriculumActions.removePlacementAction).toHaveBeenCalledWith('b-1', 11);
    expect(toast.error).toHaveBeenCalledWith('Locked');
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    curriculumActions.removePlacementAction.mockResolvedValue({ success: true });
    await user.click(within(dialog()).getByRole('button', { name: 'Remove Placement' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('cannot be dismissed while removing', async () => {
    let resolve!: (v: unknown) => void;
    curriculumActions.removePlacementAction.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = renderCurriculum();
    await user.click(screen.getByRole('button', { name: 'Remove Two Pointers from week 2' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Remove Placement' }));
    expect(within(dialog()).getByText('Removing…')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await act(async () => resolve({ success: true }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('External assessments: delete record', () => {
  const record = {
    id: 21,
    studentId: 7,
    studentName: 'Asha Test',
    studentEmail: 'asha@example.test',
    collegeRollNumber: 'R-1',
    batchId: 'b-1',
    assessmentCode: 'HR-1',
    assessmentName: 'HackerRank Round 1',
    provider: 'HackerRank',
    maxScore: 100,
    obtainedScore: 80,
    percentage: 80,
    percentile: 90,
    performanceTier: 'advanced' as const,
    importedByUserId: null,
    importedAt: new Date('2026-10-02T00:00:00Z')
  };

  function renderExternal() {
    render(
      <BatchExternalAssessmentsClient
        batch={batch as never}
        college={null}
        program={null}
        overview={{
          assessments: [],
          stats: {
            enrolledStudentsCount: 1,
            participatedStudentsCount: 1,
            participationRatePercent: 100,
            totalAssessmentsCount: 1,
            totalRecordsCount: 1,
            overallAveragePercentage: 80
          }
        }}
        initialRecords={[record] as never}
      />
    );
    return userEvent.setup();
  }

  it('asks first (destructive, same copy) and deletes exactly that record on confirm', async () => {
    externalActions.deleteExternalAssessmentRecordAction.mockResolvedValue({ success: true, message: 'Removed.' });
    const user = renderExternal();
    await user.click(screen.getByRole('button', { name: 'Delete HackerRank Round 1 result for Asha Test' }));

    expect(within(dialog()).getByText('Delete Assessment Record')).toBeTruthy();
    expect(dialog().textContent).toMatch(/scoped strictly to this batch and cannot be undone/);
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(externalActions.deleteExternalAssessmentRecordAction).not.toHaveBeenCalled();

    await user.click(within(dialog()).getByRole('button', { name: 'Delete Record' }));
    expect(externalActions.deleteExternalAssessmentRecordAction).toHaveBeenCalledTimes(1);
    expect(externalActions.deleteExternalAssessmentRecordAction).toHaveBeenCalledWith('b-1', 21);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText('Asha Test')).toBeNull();
  });

  it('Escape cancels without deleting', async () => {
    const user = renderExternal();
    await user.click(screen.getByRole('button', { name: 'Delete HackerRank Round 1 result for Asha Test' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(externalActions.deleteExternalAssessmentRecordAction).not.toHaveBeenCalled();
  });
});

describe('Colleges: activate / deactivate', () => {
  const colleges = [
    { id: 'c-1', name: 'JNTUH', code: 'JNT', city: null, state: null, isActive: true, createdAt: new Date() },
    { id: 'c-2', name: 'GNIT', code: 'GN', city: null, state: null, isActive: false, createdAt: new Date() }
  ];

  it('deactivation is destructive and states the portal-access consequence', async () => {
    collegeActions.setCollegeActiveAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<CollegesClient initialColleges={colleges} />);
    const row = screen.getByText('JNTUH').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Deactivate/ }));

    expect(within(dialog()).getByText('Deactivate JNTUH?')).toBeTruthy();
    expect(dialog().textContent).toMatch(/students lose Student Portal access until it is reactivated/);
    expect(dialog().textContent).toMatch(/No students, programs, batches or enrollments are deleted/);
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cancel' }));

    await user.click(within(dialog()).getByRole('button', { name: 'Deactivate' }));
    expect(collegeActions.setCollegeActiveAction).toHaveBeenCalledWith('c-1', false);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('activation uses the default variant; Cancel changes nothing', async () => {
    const user = userEvent.setup();
    render(<CollegesClient initialColleges={colleges} />);
    const row = screen.getByText('GNIT').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Activate/ }));

    expect(within(dialog()).getByText('Activate GNIT?')).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Activate' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(collegeActions.setCollegeActiveAction).not.toHaveBeenCalled();
  });

  it('a failed status change keeps the dialog open', async () => {
    collegeActions.setCollegeActiveAction.mockResolvedValue({ success: false, error: 'Nope' });
    const user = userEvent.setup();
    render(<CollegesClient initialColleges={colleges} />);
    await user.click(within(screen.getByText('JNTUH').closest('tr')!).getByRole('button', { name: /Deactivate/ }));
    await user.click(within(dialog()).getByRole('button', { name: 'Deactivate' }));
    expect(toast.error).toHaveBeenCalledWith('Nope');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });
});
