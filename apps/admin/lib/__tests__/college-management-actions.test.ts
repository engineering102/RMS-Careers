import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));

import { DuplicateCollegeCodeError, selectableColleges } from '../utils/college';

let store: any[] = [];

vi.mock('@/lib/db/queries', async () => {
  const { DuplicateCollegeCodeError } = await import('../utils/college');
  return {
    getCollegeByCode: vi.fn(async (code: string) => store.find((c) => c.code === code) ?? null),
    getCollegeById: vi.fn(async (id: string) => store.find((c) => c.id === id) ?? null),
    createCollege: vi.fn(async (d: any) => {
      if (store.some((c) => c.code === d.code)) throw new DuplicateCollegeCodeError(d.code);
      const row = {
        id: `00000000-0000-4000-8000-00000000000${store.length + 1}`,
        isActive: true,
        ...d
      };
      store.push(row);
      return row;
    }),
    updateCollege: vi.fn(async (id: string, d: any) => {
      const row = store.find((c) => c.id === id);
      if (!row) return null;
      Object.assign(row, d);
      return row;
    }),
    updateCollegeStatus: vi.fn(async (id: string, isActive: boolean) => {
      const row = store.find((c) => c.id === id);
      if (!row) return null;
      row.isActive = isActive;
      return row;
    })
  };
});

import {
  createCollegeAction,
  updateCollegeAction,
  setCollegeActiveAction
} from '../../app/(admin)/colleges/actions';

const asRole = (role?: string) =>
  mockAuth.mockResolvedValue(role ? { user: { id: 'u1', role } } : null);

const ID_A = '00000000-0000-4000-8000-000000000001';
const ID_B = '00000000-0000-4000-8000-000000000002';

describe('College management actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = [];
  });

  describe('authorization', () => {
    it('super_admin can create', async () => {
      asRole('super_admin');
      const res = await createCollegeAction({ name: 'MVSR', code: 'mvsr' });
      expect(res.success).toBe(true);
      expect(store).toHaveLength(1);
    });

    it('admin (non super) cannot create', async () => {
      asRole('admin');
      const res = await createCollegeAction({ name: 'MVSR', code: 'MVSR' });
      expect(res.success).toBe(false);
      expect(store).toHaveLength(0);
    });

    it('unauthenticated and unknown roles cannot create', async () => {
      asRole(undefined);
      expect((await createCollegeAction({ name: 'X', code: 'X' })).success).toBe(false);
      asRole('student');
      expect((await createCollegeAction({ name: 'X', code: 'X' })).success).toBe(false);
      expect(store).toHaveLength(0);
    });

    it('edit requires super_admin', async () => {
      store.push({ id: ID_A, name: 'Old', code: 'OLD', isActive: true });
      asRole('admin');
      const res = await updateCollegeAction({ id: ID_A, name: 'New', code: 'NEW' });
      expect(res.success).toBe(false);
      expect(store[0].name).toBe('Old');
    });

    it('activate/deactivate requires super_admin', async () => {
      store.push({ id: ID_A, name: 'Old', code: 'OLD', isActive: true });
      asRole('admin');
      expect((await setCollegeActiveAction(ID_A, false)).success).toBe(false);
      asRole(undefined);
      expect((await setCollegeActiveAction(ID_A, false)).success).toBe(false);
      expect(store[0].isActive).toBe(true);
    });
  });

  describe('validation', () => {
    beforeEach(() => asRole('super_admin'));

    it('rejects missing name', async () => {
      const res = await createCollegeAction({ code: 'ABC' });
      expect(res.success).toBe(false);
      expect(res.fieldErrors?.name).toBeDefined();
    });

    it('rejects missing/blank code', async () => {
      expect((await createCollegeAction({ name: 'A' })).success).toBe(false);
      const res = await createCollegeAction({ name: 'A', code: '   ' });
      expect(res.success).toBe(false);
      expect(res.fieldErrors?.code).toBeDefined();
    });

    it('rejects invalid code characters', async () => {
      const res = await createCollegeAction({ name: 'A', code: 'BAD CODE!' });
      expect(res.success).toBe(false);
    });

    it('normalizes code (trim + uppercase) and blank city/state to null', async () => {
      await createCollegeAction({ name: ' CBIT ', code: '  cbit ', city: '  ', state: ' Telangana ' });
      expect(store[0]).toMatchObject({ name: 'CBIT', code: 'CBIT', city: null, state: 'Telangana' });
    });

    it('handles duplicate code cleanly without leaking DB errors', async () => {
      await createCollegeAction({ name: 'A', code: 'DUP' });
      const res = await createCollegeAction({ name: 'B', code: 'dup' });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/already exists/);
      expect(res.error).not.toMatch(/constraint|violates/i);
    });

    it('maps a race-condition duplicate from the query layer to a clean error', async () => {
      const queries = await import('@/lib/db/queries');
      vi.mocked(queries.createCollege).mockRejectedValueOnce(new DuplicateCollegeCodeError('RACE'));
      const res = await createCollegeAction({ name: 'A', code: 'RACE' });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/already exists/);
    });

    it('edit rejects a code owned by another college but allows keeping its own', async () => {
      store.push({ id: ID_A, name: 'A', code: 'AAA', isActive: true });
      store.push({ id: ID_B, name: 'B', code: 'BBB', isActive: true });
      expect((await updateCollegeAction({ id: ID_B, name: 'B', code: 'aaa' })).success).toBe(false);
      const ok = await updateCollegeAction({ id: ID_B, name: 'B2', code: 'bbb', city: 'Pune' });
      expect(ok.success).toBe(true);
      expect(store[1]).toMatchObject({ id: ID_B, name: 'B2', code: 'BBB', city: 'Pune' });
    });
  });

  describe('status', () => {
    beforeEach(() => {
      asRole('super_admin');
      store.push({ id: ID_A, name: 'A', code: 'AAA', isActive: true });
    });

    it('deactivates and reactivates without deleting', async () => {
      expect((await setCollegeActiveAction(ID_A, false)).success).toBe(true);
      expect(store[0].isActive).toBe(false);
      expect((await setCollegeActiveAction(ID_A, true)).success).toBe(true);
      expect(store[0].isActive).toBe(true);
      expect(store).toHaveLength(1);
    });

    it('rejects unknown/invalid ids', async () => {
      expect((await setCollegeActiveAction('not-a-uuid', false)).success).toBe(false);
      expect(
        (await setCollegeActiveAction('00000000-0000-4000-8000-0000000000ff', false)).success
      ).toBe(false);
    });

    it('inactive colleges are excluded from selectors unless already referenced', () => {
      const all = [
        { id: 'a', isActive: true },
        { id: 'b', isActive: false },
        { id: 'c', isActive: false }
      ];
      expect(selectableColleges(all).map((c) => c.id)).toEqual(['a']);
      expect(selectableColleges(all, 'b').map((c) => c.id)).toEqual(['a', 'b']);
      expect(selectableColleges(all, null).map((c) => c.id)).toEqual(['a']);
    });
  });
});
