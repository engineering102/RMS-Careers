import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getColleges,
  getCollegeById,
  getCollegeByCode,
  createCollege,
  updateCollegeStatus
} from '../db/queries/colleges';

vi.mock('server-only', () => ({}));

// In-memory synthetic mock storage for institutional test fixtures
let mockCollegesDb: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation((condition: any) => {
            const promise = Promise.resolve(mockCollegesDb);
            (promise as any).limit = vi.fn().mockImplementation((n: number) => {
              return Promise.resolve(mockCollegesDb.slice(0, n));
            });
            (promise as any).orderBy = vi.fn().mockImplementation(() => {
              return Promise.resolve(mockCollegesDb);
            });
            return promise;
          }),
          orderBy: vi.fn().mockImplementation(() => Promise.resolve(mockCollegesDb))
        }))
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: any) => ({
          returning: vi.fn().mockImplementation(() => {
            // Enforce unique code constraint in test mock
            const exists = mockCollegesDb.some(
              (c) => c.code.toUpperCase() === vals.code.toUpperCase()
            );
            if (exists) {
              return Promise.reject(new Error('duplicate key value violates unique constraint "colleges_code_unique"'));
            }
            const record = {
              id: 'c0000000-0000-0000-0000-00000000000' + (mockCollegesDb.length + 1),
              name: vals.name,
              code: vals.code.toUpperCase(),
              city: vals.city || null,
              state: vals.state || null,
              isActive: vals.isActive ?? true,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            mockCollegesDb.push(record);
            return Promise.resolve([record]);
          })
        }))
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation((vals: any) => ({
          where: vi.fn().mockImplementation(() => ({
            returning: vi.fn().mockImplementation(() => {
              if (mockCollegesDb.length > 0) {
                mockCollegesDb[0] = { ...mockCollegesDb[0], ...vals };
                return Promise.resolve([mockCollegesDb[0]]);
              }
              return Promise.resolve([]);
            })
          }))
        }))
      }))
    }
  };
});

describe('Phase 1 — Institutional Foundation (Colleges Domain)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollegesDb = [];
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
  });

  it('creates an institution with uppercase normalized code', async () => {
    const created = await createCollege({
      name: 'Synthetic Institute of Technology',
      code: 'synth_it',
      city: 'Hyderabad',
      state: 'Telangana'
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Synthetic Institute of Technology');
    expect(created.code).toBe('SYNTH_IT');
    expect(created.isActive).toBe(true);
    expect(created.city).toBe('Hyderabad');
  });

  it('rejects creation when college code violates uniqueness constraint', async () => {
    await createCollege({
      name: 'College Alpha',
      code: 'ALPHA_01'
    });

    await expect(
      createCollege({
        name: 'Duplicate College Alpha',
        code: 'alpha_01'
      })
    ).rejects.toThrow('College code ALPHA_01 already exists.');
  });

  it('retrieves an institution by code case-insensitively', async () => {
    const created = await createCollege({
      name: 'Omega Academy',
      code: 'OMEGA'
    });

    // Mock query resolution for specific code lookup
    mockCollegesDb = [created];

    const found = await getCollegeByCode('omega');
    expect(found).not.toBeNull();
    expect(found?.code).toBe('OMEGA');
    expect(found?.name).toBe('Omega Academy');
  });

  it('updates institutional status to inactive and back to active', async () => {
    const created = await createCollege({
      name: 'Beta Polytechnic',
      code: 'BETA_POLY'
    });
    mockCollegesDb = [created];

    const deactivated = await updateCollegeStatus(created.id, false);
    expect(deactivated).not.toBeNull();
    expect(deactivated?.isActive).toBe(false);

    const reactivated = await updateCollegeStatus(created.id, true);
    expect(reactivated).not.toBeNull();
    expect(reactivated?.isActive).toBe(true);
  });

  it('returns empty array safely when POSTGRES_URL is unset', async () => {
    delete process.env.POSTGRES_URL;
    const result = await getColleges();
    expect(result).toEqual([]);
  });
});
