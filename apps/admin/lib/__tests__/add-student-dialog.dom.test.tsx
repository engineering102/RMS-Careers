// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const action = vi.hoisted(() => ({ addStudentToBatchAction: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const refresh = vi.hoisted(() => vi.fn());

vi.mock('../../app/(admin)/batches/[batchId]/students/actions', () => action);
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

import { AddStudentsMenu } from '../../app/(admin)/batches/[batchId]/add-students-menu';
import { successMessage } from '../../app/(admin)/batches/[batchId]/add-student-dialog';

beforeEach(() => {
  action.addStudentToBatchAction.mockReset();
  toast.success.mockReset();
  refresh.mockReset();
});

afterEach(() => cleanup());

async function openDialog() {
  const user = userEvent.setup();
  render(
    <AddStudentsMenu
      batchId="b-1"
      batchName="CSE Alpha"
      program={{ name: 'Full Stack', code: 'FS-1' }}
      collegeLabel="JNTUH (JNT)"
      linkAvailability={{ accepting: true, reason: null }}
    />
  );
  const trigger = screen.getByRole('button', { name: /Add students/ });
  await user.click(trigger);
  await user.click(await screen.findByRole('menuitem', { name: /Add a student/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Add a student' });
  return { user, trigger, dialog };
}

async function fill(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText('Full name'), 'Asha Test');
  await user.type(within(dialog).getByLabelText('Email'), 'asha@example.test');
  await user.type(within(dialog).getByLabelText('Phone'), '9876543210');
  await user.type(within(dialog).getByLabelText('College roll number'), 'R-1');
  await user.type(within(dialog).getByLabelText('Branch'), 'CSE');
  await user.selectOptions(within(dialog).getByLabelText('Academic year'), '3');
}

const ok = {
  success: true,
  data: {
    studentName: 'Asha Test',
    isNewStudent: true,
    enrollmentStatus: 'pending',
    emails: { requested: false, sent: 0, failed: 0 }
  }
};

describe('Add a student dialog', () => {
  it('names the target batch, program and college, with every field labelled', async () => {
    const { dialog } = await openDialog();
    expect(dialog.textContent).toMatch(/CSE Alpha · Full Stack \(FS-1\) · JNTUH \(JNT\)/);
    expect(dialog.textContent).toMatch(/starts as Pending/);
    for (const label of ['Full name', 'Email', 'Phone', 'College roll number', 'Branch', 'Academic year']) {
      expect(within(dialog).getByLabelText(label)).toBeTruthy();
    }
    expect((within(dialog).getByLabelText(/Send the activation/) as HTMLInputElement).checked).toBe(false);
  });

  it('submits the form values once, with emails off by default, then closes and refreshes', async () => {
    action.addStudentToBatchAction.mockResolvedValue(ok);
    const { user, dialog, trigger } = await openDialog();
    await fill(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));

    expect(action.addStudentToBatchAction).toHaveBeenCalledTimes(1);
    expect(action.addStudentToBatchAction).toHaveBeenCalledWith(
      'b-1',
      {
        fullName: 'Asha Test',
        email: 'asha@example.test',
        phone: '9876543210',
        collegeRollNumber: 'R-1',
        branch: 'CSE',
        year: '3'
      },
      { sendEmails: false }
    );
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Added Asha Test to CSE Alpha as Pending/));
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('passes the email opt-in through', async () => {
    action.addStudentToBatchAction.mockResolvedValue(ok);
    const { user, dialog } = await openDialog();
    await fill(user, dialog);
    await user.click(within(dialog).getByLabelText(/Send the activation/));
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
    expect(action.addStudentToBatchAction.mock.calls[0][2]).toEqual({ sendEmails: true });
  });

  it('shows server field errors on the fields (aria-invalid + described) and keeps the input', async () => {
    action.addStudentToBatchAction.mockResolvedValue({
      success: false,
      error: 'This student is already enrolled in this batch (pending, active or confirmed).',
      fieldErrors: { email: 'Already enrolled in this batch' }
    });
    const { user, dialog } = await openDialog();
    await fill(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));

    const email = within(dialog).getByLabelText('Email');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    const describedBy = email.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent).toBe('Already enrolled in this batch');
    expect(within(dialog).getByRole('alert').textContent).toMatch(/already enrolled in this batch/);
    expect((within(dialog).getByLabelText('Full name') as HTMLInputElement).value).toBe('Asha Test');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('locks while adding: no second submit, cannot be dismissed', async () => {
    let resolve!: (v: unknown) => void;
    action.addStudentToBatchAction.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user, dialog } = await openDialog();
    await fill(user, dialog);
    const submit = within(dialog).getByRole('button', { name: 'Add student' });
    await user.click(submit);
    expect(within(dialog).getByRole('button', { name: /Adding/ }).hasAttribute('disabled')).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: /Adding/ }));
    expect(action.addStudentToBatchAction).toHaveBeenCalledTimes(1);
    await act(async () => resolve(ok));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Cancel discards the input', async () => {
    const { user, dialog, trigger } = await openDialog();
    await user.type(within(dialog).getByLabelText('Full name'), 'Draft');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(action.addStudentToBatchAction).not.toHaveBeenCalled();

    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: /Add a student/ }));
    const reopened = await screen.findByRole('dialog');
    expect((within(reopened).getByLabelText('Full name') as HTMLInputElement).value).toBe('');
  });
});

describe('successMessage', () => {
  it('says Pending, flags a reused record, and reports emails when requested', () => {
    expect(successMessage('CSE Alpha', ok.data as never)).toBe(
      'Added Asha Test to CSE Alpha as Pending. Confirm the enrollment on Enrollments to give portal access.'
    );
    const reused = successMessage('CSE Alpha', {
      ...ok.data,
      isNewStudent: false,
      emails: { requested: true, sent: 1, failed: 1 }
    } as never);
    expect(reused).toMatch(/Existing student record reused; its profile was updated/);
    expect(reused).toMatch(/Emails: 1 sent, 1 not sent\./);
  });
});
