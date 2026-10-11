import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Capture the Auth.js configuration and control what the raw (JWT-only) session returns.
const { rawAuth, captured, dbUsers } = vi.hoisted(() => ({
  rawAuth: vi.fn(),
  captured: { config: null as any },
  dbUsers: { getCurrentAdminRecord: vi.fn(), getUserByEmail: vi.fn(), authenticateAdmin: vi.fn() }
}));

vi.mock('next-auth', () => ({
  CredentialsSignin: class CredentialsSignin extends Error {},
  default: (config: any) => {
    captured.config = config;
    return { auth: rawAuth, handlers: {}, signIn: vi.fn(), signOut: vi.fn() };
  }
}));
vi.mock('next-auth/providers/github', () => ({ default: (opts: any) => ({ id: 'github', ...opts }) }));
vi.mock('next-auth/providers/credentials', () => ({ default: (opts: any) => ({ id: 'credentials', ...opts }) }));
vi.mock('@/lib/db/queries/users', () => dbUsers);

import { auth } from '../auth';
import { evaluateAdminSession, sessionIssuedAtMs } from '../session-validation';

/** Audit F-09: existing admin sessions must not outlive deactivation, role removal or credential changes. */

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SIGNED_IN_AT = Date.parse('2026-10-10T08:00:00Z');
const record = (overrides: Record<string, unknown> = {}) => ({
  id: ADMIN_ID,
  status: 'active',
  roles: ['admin'],
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  ...overrides
});
const jwtSession = (overrides: Record<string, unknown> = {}) => ({
  user: { id: ADMIN_ID, role: 'super_admin', email: 'a@rms.test', authTime: SIGNED_IN_AT, ...overrides },
  expires: '2026-11-09T00:00:00Z'
});

describe('evaluateAdminSession', () => {
  const session = { userId: ADMIN_ID, issuedAtMs: SIGNED_IN_AT };

  it('accepts an active admin whose credentials predate the session', () => {
    expect(evaluateAdminSession(session, record())).toEqual({ ok: true, userId: ADMIN_ID, role: 'admin' });
  });

  it.each(['suspended', 'archived', 'pending_activation'])('revokes a %s account', (status) => {
    expect(evaluateAdminSession(session, record({ status }))).toEqual({ ok: false, reason: 'inactive' });
  });

  it('revokes when the admin role was removed', () => {
    expect(evaluateAdminSession(session, record({ roles: ['student'] }))).toEqual({ ok: false, reason: 'not_admin' });
  });

  it('takes the role from the database, not the token (demotion and promotion)', () => {
    expect(evaluateAdminSession(session, record({ roles: ['admin'] }))).toMatchObject({ role: 'admin' });
    expect(evaluateAdminSession(session, record({ roles: ['admin', 'super_admin'] }))).toMatchObject({ role: 'super_admin' });
  });

  it('revokes sessions issued before a credential change (password reset)', () => {
    const changed = record({ updatedAt: new Date(SIGNED_IN_AT + 1000) });
    expect(evaluateAdminSession(session, changed)).toEqual({ ok: false, reason: 'credentials_changed' });
  });

  it('fails closed for sessions without a provable issue time', () => {
    expect(evaluateAdminSession({ userId: ADMIN_ID, issuedAtMs: null }, record())).toEqual({ ok: false, reason: 'credentials_changed' });
  });

  it('rejects unknown or mismatched accounts', () => {
    expect(evaluateAdminSession(session, null)).toEqual({ ok: false, reason: 'not_found' });
    expect(evaluateAdminSession(session, record({ id: 'someone-else' }))).toEqual({ ok: false, reason: 'not_found' });
    expect(evaluateAdminSession({ userId: '', issuedAtMs: 1 }, record())).toEqual({ ok: false, reason: 'missing' });
  });

  it('reads authTime first and only falls back to iat seconds', () => {
    expect(sessionIssuedAtMs({ authTime: 5 })).toBe(5);
    expect(sessionIssuedAtMs({ iat: 2 })).toBe(2000);
    expect(sessionIssuedAtMs({})).toBeNull();
  });
});

