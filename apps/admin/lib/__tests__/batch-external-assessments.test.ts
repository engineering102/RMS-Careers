import { describe, it, expect, vi, beforeEach } from 'vitest';
import util from 'node:util';
import {
  parseExternalAssessmentCsv,
  validateAndMatchAssessmentRows,
  generateExternalAssessmentCsvTemplate
} from '@/lib/services/external-assessment-parser';
import {
  calculatePerformanceTier,
  getBatchExternalAssessmentsOverview,
  getBatchExternalAssessmentRecords,
  persistExternalAssessmentImport,
  deleteExternalAssessmentRecord
} from '@/lib/db/queries/batch-external-assessments';
import {
  previewExternalAssessmentCsvAction,
  confirmExternalAssessmentImportAction,
  deleteExternalAssessmentRecordAction
} from '../../app/(admin)/batches/[batchId]/external-assessments/actions';

vi.mock('server-only', () => ({}));

// Auth mock
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

// RevalidatePath mock
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const sampleBatchId = '11111111-1111-1111-1111-111111111111';
const otherBatchId = '22222222-2222-2222-2222-222222222222';
const sampleUserId = 'admin-user-uuid';

// Mock DB state
let mockBatches: any[] = [];
let mockEnrollments: any[] = [];
let mockStudents: any[] = [];
let mockExternalAssessmentRecords: any[] = [];
let mockUsers: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  const createMockDb = () => ({
    select: (fields?: any) => ({
      from: (table: any) => {
        let currentTable = table;
        const queryState = {
          joinedTables: [table],
          whereConditions: null as any,
          orderByVal: null as any,

          innerJoin(joinTable: any, condition: any) {
            queryState.joinedTables.push(joinTable);
            return queryState;
          },

          leftJoin(joinTable: any, condition: any) {
            queryState.joinedTables.push(joinTable);
            return queryState;
          },

          where(condition: any) {
            queryState.whereConditions = condition;
            return queryState;
          },

          orderBy(order: any) {
            queryState.orderByVal = order;
            return queryState;
          },

          limit(num: number) {
            return this.execute().slice(0, num);
          },

          execute() {
            // 1. batches table
            if (currentTable === actual.batches) {
              if (queryState.whereConditions) {
                const condStr = util.inspect(queryState.whereConditions, { depth: null });
                return mockBatches.filter((b) => condStr.includes(b.id));
              }
              return mockBatches;
            }

            // 2. enrollments table (joined with students)
            if (currentTable === actual.enrollments) {
              if (queryState.whereConditions) {
                const condStr = util.inspect(queryState.whereConditions, { depth: null });

                // Check for count query
                if (fields && fields.count) {
                  const enrolledCount = mockEnrollments.filter((e) =>
                    condStr.includes(sampleBatchId) ? e.batchId === sampleBatchId : true
                  ).length;
                  return [{ count: enrolledCount }];
                }

                if (condStr.includes(sampleBatchId)) {
                  const enrolled = mockEnrollments.filter((e) => e.batchId === sampleBatchId);
                  return enrolled.map((e) => {
                    const student = mockStudents.find((s) => s.id === e.studentId);
                    return {
                      id: student?.id,
                      studentId: e.studentId,
                      fullName: student?.fullName || '',
                      collegeRollNumber: student?.collegeRollNumber || null,
                      email: student?.email || ''
                    };
                  });
                }
              }
              return [];
            }

            // 3. externalAssessmentRecords table
            if (currentTable === actual.externalAssessmentRecords) {
              const condStr = queryState.whereConditions
                ? util.inspect(queryState.whereConditions, { depth: null })
                : '';

              let records = [...mockExternalAssessmentRecords];
              if (condStr.includes(sampleBatchId)) {
                records = records.filter((r) => r.batchId === sampleBatchId);
              } else if (condStr.includes(otherBatchId)) {
                records = records.filter((r) => r.batchId === otherBatchId);
              }

              // Filter by assessmentCode or provider if in condition
              if (condStr.includes('assessmentCode')) {
                // handle specific query if needed
              }

              return records.map((r) => {
                const student = mockStudents.find((s) => s.id === r.studentId);
                const reviewer = mockUsers.find((u) => u.id === r.importedByUserId);
                return {
                  id: r.id,
                  studentId: r.studentId,
                  batchId: r.batchId,
                  assessmentCode: r.assessmentCode,
                  assessmentName: r.assessmentName,
                  provider: r.provider,
                  maxScore: r.maxScore,
                  obtainedScore: r.obtainedScore,
                  percentile: r.percentile,
                  importedByUserId: r.importedByUserId,
                  importedAt: r.importedAt || new Date(),
                  studentName: student?.fullName || 'Unknown Student',
                  studentEmail: student?.email || '',
                  collegeRollNumber: student?.collegeRollNumber || null,
                  importedByName: reviewer?.name || null
                };
              });
            }

            return [];
          },

          then(resolve: any) {
            return Promise.resolve(this.execute()).then(resolve);
          }
        };

        return queryState;
      }
    }),

    insert: (table: any) => ({
      values: (data: any) => {
        const rows = Array.isArray(data) ? data : [data];
        rows.forEach((row) => {
          mockExternalAssessmentRecords.push({
            id: row.id || mockExternalAssessmentRecords.length + 1,
            ...row,
            importedAt: row.importedAt || new Date()
          });
        });
        return {
          execute: async () => rows,
          then: (resolve: any) => Promise.resolve(rows).then(resolve)
        };
      }
    }),

    update: (table: any) => ({
      set: (updates: any) => ({
        where: (condition: any) => {
          const runUpdate = async () => {
            const condStr = util.inspect(condition, { depth: null });
            mockExternalAssessmentRecords = mockExternalAssessmentRecords.map((r) => {
              if (
                condStr.includes(String(r.id)) ||
                (condStr.includes(String(r.studentId)) &&
                  condStr.includes(r.batchId) &&
                  condStr.includes(r.assessmentCode))
              ) {
                return { ...r, ...updates };
              }
              return r;
            });
            return [];
          };

          return {
            execute: runUpdate,
            then: (resolve: any) => runUpdate().then(resolve)
          };
        }
      })
    }),

    delete: (table: any) => ({
      where: (condition: any) => {
        const runDelete = async () => {
          const condStr = util.inspect(condition, { depth: null });
          mockExternalAssessmentRecords = mockExternalAssessmentRecords.filter((r) => {
            const matchesBatch = condStr.includes(r.batchId);
            const matchesId = condStr.includes(String(r.id));
            return !(matchesBatch && matchesId);
          });
          return [];
        };

        return {
          execute: runDelete,
          then: (resolve: any) => runDelete().then(resolve)
        };
      }
    })
  });

  return {
    ...actual,
    db: createMockDb()
  };
});

