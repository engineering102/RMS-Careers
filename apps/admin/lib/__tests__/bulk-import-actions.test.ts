import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args)
}));

const mockGetPrograms = vi.fn();
const mockGetProgramEnrollmentCount = vi.fn();
const mockMarkEnrollmentConfirmationSent = vi.fn();
const mockGetExistingEnrollmentsByEmails = vi.fn();

vi.mock('@/lib/db', () => ({
  getPrograms: (...args: any[]) => mockGetPrograms(...args),
  getProgramEnrollmentCount: (...args: any[]) => mockGetProgramEnrollmentCount(...args),
  markEnrollmentConfirmationSent: (...args: any[]) => mockMarkEnrollmentConfirmationSent(...args),
  getExistingEnrollmentsByEmails: (...args: any[]) => mockGetExistingEnrollmentsByEmails(...args)
}));

const mockCreateEnrollmentWithStudentProvisioning = vi.fn();
vi.mock('@/lib/services/enrollment-orchestration', () => ({
  createEnrollmentWithStudentProvisioning: (...args: any[]) =>
    mockCreateEnrollmentWithStudentProvisioning(...args)
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendEnrollmentConfirmationEmail: (...args: any[]) => mockSendEmail(...args)
}));


import {
  validateImportFileAction,
  executeBulkImportAction,
  getDownloadTemplateCsvAction,
  getDownloadErrorReportCsvAction
} from '../../app/(admin)/enrollments/import/actions';
import type { ValidatedImportRow } from '../csv/validator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockFormData(programId?: string, filename = 'import.csv', content = ''): FormData {
  const formData = new FormData();
  if (programId !== undefined) {
    formData.append('programId', programId);
  }
  if (filename && content !== null) {
    const file = new File([content], filename, { type: 'text/csv' });
    formData.append('file', file);
  }
  return formData;
}

