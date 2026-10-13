// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
const importActions = vi.hoisted(() => ({
  validateImportFileAction: vi.fn(),
  executeBulkImportAction: vi.fn(),
  getDownloadTemplateCsvAction: vi.fn(),
  getDownloadErrorReportCsvAction: vi.fn()
}));
const db = vi.hoisted(() => ({ getPrograms: vi.fn(), getActiveColleges: vi.fn(), getBatches: vi.fn() }));
const capturedClientProps = vi.hoisted(() => ({ value: null as unknown }));

vi.mock('server-only', () => ({}));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('../../app/(admin)/enrollments/import/actions', () => importActions);
vi.mock('@/lib/db', () => db);
vi.mock('../../app/(admin)/batches/[batchId]/students/actions', () => ({ addStudentToBatchAction: vi.fn() }));
vi.mock('@/lib/authz', () => ({ requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'a1' } }) }));

import { AddStudentsMenu, copyText } from '../../app/(admin)/batches/[batchId]/add-students-menu';
import { enrollmentLinkAvailability, enrollmentLinkPath } from '@/lib/enrollment/link-availability';
import { BulkImportClient } from '../../app/(admin)/enrollments/import/import-client';

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  for (const fn of Object.values(toast)) fn.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('enrollmentLinkAvailability (mirrors the public form, in order)', () => {
  const active = { status: 'active' as const, endDate: null, capacity: 0 };
  const now = new Date('2026-10-13T00:00:00Z');

  it('accepts an active, unexpired program with free seats', () => {
    expect(enrollmentLinkAvailability(active, 5, now)).toEqual({ accepting: true, reason: null });
    expect(enrollmentLinkAvailability({ ...active, capacity: 10 }, 9, now).accepting).toBe(true);
  });

  it('explains each refusal', () => {
    expect(enrollmentLinkAvailability({ ...active, status: 'archived' }, 0, now).reason).toMatch(/archived/);
    expect(enrollmentLinkAvailability({ ...active, status: 'draft' }, 0, now).reason).toMatch(/draft.*not currently open/);
    expect(
      enrollmentLinkAvailability({ ...active, endDate: new Date('2026-10-01T00:00:00Z') }, 0, now).reason
    ).toMatch(/end date has passed/);
    expect(enrollmentLinkAvailability({ ...active, capacity: 10 }, 10, now).reason).toMatch(/full \(10 of 10 seats\)/);
  });

  it('checks archived before capacity, like the form', () => {
    expect(enrollmentLinkAvailability({ status: 'archived', endDate: null, capacity: 1 }, 5, now).reason).toMatch(
      /archived/
    );
  });

  it('encodes the program code in the path', () => {
    expect(enrollmentLinkPath('PILOT PROGRAM')).toBe('/enroll/PILOT%20PROGRAM');
    expect(enrollmentLinkPath('FS-1')).toBe('/enroll/FS-1');
  });
});

function renderMenu(accepting = true) {
  const user = userEvent.setup();
  render(
    <AddStudentsMenu
      batchId="b-1"
      batchName="CSE Alpha"
      program={{ name: 'Full Stack', code: 'FS 1' }}
      collegeLabel="JNTUH (JNT)"
      linkAvailability={
        accepting ? { accepting: true, reason: null } : { accepting: false, reason: 'The program is draft, so the form says registration is not currently open.' }
      }
    />
  );
  return { user, trigger: screen.getByRole('button', { name: /Add students/ }) };
}

