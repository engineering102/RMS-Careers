/**
 * @file apps/admin/lib/services/external-assessment-parser.ts
 *
 * Provider-neutral CSV parser and student matching validator for external assessment results.
 * Strictly scopes student matching and duplicate checks to the selected batch context.
 */

import Papa from 'papaparse';
import {
  db,
  students,
  enrollments,
  externalAssessmentRecords,
  batches,
  type DbClient
} from '@rms/db';
import { eq, and, sql } from 'drizzle-orm';

export interface RawExternalAssessmentRow {
  rowIndex: number; // 1-indexed (excluding header)
  rawStudentIdentifier: string;
  scoreStr: string;
  maxScoreStr?: string;
  percentileStr?: string;
  assessmentCode?: string;
  assessmentName?: string;
  provider?: string;
}

export interface ParseCsvResult {
  success: boolean;
  rows: RawExternalAssessmentRow[];
  headers: string[];
  error?: string;
}

export interface AssessmentDefaultMeta {
  assessmentCode: string;
  assessmentName: string;
  provider: string;
  defaultMaxScore: number;
}

export type RowValidationStatus =
  | 'valid'
  | 'invalid'
  | 'unmatched'
  | 'duplicate_in_csv';

export interface ValidatedAssessmentRow {
  rowIndex: number;
  rawIdentifier: string;
  status: RowValidationStatus;
  error?: string;
  isDbDuplicate?: boolean;
  existingRecordId?: number;

  // Matched student fields
  studentId?: number;
  studentName?: string;
  studentEmail?: string;
  collegeRollNumber?: string | null;

  // Assessment fields
  assessmentCode: string;
  assessmentName: string;
  provider: string;
  maxScore: number;
  obtainedScore: number;
  percentile?: number | null;
  percentage: number;
}

export interface ValidationPreviewResult {
  summary: {
    totalRows: number;
    validCount: number;
    invalidCount: number;
    unmatchedCount: number;
    csvDuplicateCount: number;
    dbDuplicateCount: number;
  };
  rows: ValidatedAssessmentRow[];
}

/**
 * Normalizes header string to match flexible internal keys
 */
function normalizeHeaderName(header: string): string {
  const clean = (header || '').trim().toLowerCase().replace(/[\_\-]/g, ' ');

  // Student identifier headers
  if (
    clean.includes('roll') ||
    clean.includes('registration') ||
    clean.includes('student id') ||
    clean.includes('hall ticket') ||
    clean === 'id' ||
    clean === 'rollno'
  ) {
    return 'roll_number';
  }

  if (clean.includes('email') || clean.includes('mail')) {
    return 'email';
  }

  // Score headers
  if (
    clean === 'score' ||
    clean === 'marks' ||
    clean === 'obtained' ||
    clean === 'obtained score' ||
    clean === 'result' ||
    clean === 'points'
  ) {
    return 'score';
  }

  if (
    clean === 'max score' ||
    clean === 'maximum score' ||
    clean === 'total marks' ||
    clean === 'total score' ||
    clean === 'out of' ||
    clean === 'max'
  ) {
    return 'max_score';
  }

  // Percentile headers
  if (clean.includes('percentile')) {
    return 'percentile';
  }

  // Assessment metadata headers
  if (
    clean === 'assessment code' ||
    clean === 'test code' ||
    clean === 'assessment id' ||
    clean === 'test id' ||
    clean === 'code'
  ) {
    return 'assessment_code';
  }

  if (
    clean === 'assessment name' ||
    clean === 'test name' ||
    clean === 'assessment' ||
    clean === 'test'
  ) {
    return 'assessment_name';
  }

  if (
    clean === 'provider' ||
    clean === 'platform' ||
    clean === 'vendor' ||
    clean === 'source'
  ) {
    return 'provider';
  }

  return header.trim();
}

/**
 * Parses raw CSV string into normalized rows.
 * Provider-neutral: supports any arbitrary columns while extracting standard keys.
 */
