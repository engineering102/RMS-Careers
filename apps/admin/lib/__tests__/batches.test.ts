import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBatch,
  getBatches,
  getBatchById,
  assignTutorToBatch
} from '../db/queries/batches';

vi.mock('server-only', () => ({}));

let mockBatchesDb: any[] = [];
let mockAssignmentsDb: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation((condition: any) => {
            const promise = Promise.resolve(mockBatchesDb);
            (promise as any).limit = vi.fn().mockImplementation((n: number) => {
              return Promise.resolve(mockBatchesDb.slice(0, n));
            });
            (promise as any).orderBy = vi.fn().mockImplementation(() => {
              return Promise.resolve(mockBatchesDb);
            });
            return promise;
          }),
          orderBy: vi.fn().mockImplementation(() => Promise.resolve(mockBatchesDb)),
          innerJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => {
              return Promise.resolve(
                mockAssignmentsDb.map((a) => {
                  const b = mockBatchesDb.find((item) => item.id === a.batchId);
                  return { batch: b };
                })
              );
            })
          }))
        }))
      })),
      insert: vi.fn().mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((vals: any) => ({
          returning: vi.fn().mockImplementation(() => {
            if ('tutorId' in vals && 'batchId' in vals) {
              const duplicate = mockAssignmentsDb.some(
                (a) => a.tutorId === vals.tutorId && a.batchId === vals.batchId
              );
              if (duplicate) {
                return Promise.reject(new Error('duplicate key value violates unique constraint "tutor_batch_idx"'));
              }
              const record = {
                id: mockAssignmentsDb.length + 1,
                tutorId: vals.tutorId,
                batchId: vals.batchId,
                assignedAt: new Date()
              };
              mockAssignmentsDb.push(record);
              return Promise.resolve([record]);
            }

            const record = {
              id: 'b0000000-0000-0000-0000-00000000000' + (mockBatchesDb.length + 1),
              programId: vals.programId,
              collegeId: vals.collegeId,
              name: vals.name,
              startDate: vals.startDate || null,
              endDate: vals.endDate || null,
              createdAt: new Date()
            };
            mockBatchesDb.push(record);
            return Promise.resolve([record]);
          })
        }))
      }))
    }
  };
});

describe('Phase 1 — Institutional Foundation (Batches & Tutor Multi-College Assignments)', () => {
  const collegeA = 'c0000000-0000-0000-0000-000000000001';
  const collegeB = 'c0000000-0000-0000-0000-000000000002';
  const tutorId = 't0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchesDb = [];
    mockAssignmentsDb = [];
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
  });

  it('creates a batch associated with a specific program and college', async () => {
    const batch = await createBatch({
      programId: 101,
      collegeId: collegeA,
      name: 'Batch 2026-A',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-01')
    });

    expect(batch).toBeDefined();
    expect(batch.id).toBeDefined();
    expect(batch.programId).toBe(101);
    expect(batch.collegeId).toBe(collegeA);
    expect(batch.name).toBe('Batch 2026-A');
  });

  it('allows a tutor to be assigned to batches across multiple colleges (multi-college capability)', async () => {
    // Create batch in College A
    const batchA = await createBatch({
      programId: 101,
      collegeId: collegeA,
      name: 'College A - DSA Morning'
    });

    // Create batch in College B
    const batchB = await createBatch({
      programId: 102,
      collegeId: collegeB,
      name: 'College B - Web Dev Evening'
    });

    // Assign same tutor to both batches in different colleges
    const assignmentA = await assignTutorToBatch(tutorId, batchA.id);
    const assignmentB = await assignTutorToBatch(tutorId, batchB.id);

    expect(assignmentA.tutorId).toBe(tutorId);
    expect(assignmentA.batchId).toBe(batchA.id);

    expect(assignmentB.tutorId).toBe(tutorId);
    expect(assignmentB.batchId).toBe(batchB.id);

    expect(mockAssignmentsDb.length).toBe(2);
  });

  it('rejects duplicate assignment of the same tutor to the same batch', async () => {
    const batch = await createBatch({
      programId: 101,
      collegeId: collegeA,
      name: 'Unique Batch'
    });

    await assignTutorToBatch(tutorId, batch.id);

    await expect(assignTutorToBatch(tutorId, batch.id)).rejects.toThrow(
      'duplicate key value violates unique constraint "tutor_batch_idx"'
    );
  });
});
