import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOrUpdateStudent,
  getStudentsByCollege,
  updateStudentCollege
} from '../db/queries/students';

vi.mock('server-only', () => ({}));

let mockStudentsDb: any[] = [];
let mockStatsDb: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  const mockClient: any = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve(mockStudentsDb);
            (promise as any).limit = vi.fn().mockImplementation((n: number) => {
              return Promise.resolve(mockStudentsDb.slice(0, n));
            });
            (promise as any).orderBy = vi.fn().mockImplementation(() => {
              return Promise.resolve(mockStudentsDb);
            });
            return promise;
          }),
          orderBy: vi.fn().mockImplementation(() => Promise.resolve(mockStudentsDb))
        }))
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: any) => ({
          returning: vi.fn().mockImplementation(() => {
            const record = {
              id: mockStudentsDb.length + 1,
              ...vals,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            mockStudentsDb.push(record);
            return Promise.resolve([record]);
          })
        }))
      })),
      transaction: vi.fn().mockImplementation(async (callback: any) => {
        // Provide mock transaction object
        const tx = {
          update: vi.fn().mockImplementation((table: any) => ({
            set: vi.fn().mockImplementation((vals: any) => ({
              where: vi.fn().mockImplementation(() => ({
                returning: vi.fn().mockImplementation(() => {
                  if (vals.collegeId && vals.updatedAt) {
                    if (mockStudentsDb.length > 0) {
                      mockStudentsDb[0] = { ...mockStudentsDb[0], ...vals };
                    }
                    if (mockStatsDb.length > 0) {
                      mockStatsDb[0] = { ...mockStatsDb[0], ...vals };
                    }
                    return Promise.resolve([mockStudentsDb[0]]);
                  }
                  return Promise.resolve([]);
                })
              }))
            }))
          })),
          select: vi.fn().mockImplementation(() => ({
            from: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => Promise.resolve(mockStatsDb))
              }))
            }))
          })),
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation((vals: any) => ({
              returning: vi.fn().mockImplementation(() => {
                const statRecord = {
                  ...vals,
                  totalXp: 0,
                  currentLevel: 1,
                  currentStreak: 0,
                  longestStreak: 0,
                  dsaSolvedCount: 0,
                  updatedAt: new Date()
                };
                mockStatsDb.push(statRecord);
                return Promise.resolve([statRecord]);
              })
            }))
          }))
        };
        return await callback(tx);
      })
  };

  return {
    ...actual,
    // Mirrors drizzle-orm/neon-http: the root client cannot run transactions.
    db: { ...mockClient, transaction: async () => {
        throw new Error('No transactions support in neon-http driver');
      } },
    __txClient: mockClient
  };
});

// @rms/db/tx: the transactional client under test.
vi.mock('@rms/db/tx', async () => {
  const mod: any = await import('@rms/db');
  return { dbTx: mod.__txClient };
});

describe('Phase 1 — Student Institutional Affiliation & student_stats Invariant', () => {
  const collegeAlpha = 'c0000000-0000-0000-0000-000000000001';
  const collegeBeta = 'c0000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    vi.clearAllMocks();
    mockStudentsDb = [];
    mockStatsDb = [];
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
  });

  it('creates a student record linked explicitly to an institution', async () => {
    const student = await createOrUpdateStudent({
      fullName: 'Vikram Sharma',
      email: 'vikram.sharma@example.com',
      phone: '9876543210',
      collegeRollNumber: '1608-22-733-001',
      branch: 'CSE',
      year: 3,
      collegeId: collegeAlpha
    });

    expect(student).toBeDefined();
    expect(student.collegeId).toBe(collegeAlpha);
    expect(student.collegeRollNumber).toBe('1608-22-733-001');
  });

  it('transactionally synchronizes student_stats.college_id with students.college_id on institutional transfer', async () => {
    // 1. Initial student creation at collegeAlpha
    const student = await createOrUpdateStudent({
      fullName: 'Ananya Reddy',
      email: 'ananya@example.com',
      phone: '9123456780',
      collegeRollNumber: '1608-22-733-002',
      branch: 'IT',
      year: 2,
      collegeId: collegeAlpha
    });

    // 2. Perform institutional transfer to collegeBeta
    const result = await updateStudentCollege(student.id, collegeBeta);

    // 3. Verify INVARIANT: both students.collegeId and studentStats.collegeId are identical
    expect(result.student.collegeId).toBe(collegeBeta);
    expect(result.stats?.collegeId).toBe(collegeBeta);
    expect(result.student.collegeId).toBe(result.stats?.collegeId);
  });

  it('guarantees zero independent drift between student profile and leaderboard stats', async () => {
    const student = await createOrUpdateStudent({
      fullName: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      phone: '9888877777',
      collegeRollNumber: '1608-22-733-003',
      branch: 'ECE',
      year: 4,
      collegeId: collegeAlpha
    });

    // Initial stats setup
    mockStatsDb = [
      {
        studentId: student.id,
        collegeId: collegeAlpha,
        totalXp: 1500,
        currentLevel: 4
      }
    ];

    // Transfer student to collegeBeta
    const { student: updatedStudent, stats: updatedStats } = await updateStudentCollege(
      student.id,
      collegeBeta
    );

    expect(updatedStudent.collegeId).toBe(collegeBeta);
    expect(updatedStats?.collegeId).toBe(collegeBeta);

    // Invariant check: collegeId must match exactly
    expect(updatedStudent.collegeId).toEqual(updatedStats?.collegeId);
  });
});
