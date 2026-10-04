import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderEnrollmentConfirmationEmail,
  type EnrollmentConfirmationEmailData
} from '../email/templates/enrollment-confirmation';

// Mock server-only so the email service can be imported in Node/Vitest
vi.mock('server-only', () => ({}));

// Mock Resend constructor and emails.send
const mockSend = vi.fn();
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockSend
      }
    }))
  };
});

describe('Enrollment Confirmation Email Template — renderEnrollmentConfirmationEmail', () => {
  const baseData: EnrollmentConfirmationEmailData = {
    studentName: 'Aarav Patel',
    studentEmail: 'aarav.patel@example.com',
    programName: 'Full Stack Web Development',
    programCode: 'FSWD-2026',
    startDate: new Date('2026-11-01T00:00:00Z'),
    endDate: new Date('2027-04-30T00:00:00Z'),
    status: 'pending'
  };

  it('generates the expected subject line containing the program name', () => {
    const { subject } = renderEnrollmentConfirmationEmail(baseData);
    expect(subject).toBe('Registration Received — Full Stack Web Development');
  });

  it('renders student name, program code, and program name in HTML output', () => {
    const { html } = renderEnrollmentConfirmationEmail(baseData);
    expect(html).toContain('Aarav Patel');
    expect(html).toContain('Full Stack Web Development');
    expect(html).toContain('FSWD-2026');
  });

  it('renders correct status label and styling for pending status', () => {
    const { html, text } = renderEnrollmentConfirmationEmail({
      ...baseData,
      status: 'pending'
    });
    expect(html).toContain('Pending');
    expect(html).toContain('#eff6ff'); // pending background
    expect(text).toContain('Status          : Pending');
  });

  it('renders correct status label and styling for confirmed status', () => {
    const { html, text } = renderEnrollmentConfirmationEmail({
      ...baseData,
      status: 'confirmed'
    });
    expect(html).toContain('Confirmed');
    expect(html).toContain('#ecfdf5'); // confirmed background
    expect(text).toContain('Status          : Confirmed');
  });

  it('renders correct status label and styling for waitlisted status', () => {
    const { html, text } = renderEnrollmentConfirmationEmail({
      ...baseData,
      status: 'waitlisted'
    });
    expect(html).toContain('Waitlisted');
    expect(html).toContain('#fff7ed'); // waitlisted background
    expect(text).toContain('Status          : Waitlisted');
  });

  it('renders correct status label and styling for cancelled status', () => {
    const { html, text } = renderEnrollmentConfirmationEmail({
      ...baseData,
      status: 'cancelled'
    });
    expect(html).toContain('Cancelled');
    expect(html).toContain('#fef2f2'); // cancelled background
    expect(text).toContain('Status          : Cancelled');
  });

  it('formats dates safely when startDate is a string, Date, or null', () => {
    const withStringDate = renderEnrollmentConfirmationEmail({
      ...baseData,
      startDate: '2026-10-15T10:00:00.000Z'
    });
    expect(withStringDate.html).toBeDefined();

    const withNullDate = renderEnrollmentConfirmationEmail({
      ...baseData,
      startDate: null,
      endDate: undefined
    });
    expect(withNullDate.html).toBeDefined();

    const withInvalidDate = renderEnrollmentConfirmationEmail({
      ...baseData,
      startDate: 'not-a-valid-date'
    });
    expect(withInvalidDate.html).toBeDefined();
  });

  it('renders plain-text fallback with all critical registration information', () => {
    const { text } = renderEnrollmentConfirmationEmail(baseData);

    expect(text).toContain('Hello Aarav Patel,');
    expect(text).toContain('Full Stack Web Development');
    expect(text).toContain('FSWD-2026');
    expect(text).toContain('RMS CAREERS — Rising Minds Solutions');
    expect(text).toContain('This is an automated email. Please do not reply directly to this message.');
  });

  it('includes logo image tag when EMAIL_LOGO_URL is configured', () => {
    const prevUrl = process.env.EMAIL_LOGO_URL;
    process.env.EMAIL_LOGO_URL = 'https://cdn.example.com/logo.png';

    const { html } = renderEnrollmentConfirmationEmail(baseData);
    expect(html).toContain('https://cdn.example.com/logo.png');

    process.env.EMAIL_LOGO_URL = prevUrl;
  });

  it('omits logo image tag and shows text wordmark when EMAIL_LOGO_URL is unset', () => {
    const prevUrl = process.env.EMAIL_LOGO_URL;
    delete process.env.EMAIL_LOGO_URL;

    const { html } = renderEnrollmentConfirmationEmail(baseData);
    expect(html).toContain('RMS Careers');
    expect(html).not.toContain('<img src="https');

    process.env.EMAIL_LOGO_URL = prevUrl;
  });
});

