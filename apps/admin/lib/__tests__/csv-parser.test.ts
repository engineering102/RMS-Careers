import { describe, it, expect } from 'vitest';
import { parseImportFile } from '../csv/parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal valid CSV string with the standard column set.
 */
function makeCsv(rows: string[], headers = standardHeaders()): string {
  return [headers.join(','), ...rows].join('\n');
}

function standardHeaders(): string[] {
  return ['Full Name', 'Email', 'Phone Number', 'College Roll Number', 'Branch', 'Academic Year'];
}

function makeDataRow(
  name = 'Rahul Kumar',
  email = 'rahul@example.com',
  phone = '9876543210',
  roll = '21GN1A0501',
  branch = 'CSE',
  year = '3rd Year'
): string {
  return `"${name}","${email}","${phone}","${roll}","${branch}","${year}"`;
}

function bufferFrom(text: string): Buffer {
  return Buffer.from(text, 'utf-8');
}

// ---------------------------------------------------------------------------
// parseImportFile — basic CSV parsing
// ---------------------------------------------------------------------------

describe('parseImportFile — CSV success cases', () => {
  it('parses a valid CSV with one data row', () => {
    const csv = makeCsv([makeDataRow()]);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');

    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.fullName).toBe('Rahul Kumar');
    expect(row.email).toBe('rahul@example.com');
    expect(row.phone).toBe('9876543210');
    expect(row.collegeRollNumber).toBe('21GN1A0501');
    expect(row.branch).toBe('CSE');
    expect(row.academicYear).toBe('3rd Year');
  });

  it('assigns rowIndex starting from 2 (row 1 is header)', () => {
    const csv = makeCsv([makeDataRow(), makeDataRow('Priya', 'priya@example.com', '9123456789', 'ROLL2', 'ECE', '2nd Year')]);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');

    expect(result.success).toBe(true);
    expect(result.rows[0].rowIndex).toBe(2);
    expect(result.rows[1].rowIndex).toBe(3);
  });

  it('parses multiple data rows correctly', () => {
    const rows = [
      makeDataRow('Student A', 'a@example.com', '9000000001', 'ROLL1', 'CSE', '1st Year'),
      makeDataRow('Student B', 'b@example.com', '9000000002', 'ROLL2', 'ECE', '2nd Year'),
      makeDataRow('Student C', 'c@example.com', '9000000003', 'ROLL3', 'IT', '3rd Year')
    ];
    const result = parseImportFile(bufferFrom(makeCsv(rows)), 'import.csv');

    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(3);
  });

  it('returns empty rows array for header-only CSV', () => {
    const csv = standardHeaders().join(',') + '\n';
    const result = parseImportFile(bufferFrom(csv), 'import.csv');

    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it('trims whitespace from parsed field values', () => {
    const csv = makeCsv([`"  Rahul Kumar  ","  rahul@example.com  ","9876543210","ROLL1","CSE","3rd Year"`]);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');

    expect(result.success).toBe(true);
    expect(result.rows[0].fullName).toBe('Rahul Kumar');
    expect(result.rows[0].email).toBe('rahul@example.com');
  });
});

// ---------------------------------------------------------------------------
// parseImportFile — header normalization
// ---------------------------------------------------------------------------

describe('parseImportFile — header normalization', () => {
  it('accepts exact standard column names', () => {
    const result = parseImportFile(bufferFrom(makeCsv([makeDataRow()])), 'import.csv');
    expect(result.success).toBe(true);
    expect(result.missingColumns).toBeUndefined();
  });

  it('normalizes "Name" to "Full Name"', () => {
    const headers = ['Name', 'Email', 'Phone Number', 'College Roll Number', 'Branch', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('normalizes "Student Name" to "Full Name"', () => {
    const headers = ['Student Name', 'Email', 'Phone Number', 'College Roll Number', 'Branch', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('normalizes "Mobile" to "Phone Number"', () => {
    const headers = ['Full Name', 'Email', 'Mobile', 'College Roll Number', 'Branch', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('normalizes "Contact" to "Phone Number"', () => {
    const headers = ['Full Name', 'Email', 'Contact', 'College Roll Number', 'Branch', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('normalizes "Mail" to "Email"', () => {
    const headers = ['Full Name', 'Mail', 'Phone Number', 'College Roll Number', 'Branch', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('normalizes "Department" to "Branch"', () => {
    const headers = ['Full Name', 'Email', 'Phone Number', 'College Roll Number', 'Department', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('normalizes "Stream" to "Branch"', () => {
    const headers = ['Full Name', 'Email', 'Phone Number', 'College Roll Number', 'Stream', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('normalizes "Registration" (partial) to "College Roll Number"', () => {
    const headers = ['Full Name', 'Email', 'Phone Number', 'Registration Number', 'Branch', 'Academic Year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('handles mixed-case column headers', () => {
    const headers = ['FULL NAME', 'EMAIL', 'PHONE NUMBER', 'COLLEGE ROLL NUMBER', 'BRANCH', 'ACADEMIC YEAR'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('handles column names with extra whitespace', () => {
    const headers = ['  Full Name  ', '  Email  ', '  Phone Number  ', '  College Roll Number  ', '  Branch  ', '  Academic Year  '];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });

  it('handles underscore-separated headers (e.g. "full_name")', () => {
    const headers = ['full_name', 'email', 'phone_number', 'college_roll_number', 'branch', 'academic_year'];
    const csv = makeCsv([makeDataRow()], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseImportFile — missing columns
// ---------------------------------------------------------------------------

describe('parseImportFile — missing or malformed columns', () => {
  it('fails when Email column is absent', () => {
    const headers = ['Full Name', 'Phone Number', 'College Roll Number', 'Branch', 'Academic Year'];
    const csv = makeCsv(['"Rahul","9876543210","ROLL","CSE","3rd Year"'], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');

    expect(result.success).toBe(false);
    expect(result.missingColumns).toContain('Email');
  });

  it('fails when multiple columns are absent', () => {
    const headers = ['Full Name', 'Email'];
    const csv = makeCsv(['"Rahul","rahul@example.com"'], headers);
    const result = parseImportFile(bufferFrom(csv), 'import.csv');

    expect(result.success).toBe(false);
    expect(result.missingColumns!.length).toBeGreaterThan(1);
  });

  it('fails and lists all missing columns', () => {
    const headers = ['Full Name', 'Email'];
    const result = parseImportFile(bufferFrom(makeCsv([], headers)), 'import.csv');
    expect(result.success).toBe(false);
    expect(result.missingColumns).toEqual(
      expect.arrayContaining(['Phone Number', 'College Roll Number', 'Branch', 'Academic Year'])
    );
  });

  it('fails with a human-readable error message', () => {
    const headers = ['Full Name'];
    const result = parseImportFile(bufferFrom(headers.join(',') + '\n'), 'import.csv');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// parseImportFile — unsupported file types
// ---------------------------------------------------------------------------

describe('parseImportFile — unsupported file format', () => {
  it('rejects .txt extension', () => {
    const result = parseImportFile(bufferFrom('some,csv,data'), 'data.txt');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });

  it('rejects .json extension', () => {
    const result = parseImportFile(bufferFrom('{"key":"value"}'), 'data.json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });

  it('rejects empty filename extension', () => {
    const result = parseImportFile(bufferFrom('some data'), 'datafile');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });
});
