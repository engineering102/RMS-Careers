import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { parseImportFile } from '../csv/parser';

// ---------------------------------------------------------------------------
// Helpers for creating Excel test buffers
// ---------------------------------------------------------------------------

function createExcelBuffer(
  rows: Record<string, any>[],
  options: {
    sheetName?: string;
    bookType?: 'xlsx' | 'xls';
  } = {}
): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Students');
  return XLSX.write(wb, { type: 'buffer', bookType: options.bookType || 'xlsx' });
}

function makeStandardRow(overrides: Record<string, any> = {}) {
  return {
    'Full Name': 'Ananya Sharma',
    'Email': 'ananya@example.com',
    'Phone Number': '9876543210',
    'College Roll Number': '21B91A0501',
    'Branch': 'Computer Science',
    'Academic Year': '3rd Year',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Excel (.xlsx and .xls) parsing tests
// ---------------------------------------------------------------------------

describe('parseImportFile — Excel (.xlsx / .xls) parsing', () => {
  it('parses a valid .xlsx file with a single student row', () => {
    const buffer = createExcelBuffer([makeStandardRow()]);
    const result = parseImportFile(buffer, 'students.xlsx');

    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      rowIndex: 2,
      fullName: 'Ananya Sharma',
      email: 'ananya@example.com',
      phone: '9876543210',
      collegeRollNumber: '21B91A0501',
      branch: 'Computer Science',
      academicYear: '3rd Year'
    });
  });

  it('parses multiple rows with correct 1-indexed rowIndex', () => {
    const buffer = createExcelBuffer([
      makeStandardRow({ 'Full Name': 'Student One', Email: 'one@example.com' }),
      makeStandardRow({ 'Full Name': 'Student Two', Email: 'two@example.com' }),
      makeStandardRow({ 'Full Name': 'Student Three', Email: 'three@example.com' })
    ]);
    const result = parseImportFile(buffer, 'students.xlsx');

    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].rowIndex).toBe(2);
    expect(result.rows[1].rowIndex).toBe(3);
    expect(result.rows[2].rowIndex).toBe(4);
    expect(result.rows[1].email).toBe('two@example.com');
  });

  it('parses legacy .xls format successfully', () => {
    const buffer = createExcelBuffer([makeStandardRow()], { bookType: 'xls' });
    const result = parseImportFile(buffer, 'legacy_students.xls');

    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fullName).toBe('Ananya Sharma');
  });

  it('normalizes alias headers in Excel files', () => {
    const customHeaderRow = {
      'Student Name': 'Vikram Rao',
      'Mail': 'vikram@example.com',
      'Mobile': '9123456780',
      'Registration Number': 'REG99001',
      'Stream': 'Information Technology',
      'Class': '2nd Year'
    };
    const buffer = createExcelBuffer([customHeaderRow]);
    const result = parseImportFile(buffer, 'students_custom_headers.xlsx');

    expect(result.success).toBe(true);
    expect(result.rows[0].fullName).toBe('Vikram Rao');
    expect(result.rows[0].email).toBe('vikram@example.com');
    expect(result.rows[0].phone).toBe('9123456780');
    expect(result.rows[0].collegeRollNumber).toBe('REG99001');
    expect(result.rows[0].branch).toBe('Information Technology');
    expect(result.rows[0].academicYear).toBe('2nd Year');
  });

  it('trims leading and trailing whitespace from Excel cell values', () => {
    const buffer = createExcelBuffer([
      makeStandardRow({
        'Full Name': '  Pooja Patel  ',
        'Email': '  pooja@example.com  ',
        'College Roll Number': '  21IT001  '
      })
    ]);
    const result = parseImportFile(buffer, 'whitespace.xlsx');

    expect(result.success).toBe(true);
    expect(result.rows[0].fullName).toBe('Pooja Patel');
    expect(result.rows[0].email).toBe('pooja@example.com');
    expect(result.rows[0].collegeRollNumber).toBe('21IT001');
  });

  it('fails with descriptive error when required columns are missing in Excel', () => {
    const incompleteRow = {
      'Full Name': 'Incomplete Student',
      'Email': 'incomplete@example.com'
    };
    const buffer = createExcelBuffer([incompleteRow]);
    const result = parseImportFile(buffer, 'incomplete.xlsx');

    expect(result.success).toBe(false);
    expect(result.missingColumns).toEqual(
      expect.arrayContaining(['Phone Number', 'College Roll Number', 'Branch', 'Academic Year'])
    );
    expect(result.error).toMatch(/Missing required column/i);
  });

  it('fails safely when Excel workbook contains no worksheets', () => {
    const spy = vi.spyOn(XLSX, 'read').mockReturnValueOnce({
      SheetNames: [],
      Sheets: {}
    } as any);

    const result = parseImportFile(Buffer.from('dummy'), 'no_sheets.xlsx');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no worksheets/i);

    spy.mockRestore();
  });

  it('fails safely on corrupted Excel buffer with graceful error message', () => {
    // Truncated invalid zip buffer triggers XLSX.read exception
    const corruptedBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00]);
    const result = parseImportFile(corruptedBuffer, 'corrupted.xlsx');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to read or parse the uploaded file/i);
    expect(result.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases & malformed CSV parsing tests
// ---------------------------------------------------------------------------

describe('parseImportFile — CSV edge cases & malformed inputs', () => {
  it('handles empty buffer safely without throwing uncaught exceptions', () => {
    const emptyBuffer = Buffer.from('');
    const result = parseImportFile(emptyBuffer, 'empty.csv');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/CSV parsing error/i);
    expect(result.rows).toHaveLength(0);
  });

  it('handles completely malformed or unclosed quotes in CSV safely', () => {
    const malformedCsv = 'Full Name,Email,Phone Number,College Roll Number,Branch,Academic Year\n"Unclosed Quote,test@example.com,9876543210,R1,CSE,1st Year';
    const result = parseImportFile(Buffer.from(malformedCsv, 'utf-8'), 'malformed.csv');

    expect(result).toBeDefined();
    if (!result.success) {
      expect(result.error).toBeDefined();
    } else {
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles CRLF (Windows) and LF (Unix) line endings identically', () => {
    const headers = 'Full Name,Email,Phone Number,College Roll Number,Branch,Academic Year';
    const row = '"Student Name","student@example.com","9876543210","ROLL123","CSE","2nd Year"';

    const crlfCsv = `${headers}\r\n${row}\r\n`;
    const lfCsv = `${headers}\n${row}\n`;

    const crlfResult = parseImportFile(Buffer.from(crlfCsv, 'utf-8'), 'crlf.csv');
    const lfResult = parseImportFile(Buffer.from(lfCsv, 'utf-8'), 'lf.csv');

    expect(crlfResult.success).toBe(true);
    expect(lfResult.success).toBe(true);
    expect(crlfResult.rows[0].fullName).toBe(lfResult.rows[0].fullName);
    expect(crlfResult.rows[0].email).toBe(lfResult.rows[0].email);
  });

  it('handles rows with commas inside quoted fields properly', () => {
    const csv = [
      'Full Name,Email,Phone Number,College Roll Number,Branch,Academic Year',
      '"Kumar, Rahul","rahul.k@example.com","9876543210","21CS01","Computer Science, Engineering","4th Year"'
    ].join('\n');

    const result = parseImportFile(Buffer.from(csv, 'utf-8'), 'commas.csv');

    expect(result.success).toBe(true);
    expect(result.rows[0].fullName).toBe('Kumar, Rahul');
    expect(result.rows[0].branch).toBe('Computer Science, Engineering');
  });
});
