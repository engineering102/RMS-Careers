import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const authz = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
const queries = vi.hoisted(() => ({
  getBatchById: vi.fn(),
  getProgramById: vi.fn(),
  getProgramEnrollmentCount: vi.fn(),
  markEnrollmentConfirmationSent: vi.fn()
}));
const service = vi.hoisted(() => ({ createEnrollmentWithStudentProvisioning: vi.fn() }));
const emailService = vi.hoisted(() => ({ sendNewEnrollmentEmails: vi.fn() }));
const email = vi.hoisted(() => ({ sendStudentActivationEmail: vi.fn(), sendEnrollmentConfirmationEmail: vi.fn() }));
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock('@/lib/authz', () => authz);
vi.mock('@/lib/db/queries', () => queries);
vi.mock('../db/queries/enrollments', () => ({ markEnrollmentConfirmationSent: queries.markEnrollmentConfirmationSent }));
vi.mock('@/lib/services/enrollment-orchestration', () => service);
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('../email', () => email);
vi.mock('../email/student-portal-url', () => ({ getStudentPortalUrl: () => 'https://student.example.test' }));

import { validateImportRows } from '../csv/validator';
import { fieldErrorsFromIssue } from '../enrollment/student-form';
import { sendNewEnrollmentEmails } from '../services/enrollment-emails';

const batch = {
  id: 'b-1',
  programId: 3,
  collegeId: 'c-1',
  name: 'CSE Alpha',
  status: 'active',
  startDate: new Date('2026-10-01T00:00:00Z'),
  endDate: null
};
const program = {
  id: 3,
  name: 'Full Stack',
  code: 'FS-1',
  status: 'active',
  capacity: 0,
  collegeId: 'c-9',
  startDate: null,
  endDate: new Date('2027-03-31T00:00:00Z')
};
const valid = {
  fullName: '  Asha Test ',
  email: ' Asha@Example.Test ',
  phone: '9876543210',
  collegeRollNumber: 'R-1',
  branch: 'CSE',
  year: '3'
};
const success = {
  success: true,
  isNewStudent: true,
  student: { id: 7, fullName: 'Asha Test', email: 'asha@example.test' },
  enrollment: { id: 41 },
  userId: 'u-1',
  activation: { rawToken: 'raw', expiresAt: new Date('2026-10-20T00:00:00Z') }
};

async function loadAction() {
  vi.doMock('@/lib/services/enrollment-emails', () => emailService);
  const mod = await import('../../app/(admin)/batches/[batchId]/students/actions');
  return mod.addStudentToBatchAction;
}

