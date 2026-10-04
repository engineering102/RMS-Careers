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

const mockUpdateEnrollmentStatus = vi.fn();
const mockUpdateBulkEnrollmentStatus = vi.fn();
const mockGetEnrollmentsWithDetails = vi.fn();
const mockGetEnrollmentById = vi.fn();
const mockMarkEnrollmentConfirmationSent = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  updateEnrollmentStatus: (...args: any[]) => mockUpdateEnrollmentStatus(...args),
  updateBulkEnrollmentStatus: (...args: any[]) => mockUpdateBulkEnrollmentStatus(...args),
  getEnrollmentsWithDetails: (...args: any[]) => mockGetEnrollmentsWithDetails(...args),
  getEnrollmentById: (...args: any[]) => mockGetEnrollmentById(...args),
  markEnrollmentConfirmationSent: (...args: any[]) => mockMarkEnrollmentConfirmationSent(...args)
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendEnrollmentConfirmationEmail: (...args: any[]) => mockSendEmail(...args)
}));

import {
  updateEnrollmentStatusAction,
  bulkUpdateEnrollmentStatusAction,
  resendEnrollmentEmailAction,
  bulkResendEnrollmentEmailsAction,
  exportEnrollmentsCsvAction
} from '../../app/(admin)/enrollments/actions';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Admin Enrollment Server Actions', () => {
  const adminUser = {
    user: {
      id: 'usr_admin_001',
      name: 'System Admin',
      email: 'admin@rmscareers.com',
      role: 'super_admin'
    }
  };

  const sampleEnrollment = {
    id: 10,
    studentId: 20,
    programId: 1,
    status: 'pending',
    createdAt: new Date('2026-10-01T12:00:00Z'),
    confirmationSentAt: null,
    student: {
      id: 20,
      fullName: 'Rahul Verma',
      email: 'rahul.v@example.com',
      phone: '9876543210',
      collegeRollNumber: '21CS099',
      branch: 'Computer Science',
      year: 3
    },
    program: {
      id: 1,
      name: 'Full Stack Web Development',
      code: 'FSWD-2026'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminUser);
  });

  // -------------------------------------------------------------------------
  // 1. updateEnrollmentStatusAction
  // -------------------------------------------------------------------------
  describe('updateEnrollmentStatusAction', () => {
    it('blocks unauthorized requests when user session is missing', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await updateEnrollmentStatusAction(10, 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unauthorized/i);
      expect(mockUpdateEnrollmentStatus).not.toHaveBeenCalled();
    });

    it('successfully updates enrollment status and triggers revalidation', async () => {
      mockUpdateEnrollmentStatus.mockResolvedValue(true);

      const result = await updateEnrollmentStatusAction(10, 'confirmed');

      expect(result.success).toBe(true);
      expect(mockUpdateEnrollmentStatus).toHaveBeenCalledWith(10, 'confirmed');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/enrollments');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/programs');
    });

    it('returns failure when database update returns false', async () => {
      mockUpdateEnrollmentStatus.mockResolvedValue(false);

      const result = await updateEnrollmentStatusAction(999, 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Failed to update enrollment status/i);
    });

    it('catches database error safely without throwing', async () => {
      mockUpdateEnrollmentStatus.mockRejectedValue(new Error('DB disconnect'));

      const result = await updateEnrollmentStatusAction(10, 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unexpected error/i);
    });
  });

  // -------------------------------------------------------------------------
  // 2. bulkUpdateEnrollmentStatusAction
  // -------------------------------------------------------------------------
  describe('bulkUpdateEnrollmentStatusAction', () => {
    it('blocks unauthorized requests', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await bulkUpdateEnrollmentStatusAction([1, 2], 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unauthorized/i);
    });

    it('rejects empty IDs array', async () => {
      const result = await bulkUpdateEnrollmentStatusAction([], 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No enrollments selected/i);
      expect(mockUpdateBulkEnrollmentStatus).not.toHaveBeenCalled();
    });

    it('updates multiple enrollment records and returns affected count', async () => {
      mockUpdateBulkEnrollmentStatus.mockResolvedValue(3);

      const result = await bulkUpdateEnrollmentStatusAction([10, 11, 12], 'waitlisted');

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(mockUpdateBulkEnrollmentStatus).toHaveBeenCalledWith([10, 11, 12], 'waitlisted');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/enrollments');
    });
  });

  // -------------------------------------------------------------------------
  // 3. resendEnrollmentEmailAction
  // -------------------------------------------------------------------------
  describe('resendEnrollmentEmailAction', () => {
    it('blocks unauthorized requests', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await resendEnrollmentEmailAction(10);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unauthorized/i);
    });

    it('returns error when enrollment record does not exist', async () => {
      mockGetEnrollmentById.mockResolvedValue(null);

      const result = await resendEnrollmentEmailAction(999);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('resends email and marks confirmation sent in database', async () => {
      mockGetEnrollmentById.mockResolvedValue(sampleEnrollment);
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'resend_msg_001' });
      mockMarkEnrollmentConfirmationSent.mockResolvedValue(true);

      const result = await resendEnrollmentEmailAction(10);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend_msg_001');
      expect(mockSendEmail).toHaveBeenCalledWith({
        studentName: 'Rahul Verma',
        studentEmail: 'rahul.v@example.com',
        programName: 'Full Stack Web Development',
        programCode: 'FSWD-2026',
        status: 'pending'
      });
      expect(mockMarkEnrollmentConfirmationSent).toHaveBeenCalledWith(10);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/enrollments');
    });

    it('returns error when email delivery fails', async () => {
      mockGetEnrollmentById.mockResolvedValue(sampleEnrollment);
      mockSendEmail.mockResolvedValue({ success: false, error: 'Rate limit exceeded' });

      const result = await resendEnrollmentEmailAction(10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
      expect(mockMarkEnrollmentConfirmationSent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. bulkResendEnrollmentEmailsAction
  // -------------------------------------------------------------------------
  describe('bulkResendEnrollmentEmailsAction', () => {
    it('blocks unauthorized requests', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await bulkResendEnrollmentEmailsAction([10]);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unauthorized/i);
    });

    it('rejects empty IDs array', async () => {
      const result = await bulkResendEnrollmentEmailsAction([]);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No enrollments selected/i);
    });

    it('iterates through selected enrollments and tracks sent vs failed counts', async () => {
      const secondEnrollment = {
        ...sampleEnrollment,
        id: 11,
        student: { ...sampleEnrollment.student, email: 'failed@example.com' }
      };

      mockGetEnrollmentsWithDetails.mockResolvedValue([sampleEnrollment, secondEnrollment]);
      mockSendEmail
        .mockResolvedValueOnce({ success: true, messageId: 'msg_1' })
        .mockResolvedValueOnce({ success: false, error: 'Bounced' });

      const result = await bulkResendEnrollmentEmailsAction([10, 11]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.total).toBe(2);
        expect(result.sentCount).toBe(1);
        expect(result.failedCount).toBe(1);
      }
      expect(mockMarkEnrollmentConfirmationSent).toHaveBeenCalledTimes(1);
      expect(mockMarkEnrollmentConfirmationSent).toHaveBeenCalledWith(10);
    });
  });

  // -------------------------------------------------------------------------
  // 5. exportEnrollmentsCsvAction
  // -------------------------------------------------------------------------
  describe('exportEnrollmentsCsvAction', () => {
    it('blocks unauthorized requests', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await exportEnrollmentsCsvAction({});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unauthorized/i);
    });

    it('returns error when no enrollment records match', async () => {
      mockGetEnrollmentsWithDetails.mockResolvedValue([]);

      const result = await exportEnrollmentsCsvAction({});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No enrollment records match/i);
    });

    it('generates valid CSV export with escaped fields and headers', async () => {
      mockGetEnrollmentsWithDetails.mockResolvedValue([sampleEnrollment]);

      const result = await exportEnrollmentsCsvAction({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.filename).toMatch(/^enrollments_export_\d{4}-\d{2}-\d{2}\.csv$/);
        expect(result.csvData).toContain('Student Name,Email,Phone,College Roll Number');
        expect(result.csvData).toContain('"Rahul Verma"');
        expect(result.csvData).toContain('"rahul.v@example.com"');
        expect(result.csvData).toContain('"FSWD-2026"');
        expect(result.csvData).toContain('"3rd Year"');
      }
    });

    it('filters by selectedIds when provided', async () => {
      const secondEnrollment = {
        ...sampleEnrollment,
        id: 99,
        student: { ...sampleEnrollment.student, fullName: 'Ignored Student' }
      };
      mockGetEnrollmentsWithDetails.mockResolvedValue([sampleEnrollment, secondEnrollment]);

      const result = await exportEnrollmentsCsvAction({}, [10]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.csvData).toContain('Rahul Verma');
        expect(result.csvData).not.toContain('Ignored Student');
      }
    });
  });
});