describe('Phase 3 Slice C4 — External Assessment Ingestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    mockBatches = [
      {
        id: sampleBatchId,
        name: 'CSE Batch 2026',
        collegeId: 'coll-1',
        programId: 101,
        status: 'active'
      },
      {
        id: otherBatchId,
        name: 'ECE Batch 2026',
        collegeId: 'coll-1',
        programId: 102,
        status: 'active'
      }
    ];

    mockStudents = [
      {
        id: 1,
        fullName: 'Alice Smith',
        collegeRollNumber: 'CS-2026-001',
        email: 'alice@example.edu'
      },
      {
        id: 2,
        fullName: 'Bob Johnson',
        collegeRollNumber: 'CS-2026-002',
        email: 'bob@example.edu'
      },
      {
        id: 3,
        fullName: 'Charlie Davis',
        collegeRollNumber: 'EC-2026-003',
        email: 'charlie@example.edu'
      },
      {
        id: 99,
        fullName: 'Other Student',
        collegeRollNumber: 'ME-2026-999',
        email: 'other@example.edu'
      }
    ];

    mockEnrollments = [
      { batchId: sampleBatchId, studentId: 1, status: 'confirmed' },
      { batchId: sampleBatchId, studentId: 2, status: 'confirmed' },
      { batchId: sampleBatchId, studentId: 3, status: 'confirmed' },
      { batchId: otherBatchId, studentId: 99, status: 'confirmed' }
    ];

    mockExternalAssessmentRecords = [];
    mockUsers = [
      {
        id: sampleUserId,
        name: 'Admin Reviewer',
        role: 'super_admin',
        email: 'admin@rms.edu'
      }
    ];

    mockAuth.mockResolvedValue({
      user: {
        id: sampleUserId,
        role: 'super_admin',
        email: 'admin@rms.edu'
      }
    });
  });

  // ==========================================
  // 1. Authentication & Role Guards
  // ==========================================
  describe('1. Authentication & Role Guards', () => {
    it('rejects unauthenticated user on preview action', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await previewExternalAssessmentCsvAction(
        sampleBatchId,
        'roll_number,score\nCS-2026-001,85',
        {
          assessmentCode: 'TEST-01',
          assessmentName: 'Test Assessment',
          provider: 'HackerRank',
          defaultMaxScore: 100
        }
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });

    it('rejects unauthenticated user on confirm import action', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await confirmExternalAssessmentImportAction(sampleBatchId, {
        duplicateStrategy: 'update',
        rows: []
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/unauthorized/i);
    });

    it('allows authorized super_admin role', async () => {
      mockAuth.mockResolvedValue({
        user: { id: sampleUserId, role: 'super_admin' }
      });

      const res = await previewExternalAssessmentCsvAction(
        sampleBatchId,
        'roll_number,score\nCS-2026-001,85',
        {
          assessmentCode: 'DSA-101',
          assessmentName: 'DSA Test',
          provider: 'HackerRank',
          defaultMaxScore: 100
        }
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.summary.validCount).toBe(1);
      }
    });
  });

  // ==========================================
  // 2. Batch Isolation
  // ==========================================
  describe('2. Batch Isolation', () => {
    it('rejects non-existent batch on preview action', async () => {
      const res = await previewExternalAssessmentCsvAction(
        'non-existent-batch-uuid',
        'roll_number,score\nCS-2026-001,85',
        {
          assessmentCode: 'TEST-01',
          assessmentName: 'Test',
          provider: 'AMCAT',
          defaultMaxScore: 100
        }
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/not found/i);
      }
    });

    it('flags student from another batch as unmatched within this batch cohort', async () => {
      // ME-2026-999 is enrolled in otherBatchId, NOT sampleBatchId
      const csv = 'roll_number,score\nME-2026-999,92';
      const parsed = parseExternalAssessmentCsv(csv);
      expect(parsed.success).toBe(true);

      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'TEST-01',
        assessmentName: 'Test',
        provider: 'AMCAT',
        defaultMaxScore: 100
      });

      expect(preview.summary.validCount).toBe(0);
      expect(preview.summary.unmatchedCount).toBe(1);
      expect(preview.rows[0].status).toBe('unmatched');
      expect(preview.rows[0].error).toMatch(/not enrolled in this batch cohort/i);
    });

    it('cannot delete external assessment record belonging to another batch', async () => {
      // Seed record in otherBatchId
      mockExternalAssessmentRecords.push({
        id: 999,
        batchId: otherBatchId,
        studentId: 99,
        assessmentCode: 'EXT-01',
        assessmentName: 'External 01',
        provider: 'ProviderX',
        maxScore: 100,
        obtainedScore: 80,
        percentile: null,
        importedByUserId: sampleUserId,
        importedAt: new Date()
      });

      // Try to delete record 999 using sampleBatchId
      const res = await deleteExternalAssessmentRecord(sampleBatchId, 999);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/not found|does not belong/i);
      expect(mockExternalAssessmentRecords.length).toBe(1); // not deleted
    });
  });

  // ==========================================
  // 3. CSV Parsing & Header Normalization
  // ==========================================
  describe('3. CSV Parsing & Header Normalization', () => {
    it('parses valid CSV with standard columns', () => {
      const csv = `roll_number,score,max_score,percentile,assessment_code,assessment_name,provider
CS-2026-001,85,100,92,ALGO-101,Algorithms Test,HackerRank`;

      const result = parseExternalAssessmentCsv(csv);
      expect(result.success).toBe(true);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].rawStudentIdentifier).toBe('CS-2026-001');
      expect(result.rows[0].scoreStr).toBe('85');
      expect(result.rows[0].maxScoreStr).toBe('100');
      expect(result.rows[0].percentileStr).toBe('92');
      expect(result.rows[0].assessmentCode).toBe('ALGO-101');
      expect(result.rows[0].provider).toBe('HackerRank');
    });

    it('returns clear error for empty CSV content', () => {
      const result = parseExternalAssessmentCsv('   \n   ');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/empty/i);
    });

    it('returns error when student identifier column is missing', () => {
      const csv = `score,max_score\n85,100`;
      const result = parseExternalAssessmentCsv(csv);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/missing student identifier/i);
    });

    it('returns error when score column is missing', () => {
      const csv = `roll_number,max_score\nCS-2026-001,100`;
      const result = parseExternalAssessmentCsv(csv);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/missing score header/i);
    });

    it('handles whitespace normalization in headers and cell values', () => {
      const csv = `  Roll Number  ,   Score  ,  Provider  \n  CS-2026-001  ,  78  ,  CodeChef  `;
      const result = parseExternalAssessmentCsv(csv);
      expect(result.success).toBe(true);
      expect(result.rows[0].rawStudentIdentifier).toBe('CS-2026-001');
      expect(result.rows[0].scoreStr).toBe('78');
      expect(result.rows[0].provider).toBe('CodeChef');
    });

    it('matches student by email if roll number is not provided', async () => {
      const csv = `email,score\nalice@example.edu,90`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'DSA-FINAL',
        assessmentName: 'DSA Final Exam',
        provider: 'Wheebox',
        defaultMaxScore: 100
      });

      expect(preview.summary.validCount).toBe(1);
      expect(preview.rows[0].studentId).toBe(1);
      expect(preview.rows[0].studentName).toBe('Alice Smith');
    });
  });

  // ==========================================
  // 4. Data Validation Rules
  // ==========================================
  describe('4. Data Validation Rules', () => {
    it('marks row invalid if score is negative', async () => {
      const csv = `roll_number,score\nCS-2026-001,-10`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'TEST',
        assessmentName: 'Test',
        provider: 'Prov',
        defaultMaxScore: 100
      });

      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].error).toMatch(/negative/i);
    });

    it('marks row invalid if score exceeds max score', async () => {
      const csv = `roll_number,score,max_score\nCS-2026-001,105,100`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'TEST',
        assessmentName: 'Test',
        provider: 'Prov',
        defaultMaxScore: 100
      });

      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].error).toMatch(/exceeds maximum score/i);
    });

    it('marks row invalid if percentile is out of bounds (<0 or >100)', async () => {
      const csv = `roll_number,score,percentile\nCS-2026-001,80,105`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'TEST',
        assessmentName: 'Test',
        provider: 'Prov',
        defaultMaxScore: 100
      });

      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].error).toMatch(/percentile/i);
    });

    it('marks row invalid if assessment identifier is missing from both row and default', async () => {
      const csv = `roll_number,score\nCS-2026-001,80`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: '',
        assessmentName: 'Test',
        provider: 'Prov',
        defaultMaxScore: 100
      });

      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].error).toMatch(/assessment identifier code/i);
    });

    it('marks row invalid if score is non-numeric string', async () => {
      const csv = `roll_number,score\nCS-2026-001,N/A`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'TEST',
        assessmentName: 'Test',
        provider: 'Prov',
        defaultMaxScore: 100
      });

      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].error).toMatch(/valid number/i);
    });

    it('marks row invalid if student identifier is empty', async () => {
      const csv = `roll_number,score\n" ",85`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'TEST',
        assessmentName: 'Test',
        provider: 'Prov',
        defaultMaxScore: 100
      });

      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].error).toMatch(/missing student identifier/i);
    });

    it('matches student with whitespace padding and case variation', async () => {
      const csv = `roll_number,score\n  cs-2026-001  ,85`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'TEST',
        assessmentName: 'Test',
        provider: 'Prov',
        defaultMaxScore: 100
      });

      expect(preview.summary.validCount).toBe(1);
      expect(preview.rows[0].studentId).toBe(1);
      expect(preview.rows[0].studentName).toBe('Alice Smith');
    });
  });

  // ==========================================
  // 5. Duplicates & Deterministic Handling
  // ==========================================
  describe('5. Duplicate Detection & Deterministic Handling', () => {
    it('detects duplicate student assessment in the same CSV file', async () => {
      const csv = `roll_number,score,assessment_code\nCS-2026-001,80,AMCAT-01\nCS-2026-001,85,AMCAT-01`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'AMCAT-01',
        assessmentName: 'AMCAT',
        provider: 'AMCAT',
        defaultMaxScore: 100
      });

      expect(preview.summary.csvDuplicateCount).toBe(1);
      expect(preview.rows[1].status).toBe('duplicate_in_csv');
      expect(preview.rows[1].error).toMatch(/duplicate entry/i);
    });

    it('detects duplicate of existing database record and flags isDbDuplicate', async () => {
      // Pre-seed record
      mockExternalAssessmentRecords.push({
        id: 10,
        batchId: sampleBatchId,
        studentId: 1,
        assessmentCode: 'HCKR-ALGO',
        assessmentName: 'Algorithms',
        provider: 'HackerRank',
        maxScore: 100,
        obtainedScore: 75,
        percentile: 80,
        importedByUserId: sampleUserId,
        importedAt: new Date()
      });

      const csv = `roll_number,score,assessment_code\nCS-2026-001,95,HCKR-ALGO`;
      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'HCKR-ALGO',
        assessmentName: 'Algorithms',
        provider: 'HackerRank',
        defaultMaxScore: 100
      });

      expect(preview.summary.dbDuplicateCount).toBe(1);
      expect(preview.rows[0].isDbDuplicate).toBe(true);
      expect(preview.rows[0].status).toBe('valid');
    });

    it('updates existing record when duplicateStrategy is "update"', async () => {
      mockExternalAssessmentRecords.push({
        id: 1,
        batchId: sampleBatchId,
        studentId: 1,
        assessmentCode: 'CODE-01',
        assessmentName: 'Test Code',
        provider: 'CustomPlatform',
        maxScore: 100,
        obtainedScore: 60,
        percentile: 50,
        importedByUserId: sampleUserId,
        importedAt: new Date()
      });

      const input = {
        batchId: sampleBatchId,
        userId: sampleUserId,
        duplicateStrategy: 'update' as const,
        rows: [
          {
            studentId: 1,
            assessmentCode: 'CODE-01',
            assessmentName: 'Test Code Updated',
            provider: 'CustomPlatform',
            maxScore: 100,
            obtainedScore: 92,
            percentile: 95
          }
        ]
      };

      const result = await persistExternalAssessmentImport(input);
      expect(result.updatedCount).toBe(1);
      expect(result.insertedCount).toBe(0);
      expect(mockExternalAssessmentRecords[0].obtainedScore).toBe(92);
      expect(mockExternalAssessmentRecords[0].percentile).toBe(95);
    });

    it('skips existing record when duplicateStrategy is "skip"', async () => {
      mockExternalAssessmentRecords.push({
        id: 1,
        batchId: sampleBatchId,
        studentId: 1,
        assessmentCode: 'CODE-01',
        assessmentName: 'Test Code',
        provider: 'CustomPlatform',
        maxScore: 100,
        obtainedScore: 60,
        percentile: 50,
        importedByUserId: sampleUserId,
        importedAt: new Date()
      });

      const input = {
        batchId: sampleBatchId,
        userId: sampleUserId,
        duplicateStrategy: 'skip' as const,
        rows: [
          {
            studentId: 1,
            assessmentCode: 'CODE-01',
            assessmentName: 'Test Code Skipped',
            provider: 'CustomPlatform',
            maxScore: 100,
            obtainedScore: 92,
            percentile: 95
          }
        ]
      };

      const result = await persistExternalAssessmentImport(input);
      expect(result.skippedCount).toBe(1);
      expect(result.updatedCount).toBe(0);
      expect(mockExternalAssessmentRecords[0].obtainedScore).toBe(60); // unchanged
    });
  });

  // ==========================================
  // 6. Import & Persistence Workflow
  // ==========================================
  describe('6. Import & Persistence Workflow', () => {
    it('persists mixed valid and invalid rows by importing only valid ones', async () => {
      const csv = `roll_number,score,assessment_code
CS-2026-001,88,EXAM-1
INVALID-STUDENT,75,EXAM-1
CS-2026-002,94,EXAM-1`;

      const parsed = parseExternalAssessmentCsv(csv);
      const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
        assessmentCode: 'EXAM-1',
        assessmentName: 'General Exam',
        provider: 'Mettl',
        defaultMaxScore: 100
      });

      expect(preview.summary.validCount).toBe(2);
      expect(preview.summary.unmatchedCount).toBe(1);

      // Confirm import with only valid rows
      const validRows = preview.rows
        .filter((r) => r.status === 'valid')
        .map((r) => ({
          studentId: r.studentId!,
          assessmentCode: r.assessmentCode,
          assessmentName: r.assessmentName,
          provider: r.provider,
          maxScore: r.maxScore,
          obtainedScore: r.obtainedScore,
          percentile: r.percentile
        }));

      const res = await confirmExternalAssessmentImportAction(sampleBatchId, {
        duplicateStrategy: 'update',
        rows: validRows
      });

      expect(res.success).toBe(true);
      expect(res.insertedCount).toBe(2);
      expect(mockExternalAssessmentRecords.length).toBe(2);
      expect(mockExternalAssessmentRecords[0].batchId).toBe(sampleBatchId);
    });

    it('returns empty import cleanly when valid rows array is empty', async () => {
      const res = await confirmExternalAssessmentImportAction(sampleBatchId, {
        duplicateStrategy: 'update',
        rows: []
      });

      expect(res.success).toBe(true);
      expect(res.insertedCount).toBe(0);
      expect(res.message).toMatch(/no records/i);
    });
  });

  // ==========================================
  // 7. Provider Neutrality
  // ==========================================
  describe('7. Provider Neutrality', () => {
    it('accepts arbitrary external provider names without hardcoded branching', async () => {
      const providers = [
        'HackerRank',
        'AMCAT',
        'Mettl',
        'Wheebox',
        'CodeChef',
        'CustomUniversityPlatform',
        'InternalHackathon_2026'
      ];

      for (const provider of providers) {
        const csv = `roll_number,score,provider\nCS-2026-001,85,${provider}`;
        const parsed = parseExternalAssessmentCsv(csv);
        const preview = await validateAndMatchAssessmentRows(sampleBatchId, parsed.rows, {
          assessmentCode: 'PROV-TEST',
          assessmentName: 'Provider Test',
          provider: 'Default',
          defaultMaxScore: 100
        });

        expect(preview.summary.validCount).toBe(1);
        expect(preview.rows[0].provider).toBe(provider);
      }
    });
  });

  // ==========================================
  // 8. Performance Tier Calculations
  // ==========================================
  describe('8. Performance Tier Calculations', () => {
    it('computes correct tiers across percentage spectrum', () => {
      expect(calculatePerformanceTier(95)).toBe('elite');
      expect(calculatePerformanceTier(90)).toBe('elite');
      expect(calculatePerformanceTier(89.9)).toBe('advanced');
      expect(calculatePerformanceTier(75)).toBe('advanced');
      expect(calculatePerformanceTier(74.9)).toBe('proficient');
      expect(calculatePerformanceTier(60)).toBe('proficient');
      expect(calculatePerformanceTier(59.9)).toBe('developing');
      expect(calculatePerformanceTier(0)).toBe('developing');
    });
  });

  // ==========================================
  // 9. Batch Overview & Record Queries
  // ==========================================
  describe('9. Batch Overview & Record Queries', () => {
    it('computes correct metrics from batch external assessments overview', async () => {
      mockExternalAssessmentRecords = [
        {
          id: 1,
          batchId: sampleBatchId,
          studentId: 1,
          assessmentCode: 'EVAL-01',
          assessmentName: 'Test 1',
          provider: 'ProviderA',
          maxScore: 100,
          obtainedScore: 90,
          percentile: 95,
          importedByUserId: sampleUserId,
          importedAt: new Date()
        },
        {
          id: 2,
          batchId: sampleBatchId,
          studentId: 2,
          assessmentCode: 'EVAL-01',
          assessmentName: 'Test 1',
          provider: 'ProviderA',
          maxScore: 100,
          obtainedScore: 70,
          percentile: 75,
          importedByUserId: sampleUserId,
          importedAt: new Date()
        }
      ];

      const overview = await getBatchExternalAssessmentsOverview(sampleBatchId);

      expect(overview.stats.totalAssessmentsCount).toBe(1);
      expect(overview.stats.totalRecordsCount).toBe(2);
      expect(overview.stats.participatedStudentsCount).toBe(2);
      expect(overview.assessments[0].highestScore).toBe(90);
      expect(overview.stats.overallAveragePercentage).toBe(80); // (90 + 70) / 2
      expect(overview.stats.participationRatePercent).toBe(67);
    });

    it('generates a valid CSV template', () => {
      const template = generateExternalAssessmentCsvTemplate();
      expect(template).toContain('College Roll Number');
      expect(template).toContain('Score');
      expect(template).toContain('Email');
    });
  });
});
