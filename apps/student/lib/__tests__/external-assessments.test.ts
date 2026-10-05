import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  calculatePerformanceTier,
  getStudentExternalAssessments
} from '@/lib/db/queries/external-assessments';

const TEST_STUDENT_ID = 101;
const OTHER_STUDENT_ID = 999;
const ENROLLED_BATCH_A = '11111111-1111-4111-8111-111111111111';
const ENROLLED_BATCH_B = '22222222-2222-4222-8222-222222222222';
const UNENROLLED_BATCH = '88888888-8888-4888-8888-888888888888';

let mockEnrollments: any[] = [];
let mockExternalRecords: any[] = [];

vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');

  return {
    ...actual,
    db: {
      select: () => ({
        from: (table: any) => {
          // Mock enrollments query with innerJoin(batches)
          if (table === actual.enrollments) {
            const chain = {
              innerJoin: () => chain,
              where: () => Promise.resolve(mockEnrollments)
            };
            return chain;
          }

          // Mock externalAssessmentRecords query with where and orderBy
          if (table === actual.externalAssessmentRecords) {
            return {
              where: (condition: any) => {
                const chain = {
                  orderBy: () => Promise.resolve(mockExternalRecords)
                };
                return chain;
              }
            };
          }

          return {
            where: () => Promise.resolve([])
          };
        }
      })
    }
  };
});

describe('Slice 14: External Assessment Report Card', () => {
  beforeEach(() => {
    mockEnrollments = [
      { batchId: ENROLLED_BATCH_A, batchName: 'CSE 2026 Alpha' },
      { batchId: ENROLLED_BATCH_B, batchName: 'Full Stack Elite' }
    ];

    mockExternalRecords = [
      {
        id: 1,
        studentId: TEST_STUDENT_ID,
        batchId: ENROLLED_BATCH_A,
        assessmentCode: 'HKR-DSA-01',
        assessmentName: 'HackerEarth National Coding Benchmark',
        provider: 'HackerEarth',
        maxScore: 500,
        obtainedScore: 475,
        percentile: 96,
        importedAt: new Date('2026-10-01T10:00:00Z')
      },
      {
        id: 2,
        studentId: TEST_STUDENT_ID,
        batchId: ENROLLED_BATCH_B,
        assessmentCode: 'AMCAT-APT-02',
        assessmentName: 'AMCAT Employability Aptitude & Logic',
        provider: 'AMCAT',
        maxScore: 900,
        obtainedScore: 720,
        percentile: 82,
        importedAt: new Date('2026-09-15T10:00:00Z')
      }
    ];
  });

  describe('calculatePerformanceTier', () => {
    it('returns "elite" when percentile is 90 or higher', () => {
      expect(calculatePerformanceTier(80, 95)).toBe('elite');
      expect(calculatePerformanceTier(70, 90)).toBe('elite');
    });

    it('returns "elite" when percentage is 90 or higher even if percentile is lower or null', () => {
      expect(calculatePerformanceTier(92, null)).toBe('elite');
      expect(calculatePerformanceTier(90, 85)).toBe('elite');
    });

    it('returns "advanced" when percentile is between 75 and 89', () => {
      expect(calculatePerformanceTier(65, 78)).toBe('advanced');
      expect(calculatePerformanceTier(70, 75)).toBe('advanced');
    });

    it('returns "advanced" when percentage is between 75 and 89 and percentile is lower or null', () => {
      expect(calculatePerformanceTier(80, null)).toBe('advanced');
      expect(calculatePerformanceTier(75, 50)).toBe('advanced');
    });

    it('returns "proficient" when percentile is between 60 and 74', () => {
      expect(calculatePerformanceTier(55, 68)).toBe('proficient');
      expect(calculatePerformanceTier(50, 60)).toBe('proficient');
    });

    it('returns "proficient" when percentage is between 60 and 74 and percentile is lower or null', () => {
      expect(calculatePerformanceTier(65, null)).toBe('proficient');
      expect(calculatePerformanceTier(60, 40)).toBe('proficient');
    });

    it('returns "developing" when both percentile and percentage are below 60', () => {
      expect(calculatePerformanceTier(55, 50)).toBe('developing');
      expect(calculatePerformanceTier(45, null)).toBe('developing');
      expect(calculatePerformanceTier(0, 0)).toBe('developing');
    });
  });

  describe('getStudentExternalAssessments', () => {
    it('returns enriched external assessments with calculated metrics and tier', async () => {
      const results = await getStudentExternalAssessments(TEST_STUDENT_ID);

      expect(results).toHaveLength(2);

      // Record 1
      expect(results[0]).toMatchObject({
        id: 1,
        assessmentCode: 'HKR-DSA-01',
        assessmentName: 'HackerEarth National Coding Benchmark',
        provider: 'HackerEarth',
        batchId: ENROLLED_BATCH_A,
        batchName: 'CSE 2026 Alpha',
        maxScore: 500,
        obtainedScore: 475,
        percentage: 95, // (475 / 500) * 100
        percentile: 96,
        performanceTier: 'elite'
      });

      // Record 2
      expect(results[1]).toMatchObject({
        id: 2,
        assessmentCode: 'AMCAT-APT-02',
        assessmentName: 'AMCAT Employability Aptitude & Logic',
        provider: 'AMCAT',
        batchId: ENROLLED_BATCH_B,
        batchName: 'Full Stack Elite',
        maxScore: 900,
        obtainedScore: 720,
        percentage: 80, // (720 / 900) * 100
        percentile: 82,
        performanceTier: 'advanced'
      });
    });

    it('returns empty array when student has no active enrollments', async () => {
      mockEnrollments = [];
      const results = await getStudentExternalAssessments(TEST_STUDENT_ID);
      expect(results).toEqual([]);
    });

    it('handles null percentiles gracefully', async () => {
      mockExternalRecords = [
        {
          id: 3,
          studentId: TEST_STUDENT_ID,
          batchId: ENROLLED_BATCH_A,
          assessmentCode: 'TCS-ION-03',
          assessmentName: 'TCS NQT Benchmark',
          provider: 'TCS iON',
          maxScore: 100,
          obtainedScore: 68,
          percentile: null,
          importedAt: new Date('2026-10-02T10:00:00Z')
        }
      ];

      const results = await getStudentExternalAssessments(TEST_STUDENT_ID);
      expect(results).toHaveLength(1);
      expect(results[0].percentile).toBeNull();
      expect(results[0].percentage).toBe(68);
      expect(results[0].performanceTier).toBe('proficient');
    });

    it('prevents division by zero if maxScore is 0', async () => {
      mockExternalRecords = [
        {
          id: 4,
          studentId: TEST_STUDENT_ID,
          batchId: ENROLLED_BATCH_A,
          assessmentCode: 'ZERO-MAX-01',
          assessmentName: 'Experimental Assessment',
          provider: 'HackerEarth',
          maxScore: 0,
          obtainedScore: 0,
          percentile: null,
          importedAt: new Date()
        }
      ];

      const results = await getStudentExternalAssessments(TEST_STUDENT_ID);
      expect(results).toHaveLength(1);
      expect(results[0].percentage).toBe(0);
      expect(results[0].performanceTier).toBe('developing');
    });
  });
});