export function parseExternalAssessmentCsv(csvContent: string): ParseCsvResult {
  if (!csvContent || !csvContent.trim()) {
    return {
      success: false,
      rows: [],
      headers: [],
      error: 'The uploaded CSV file is empty.'
    };
  }

  try {
    const parsed = Papa.parse<Record<string, any>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalizeHeaderName(h)
    });

    if (parsed.errors && parsed.errors.length > 0) {
      const firstError = parsed.errors[0];
      // Ignore trailing delimiter or minor quote warnings if rows parsed
      if (parsed.data.length === 0) {
        return {
          success: false,
          rows: [],
          headers: [],
          error: `Failed to parse CSV: ${firstError.message} (Line ${firstError.row || 1})`
        };
      }
    }

    const detectedHeaders = parsed.meta.fields || [];

    // Verify minimum required column structure: at least a student identifier and a score
    const hasIdentifierCol =
      detectedHeaders.includes('roll_number') || detectedHeaders.includes('email');
    const hasScoreCol = detectedHeaders.includes('score');

    if (!hasIdentifierCol) {
      return {
        success: false,
        rows: [],
        headers: detectedHeaders,
        error:
          'Missing student identifier header. CSV must contain a "College Roll Number" or "Email" column.'
      };
    }

    if (!hasScoreCol) {
      return {
        success: false,
        rows: [],
        headers: detectedHeaders,
        error:
          'Missing score header. CSV must contain a "Score" or "Marks" column.'
      };
    }

    const rows: RawExternalAssessmentRow[] = [];

    parsed.data.forEach((row, index) => {
      const rawIdentifier = (row['roll_number'] || row['email'] || '').toString().trim();
      const scoreStr = (row['score'] !== undefined && row['score'] !== null ? row['score'] : '')
        .toString()
        .trim();
      const maxScoreStr = row['max_score'] ? row['max_score'].toString().trim() : undefined;
      const percentileStr = row['percentile']
        ? row['percentile'].toString().trim()
        : undefined;
      const assessmentCode = row['assessment_code']
        ? row['assessment_code'].toString().trim()
        : undefined;
      const assessmentName = row['assessment_name']
        ? row['assessment_name'].toString().trim()
        : undefined;
      const provider = row['provider'] ? row['provider'].toString().trim() : undefined;

      rows.push({
        rowIndex: index + 1,
        rawStudentIdentifier: rawIdentifier,
        scoreStr,
        maxScoreStr,
        percentileStr,
        assessmentCode,
        assessmentName,
        provider
      });
    });

    return {
      success: true,
      rows,
      headers: detectedHeaders
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      headers: [],
      error: err?.message || 'An unexpected error occurred while parsing the CSV file.'
    };
  }
}

/**
 * Validates parsed rows against batch enrollment, assessment bounds, and duplicate constraints.
 * Strictly matches students only within the specified batchId.
 */