function makeValidCsv(): string {
  const headers = 'Full Name,Email,Phone Number,College Roll Number,Branch,Academic Year';
  const row1 = '"Pooja Patel","pooja@example.com","9876543210","21CS01","CSE","3rd Year"';
  const row2 = '"Arjun Nair","arjun@example.com","9123456789","21CS02","ECE","2nd Year"';
  return `${headers}\n${row1}\n${row2}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Bulk Import Server Actions', () => {
  const adminSession = {
    user: { id: 'admin_1', email: 'admin@rmscareers.com', role: 'super_admin' }
  };

  const sampleProgram = {
    id: 1,
    name: 'Full Stack Development',
    code: 'FSD-2026',
    status: 'active',
    capacity: 50,
    startDate: new Date('2026-11-01'),
    endDate: new Date('2027-04-30')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
    mockGetPrograms.mockResolvedValue([sampleProgram]);
    mockGetProgramEnrollmentCount.mockResolvedValue(10);
    mockGetExistingEnrollmentsByEmails.mockResolvedValue(new Set<string>());
    mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
      success: true,
      isNewStudent: true,
      student: { id: 10 },
      enrollment: { id: 100 },
      userId: 'student-user',
      activation: null
    });
  });

  // -------------------------------------------------------------------------
  // 1. validateImportFileAction
  // -------------------------------------------------------------------------
  describe('validateImportFileAction', () => {
    it('blocks unauthorized access when no session is present', async () => {
      mockAuth.mockResolvedValue(null);

      const formData = createMockFormData('1', 'test.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Unauthorized/i);
      }
    });

    it('returns error when programId is missing from form', async () => {
      const formData = createMockFormData(undefined, 'test.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Please select a program/i);
      }
    });

    it('returns error when programId is not a valid number', async () => {
      const formData = createMockFormData('abc', 'test.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Invalid program/i);
      }
    });

    it('returns error when file is missing or empty', async () => {
      const formData = createMockFormData('1', 'empty.csv', '');
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/upload a valid CSV or Excel/i);
      }
    });

    it('returns error when program does not exist', async () => {
      mockGetPrograms.mockResolvedValue([]);

      const formData = createMockFormData('999', 'test.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Selected program not found/i);
      }
    });

    it('returns error when program is archived', async () => {
      mockGetPrograms.mockResolvedValue([{ ...sampleProgram, status: 'archived' }]);

      const formData = createMockFormData('1', 'test.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/archived/i);
      }
    });

    it('validates a valid CSV file and returns preview data with accurate counts', async () => {
      const formData = createMockFormData('1', 'students.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.preview.totalRows).toBe(2);
        expect(result.preview.validCount).toBe(2);
        expect(result.preview.invalidCount).toBe(0);
        expect(result.preview.duplicateInFileCount).toBe(0);
        expect(result.preview.alreadyEnrolledCount).toBe(0);
        expect(result.preview.isExceedingCapacity).toBe(false);
        expect(result.preview.rows).toHaveLength(2);
      }
    });

    it('identifies already enrolled students from database check and updates preview status', async () => {
      mockGetExistingEnrollmentsByEmails.mockResolvedValue(new Set(['pooja@example.com']));

      const formData = createMockFormData('1', 'students.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.preview.alreadyEnrolledCount).toBe(1);
        expect(result.preview.validCount).toBe(1);
        const poojaRow = result.preview.rows.find((r) => r.email === 'pooja@example.com');
        expect(poojaRow?.status).toBe('already_enrolled');
        expect(poojaRow?.issue).toMatch(/already enrolled/i);
      }
    });

    it('flags isExceedingCapacity when new valid count exceeds remaining capacity', async () => {
      // Program capacity = 11, enrolledCount = 10, remaining = 1. We have 2 valid rows in CSV.
      mockGetPrograms.mockResolvedValue([{ ...sampleProgram, capacity: 11 }]);
      mockGetProgramEnrollmentCount.mockResolvedValue(10);

      const formData = createMockFormData('1', 'students.csv', makeValidCsv());
      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.preview.isExceedingCapacity).toBe(true);
      }
    });

    it('returns error when uploaded CSV is missing required columns', async () => {
      const incompleteCsv = 'Full Name,Email\n"Rahul","rahul@example.com"';
      const formData = createMockFormData('1', 'incomplete.csv', incompleteCsv);

      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.missingColumns).toBeDefined();
        expect(result.missingColumns?.length).toBeGreaterThan(0);
      }
    });

    it('returns error when CSV has header only and no data rows', async () => {
      const headerOnly = 'Full Name,Email,Phone Number,College Roll Number,Branch,Academic Year\n';
      const formData = createMockFormData('1', 'header_only.csv', headerOnly);

      const result = await validateImportFileAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/contains no data rows/i);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. executeBulkImportAction
  // -------------------------------------------------------------------------
  describe('executeBulkImportAction', () => {
    const validRow: ValidatedImportRow = {
      rowIndex: 2,
      fullName: 'Vikram Joshi',
      email: 'vikram.j@example.com',
      phone: '9876543210',
      collegeRollNumber: '21CS99',
      branch: 'CSE',
      year: 3,
      yearFormatted: '3rd Year',
      status: 'valid'
    };

    const invalidRow: ValidatedImportRow = {
      ...validRow,
      rowIndex: 3,
      email: 'invalid-email',
      status: 'invalid',
      issue: 'Invalid email'
    };

    it('blocks unauthorized access', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await executeBulkImportAction({
        programId: 1,
        rows: [validRow],
        sendEmails: false
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Unauthorized/i);
      }
    });

    it('fails when program is not found', async () => {
      mockGetPrograms.mockResolvedValue([]);

      const result = await executeBulkImportAction({
        programId: 999,
        rows: [validRow],
        sendEmails: false
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Program not found/i);
      }
    });

    it('fails when there are no valid rows to import', async () => {
      const result = await executeBulkImportAction({
        programId: 1,
        rows: [invalidRow],
        sendEmails: false
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/No valid rows available/i);
      }
    });

    it('fails when import count exceeds remaining program capacity', async () => {
      mockGetPrograms.mockResolvedValue([{ ...sampleProgram, capacity: 10 }]);
      mockGetProgramEnrollmentCount.mockResolvedValue(10); // 0 seats remaining

      const result = await executeBulkImportAction({
        programId: 1,
        rows: [validRow],
        sendEmails: false
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/exceeds available capacity/i);
      }
    });

    it('successfully imports new student and creates enrollment record', async () => {
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: true,
        isNewStudent: true,
        student: { id: 10, ...validRow },
        enrollment: { id: 100, studentId: 10, programId: 1 },
        userId: 'student-user',
        activation: null
      });

      const result = await executeBulkImportAction({
        programId: 1,
        rows: [validRow],
        sendEmails: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.totalRows).toBe(1);
        expect(result.summary.newStudentsCount).toBe(1);
        expect(result.summary.reusedStudentsCount).toBe(0);
        expect(result.summary.newEnrollmentsCount).toBe(1);
        expect(result.summary.alreadyEnrolledCount).toBe(0);
        expect(result.summary.emailsSentCount).toBe(0);
      }

      expect(mockCreateEnrollmentWithStudentProvisioning).toHaveBeenCalledWith({
        programId: 1,
        student: {
          fullName: 'Vikram Joshi',
          email: 'vikram.j@example.com',
          phone: '9876543210',
          collegeRollNumber: '21CS99',
          branch: 'CSE',
          year: 3
        }
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/enrollments');
    });

    it('reuses existing student record when student is already in database', async () => {
      const existingStudent = { id: 25, fullName: 'Vikram Joshi', email: 'vikram.j@example.com' };
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: true,
        isNewStudent: false,
        student: existingStudent,
        enrollment: { id: 101, studentId: 25, programId: 1 },
        userId: 'student-user',
        activation: null
      });

      const result = await executeBulkImportAction({
        programId: 1,
        rows: [validRow],
        sendEmails: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.newStudentsCount).toBe(0);
        expect(result.summary.reusedStudentsCount).toBe(1);
        expect(result.summary.newEnrollmentsCount).toBe(1);
      }
    });

    it('safely skips enrollment creation if student is already enrolled in this program', async () => {
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: false,
        error: 'already_enrolled'
      });

      const result = await executeBulkImportAction({
        programId: 1,
        rows: [validRow],
        sendEmails: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.alreadyEnrolledCount).toBe(1);
        expect(result.summary.newEnrollmentsCount).toBe(0);
      }
    });

    it('dispatches emails when sendEmails is true and tallies successes and failures', async () => {
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: true,
        isNewStudent: true,
        student: { id: 10, ...validRow },
        enrollment: { id: 100, studentId: 10, programId: 1 },
        userId: 'student-user',
        activation: null
      });

      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg_bulk_01' });
      mockMarkEnrollmentConfirmationSent.mockResolvedValue(true);

      const result = await executeBulkImportAction({
        programId: 1,
        rows: [validRow],
        sendEmails: true
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.emailsSentCount).toBe(1);
        expect(result.summary.emailFailuresCount).toBe(0);
      }
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockMarkEnrollmentConfirmationSent).toHaveBeenCalledWith(100);
    });

    it('gracefully counts email failure when email sending throws an exception', async () => {
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: true,
        isNewStudent: true,
        student: { id: 10, ...validRow },
        enrollment: { id: 100, studentId: 10, programId: 1 },
        userId: 'student-user',
        activation: null
      });

      mockSendEmail.mockRejectedValue(new Error('SMTP service unavailable'));

      const result = await executeBulkImportAction({
        programId: 1,
        rows: [validRow],
        sendEmails: true
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.newEnrollmentsCount).toBe(1);
        expect(result.summary.emailsSentCount).toBe(0);
        expect(result.summary.emailFailuresCount).toBe(1);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. Template and Error Report CSV generators
  // -------------------------------------------------------------------------
  describe('CSV download helper actions', () => {
    it('returns CSV template string with all standard headers', async () => {
      const template = await getDownloadTemplateCsvAction();

      expect(template).toContain('Full Name,Email,Phone Number,College Roll Number,Branch,Academic Year');
    });

    it('generates error report CSV with status and issue reason columns', async () => {
      const testRow: ValidatedImportRow = {
        rowIndex: 2,
        fullName: 'Test Student',
        email: 'bad-email',
        phone: '123',
        collegeRollNumber: 'R1',
        branch: 'CSE',
        year: 0,
        yearFormatted: 'Unknown',
        status: 'invalid',
        issue: 'Invalid email address format'
      };

      const report = await getDownloadErrorReportCsvAction([testRow]);

      expect(report).toContain('Issue / Reason');
      expect(report).toContain('Invalid email address format');
      expect(report).toContain('Test Student');
    });
  });
});