describe('auth() wrapper (every page, layout and Server Action)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rawAuth.mockResolvedValue(jwtSession());
    dbUsers.getCurrentAdminRecord.mockResolvedValue(record());
  });

  it('returns the session with the database role for a valid admin', async () => {
    const session = await auth();
    expect(dbUsers.getCurrentAdminRecord).toHaveBeenCalledWith(ADMIN_ID);
    // The token claimed super_admin; the database says admin.
    expect(session?.user.role).toBe('admin');
  });

  it('ends an existing session as soon as the admin is deactivated', async () => {
    dbUsers.getCurrentAdminRecord.mockResolvedValue(record({ status: 'suspended' }));
    await expect(auth()).resolves.toBeNull();
  });

  it('ends an existing session after the admin role is removed', async () => {
    dbUsers.getCurrentAdminRecord.mockResolvedValue(record({ roles: [] }));
    await expect(auth()).resolves.toBeNull();
  });

  it('ends sessions that predate a password change', async () => {
    dbUsers.getCurrentAdminRecord.mockResolvedValue(record({ updatedAt: new Date(SIGNED_IN_AT + 60_000) }));
    await expect(auth()).resolves.toBeNull();
  });

  it('fails closed when the account cannot be verified', async () => {
    dbUsers.getCurrentAdminRecord.mockRejectedValue(new Error('connection refused'));
    await expect(auth()).resolves.toBeNull();
  });

  it('returns null without a JWT session', async () => {
    rawAuth.mockResolvedValue(null);
    await expect(auth()).resolves.toBeNull();
    expect(dbUsers.getCurrentAdminRecord).not.toHaveBeenCalled();
  });
});

describe('sign-in callbacks', () => {
  it('stamps authTime at sign-in and keeps it across refreshes', async () => {
    const jwt = captured.config.callbacks.jwt;
    const before = Date.now();
    const signedIn = await jwt({ token: {}, user: { id: ADMIN_ID, role: 'admin' }, account: { provider: 'credentials' } });
    expect(signedIn.authTime).toBeGreaterThanOrEqual(before);
    const refreshed = await jwt({ token: { ...signedIn }, user: undefined });
    expect(refreshed.authTime).toBe(signedIn.authTime);
  });

  it('binds GitHub sign-ins to the database account and its real role', async () => {
    dbUsers.getUserByEmail.mockResolvedValue({ id: ADMIN_ID, status: 'active', roles: [{ role: 'super_admin' }] });
    const token = await captured.config.callbacks.jwt({
      token: {},
      user: { id: '9876543', email: 'a@rms.test' },
      account: { provider: 'github' }
    });
    expect(token.id).toBe(ADMIN_ID);
    expect(token.role).toBe('super_admin');
  });

  it('exposes authTime on the session object', async () => {
    const session = await captured.config.callbacks.session({
      session: { user: { id: 'x' }, expires: '' },
      token: { id: ADMIN_ID, role: 'admin', authTime: 123 }
    });
    expect(session.user.authTime).toBe(123);
  });
});

describe('admin credential sign-in rate limit (audit F-04)', () => {
  const authorize = (username: string, ip: string) =>
    captured.config.providers
      .find((p: any) => p.id === 'credentials')
      .authorize(
        { username, password: 'wrong' },
        new Request('https://admin.rms-careers.com/api/auth/callback/credentials', {
          method: 'POST',
          headers: { 'cf-connecting-ip': ip }
        })
      );

  beforeEach(async () => {
    (await import('../security/request-limits')).resetMemoryLimits();
    dbUsers.authenticateAdmin.mockReset().mockResolvedValue(null);
  });

  // Audit PR-08: 60 per client IP, 5 per account.
  it('refuses the 61st attempt from one client within a minute without verifying the password', async () => {
    for (let i = 0; i < 60; i++) await expect(authorize(`a${i}@rms.test`, '203.0.113.1')).resolves.toBeNull();
    await expect(authorize('a99@rms.test', '203.0.113.1')).rejects.toMatchObject({ code: 'rate_limited' });
    expect(dbUsers.authenticateAdmin).toHaveBeenCalledTimes(60);
  });

  it('limits guesses against one admin account across clients', async () => {
    for (let i = 0; i < 5; i++) await authorize('Owner@RMS.test', `198.51.100.${i}`);
    await expect(authorize('owner@rms.test', '198.51.100.250')).rejects.toMatchObject({ code: 'rate_limited' });
  });
});