export async function validateAndMatchAssessmentRows(
  batchId: string,
  rawRows: RawExternalAssessmentRow[],
  defaultMeta: AssessmentDefaultMeta,
  client: DbClient = db
): Promise<ValidationPreviewResult> {
  // 1. Verify batch exists
  const [batch] = await client
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (!batch) {
    throw new Error('Target batch does not exist.');
  }

  // 2. Fetch all eligible enrolled students strictly within this batch
  const enrolledStudents = await client
    .select({
      id: students.id,
      fullName: students.fullName,
      email: students.email,
      collegeRollNumber: students.collegeRollNumber
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(
      and(
        eq(enrollments.batchId, batchId),
        sql`${enrollments.status} IN ('active', 'confirmed', 'completed')`
      )
    );

  // Build lookup index: rollNumber (lowercase) -> student, email (lowercase) -> student
  const rollMap = new Map<string, (typeof enrolledStudents)[number]>();
  const emailMap = new Map<string, (typeof enrolledStudents)[number]>();

  enrolledStudents.forEach((s) => {
    if (s.collegeRollNumber) {
      rollMap.set(s.collegeRollNumber.toLowerCase().trim(), s);
    }
    if (s.email) {
      emailMap.set(s.email.toLowerCase().trim(), s);
    }
  });

  // 3. Query existing assessment records in this batch to detect database duplicates
  const existingRecords = await client
    .select({
      id: externalAssessmentRecords.id,
      studentId: externalAssessmentRecords.studentId,
      assessmentCode: externalAssessmentRecords.assessmentCode
    })
    .from(externalAssessmentRecords)
    .where(eq(externalAssessmentRecords.batchId, batchId));

  const existingDbKeys = new Map<string, number>();
  existingRecords.forEach((r) => {
    existingDbKeys.set(`${r.studentId}::${r.assessmentCode.toLowerCase()}`, r.id);
  });

  // Track duplicates within the uploaded CSV
  const seenCsvKeys = new Set<string>();

  const validatedRows: ValidatedAssessmentRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let unmatchedCount = 0;
  let csvDuplicateCount = 0;
  let dbDuplicateCount = 0;

  for (const raw of rawRows) {
    const rawId = raw.rawStudentIdentifier.trim();
    const effectiveCode = (raw.assessmentCode || defaultMeta.assessmentCode || '').trim();
    const effectiveName = (raw.assessmentName || defaultMeta.assessmentName || '').trim();
    const effectiveProvider = (raw.provider || defaultMeta.provider || '').trim();

    // Determine max score
    let effectiveMaxScore = defaultMeta.defaultMaxScore || 100;
    if (raw.maxScoreStr) {
      const parsedMax = parseInt(raw.maxScoreStr, 10);
      if (!isNaN(parsedMax) && parsedMax > 0) {
        effectiveMaxScore = parsedMax;
      }
    }

    // A. Check student identifier presence
    if (!rawId) {
      invalidCount++;
      validatedRows.push({
        rowIndex: raw.rowIndex,
        rawIdentifier: '',
        status: 'invalid',
        error: 'Missing student identifier (roll number or email).',
        assessmentCode: effectiveCode,
        assessmentName: effectiveName,
        provider: effectiveProvider,
        maxScore: effectiveMaxScore,
        obtainedScore: 0,
        percentage: 0
      });
      continue;
    }

    // B. Match student strictly in this batch
    const matched =
      rollMap.get(rawId.toLowerCase()) || emailMap.get(rawId.toLowerCase());

    if (!matched) {
      unmatchedCount++;
      validatedRows.push({
        rowIndex: raw.rowIndex,
        rawIdentifier: rawId,
        status: 'unmatched',
        error: `Student identifier "${rawId}" is not enrolled in this batch cohort.`,
        assessmentCode: effectiveCode,
        assessmentName: effectiveName,
        provider: effectiveProvider,
        maxScore: effectiveMaxScore,
        obtainedScore: 0,
        percentage: 0
      });
      continue;
    }

    // C. Validate assessment code presence
    if (!effectiveCode) {
      invalidCount++;
      validatedRows.push({
        rowIndex: raw.rowIndex,
        rawIdentifier: rawId,
        studentId: matched.id,
        studentName: matched.fullName,
        studentEmail: matched.email,
        collegeRollNumber: matched.collegeRollNumber,
        status: 'invalid',
        error: 'Assessment identifier code is required.',
        assessmentCode: '',
        assessmentName: effectiveName,
        provider: effectiveProvider,
        maxScore: effectiveMaxScore,
        obtainedScore: 0,
        percentage: 0
      });
      continue;
    }

    // D. Validate score
    if (!raw.scoreStr || isNaN(Number(raw.scoreStr))) {
      invalidCount++;
      validatedRows.push({
        rowIndex: raw.rowIndex,
        rawIdentifier: rawId,
        studentId: matched.id,
        studentName: matched.fullName,
        studentEmail: matched.email,
        collegeRollNumber: matched.collegeRollNumber,
        status: 'invalid',
        error: `Invalid score "${raw.scoreStr}". Score must be a valid number.`,
        assessmentCode: effectiveCode,
        assessmentName: effectiveName,
        provider: effectiveProvider,
        maxScore: effectiveMaxScore,
        obtainedScore: 0,
        percentage: 0
      });
      continue;
    }

    const obtainedScore = Math.round(Number(raw.scoreStr));
    if (obtainedScore < 0) {
      invalidCount++;
      validatedRows.push({
        rowIndex: raw.rowIndex,
        rawIdentifier: rawId,
        studentId: matched.id,
        studentName: matched.fullName,
        studentEmail: matched.email,
        collegeRollNumber: matched.collegeRollNumber,
        status: 'invalid',
        error: `Score cannot be negative (${obtainedScore}).`,
        assessmentCode: effectiveCode,
        assessmentName: effectiveName,
        provider: effectiveProvider,
        maxScore: effectiveMaxScore,
        obtainedScore,
        percentage: 0
      });
      continue;
    }

    if (obtainedScore > effectiveMaxScore) {
      invalidCount++;
      validatedRows.push({
        rowIndex: raw.rowIndex,
        rawIdentifier: rawId,
        studentId: matched.id,
        studentName: matched.fullName,
        studentEmail: matched.email,
        collegeRollNumber: matched.collegeRollNumber,
        status: 'invalid',
        error: `Obtained score (${obtainedScore}) exceeds maximum score (${effectiveMaxScore}).`,
        assessmentCode: effectiveCode,
        assessmentName: effectiveName,
        provider: effectiveProvider,
        maxScore: effectiveMaxScore,
        obtainedScore,
        percentage: Math.round((obtainedScore / effectiveMaxScore) * 100)
      });
      continue;
    }

    // E. Validate percentile if provided
    let percentile: number | null = null;
    if (raw.percentileStr && raw.percentileStr.trim() !== '') {
      const p = Math.round(Number(raw.percentileStr));
      if (isNaN(p) || p < 0 || p > 100) {
        invalidCount++;
        validatedRows.push({
          rowIndex: raw.rowIndex,
          rawIdentifier: rawId,
          studentId: matched.id,
          studentName: matched.fullName,
          studentEmail: matched.email,
          collegeRollNumber: matched.collegeRollNumber,
          status: 'invalid',
          error: `Percentile must be between 0 and 100 (got "${raw.percentileStr}").`,
          assessmentCode: effectiveCode,
          assessmentName: effectiveName,
          provider: effectiveProvider,
          maxScore: effectiveMaxScore,
          obtainedScore,
          percentage: Math.round((obtainedScore / effectiveMaxScore) * 100)
        });
        continue;
      }
      percentile = p;
    }

    // F. Check CSV internal duplicate
    const csvKey = `${matched.id}::${effectiveCode.toLowerCase()}`;
    if (seenCsvKeys.has(csvKey)) {
      csvDuplicateCount++;
      validatedRows.push({
        rowIndex: raw.rowIndex,
        rawIdentifier: rawId,
        studentId: matched.id,
        studentName: matched.fullName,
        studentEmail: matched.email,
        collegeRollNumber: matched.collegeRollNumber,
        status: 'duplicate_in_csv',
        error: `Duplicate entry for student "${matched.fullName}" in uploaded CSV.`,
        assessmentCode: effectiveCode,
        assessmentName: effectiveName,
        provider: effectiveProvider,
        maxScore: effectiveMaxScore,
        obtainedScore,
        percentile,
        percentage: Math.round((obtainedScore / effectiveMaxScore) * 100)
      });
      continue;
    }
    seenCsvKeys.add(csvKey);

    // G. Check Database duplicate
    const isDbDuplicate = existingDbKeys.has(csvKey);
    const existingRecordId = existingDbKeys.get(csvKey);
    if (isDbDuplicate) {
      dbDuplicateCount++;
    }

    validCount++;
    const percentage = Math.round((obtainedScore / effectiveMaxScore) * 100);

    validatedRows.push({
      rowIndex: raw.rowIndex,
      rawIdentifier: rawId,
      studentId: matched.id,
      studentName: matched.fullName,
      studentEmail: matched.email,
      collegeRollNumber: matched.collegeRollNumber,
      status: 'valid',
      isDbDuplicate,
      existingRecordId,
      assessmentCode: effectiveCode,
      assessmentName: effectiveName,
      provider: effectiveProvider,
      maxScore: effectiveMaxScore,
      obtainedScore,
      percentile,
      percentage
    });
  }

  return {
    summary: {
      totalRows: rawRows.length,
      validCount,
      invalidCount,
      unmatchedCount,
      csvDuplicateCount,
      dbDuplicateCount
    },
    rows: validatedRows
  };
}

/**
 * Generates sample CSV template for external assessment ingestion.
 */
export { generateExternalAssessmentCsvTemplate } from '@/lib/utils/external-assessment-template';
