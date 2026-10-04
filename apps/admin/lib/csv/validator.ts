import { type RawImportRow } from './parser';

export type RowStatus = 'valid' | 'invalid' | 'in_file_duplicate' | 'already_enrolled';

export interface ValidatedImportRow {
  rowIndex: number;
  fullName: string;
  email: string;
  phone: string;
  collegeRollNumber: string;
  branch: string;
  year: number; // 1, 2, 3, or 4
  yearFormatted: string; // '1st Year', '2nd Year', etc.
  status: RowStatus;
  issue?: string;
}

const phoneRegex = /^(?:\+?91[\-\s]?)?[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes academic year input string to integer (1, 2, 3, or 4)
 */
export function normalizeAcademicYear(input: string): number | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase().replace(/year/g, '').trim();

  if (clean === '1' || clean === '1st' || clean === 'first') return 1;
  if (clean === '2' || clean === '2nd' || clean === 'second') return 2;
  if (clean === '3' || clean === '3rd' || clean === 'third') return 3;
  if (clean === '4' || clean === '4th' || clean === 'fourth') return 4;

  const num = parseInt(clean, 10);
  if (num >= 1 && num <= 4) return num;

  return null;
}

export function formatAcademicYear(year: number): string {
  const map: Record<number, string> = {
    1: '1st Year',
    2: '2nd Year',
    3: '3rd Year',
    4: '4th Year'
  };
  return map[year] || `${year}th Year`;
}

/**
 * Validates raw rows and identifies in-file duplicate entries.
 */
export function validateImportRows(rawRows: RawImportRow[]): ValidatedImportRow[] {
  const seenEmails = new Set<string>();
  const results: ValidatedImportRow[] = [];

  for (const row of rawRows) {
    const issues: string[] = [];

    // 1. Full Name check
    if (!row.fullName || row.fullName.trim().length < 2) {
      issues.push('Full Name is required (minimum 2 characters)');
    }

    // 2. Email check
    const cleanEmail = (row.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      issues.push('Email address is required');
    } else if (!emailRegex.test(cleanEmail)) {
      issues.push('Invalid email address format');
    }

    // 3. Phone check
    const cleanPhone = (row.phone || '').trim();
    if (!cleanPhone) {
      issues.push('Phone number is required');
    } else if (!phoneRegex.test(cleanPhone)) {
      issues.push('Invalid 10-digit Indian phone number format');
    }

    // 4. College Roll Number check
    if (!row.collegeRollNumber || row.collegeRollNumber.trim().length === 0) {
      issues.push('College Roll Number is required');
    }

    // 5. Branch check
    if (!row.branch || row.branch.trim().length === 0) {
      issues.push('Branch is required');
    }

    // 6. Academic Year check
    const yearNumber = normalizeAcademicYear(row.academicYear);
    if (yearNumber === null) {
      issues.push(`Invalid Academic Year: "${row.academicYear}" (must be 1st-4th Year)`);
    }

    // Determine In-File Duplicate Status
    let isDuplicateInFile = false;
    if (cleanEmail && emailRegex.test(cleanEmail)) {
      if (seenEmails.has(cleanEmail)) {
        isDuplicateInFile = true;
      } else {
        seenEmails.add(cleanEmail);
      }
    }

    if (issues.length > 0) {
      results.push({
        rowIndex: row.rowIndex,
        fullName: row.fullName,
        email: cleanEmail || row.email,
        phone: row.phone,
        collegeRollNumber: row.collegeRollNumber,
        branch: row.branch,
        year: yearNumber || 0,
        yearFormatted: yearNumber ? formatAcademicYear(yearNumber) : row.academicYear,
        status: 'invalid',
        issue: issues.join('; ')
      });
    } else if (isDuplicateInFile) {
      results.push({
        rowIndex: row.rowIndex,
        fullName: row.fullName,
        email: cleanEmail,
        phone: row.phone,
        collegeRollNumber: row.collegeRollNumber,
        branch: row.branch,
        year: yearNumber!,
        yearFormatted: formatAcademicYear(yearNumber!),
        status: 'in_file_duplicate',
        issue: 'Duplicate entry in uploaded file (same email address)'
      });
    } else {
      results.push({
        rowIndex: row.rowIndex,
        fullName: row.fullName,
        email: cleanEmail,
        phone: row.phone,
        collegeRollNumber: row.collegeRollNumber,
        branch: row.branch,
        year: yearNumber!,
        yearFormatted: formatAcademicYear(yearNumber!),
        status: 'valid'
      });
    }
  }

  return results;
}
