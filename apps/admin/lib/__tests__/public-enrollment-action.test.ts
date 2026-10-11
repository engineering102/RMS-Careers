import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}));

// Requests arrive through Cloudflare, which sets cf-connecting-ip (the only trusted client identity).
let clientIp = '203.0.113.7';
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'cf-connecting-ip': clientIp, 'x-forwarded-for': '1.1.1.1' })
}));

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args)
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendEnrollmentConfirmationEmail: (...args: any[]) => mockSendEmail(...args)
}));

const mockGetProgramByCode = vi.fn();
const mockGetProgramEnrollmentCount = vi.fn();
const mockMarkEnrollmentConfirmationSent = vi.fn();

vi.mock('@/lib/db', () => ({
  getProgramByCode: (...args: any[]) => mockGetProgramByCode(...args),
  getProgramEnrollmentCount: (...args: any[]) => mockGetProgramEnrollmentCount(...args),
  markEnrollmentConfirmationSent: (...args: any[]) => mockMarkEnrollmentConfirmationSent(...args)
}));

const mockCreateEnrollmentWithStudentProvisioning = vi.fn();
vi.mock('@/lib/services/enrollment-orchestration', () => ({
  createEnrollmentWithStudentProvisioning: (...args: any[]) =>
    mockCreateEnrollmentWithStudentProvisioning(...args)
}));


import { submitStudentEnrollment } from '../../app/(public)/enroll/[programCode]/actions';

// ---------------------------------------------------------------------------
// Test Data & Setup
// ---------------------------------------------------------------------------

