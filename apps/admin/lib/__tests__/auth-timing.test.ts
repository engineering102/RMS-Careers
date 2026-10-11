import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

let userRow: Record<string, unknown> | null = null;
let roleRows: Array<{ role: string }> = [];
const verifyCalls: string[] = [];

vi.mock('@rms/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/auth')>();
  return {
    ...actual,
    // Cheap stand-ins: the test counts comparisons, it does not need real bcrypt work.
    hashPassword: async () => '$2a$12$equalization.hash.placeholder.................',
    verifyPassword: async (password: string, hash: string) => {
      verifyCalls.push(hash);
      return hash === 'REAL_HASH' && password === 'right-password';
    }
  };
});

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  const where = () => {
    const p = Promise.resolve(roleRows) as Promise<unknown> & { limit: () => Promise<unknown> };
    p.limit = () => Promise.resolve(userRow ? [userRow] : []);
    return p;
  };
  return {
    ...actual,
    db: {
      select: () => ({ from: () => ({ where, innerJoin: () => ({ leftJoin: () => ({ where }) }) }) }),
      update: () => ({ set: () => ({ where: async () => [] }) })
    }
  };
});

import { authenticateAdmin } from '@/lib/db/queries/users';

/** Audit PR-08: every rejection path costs exactly one bcrypt comparison (no account enumeration by timing). */
describe('admin sign-in timing equalization', () => {
  beforeEach(() => {
    verifyCalls.length = 0;
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost/mock';
  });

  it.each([
    ['unknown email', null, []],
    ['inactive account', { id: 'u1', email: 'a@x.test', passwordHash: 'REAL_HASH', status: 'pending' }, [{ role: 'admin' }]],
    ['account without the required role', { id: 'u1', email: 'a@x.test', passwordHash: 'REAL_HASH', status: 'active' }, [{ role: 'student' }]]
  ])('%s: rejected after one comparison against the equalization hash', async (_label, user, roles) => {
    userRow = user as Record<string, unknown> | null;
    roleRows = roles as Array<{ role: string }>;
    expect(await authenticateAdmin('a@x.test', 'right-password')).toBeNull();
    expect(verifyCalls).toHaveLength(1);
    expect(verifyCalls[0]).not.toBe('REAL_HASH');
  });

  it('wrong password on a real account: one comparison against the real hash', async () => {
    userRow = { id: 'u1', email: 'a@x.test', passwordHash: 'REAL_HASH', status: 'active' };
    roleRows = [{ role: 'admin' }];
    expect(await authenticateAdmin('a@x.test', 'wrong-password')).toBeNull();
    expect(verifyCalls).toEqual(['REAL_HASH']);
  });

  it('logs only the error class when the database fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    userRow = null;
    roleRows = [];
    const { db } = await import('@rms/db');
    const original = db.select;
    (db as { select: unknown }).select = () => { throw new TypeError('connect ECONNREFUSED postgres://user:pw@host/db'); };
    try {
      expect(await authenticateAdmin('a@x.test', 'x')).toBeNull();
      const logged = spy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(logged).toContain('TypeError');
      expect(logged).not.toMatch(/postgres:\/\/|ECONNREFUSED|a@x\.test/);
    } finally {
      (db as { select: unknown }).select = original;
      spy.mockRestore();
    }
  });
});
