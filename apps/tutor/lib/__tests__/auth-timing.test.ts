import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { verifyPassword, rows } = vi.hoisted(() => ({
  verifyPassword: vi.fn(async (_password: string, hash: string) => hash === 'REAL_HASH'),
  rows: { current: [] as unknown[] }
}));

vi.mock('@rms/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@rms/auth')>()),
  verifyPassword,
  hashPassword: vi.fn(async () => 'EQUALIZATION_HASH')
}));

// loadTutorAccount: select(...).from(users).leftJoin(tutors, ...).where(...).limit(1)
vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  const chain = { from: () => chain, leftJoin: () => chain, where: () => chain, limit: async () => rows.current };
  return { ...actual, db: { select: () => chain } };
});

import { authenticateTutor } from '../db/tutor-accounts';

const tutorRow = (overrides: Record<string, unknown> = {}) => ({
  userId: 'u1',
  email: 'tutor@example.test',
  status: 'active',
  passwordHash: 'REAL_HASH',
  updatedAt: null,
  tutorId: 't1',
  tutorActive: true,
  fullName: 'Asha Rao',
  roles: ['tutor'],
  ...overrides
});

describe('tutor sign-in timing equalization', () => {
  beforeEach(() => {
    verifyPassword.mockClear();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
  });

  it.each([
    ['unknown email', []],
    ['pending activation', [tutorRow({ status: 'pending_activation' })]],
    ['not a tutor', [tutorRow({ roles: ['student'] })]],
    ['admin account', [tutorRow({ roles: ['tutor', 'admin'] })]],
    ['deactivated tutor', [tutorRow({ tutorActive: false })]]
  ])('%s: rejected after exactly one bcrypt comparison against a dummy hash', async (_label, found) => {
    rows.current = found;
    expect(await authenticateTutor('tutor@example.test', 'whatever password')).toBeNull();
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword.mock.calls[0][1]).toBe('EQUALIZATION_HASH');
  });

  it('an eligible tutor costs the same single comparison, against the real hash', async () => {
    rows.current = [tutorRow()];
    expect(await authenticateTutor('tutor@example.test', 'whatever password')).toEqual({
      userId: 'u1',
      tutorId: 't1',
      email: 'tutor@example.test',
      name: 'Asha Rao'
    });
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword.mock.calls[0][1]).toBe('REAL_HASH');
  });
});