describe('Public Enrollment Server Action — submitStudentEnrollment', () => {
  const validSubmission = {
    programCode: 'FSWD-2026',
    fullName: 'Rohan Gupta',
    email: 'rohan.gupta@example.com',
    phone: '9876543210',
    collegeRollNumber: '21CS101',
    branch: 'Computer Science',
    year: '3'
  };

  const mockProgram = {
    id: 1,
    name: 'Full Stack Web Development',
    code: 'FSWD-2026',
    status: 'active',
    capacity: 60,
    startDate: new Date('2026-11-01'),
    endDate: new Date('2027-04-30')
  };

  const mockStudent = {
    id: 42,
    fullName: 'Rohan Gupta',
    email: 'rohan.gupta@example.com',
    phone: '9876543210',
    collegeRollNumber: '21CS101',
    branch: 'Computer Science',
    year: 3
  };

  const mockEnrollment = {
    id: 101,
    studentId: 42,
    programId: 1,
    status: 'pending',
    createdAt: new Date('2026-10-03T10:00:00.000Z')
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    clientIp = '203.0.113.7';
    (await import('../security/request-limits')).resetMemoryLimits();

    mockGetProgramByCode.mockResolvedValue(mockProgram);
    mockGetProgramEnrollmentCount.mockResolvedValue(10);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg_test_001' });
    mockMarkEnrollmentConfirmationSent.mockResolvedValue(true);
    mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
      success: true,
      isNewStudent: true,
      student: mockStudent,
      enrollment: mockEnrollment,
      userId: 'student-user',
      activation: null
    });
  });

  // -------------------------------------------------------------------------
  // 1. Success Flow
  // -------------------------------------------------------------------------
  describe('Successful enrollment', () => {
    it('successfully validates, creates student, creates enrollment, and sends confirmation email', async () => {
      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.studentName).toBe('Rohan Gupta');
        expect(result.data.studentEmail).toBe('rohan.gupta@example.com');
        expect(result.data.programName).toBe('Full Stack Web Development');
        expect(result.data.programCode).toBe('FSWD-2026');
        expect(result.data.status).toBe('pending');
        // Anti-enumeration: delivery status and record timestamps are not echoed to the requester.
        expect(result.data).not.toHaveProperty('emailSent');
        expect(result.data).not.toHaveProperty('registeredAt');
      }

      expect(mockCreateEnrollmentWithStudentProvisioning).toHaveBeenCalledWith({
        programId: 1,
        mode: 'public',
        student: {
          fullName: 'Rohan Gupta',
          email: 'rohan.gupta@example.com',
          phone: '9876543210',
          collegeRollNumber: '21CS101',
          branch: 'Computer Science',
          year: 3
        }
      });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockMarkEnrollmentConfirmationSent).toHaveBeenCalledWith(101);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/enrollments');
    });

    it('reuses existing student record if student already exists but is new to this program', async () => {
      const existingStudent = { ...mockStudent, id: 99 };
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: true,
        isNewStudent: false,
        student: existingStudent,
        enrollment: { ...mockEnrollment, studentId: 99 },
        userId: 'student-user',
        activation: null
      });

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(true);
      expect(mockCreateEnrollmentWithStudentProvisioning).toHaveBeenCalled();
    });

    it('preserves valid enrollment when confirmation email delivery fails', async () => {
      mockSendEmail.mockResolvedValue({
        success: false,
        reason: 'delivery_failed',
        error: 'SMTP provider down'
      });

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(true);
      expect(mockCreateEnrollmentWithStudentProvisioning).toHaveBeenCalled();
      expect(mockMarkEnrollmentConfirmationSent).not.toHaveBeenCalled();
    });

    it('preserves valid enrollment when confirmation email throws an unexpected exception', async () => {
      mockSendEmail.mockRejectedValue(new Error('Network disconnected'));

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(true);
      expect(mockCreateEnrollmentWithStudentProvisioning).toHaveBeenCalled();
      expect(mockMarkEnrollmentConfirmationSent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Schema Validation Errors
  // -------------------------------------------------------------------------
  describe('Form input validation errors', () => {
    it('fails when full name is shorter than 2 characters', async () => {
      const result = await submitStudentEnrollment({
        ...validSubmission,
        fullName: 'A'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors?.fullName).toMatch(/at least 2 characters/i);
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('fails when email address is invalid', async () => {
      const result = await submitStudentEnrollment({
        ...validSubmission,
        email: 'invalid-email-address'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors?.email).toMatch(/valid email/i);
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('fails when phone number does not match Indian phone regex', async () => {
      const result = await submitStudentEnrollment({
        ...validSubmission,
        phone: '12345'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors?.phone).toMatch(/valid 10-digit phone/i);
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('fails when college roll number is missing', async () => {
      const result = await submitStudentEnrollment({
        ...validSubmission,
        collegeRollNumber: ''
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors?.collegeRollNumber).toBeDefined();
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('fails when branch is empty', async () => {
      const result = await submitStudentEnrollment({
        ...validSubmission,
        branch: ''
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors?.branch).toBeDefined();
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('fails when year is out of range 1-4', async () => {
      const result = await submitStudentEnrollment({
        ...validSubmission,
        year: 5
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors?.year).toBeDefined();
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Business Rule Validation Failures
  // -------------------------------------------------------------------------
  describe('Business rule validation failures', () => {
    it('returns error when program does not exist', async () => {
      mockGetProgramByCode.mockResolvedValue(null);

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Program not found.');
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('returns error when program is archived', async () => {
      mockGetProgramByCode.mockResolvedValue({
        ...mockProgram,
        status: 'archived'
      });

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Registration for this program is no longer available.');
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('returns error when program is not active (e.g. draft)', async () => {
      mockGetProgramByCode.mockResolvedValue({
        ...mockProgram,
        status: 'draft'
      });

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Registration for this program is not currently open.');
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('returns error when program has reached maximum capacity', async () => {
      mockGetProgramByCode.mockResolvedValue({
        ...mockProgram,
        capacity: 50
      });
      mockGetProgramEnrollmentCount.mockResolvedValue(50);

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Registration for this program is currently full.');
      }
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('does not reveal an existing registration: duplicate submissions get the same acknowledgement and no email', async () => {
      const fresh = await submitStudentEnrollment(validSubmission);
      mockSendEmail.mockClear();
      mockMarkEnrollmentConfirmationSent.mockClear();
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: false,
        error: 'already_enrolled',
        message: 'You are already registered for this program.'
      });

      const duplicate = await submitStudentEnrollment(validSubmission);

      expect(duplicate).toEqual(fresh);
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockMarkEnrollmentConfirmationSent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Safe Error Handling
  // -------------------------------------------------------------------------
  describe('Database failure & unexpected errors', () => {
    it('handles unexpected database exception gracefully without leaking sensitive details', async () => {
      mockCreateEnrollmentWithStudentProvisioning.mockRejectedValue(
        new Error('FATAL: connection pool exhausted')
      );

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('An unexpected server error occurred. Please try again.');
        expect((result as any).error).not.toContain('FATAL');
        expect((result as any).error).not.toContain('connection pool');
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. Audit F-02 / F-25 / F-26: no overwrite signal, no enumeration, no raw errors
  // -------------------------------------------------------------------------
  describe('Anti-enumeration and safe failures (audit F-02)', () => {
    it('always runs provisioning in public mode', async () => {
      await submitStudentEnrollment(validSubmission);
      expect(mockCreateEnrollmentWithStudentProvisioning).toHaveBeenCalledWith(expect.objectContaining({ mode: 'public' }));
    });

    it.each(['privileged_identity', 'identity_conflict', 'already_enrolled'])(
      'answers a %s outcome exactly like a fresh registration and sends no email',
      async (error) => {
        const fresh = await submitStudentEnrollment(validSubmission);
        mockSendEmail.mockClear();
        mockMarkEnrollmentConfirmationSent.mockClear();
        mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({ success: false, error, message: 'internal detail' });

        const result = await submitStudentEnrollment(validSubmission);

        expect(result).toEqual(fresh);
        expect(JSON.stringify(result)).not.toContain('internal detail');
        expect(mockSendEmail).not.toHaveBeenCalled();
        expect(mockMarkEnrollmentConfirmationSent).not.toHaveBeenCalled();
      }
    );

    it('echoes only what the requester submitted, never the stored profile of an existing student', async () => {
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: true,
        isNewStudent: false,
        student: { ...mockStudent, fullName: 'Stored Real Name', phone: '9000000000' },
        enrollment: mockEnrollment,
        userId: 'student-user',
        activation: null
      });

      const result = await submitStudentEnrollment(validSubmission);

      expect(result.success && result.data.studentName).toBe('Rohan Gupta');
      expect(JSON.stringify(result)).not.toContain('Stored Real Name');
      expect(JSON.stringify(result)).not.toContain('9000000000');
    });

    it('rejects registration for a program whose end date has passed', async () => {
      mockGetProgramByCode.mockResolvedValue({ ...mockProgram, endDate: new Date('2020-01-01') });
      const result = await submitStudentEnrollment(validSubmission);
      expect(result).toEqual({ success: false, error: 'Registration for this program is no longer available.' });
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('rejects an unknown program code', async () => {
      mockGetProgramByCode.mockResolvedValue(null);
      const result = await submitStudentEnrollment({ ...validSubmission, programCode: 'NOPE' });
      expect(result).toEqual({ success: false, error: 'Program not found.' });
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
    });

    it('does not leak driver error text from a failed provisioning transaction', async () => {
      mockCreateEnrollmentWithStudentProvisioning.mockResolvedValue({
        success: false,
        error: 'database_error',
        message: 'duplicate key value violates unique constraint "college_roll_idx"'
      });
      const result = await submitStudentEnrollment(validSubmission);
      expect(result).toEqual({ success: false, error: 'An error occurred during enrollment. Please try again.' });
    });
  });

  describe('Abuse control (audit F-04)', () => {
    it('refuses the 6th request from one client within the window, before any provisioning', async () => {
      for (let i = 0; i < 5; i++) {
        const ok = await submitStudentEnrollment({ ...validSubmission, email: `user${i}@example.com` });
        expect(ok.success).toBe(true);
      }
      mockCreateEnrollmentWithStudentProvisioning.mockClear();
      mockSendEmail.mockClear();

      const limited = await submitStudentEnrollment({ ...validSubmission, email: 'user6@example.com' });

      expect(limited).toEqual({ success: false, error: 'Too many registration attempts. Please wait a minute and try again.' });
      expect(mockCreateEnrollmentWithStudentProvisioning).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('limits per target email across clients (email bombing)', async () => {
      for (let i = 0; i < 5; i++) {
        clientIp = `198.51.100.${i}`;
        await submitStudentEnrollment(validSubmission);
      }
      clientIp = '198.51.100.99';
      const limited = await submitStudentEnrollment(validSubmission);
      expect(limited.success).toBe(false);
    });

    it('ignores spoofable forwarding headers when identifying the client', async () => {
      // Every request claims x-forwarded-for 1.1.1.1 but comes from a different Cloudflare client IP.
      for (let i = 0; i < 8; i++) {
        clientIp = `192.0.2.${i}`;
        const result = await submitStudentEnrollment({ ...validSubmission, email: `spoof${i}@example.com` });
        expect(result.success).toBe(true);
      }
    });
  });
});
