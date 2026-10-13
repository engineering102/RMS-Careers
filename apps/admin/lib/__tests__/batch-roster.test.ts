import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const chain = vi.hoisted(() => ({ rows: [] as unknown[], fail: false, whereArg: undefined as unknown }));

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  const orderBy = vi.fn(() => (chain.fail ? Promise.reject(new Error('db down')) : Promise.resolve(chain.rows)));
  const where = vi.fn((arg: unknown) => {
    chain.whereArg = arg;
    return { orderBy };
  });
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ innerJoin }));
  return { ...actual, db: { select: vi.fn(() => ({ from })) } };
});

import { getBatchRoster } from '../db/queries/batches';

describe('getBatchRoster', () => {
  const original = process.env.POSTGRES_URL;
  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://localhost/unit';
    chain.rows = [];
    chain.fail = false;
  });
  afterEach(() => {
    process.env.POSTGRES_URL = original;
  });

  it('maps joined rows to roster entries with a nested student', async () => {
    const enrolledAt = new Date('2026-10-02T00:00:00Z');
    chain.rows = [
      {
        enrollmentId: 9,
        status: 'pending',
        enrolledAt,
        confirmationSentAt: null,
        studentId: 4,
        fullName: 'Asha Test',
        email: 'asha@example.test',
        collegeRollNumber: 'R-1',
        branch: 'CSE',
        year: 3
      }
    ];
    await expect(getBatchRoster('b-1')).resolves.toEqual([
      {
        enrollmentId: 9,
        status: 'pending',
        enrolledAt,
        confirmationSentAt: null,
        student: {
          id: 4,
          fullName: 'Asha Test',
          email: 'asha@example.test',
          collegeRollNumber: 'R-1',
          branch: 'CSE',
          year: 3
        }
      }
    ]);
    expect(chain.whereArg).toBeDefined();
  });

  it('returns [] without a batch id, without a database, or on a query error', async () => {
    await expect(getBatchRoster('')).resolves.toEqual([]);

    delete process.env.POSTGRES_URL;
    await expect(getBatchRoster('b-1')).resolves.toEqual([]);

    process.env.POSTGRES_URL = 'postgres://localhost/unit';
    chain.fail = true;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(getBatchRoster('b-1')).resolves.toEqual([]);
    spy.mockRestore();
  });
});
