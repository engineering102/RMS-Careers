import Papa from 'papaparse';
import { type ValidatedImportRow } from './validator';

/**
 * Returns sample CSV template text for student enrollment import
 */
export function generateCsvTemplate(): string {
  const data = [
    {
      'Full Name': 'Rahul Kumar',
      'Email': 'rahul.kumar@example.com',
      'Phone Number': '9876543210',
      'College Roll Number': '21GN1A0501',
      'Branch': 'CSE',
      'Academic Year': '3rd Year'
    },
    {
      'Full Name': 'Priya Sharma',
      'Email': 'priya.sharma@example.com',
      'Phone Number': '9123456789',
      'College Roll Number': '21GN1A0402',
      'Branch': 'ECE',
      'Academic Year': '2nd Year'
    }
  ];

  return Papa.unparse(data);
}

/**
 * Generates downloadable error report CSV text for invalid/problematic import rows
 */
export function generateErrorReportCsv(rows: ValidatedImportRow[]): string {
  const problemRows = rows.filter((r) => r.status !== 'valid');

  const reportData = problemRows.map((r) => ({
    'Row Number': r.rowIndex,
    'Full Name': r.fullName,
    'Email': r.email,
    'Phone Number': r.phone,
    'College Roll Number': r.collegeRollNumber,
    'Branch': r.branch,
    'Academic Year': r.yearFormatted,
    'Status': r.status,
    'Issue / Reason': r.issue || 'N/A'
  }));

  return Papa.unparse(reportData);
}
