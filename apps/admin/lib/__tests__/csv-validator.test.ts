import { describe, it, expect } from 'vitest';
import {
  normalizeAcademicYear,
  formatAcademicYear,
  validateImportRows
} from '../csv/validator';
import type { RawImportRow } from '../csv/parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<RawImportRow> = {}): RawImportRow {
  return {
    rowIndex: 1,
    fullName: 'Rahul Kumar',
    email: 'rahul@example.com',
    phone: '9876543210',
    collegeRollNumber: '21GN1A0501',
    branch: 'CSE',
    academicYear: '3rd Year',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// normalizeAcademicYear
// ---------------------------------------------------------------------------

describe('normalizeAcademicYear', () => {
  it('returns null for empty string', () => {
    expect(normalizeAcademicYear('')).toBeNull();
  });

  it('parses numeric strings', () => {
    expect(normalizeAcademicYear('1')).toBe(1);
    expect(normalizeAcademicYear('2')).toBe(2);
    expect(normalizeAcademicYear('3')).toBe(3);
    expect(normalizeAcademicYear('4')).toBe(4);
  });

  it('parses ordinal suffixes', () => {
    expect(normalizeAcademicYear('1st')).toBe(1);
    expect(normalizeAcademicYear('2nd')).toBe(2);
    expect(normalizeAcademicYear('3rd')).toBe(3);
    expect(normalizeAcademicYear('4th')).toBe(4);
  });

  it('parses written words', () => {
    expect(normalizeAcademicYear('first')).toBe(1);
    expect(normalizeAcademicYear('second')).toBe(2);
    expect(normalizeAcademicYear('third')).toBe(3);
    expect(normalizeAcademicYear('fourth')).toBe(4);
  });

  it('strips trailing "Year" and whitespace case-insensitively', () => {
    expect(normalizeAcademicYear('1st Year')).toBe(1);
    expect(normalizeAcademicYear('2nd year')).toBe(2);
    expect(normalizeAcademicYear('3RD YEAR')).toBe(3);
    expect(normalizeAcademicYear('  4th Year  ')).toBe(4);
  });

  it('returns null for out-of-range numbers', () => {
    expect(normalizeAcademicYear('0')).toBeNull();
    expect(normalizeAcademicYear('5')).toBeNull();
    expect(normalizeAcademicYear('99')).toBeNull();
  });

  it('returns null for non-numeric garbage', () => {
    expect(normalizeAcademicYear('abc')).toBeNull();
    expect(normalizeAcademicYear('PG')).toBeNull();
    expect(normalizeAcademicYear('N/A')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatAcademicYear
// ---------------------------------------------------------------------------

describe('formatAcademicYear', () => {
  it('formats years 1–4 with correct ordinal suffix', () => {
    expect(formatAcademicYear(1)).toBe('1st Year');
    expect(formatAcademicYear(2)).toBe('2nd Year');
    expect(formatAcademicYear(3)).toBe('3rd Year');
    expect(formatAcademicYear(4)).toBe('4th Year');
  });

  it('falls back to generic suffix for unlisted values', () => {
    expect(formatAcademicYear(5)).toBe('5th Year');
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — valid records
// ---------------------------------------------------------------------------

describe('validateImportRows — valid records', () => {
  it('marks a fully valid row as valid', () => {
    const [result] = validateImportRows([makeRow()]);
    expect(result.status).toBe('valid');
    expect(result.issue).toBeUndefined();
  });

  it('normalises email to lowercase', () => {
    const [result] = validateImportRows([makeRow({ email: 'RAHUL@EXAMPLE.COM' })]);
    expect(result.email).toBe('rahul@example.com');
    expect(result.status).toBe('valid');
  });

  it('accepts email with dots and plus signs', () => {
    const [result] = validateImportRows([makeRow({ email: 'rahul.kumar+test@example.co.in' })]);
    expect(result.status).toBe('valid');
  });

  it('accepts phone with +91 prefix', () => {
    const [result] = validateImportRows([makeRow({ phone: '+919876543210' })]);
    expect(result.status).toBe('valid');
  });

  it('accepts phone with 91 country code and hyphen', () => {
    const [result] = validateImportRows([makeRow({ phone: '91-9876543210' })]);
    expect(result.status).toBe('valid');
  });

  it('accepts all four academic year formats', () => {
    const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    years.forEach((yr, idx) => {
      const [result] = validateImportRows([makeRow({ academicYear: yr })]);
      expect(result.status).toBe('valid');
      expect(result.year).toBe(idx + 1);
    });
  });

  it('returns rowIndex as supplied', () => {
    const [result] = validateImportRows([makeRow({ rowIndex: 7 })]);
    expect(result.rowIndex).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — missing required fields
// ---------------------------------------------------------------------------

describe('validateImportRows — missing required fields', () => {
  it('marks empty fullName as invalid', () => {
    const [result] = validateImportRows([makeRow({ fullName: '' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/Full Name/i);
  });

  it('marks single-character fullName as invalid (< 2 chars)', () => {
    const [result] = validateImportRows([makeRow({ fullName: 'A' })]);
    expect(result.status).toBe('invalid');
  });

  it('marks missing email as invalid', () => {
    const [result] = validateImportRows([makeRow({ email: '' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/email/i);
  });

  it('marks missing phone as invalid', () => {
    const [result] = validateImportRows([makeRow({ phone: '' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/phone/i);
  });

  it('marks missing college roll number as invalid', () => {
    const [result] = validateImportRows([makeRow({ collegeRollNumber: '' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/roll/i);
  });

  it('marks missing branch as invalid', () => {
    const [result] = validateImportRows([makeRow({ branch: '' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/branch/i);
  });

  it('marks missing academic year as invalid', () => {
    const [result] = validateImportRows([makeRow({ academicYear: '' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/academic year/i);
  });

  it('accumulates multiple field errors into a single issue string', () => {
    const [result] = validateImportRows([makeRow({ fullName: '', email: '', phone: '' })]);
    expect(result.status).toBe('invalid');
    // issue should mention all three missing fields
    expect(result.issue).toMatch(/Full Name/i);
    expect(result.issue).toMatch(/email/i);
    expect(result.issue).toMatch(/phone/i);
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — invalid email formats
// ---------------------------------------------------------------------------

describe('validateImportRows — invalid email', () => {
  const badEmails = [
    'notanemail',
    'missing@tld',
    '@nodomain.com',
    'spaces in@email.com',
    'double@@domain.com'
  ];

  badEmails.forEach((email) => {
    it(`rejects "${email}"`, () => {
      const [result] = validateImportRows([makeRow({ email })]);
      expect(result.status).toBe('invalid');
      expect(result.issue).toMatch(/email/i);
    });
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — invalid phone formats
// ---------------------------------------------------------------------------

describe('validateImportRows — invalid phone', () => {
  const badPhones = [
    '12345',          // too short
    '1234567890',     // starts with invalid digit (must start 6-9)
    'abcdefghij',     // letters
    '98765432100',    // too long
    '55555 55555'     // invalid starting digit
  ];

  badPhones.forEach((phone) => {
    it(`rejects "${phone}"`, () => {
      const [result] = validateImportRows([makeRow({ phone })]);
      expect(result.status).toBe('invalid');
      expect(result.issue).toMatch(/phone/i);
    });
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — invalid academic year
// ---------------------------------------------------------------------------

describe('validateImportRows — invalid academic year', () => {
  const badYears = ['0', '5', 'PG', 'N/A', 'abc', ''];

  badYears.forEach((yr) => {
    it(`rejects "${yr}"`, () => {
      const [result] = validateImportRows([makeRow({ academicYear: yr })]);
      expect(result.status).toBe('invalid');
    });
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — in-file duplicates
// ---------------------------------------------------------------------------

describe('validateImportRows — in-file duplicates', () => {
  it('marks the second occurrence of the same email as in_file_duplicate', () => {
    const rows = [makeRow({ rowIndex: 2 }), makeRow({ rowIndex: 3 })];
    const results = validateImportRows(rows);
    expect(results[0].status).toBe('valid');
    expect(results[1].status).toBe('in_file_duplicate');
    expect(results[1].issue).toMatch(/duplicate/i);
  });

  it('treats email comparison as case-insensitive for duplicate detection', () => {
    const rows = [
      makeRow({ rowIndex: 2, email: 'rahul@example.com' }),
      makeRow({ rowIndex: 3, email: 'RAHUL@EXAMPLE.COM' })
    ];
    const results = validateImportRows(rows);
    expect(results[0].status).toBe('valid');
    expect(results[1].status).toBe('in_file_duplicate');
  });

  it('marks third occurrence as in_file_duplicate too', () => {
    const rows = [
      makeRow({ rowIndex: 2 }),
      makeRow({ rowIndex: 3 }),
      makeRow({ rowIndex: 4 })
    ];
    const results = validateImportRows(rows);
    expect(results[0].status).toBe('valid');
    expect(results[1].status).toBe('in_file_duplicate');
    expect(results[2].status).toBe('in_file_duplicate');
  });

  it('does not flag duplicate if first occurrence is itself invalid', () => {
    // Invalid email → not added to seen set → second row with same bad email is also invalid, not a duplicate
    const rows = [
      makeRow({ rowIndex: 2, email: 'bademail' }),
      makeRow({ rowIndex: 3, email: 'bademail' })
    ];
    const results = validateImportRows(rows);
    expect(results[0].status).toBe('invalid');
    expect(results[1].status).toBe('invalid'); // both invalid — not duplicate
  });

  it('correctly processes a mix of valid, duplicate, and invalid rows', () => {
    const rows = [
      makeRow({ rowIndex: 2, email: 'a@test.com' }),   // valid
      makeRow({ rowIndex: 3, email: 'a@test.com' }),   // duplicate
      makeRow({ rowIndex: 4, email: 'b@test.com', phone: '' }), // invalid
      makeRow({ rowIndex: 5, email: 'c@test.com' })   // valid
    ];
    const results = validateImportRows(rows);
    expect(results[0].status).toBe('valid');
    expect(results[1].status).toBe('in_file_duplicate');
    expect(results[2].status).toBe('invalid');
    expect(results[3].status).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — boundary conditions
// ---------------------------------------------------------------------------

describe('validateImportRows — boundary conditions', () => {
  it('returns empty array for empty input', () => {
    expect(validateImportRows([])).toEqual([]);
  });

  it('handles whitespace-only fullName as invalid', () => {
    const [result] = validateImportRows([makeRow({ fullName: '   ' })]);
    expect(result.status).toBe('invalid');
  });

  it('handles a row where year is a numeric string that parses to valid', () => {
    const [result] = validateImportRows([makeRow({ academicYear: '3' })]);
    expect(result.status).toBe('valid');
    expect(result.year).toBe(3);
  });

  it('preserves the year as 0 in output for rows with invalid year', () => {
    const [result] = validateImportRows([makeRow({ academicYear: 'invalid' })]);
    expect(result.year).toBe(0);
  });

  it('handles whitespace-only collegeRollNumber as invalid', () => {
    const [result] = validateImportRows([makeRow({ collegeRollNumber: '   ' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/College Roll Number is required/i);
  });

  it('handles whitespace-only branch as invalid', () => {
    const [result] = validateImportRows([makeRow({ branch: '   ' })]);
    expect(result.status).toBe('invalid');
    expect(result.issue).toMatch(/Branch is required/i);
  });

  it('trims whitespace around email and normalizes to lowercase', () => {
    const [result] = validateImportRows([makeRow({ email: '   Rahul.Verma@Example.COM   ' })]);
    expect(result.status).toBe('valid');
    expect(result.email).toBe('rahul.verma@example.com');
  });

  it('identifies in-file duplicates when emails match despite differing case and whitespace', () => {
    const rows = [
      makeRow({ rowIndex: 2, email: 'student@example.com' }),
      makeRow({ rowIndex: 3, email: '  STUDENT@EXAMPLE.COM  ' })
    ];
    const results = validateImportRows(rows);
    expect(results[0].status).toBe('valid');
    expect(results[1].status).toBe('in_file_duplicate');
  });

  it('preserves roll number and allows distinct students having the same roll number if emails differ per existing validator logic', () => {
    const rows = [
      makeRow({ rowIndex: 2, email: 's1@example.com', collegeRollNumber: 'ROLL_01' }),
      makeRow({ rowIndex: 3, email: 's2@example.com', collegeRollNumber: 'ROLL_01' })
    ];
    const results = validateImportRows(rows);
    expect(results[0].status).toBe('valid');
    expect(results[1].status).toBe('valid');
  });

  it('handles a large batch without affecting independent valid rows', () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      makeRow({ rowIndex: i + 2, email: `student${i}@example.com` })
    );
    const results = validateImportRows(rows);
    expect(results.every((r) => r.status === 'valid')).toBe(true);
  });
});
