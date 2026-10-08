import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const insertValues = vi.fn();
const updateSet = vi.fn();
const whereSpy = vi.fn();
let insertError: unknown = null;
let updateError: unknown = null;

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({
          where: (cond: unknown) => {
            whereSpy(cond);
            return { orderBy: () => Promise.resolve([{ id: 'active-1', isActive: true }]) };
          }
        })
      }),
      insert: () => ({
        values: (v: any) => {
          insertValues(v);
          return {
            returning: () =>
              insertError ? Promise.reject(insertError) : Promise.resolve([{ id: 'x', ...v }])
          };
        }
      }),
      update: () => ({
        set: (v: any) => {
          updateSet(v);
          return {
            where: () => ({
              returning: () =>
                updateError ? Promise.reject(updateError) : Promise.resolve([{ id: 'x', ...v }])
            })
          };
        }
      })
    }
  };
});

import { createCollege, updateCollege, getActiveColleges } from '../db/queries/colleges';
import { createProgram, updateProgramCollege } from '../db/queries/programs';
import { DuplicateCollegeCodeError, normalizeCollegeCode } from '../utils/college';

describe('college/program query layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    updateError = null;
    process.env.POSTGRES_URL = 'postgres://test';
  });

  it('normalizes codes consistently', async () => {
    expect(normalizeCollegeCode('  mvsr-1 ')).toBe('MVSR-1');
    await createCollege({ name: ' A ', code: ' ab ' });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'A', code: 'AB', isActive: true })
    );
    await updateCollege('id', { name: 'A', code: ' cd ' });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ code: 'CD' }));
    expect(updateSet.mock.calls[0][0]).not.toHaveProperty('id');
  });

  it('translates unique violations into DuplicateCollegeCodeError (create + update)', async () => {
    insertError = Object.assign(new Error('boom'), { code: '23505' });
    await expect(createCollege({ name: 'A', code: 'dup' })).rejects.toBeInstanceOf(
      DuplicateCollegeCodeError
    );
    updateError = new Error('duplicate key value violates unique constraint "colleges_code_unique"');
    await expect(updateCollege('id', { name: 'A', code: 'dup' })).rejects.toBeInstanceOf(
      DuplicateCollegeCodeError
    );
  });

  it('rethrows non-unique errors untouched', async () => {
    insertError = new Error('connection reset');
    await expect(createCollege({ name: 'A', code: 'x' })).rejects.toThrow('connection reset');
  });

  it('getActiveColleges applies an is_active filter', async () => {
    const rows = await getActiveColleges();
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
  });

  it('createProgram persists collegeId, defaulting to NULL', async () => {
    await createProgram({ name: 'P', code: 'p', capacity: 1, collegeId: 'college-1' });
    expect(insertValues).toHaveBeenLastCalledWith(expect.objectContaining({ collegeId: 'college-1' }));
    await createProgram({ name: 'P', code: 'q', capacity: 1 });
    expect(insertValues).toHaveBeenLastCalledWith(expect.objectContaining({ collegeId: null }));
  });

  it('updateProgramCollege sets college_id (including null)', async () => {
    await updateProgramCollege(1, 'college-2');
    expect(updateSet).toHaveBeenLastCalledWith({ collegeId: 'college-2' });
    await updateProgramCollege(1, null);
    expect(updateSet).toHaveBeenLastCalledWith({ collegeId: null });
  });
});