describe('AddStudentsMenu', () => {
  it('offers import into this batch and sharing the link', async () => {
    const { user, trigger } = renderMenu();
    await user.click(trigger);
    expect(await screen.findByRole('menuitem', { name: /Add a student/ })).toBeTruthy();
    const importItem = screen.getByRole('menuitem', { name: /Import from CSV or Excel/ });
    expect(importItem.getAttribute('href')).toBe('/enrollments/import?batch=b-1');
    expect(screen.getByRole('menuitem', { name: /Share enrollment link/ })).toBeTruthy();
  });

  it('Share opens the dialog with the full program link and an honest scope note', async () => {
    const { user, trigger } = renderMenu();
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: /Share enrollment link/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Share enrollment link' });

    expect((within(dialog).getByLabelText('Enrollment link') as HTMLInputElement).value).toBe(
      `${window.location.origin}/enroll/FS%201`
    );
    expect(within(dialog).getByText('This link is for the program, not this batch')).toBeTruthy();
    expect(dialog.textContent).toMatch(/Pending with no batch/);
    expect(within(dialog).queryByText('The form is not accepting registrations')).toBeNull();
    const open = within(dialog).getByRole('link', { name: /Open form/ });
    expect(open.getAttribute('href')).toBe('/enroll/FS%201');
    expect(open.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('warns when the public form would refuse registrations', async () => {
    const { user, trigger } = renderMenu(false);
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: /Share enrollment link/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('The form is not accepting registrations')).toBeTruthy();
    expect(within(dialog).getByText(/draft, so the form says registration is not currently open/)).toBeTruthy();
  });

  it('Copy uses the clipboard and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { user, trigger } = renderMenu();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: /Share enrollment link/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/enroll/FS%201`);
    expect(toast.success).toHaveBeenCalledWith('Enrollment link copied');
  });

  it('keyboard: open the menu, choose Share, Done returns focus to Add students', async () => {
    const { user, trigger } = renderMenu();
    trigger.focus();
    await user.keyboard('{Enter}');
    const share = await screen.findByRole('menuitem', { name: /Share enrollment link/ });
    share.focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('copyText', () => {
  it('falls back to selecting the input when the Clipboard API is missing or refuses', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const input = document.createElement('input');
    input.value = 'x';
    document.body.appendChild(input);
    const exec = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true });
    await expect(copyText('x', input)).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true
    });
    exec.mockReturnValue(false);
    await expect(copyText('x', input)).resolves.toBe(false);
    await expect(copyText('x', null)).resolves.toBe(false);
    input.remove();
  });
});

describe('Import page ?batch= pre-selection', () => {
  const programs = [{ id: 3, name: 'Full Stack', code: 'FS-1', collegeId: 'c-1', status: 'active', capacity: 0 }];
  const batches = [{ id: 'b-1', name: 'CSE Alpha', programId: 3, collegeId: 'c-1', status: 'active' }];

  beforeEach(() => {
    db.getPrograms.mockResolvedValue(programs);
    db.getActiveColleges.mockResolvedValue([{ id: 'c-1', name: 'JNTUH', code: 'JNT' }]);
    db.getBatches.mockResolvedValue(batches);
  });

  async function pageProps(search: Record<string, string>) {
    vi.resetModules();
    vi.doMock('../../app/(admin)/enrollments/import/import-client', () => ({
      BulkImportClient: (props: unknown) => {
        capturedClientProps.value = props;
        return null;
      }
    }));
    const { default: Page } = await import('../../app/(admin)/enrollments/import/page');
    render(await Page({ searchParams: Promise.resolve(search) }));
    vi.doUnmock('../../app/(admin)/enrollments/import/import-client');
    return capturedClientProps.value as { initialSelection: unknown };
  }

  it('resolves a known batch to its college, program and batch', async () => {
    expect((await pageProps({ batch: 'b-1' })).initialSelection).toEqual({
      collegeId: 'c-1',
      programId: 3,
      batchId: 'b-1',
      batchName: 'CSE Alpha'
    });
  });

  it('ignores an unknown batch and a missing parameter', async () => {
    expect((await pageProps({ batch: 'nope' })).initialSelection).toBeNull();
    expect((await pageProps({})).initialSelection).toBeNull();
  });

  it('the import form starts on the pre-selected program and batch, with a banner', () => {
    render(
      <BulkImportClient
        programs={programs as never}
        colleges={[{ id: 'c-1', name: 'JNTUH', code: 'JNT' }] as never}
        batches={batches as never}
        initialSelection={{ collegeId: 'c-1', programId: 3, batchId: 'b-1', batchName: 'CSE Alpha' }}
      />
    );
    expect(screen.getByRole('status').textContent).toMatch(/Importing into batch CSE Alpha/);
    const comboboxes = screen.getAllByRole('combobox').map((c) => c.textContent);
    expect(comboboxes.some((t) => t?.includes('Full Stack'))).toBe(true);
    expect(comboboxes.some((t) => t?.includes('CSE Alpha'))).toBe(true);
  });

  it('without a pre-selection there is no banner and nothing is chosen', () => {
    render(<BulkImportClient programs={programs as never} batches={batches as never} />);
    expect(screen.queryByText(/Importing into batch/)).toBeNull();
  });
});