describe('Email Service — sendEnrollmentConfirmationEmail', () => {
  const originalEnv = { ...process.env };

  const emailData: EnrollmentConfirmationEmailData = {
    studentName: 'Kavita Reddy',
    studentEmail: 'kavita@example.com',
    programName: 'Data Science & Machine Learning',
    programCode: 'DSML-101',
    status: 'pending'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('safely skips sending when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY;

    const { sendEnrollmentConfirmationEmail } = await import('../email');
    const result = await sendEnrollmentConfirmationEmail(emailData);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('provider_not_configured');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('safely skips sending when RESEND_API_KEY is an empty string', async () => {
    process.env.RESEND_API_KEY = '   ';

    const { sendEnrollmentConfirmationEmail } = await import('../email');
    const result = await sendEnrollmentConfirmationEmail(emailData);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('provider_not_configured');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('constructs correct payload and sends via Resend when configured', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_api_key_123';
    process.env.EMAIL_FROM = 'RMS Admissions <admissions@rms-careers.com>';

    mockSend.mockResolvedValueOnce({
      data: { id: 'msg_mock_001' },
      error: null
    });

    const { sendEnrollmentConfirmationEmail } = await import('../email');
    const result = await sendEnrollmentConfirmationEmail(emailData);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg_mock_001');

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentPayload = mockSend.mock.calls[0][0];
    expect(sentPayload.from).toBe('RMS Admissions <admissions@rms-careers.com>');
    expect(sentPayload.to).toEqual(['kavita@example.com']);
    expect(sentPayload.subject).toBe('Registration Received — Data Science & Machine Learning');
    expect(sentPayload.html).toContain('Kavita Reddy');
    expect(sentPayload.text).toContain('Kavita Reddy');
  });

  it('falls back to default from address when EMAIL_FROM is unset', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_api_key_123';
    delete process.env.EMAIL_FROM;

    mockSend.mockResolvedValueOnce({
      data: { id: 'msg_mock_002' },
      error: null
    });

    const { sendEnrollmentConfirmationEmail } = await import('../email');
    const result = await sendEnrollmentConfirmationEmail(emailData);

    expect(result.success).toBe(true);
    const sentPayload = mockSend.mock.calls[0][0];
    expect(sentPayload.from).toBe('Academy Enrollment <onboarding@resend.dev>');
  });

  it('handles Resend API error response without throwing', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_api_key_123';

    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Domain not verified in Resend', name: 'validation_error' }
    });

    const { sendEnrollmentConfirmationEmail } = await import('../email');
    const result = await sendEnrollmentConfirmationEmail(emailData);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('delivery_failed');
    expect(result.error).toBe('Domain not verified in Resend');
  });

  it('handles network or unexpected exceptions gracefully without throwing', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_api_key_123';

    mockSend.mockRejectedValueOnce(new Error('Connection timeout to api.resend.com'));

    const { sendEnrollmentConfirmationEmail } = await import('../email');
    const result = await sendEnrollmentConfirmationEmail(emailData);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('delivery_failed');
    expect(result.error).toBe('Connection timeout to api.resend.com');
  });
});
