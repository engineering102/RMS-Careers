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
import { buildRosterExportCsv, rosterExportFilename } from '../batches/roster';

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

describe('buildRosterExportCsv', () => {
  const entry = (status: string, fullName: string, email: string) =>
    ({ status, student: { id: 1, fullName, email, collegeRollNumber: null, branch: null, year: null } }) as never;

  it('exports name,email for students with portal access only', () => {
    const out = buildRosterExportCsv([
      entry('active', 'Asha Rao', 'asha@college.edu'),
      entry('confirmed', 'Bala K', 'bala@college.edu'),
      entry('pending', 'Chitra P', 'chitra@college.edu'),
      entry('dropped', 'Dev S', 'dev@college.edu')
    ]);
    expect(out.rowCount).toBe(2);
    expect(out.csvContent.split('\n')).toEqual(['name,email', 'Asha Rao,asha@college.edu', 'Bala K,bala@college.edu']);
  });

  it('normalises and de-duplicates emails', () => {
    const out = buildRosterExportCsv([
      entry('active', 'Asha Rao', ' Asha@College.edu '),
      entry('confirmed', 'Asha Rao', 'asha@college.edu')
    ]);
    expect(out.rowCount).toBe(1);
    expect(out.csvContent).toBe('name,email\nAsha Rao,asha@college.edu');
  });

  it('quotes commas and neutralises spreadsheet formulas in names', () => {
    const out = buildRosterExportCsv([
      entry('active', 'Rao, Asha', 'asha@college.edu'),
      entry('active', '=HYPERLINK("x")', 'bad@college.edu')
    ]);
    const [, first, second] = out.csvContent.split('\n');
    expect(first).toBe('"Rao, Asha",asha@college.edu');
    expect(second).toBe(`"'=HYPERLINK(""x"")",bad@college.edu`);
  });

  it('returns only the header when nobody has access', () => {
    expect(buildRosterExportCsv([entry('pending', 'X', 'x@y.z')])).toEqual({ csvContent: 'name,email', rowCount: 0 });
  });
});

describe('rosterExportFilename', () => {
  it('slugifies the batch name and appends the date', () => {
    expect(rosterExportFilename('CSE 2026 — Batch A', new Date('2026-10-18T05:00:00Z'))).toBe(
      'cse-2026-batch-a-roster-2026-10-18.csv'
    );
    expect(rosterExportFilename('***', new Date('2026-10-18T05:00:00Z'))).toBe('batch-roster-2026-10-18.csv');
  });
});
