import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface RawImportRow {
  rowIndex: number; // 1-indexed (excluding header)
  fullName: string;
  email: string;
  phone: string;
  collegeRollNumber: string;
  branch: string;
  academicYear: string;
}

export interface ParseResult {
  success: boolean;
  rows: RawImportRow[];
  headers: string[];
  missingColumns?: string[];
  error?: string;
}

const REQUIRED_COLUMNS = [
  'Full Name',
  'Email',
  'Phone Number',
  'College Roll Number',
  'Branch',
  'Academic Year'
];

/**
 * Normalizes header string to match standard schema keys
 */
function normalizeHeaderName(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[\_\-]/g, ' ');
  if (clean.includes('full name') || clean === 'name' || clean === 'student name') return 'Full Name';
  if (clean.includes('email') || clean.includes('mail')) return 'Email';
  if (clean.includes('phone') || clean.includes('mobile') || clean.includes('contact')) return 'Phone Number';
  if (clean.includes('roll') || clean.includes('registration') || clean.includes('id number')) return 'College Roll Number';
  if (clean.includes('branch') || clean.includes('department') || clean.includes('stream')) return 'Branch';
  if (clean.includes('year') || clean.includes('academic year') || clean.includes('class')) return 'Academic Year';
  return header.trim();
}

/**
 * Parses buffer or base64 file data (.csv, .xlsx, .xls) into normalized raw rows.
 */
export function parseImportFile(buffer: Buffer, filename: string): ParseResult {
  try {
    const ext = filename.split('.').pop()?.toLowerCase();
    let rawObjects: Record<string, any>[] = [];
    let detectedHeaders: string[] = [];

    if (ext === 'csv') {
      const csvText = buffer.toString('utf-8');
      const parsed = Papa.parse<Record<string, any>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => normalizeHeaderName(h)
      });

      if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
        return {
          success: false,
          rows: [],
          headers: [],
          error: `CSV parsing error: ${parsed.errors[0].message}`
        };
      }

      detectedHeaders = parsed.meta.fields || [];
      rawObjects = parsed.data;
    } else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          rows: [],
          headers: [],
          error: 'The uploaded Excel file contains no worksheets.'
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (json.length > 0) {
        const firstRowKeys = Object.keys(json[0]);
        detectedHeaders = firstRowKeys.map((k) => normalizeHeaderName(k));

        // Remap row objects with normalized keys
        rawObjects = json.map((row) => {
          const newRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            newRow[normalizeHeaderName(key)] = row[key];
          });
          return newRow;
        });
      }
    } else {
      return {
        success: false,
        rows: [],
        headers: [],
        error: 'Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.'
      };
    }

    // Validate Required Columns
    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) => !detectedHeaders.includes(col)
    );

    if (missingColumns.length > 0) {
      return {
        success: false,
        rows: [],
        headers: detectedHeaders,
        missingColumns,
        error: `Missing required column${missingColumns.length === 1 ? '' : 's'}: ${missingColumns.join(', ')}`
      };
    }

    // Convert raw objects to RawImportRow items
    const rows: RawImportRow[] = rawObjects.map((item, index) => ({
      rowIndex: index + 2, // Row 1 is header, data starts at row 2
      fullName: String(item['Full Name'] || '').trim(),
      email: String(item['Email'] || '').trim(),
      phone: String(item['Phone Number'] || '').trim(),
      collegeRollNumber: String(item['College Roll Number'] || '').trim(),
      branch: String(item['Branch'] || '').trim(),
      academicYear: String(item['Academic Year'] || '').trim()
    }));

    return {
      success: true,
      rows,
      headers: detectedHeaders
    };
  } catch (err) {
    console.error('File parsing error:', err);
    return {
      success: false,
      rows: [],
      headers: [],
      error: 'Failed to read or parse the uploaded file. Please ensure it is a valid spreadsheet.'
    };
  }
}
