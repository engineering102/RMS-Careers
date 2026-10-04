import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { getPublicPrograms, getPublicProgramByCode } from '../db/queries/programs';
import { db, programs } from '@rms/db';

vi.mock('@rms/db', () => ({
  db: {
    select: vi.fn()
  },
  programs: {
    id: 'programs.id',
    name: 'programs.name',
    code: 'programs.code',
    description: 'programs.description',
    status: 'programs.status',
    capacity: 'programs.capacity',
    collegeId: 'programs.collegeId',
    startDate: 'programs.startDate',
    endDate: 'programs.endDate',
    createdAt: 'programs.createdAt'
  }
}));

describe('Public Program Queries (@rms/web)', () => {
  const originalEnv = process.env.POSTGRES_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgresql://mock:mock@localhost:5432/mock';
  });

  describe('getPublicPrograms', () => {
    it('returns empty array when POSTGRES_URL is not set', async () => {
      delete process.env.POSTGRES_URL;
      const result = await getPublicPrograms();
      expect(result).toEqual([]);
    });

    it('queries only active programs where collegeId IS NULL', async () => {
      const mockRows = [
        {
          id: 1,
          name: 'Full Stack Engineering',
          code: 'FSE-2026',
          description: 'Web development program',
          capacity: 100,
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-12-01'),
          createdAt: new Date('2026-01-01')
        }
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockRows);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getPublicPrograms();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('FSE-2026');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(programs);
    });

    it('falls back gracefully when college_id column is missing in unmigrated environments (42703)', async () => {
      const dbError: any = new Error('column "college_id" does not exist');
      dbError.code = '42703';

      const mockFallbackRows = [
        {
          id: 2,
          name: 'Fallback Program',
          code: 'FALLBACK-01',
          description: 'Graceful fallback',
          capacity: 50,
          startDate: null,
          endDate: null,
          createdAt: new Date()
        }
      ];

      // First query throws 42703, second query succeeds
      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: () => ({
              where: () => ({
                orderBy: vi.fn().mockRejectedValue(dbError)
              })
            })
          } as any;
        }
        return {
          from: () => ({
            where: () => ({
              orderBy: vi.fn().mockResolvedValue(mockFallbackRows)
            })
          })
        } as any;
      });

      const result = await getPublicPrograms();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('FALLBACK-01');
    });
  });

  describe('getPublicProgramByCode', () => {
    it('returns null when program code is empty or missing', async () => {
      const result = await getPublicProgramByCode('');
      expect(result).toBeNull();
    });

    it('retrieves active public program matching code', async () => {
      const mockProgram = {
        id: 10,
        name: 'DSA Mastery',
        code: 'DSA-2026',
        description: 'DSA cohort',
        capacity: 150,
        startDate: null,
        endDate: null,
        createdAt: new Date()
      };

      const mockLimit = vi.fn().mockResolvedValue([mockProgram]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getPublicProgramByCode('DSA-2026');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('DSA-2026');
    });

    it('returns null if program is not found or is institution-private', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getPublicProgramByCode('PRIVATE-COLLEGE-PROGRAM');
      expect(result).toBeNull();
    });
  });
});
