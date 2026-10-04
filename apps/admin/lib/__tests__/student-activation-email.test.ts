import { describe, expect, it } from 'vitest';
import { renderStudentActivationEmail } from '../email/templates/student-activation';

describe('Student activation email template', () => {
  it('uses the canonical isolated Student Portal activation URL without exposing internal fields', () => {
    const rawToken = 'a'.repeat(64);
    const activationUrl = `https://student.rms-careers.com/activate?token=${rawToken}`;
    const result = renderStudentActivationEmail({
      studentName: 'Test Student',
      studentEmail: 'student@example.com',
      activationUrl,
      expiresAt: new Date('2026-10-11T12:00:00.000Z')
    });

    expect(result.html).toContain(activationUrl);
    expect(result.text).toContain(activationUrl);
    expect(result.html).not.toContain('token_hash');
    expect(result.html).not.toContain('user_id');
  });
});
