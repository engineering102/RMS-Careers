import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transferEnrollment } from '../db/queries/enrollments';

vi.mock('server-only', () => ({}));

let mockEnrollmentsDb: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  const mockClient: any = {
      transaction: vi.fn().mockImplementation(async (callback: any) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => {
                  return Promise.resolve(mockEnrollmentsDb.slice(0, 1));
                })
              }))
            }))
          })),
          update: vi.fn().mockImplementation(() => ({
            set: vi.fn().mockImplementation((vals: any) => ({
              where: vi.fn().mockImplementation(() => ({
                returning: vi.fn().mockImplementation(() => {
                  if (mockEnrollmentsDb.length > 0) {
                    mockEnrollmentsDb[0] = { ...mockEnrollmentsDb[0], ...vals };
                    return Promise.resolve([mockEnrollmentsDb[0]]);
                  }
                  return Promise.resolve([]);
                })
              }))
            }))
          })),
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation((vals: any) => ({
              returning: vi.fn().mockImplementation(() => {
                // Check active enrollment constraint: at most one active enrollment per student/batch
                const activeExisting = mockEnrollmentsDb.find(
                  (e) =>
                    e.studentId === vals.studentId &&
                    e.batchId === vals.batchId &&
                    (e.status === 'active' || e.status === 'confirmed')
                );
                if (activeExisting) {
                  return Promise.reject(
                    new Error('duplicate key value violates unique constraint "unique_active_batch_enrollment_idx"')
                  );
                }

                const newRec = {
                  id: mockEnrollmentsDb.length + 1,
                  ...vals,
                  createdAt: new Date()
                };
                mockEnrollmentsDb.push(newRec);
                return Promise.resolve([newRec]);
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

describe('Phase 1 — Enrollment Lifecycle & Transfer Semantics', () => {
  const batch1 = 'b0000000-0000-0000-0000-000000000001';
  const batch2 = 'b0000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollmentsDb = [];
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
  });

  it('preserves historical enrollment records during batch transfer without deleting records', async () => {
    // Initial active enrollment in batch 1
    mockEnrollmentsDb = [
      {
        id: 1,
        studentId: 10,
        programId: 101,
        batchId: batch1,
        status: 'active',
        createdAt: new Date('2026-01-01')
      }
    ];

    // Transfer enrollment to batch 2
    const { previousEnrollment, newEnrollment } = await transferEnrollment(1, batch2);

    // 1. Previous enrollment is marked 'transferred' with a timestamp (history preserved)
    expect(previousEnrollment.id).toBe(1);
    expect(previousEnrollment.status).toBe('transferred');
    expect(previousEnrollment.transferredAt).toBeDefined();

    // 2. New enrollment is active in batch 2
    expect(newEnrollment.id).toBe(2);
    expect(newEnrollment.studentId).toBe(10);
    expect(newEnrollment.programId).toBe(101);
    expect(newEnrollment.batchId).toBe(batch2);
    expect(newEnrollment.status).toBe('active');

    // 3. Both records exist in the database (non-destructive audit trail)
    expect(mockEnrollmentsDb.length).toBe(2);
    expect(mockEnrollmentsDb[0].status).toBe('transferred');
    expect(mockEnrollmentsDb[1].status).toBe('active');
  });

  it('rejects transfer of an already transferred enrollment', async () => {
    mockEnrollmentsDb = [
      {
        id: 1,
        studentId: 10,
        programId: 101,
        batchId: batch1,
        status: 'transferred',
        transferredAt: new Date()
      }
    ];

    await expect(transferEnrollment(1, batch2)).rejects.toThrow(
      "Cannot transfer enrollment with status 'transferred'"
    );
  });

  it('rejects transfer of a cancelled enrollment', async () => {
    mockEnrollmentsDb = [
      {
        id: 1,
        studentId: 10,
        programId: 101,
        batchId: batch1,
        status: 'cancelled'
      }
    ];

    await expect(transferEnrollment(1, batch2)).rejects.toThrow(
      "Cannot transfer enrollment with status 'cancelled'"
    );
  });
});
