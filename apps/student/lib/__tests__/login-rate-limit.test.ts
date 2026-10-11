import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { captured, authenticateStudent } = vi.hoisted(() => ({
  captured: { config: null as any },
  authenticateStudent: vi.fn()
}));

vi.mock('next-auth', () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = 'credentials';
  },
  default: (config: any) => {
    captured.config = config;
    return { auth: vi.fn(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() };
  }
}));
vi.mock('next-auth/providers/credentials', () => ({ default: (opts: any) => opts }));
vi.mock('@/lib/db/student-identity', () => ({ authenticateStudent }));

import { RateLimitedSignin } from '../auth';
import { resetMemoryLimits } from '../security/request-limits';

/** Audit F-04: student sign-in is limited inside authorize(), which also serves the raw callback endpoint. */
const authorize = (email: string, ip: string | null) =>
  captured.config.providers[0].authorize(
    { email, password: 'wrong-password' },
    new Request('https://student.rms-careers.com/api/auth/callback/credentials', {
      method: 'POST',
      headers: ip ? { 'cf-connecting-ip': ip } : {}
    })
  );

beforeEach(() => {
  resetMemoryLimits();
  authenticateStudent.mockReset().mockResolvedValue(null);
});

describe('student credential sign-in rate limit', () => {
  // Audit PR-08: 60 per client IP (a college lab behind one NAT), 5 per account.
  it('allows 60 attempts per client per minute (a whole lab), then refuses without checking the password', async () => {
    for (let i = 0; i < 60; i++) {
      await expect(authorize(`s${i}@example.com`, '203.0.113.5')).resolves.toBeNull();
    }
    await expect(authorize('s99@example.com', '203.0.113.5')).rejects.toBeInstanceOf(RateLimitedSignin);
    expect(authenticateStudent).toHaveBeenCalledTimes(60);
  });

  it('limits guesses against one account across many clients', async () => {
    for (let i = 0; i < 5; i++) await authorize('victim@example.com', `198.51.100.${i}`);
    await expect(authorize('victim@example.com', '198.51.100.200')).rejects.toBeInstanceOf(RateLimitedSignin);
  });

  it('counts unknown accounts the same way (no enumeration through the limiter)', async () => {
    authenticateStudent.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) await authorize('nobody@example.com', `192.0.2.${i}`);
    await expect(authorize('nobody@example.com', '192.0.2.250')).rejects.toBeInstanceOf(RateLimitedSignin);
  });

  it('reports the rate_limited code to the login form', () => {
    expect(new RateLimitedSignin().code).toBe('rate_limited');
  });
});
