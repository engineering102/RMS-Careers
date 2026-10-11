import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { state } = vi.hoisted(() => ({ state: { userRow: null as any, selects: 0 } }));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: () => {
        state.selects++;
        return {
          from: (table: any) => ({
            where: () => {
              const rows = table === actual.users ? (state.userRow ? [state.userRow] : []) : [];
              const p: any = Promise.resolve(rows);
              p.limit = async () => rows;
              return p;
            },
            leftJoin: () => ({ where: () => ({ limit: async () => [] }) })
          })
        };
      }
    }
  };
});

import { isSessionCurrent } from '../auth/session-revocation';
import { studentAuthConfig } from '../auth/config';
import { getStudentEntitlementContext } from '../db/queries/entitlements';

/** Audit F-09 (student portal): password reset / activation revokes older sessions. */

const SIGNED_IN = Date.parse('2026-10-10T08:00:00Z');

describe('isSessionCurrent', () => {
  it('keeps sessions issued after the last credential change', () => {
    expect(isSessionCurrent(SIGNED_IN, new Date(SIGNED_IN - 1))).toBe(true);
    expect(isSessionCurrent(SIGNED_IN, new Date(SIGNED_IN))).toBe(true);
  });

  it('revokes sessions issued before a password reset', () => {
    expect(isSessionCurrent(SIGNED_IN, new Date(SIGNED_IN + 1))).toBe(false);
  });

  it('fails closed for sessions without authTime', () => {
    expect(isSessionCurrent(undefined, new Date(0))).toBe(false);
    expect(isSessionCurrent('123', new Date(0))).toBe(false);
  });
});

describe('student Auth.js callbacks', () => {
  const { jwt, session } = studentAuthConfig.callbacks!;

  it('stamps authTime at sign-in and preserves it across sliding refreshes', async () => {
    const before = Date.now();
    const signedIn: any = await jwt!({ token: {}, user: { id: 'u1', role: 'student' } } as any);
    expect(signedIn.authTime).toBeGreaterThanOrEqual(before);
    const refreshed: any = await jwt!({ token: { ...signedIn } } as any);
    expect(refreshed.authTime).toBe(signedIn.authTime);
  });

  it('exposes authTime on the session', async () => {
    const s: any = await session!({ session: { user: {} }, token: { id: 'u1', role: 'student', authTime: 42 } } as any);
    expect(s.user.authTime).toBe(42);
  });
});

describe('entitlement guard applies the revocation rule on every request', () => {
  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    state.selects = 0;
  });

  it('rejects an existing session after the password was reset elsewhere', async () => {
    state.userRow = { id: 'u1', email: 's@x.test', name: 'S', status: 'active', updatedAt: new Date(SIGNED_IN + 5_000) };
    const ctx = await getStudentEntitlementContext('u1', { authTime: SIGNED_IN });
    expect(ctx.isStudent).toBe(false);
    expect(ctx.student).toBeNull();
    // Stopped at the account check: no role/profile/enrollment queries ran.
    expect(state.selects).toBe(1);
  });

  it('rejects a deactivated account even with a fresh session', async () => {
    state.userRow = { id: 'u1', email: 's@x.test', name: 'S', status: 'suspended', updatedAt: new Date(SIGNED_IN - 5_000) };
    const ctx = await getStudentEntitlementContext('u1', { authTime: SIGNED_IN });
    expect(ctx).toMatchObject({ isStudent: false, isActive: false });
  });

  it('lets a current session continue past the account check', async () => {
    state.userRow = { id: 'u1', email: 's@x.test', name: 'S', status: 'active', updatedAt: new Date(SIGNED_IN - 5_000) };
    await getStudentEntitlementContext('u1', { authTime: SIGNED_IN });
    expect(state.selects).toBeGreaterThan(1);
  });
});
