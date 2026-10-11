import { describe, it, expect, vi } from 'vitest';
import Papa from 'papaparse';

vi.mock('server-only', () => ({}));

const { mockAuth, mockGetEnrollmentsWithDetails } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetEnrollmentsWithDetails: vi.fn()
}));
vi.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendEnrollmentConfirmationEmail: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({
  getEnrollmentsWithDetails: (...args: unknown[]) => mockGetEnrollmentsWithDetails(...args),
  updateEnrollmentStatus: vi.fn(),
  updateBulkEnrollmentStatus: vi.fn(),
  getEnrollmentById: vi.fn(),
  markEnrollmentConfirmationSent: vi.fn()
}));

import { csvCell, csvRow } from '../csv/escape';
import { generateErrorReportCsv } from '../csv/template';
import { exportEnrollmentsCsvAction } from '../../app/(admin)/enrollments/actions';

/** Audit F-12: anonymous text reaches admin spreadsheets; it must never be evaluated as a formula. */

const payloads = ['=HYPERLINK("http://evil.test","x")', '+1+cmd|calc', '-2+3', '@SUM(A1:A9)', '\t=1+1', '\r=1+1'];

describe('csvCell', () => {
  it.each(payloads)('neutralises formula-leading text %j', (payload) => {
    const cell = csvCell(payload);
    expect(cell.startsWith(`"'`)).toBe(true);
    const parsed = Papa.parse<string[]>(cell).data[0][0];
    expect(parsed).toBe(`'${payload}`);
  });

  it('quotes, doubles embedded quotes, and leaves ordinary text intact', () => {
    expect(csvCell('Rahul "RV" Verma')).toBe('"Rahul ""RV"" Verma"');
    expect(csvCell('Computer Science')).toBe('"Computer Science"');
    expect(csvCell(null)).toBe('""');
  });

  it('keeps numbers numeric (including negatives)', () => {
    expect(csvCell(-5)).toBe('"-5"');
    expect(csvCell(42)).toBe('"42"');
  });

  it('minimal mode quotes only when needed but still neutralises formulas', () => {
    expect(csvCell('Enrolled Students', 'minimal')).toBe('Enrolled Students');
    expect(csvCell('a,b', 'minimal')).toBe('"a,b"');
    expect(csvCell('=1+1', 'minimal')).toBe("'=1+1");
    expect(csvCell(null, 'minimal')).toBe('');
  });

  it('builds rows', () => {
    expect(csvRow(['x', 1, '=y'])).toBe(`"x","1","'=y"`);
  });
});

describe('admin exports', () => {
  it('enrollment export neutralises a malicious name typed on the public form', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u', role: 'admin' } });
    mockGetEnrollmentsWithDetails.mockResolvedValue([
      {
        id: 1,
        status: 'pending',
        createdAt: new Date('2026-10-01T00:00:00Z'),
        confirmationSentAt: null,
        student: {
          id: 1,
          fullName: '=HYPERLINK("http://evil.test","Click")',
          email: 'x@example.com',
          phone: '+919876543210',
          collegeRollNumber: '@cmd',
          branch: 'CSE',
          year: 3
        },
        program: { id: 1, name: 'FSWD', code: 'FSWD-2026', capacity: 60 }
      }
    ]);

    const result = await exportEnrollmentsCsvAction({});

    expect(result.success).toBe(true);
    const rows = Papa.parse<string[]>((result as { csvData: string }).csvData).data;
    expect(rows[1][0]).toBe(`'=HYPERLINK("http://evil.test","Click")`);
    expect(rows[1][2]).toBe("'+919876543210");
    expect(rows[1][3]).toBe("'@cmd");
    for (const cell of rows[1]) expect(cell).not.toMatch(/^[=+\-@]/);
  });

  it('import error report escapes formulas', () => {
    const csv = generateErrorReportCsv([
      {
        rowIndex: 2,
        fullName: '=cmd|"/c calc"!A1',
        email: 'bad',
        phone: '1',
        collegeRollNumber: 'R1',
        branch: 'CSE',
        year: 2,
        yearFormatted: '2nd Year',
        status: 'invalid',
        issue: 'Invalid email'
      } as any
    ]);
    const rows = Papa.parse<string[]>(csv).data;
    expect(rows[1][1].startsWith("'=")).toBe(true);
  });
});
