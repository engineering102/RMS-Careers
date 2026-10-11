import { describe, it, expect } from 'vitest';
import { loginErrorMessage } from '@/lib/auth/login-errors';

/** Audit D-08: error codes are mapped, an outage is not presented as "no access", input is never echoed. */
describe('loginErrorMessage', () => {
  it('returns nothing without a code', () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage('')).toBeNull();
  });

  it('distinguishes an outage from an authorization failure', () => {
    expect(loginErrorMessage('Configuration')).toMatch(/temporarily unavailable/);
    expect(loginErrorMessage('AccessDenied')).toMatch(/do not have access/);
    expect(loginErrorMessage('Unauthorized')).toMatch(/session has ended/);
  });

  it.each(['<script>alert(1)</script>', 'toString', '__proto__', 'constructor'])('does not echo or resolve %s', (code) => {
    expect(loginErrorMessage(code)).toBe('Sign-in could not be completed. Please try again.');
  });
});