describe('addStudentToBatchAction', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const group of [authz, queries, service, emailService, email]) {
      for (const fn of Object.values(group)) fn.mockReset();
    }
    revalidatePath.mockReset();
    authz.requireAdmin.mockResolvedValue({ ok: true, userId: 'a-1', role: 'admin' });
    queries.getBatchById.mockResolvedValue(batch);
    queries.getProgramById.mockResolvedValue(program);
    queries.getProgramEnrollmentCount.mockResolvedValue(0);
    service.createEnrollmentWithStudentProvisioning.mockResolvedValue(success);
    emailService.sendNewEnrollmentEmails.mockResolvedValue({ sent: 2, failed: 0 });
  });

  it('refuses non-admins before touching anything', async () => {
    authz.requireAdmin.mockResolvedValue({ ok: false, error: 'Forbidden.' });
    const act = await loadAction();
    expect(await act('b-1', valid)).toEqual({ success: false, error: 'Forbidden.' });
    expect(queries.getBatchById).not.toHaveBeenCalled();
    expect(service.createEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
  });

  it('rejects malformed input and unknown batches', async () => {
    const act = await loadAction();
    expect((await act('b-1', { fullName: 1 })).success).toBe(false);
    expect((await act('', valid)).success).toBe(false);
    queries.getBatchById.mockResolvedValue(null);
    expect(await act('nope', valid)).toEqual({ success: false, error: 'Batch not found.' });
    expect(service.createEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
  });

  it('refuses archived programs and full programs, like the bulk import', async () => {
    const act = await loadAction();
    queries.getProgramById.mockResolvedValue({ ...program, status: 'archived' });
    expect((await act('b-1', valid)).success).toBe(false);

    queries.getProgramById.mockResolvedValue({ ...program, capacity: 10 });
    queries.getProgramEnrollmentCount.mockResolvedValue(10);
    const full = await act('b-1', valid);
    expect(full).toEqual({ success: false, error: 'This program is full: all 10 seats are taken.' });
    expect(service.createEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
  });

  it('validates with the import rules and returns per-field errors', async () => {
    const act = await loadAction();
    const res = await act('b-1', { ...valid, email: 'not-an-email', phone: '123', year: '7' });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe('Please fix the highlighted fields.');
    expect(Object.keys(res.fieldErrors ?? {}).sort()).toEqual(['email', 'phone', 'year']);
    expect(service.createEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
  });

  it('enrols through the shared service with the program taken from the batch (client cannot choose it)', async () => {
    const act = await loadAction();
    const res = await act('b-1', { ...valid, programId: 999 } as never);
    expect(res.success).toBe(true);
    expect(service.createEnrollmentWithStudentProvisioning).toHaveBeenCalledTimes(1);
    expect(service.createEnrollmentWithStudentProvisioning).toHaveBeenCalledWith({
      programId: 3,
      batchId: 'b-1',
      student: {
        fullName: 'Asha Test',
        email: 'asha@example.test',
        phone: '9876543210',
        collegeRollNumber: 'R-1',
        branch: 'CSE',
        year: 3,
        collegeId: 'c-1'
      }
    });
    // Admin mode (the default): no `mode` override.
    expect(service.createEnrollmentWithStudentProvisioning.mock.calls[0][0]).not.toHaveProperty('mode');
  });

  it('sends no email unless asked, and reports pending + new/existing', async () => {
    const act = await loadAction();
    const res = await act('b-1', valid);
    expect(emailService.sendNewEnrollmentEmails).not.toHaveBeenCalled();
    expect(res).toEqual({
      success: true,
      data: {
        studentName: 'Asha Test',
        isNewStudent: true,
        enrollmentStatus: 'pending',
        emails: { requested: false, sent: 0, failed: 0 }
      }
    });
    expect(revalidatePath).toHaveBeenCalledWith('/batches/b-1');
    expect(revalidatePath).toHaveBeenCalledWith('/enrollments');
  });

  it('sends emails after the enrollment when asked', async () => {
    const act = await loadAction();
    const res = await act('b-1', valid, { sendEmails: true });
    expect(emailService.sendNewEnrollmentEmails).toHaveBeenCalledWith(success, { program, batch });
    expect(res.success && res.data.emails).toEqual({ requested: true, sent: 2, failed: 0 });
  });

  it('maps service refusals to admin-facing messages', async () => {
    const act = await loadAction();
    const cases: [string, RegExp][] = [
      ['already_enrolled', /already enrolled in this batch/],
      ['privileged_identity', /staff account/],
      ['identity_conflict', /conflicts with another account/],
      ['database_error', /could not be added/]
    ];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const [code, message] of cases) {
      service.createEnrollmentWithStudentProvisioning.mockResolvedValue({ success: false, error: code });
      const res = await act('b-1', valid);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toMatch(message);
    }
    spy.mockRestore();
    expect(emailService.sendNewEnrollmentEmails).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('fieldErrorsFromIssue', () => {
  it('maps every bulk-import validator message to its field', () => {
    const [row] = validateImportRows([
      { rowIndex: 1, fullName: '', email: '', phone: '', collegeRollNumber: '', branch: '', academicYear: 'x' }
    ]);
    const { fieldErrors, unmatched } = fieldErrorsFromIssue(row.issue);
    expect(Object.keys(fieldErrors).sort()).toEqual(
      ['branch', 'collegeRollNumber', 'email', 'fullName', 'phone', 'year'].sort()
    );
    expect(unmatched).toEqual([]);

    const [formatRow] = validateImportRows([
      { rowIndex: 1, fullName: 'Ok Name', email: 'bad', phone: '12', collegeRollNumber: 'R', branch: 'B', academicYear: '2' }
    ]);
    const formats = fieldErrorsFromIssue(formatRow.issue).fieldErrors;
    expect(formats.email).toMatch(/email/i);
    expect(formats.phone).toMatch(/phone/i);
  });

  it('keeps messages it cannot place', () => {
    expect(fieldErrorsFromIssue('Something else; Branch is required')).toEqual({
      fieldErrors: { branch: 'Branch is required' },
      unmatched: ['Something else']
    });
    expect(fieldErrorsFromIssue(undefined)).toEqual({ fieldErrors: {}, unmatched: [] });
  });
});

describe('sendNewEnrollmentEmails', () => {
  const ctx = { program, batch };

  beforeEach(() => {
    for (const fn of [...Object.values(email), queries.markEnrollmentConfirmationSent]) fn.mockReset();
    email.sendStudentActivationEmail.mockResolvedValue({ success: true });
    email.sendEnrollmentConfirmationEmail.mockResolvedValue({ success: true });
  });

  it('new student: activation invitation, then confirmation (batch dates first), then stamps it', async () => {
    const out = await sendNewEnrollmentEmails(success as never, ctx as never);
    expect(out).toEqual({ sent: 2, failed: 0 });
    expect(email.sendStudentActivationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ activationUrl: 'https://student.example.test/activate?token=raw' })
    );
    expect(email.sendEnrollmentConfirmationEmail).toHaveBeenCalledWith({
      studentName: 'Asha Test',
      studentEmail: 'asha@example.test',
      programName: 'Full Stack (CSE Alpha)',
      programCode: 'FS-1',
      startDate: batch.startDate,
      endDate: program.endDate,
      status: 'pending'
    });
    expect(queries.markEnrollmentConfirmationSent).toHaveBeenCalledWith(41);
  });

  it('existing student: confirmation only; a failed send is counted and not stamped', async () => {
    email.sendEnrollmentConfirmationEmail.mockResolvedValue({ success: false, reason: 'provider_not_configured' });
    const out = await sendNewEnrollmentEmails({ ...success, isNewStudent: false, activation: null } as never, ctx as never);
    expect(email.sendStudentActivationEmail).not.toHaveBeenCalled();
    expect(out).toEqual({ sent: 0, failed: 1 });
    expect(queries.markEnrollmentConfirmationSent).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    email.sendStudentActivationEmail.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(sendNewEnrollmentEmails(success as never, ctx as never)).resolves.toEqual({ sent: 0, failed: 1 });
    spy.mockRestore();
  });
});
