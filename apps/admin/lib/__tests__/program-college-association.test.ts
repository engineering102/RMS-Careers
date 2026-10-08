import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));

const C1 = '00000000-0000-4000-8000-000000000001';
const C2 = '00000000-0000-4000-8000-000000000002';
const C_INACTIVE = '00000000-0000-4000-8000-000000000009';

let colleges: any[] = [];
let programs: any[] = [];
let batchesOutside = 0;

vi.mock('@/lib/db/queries', () => ({
  getProgramByCode: vi.fn(async (code: string) => programs.find((p) => p.code === code) ?? null),
  getProgramById: vi.fn(async (id: number) => programs.find((p) => p.id === id) ?? null),
  getCollegeById: vi.fn(async (id: string) => colleges.find((c) => c.id === id) ?? null),
  createProgram: vi.fn(async (d: any) => {
    const row = { id: programs.length + 1, ...d, collegeId: d.collegeId ?? null };
    programs.push(row);
    return row;
  }),
  updateProgramStatus: vi.fn(async () => null),
  updateProgramCollege: vi.fn(async (id: number, collegeId: string | null) => {
    const row = programs.find((p) => p.id === id);
    if (row) row.collegeId = collegeId;
    return row ?? null;
  }),
  countProgramBatchesOutsideCollege: vi.fn(async () => batchesOutside)
}));

import {
  createProgramAction,
  updateProgramStatusAction,
  updateProgramCollegeAction
} from '../../app/(admin)/programs/actions';

const asRole = (role?: string) =>
  mockAuth.mockResolvedValue(role ? { user: { id: 'u1', role } } : null);

function form(fields: Record<string, string>) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

describe('Program and college association', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    colleges = [
      { id: C1, isActive: true },
      { id: C2, isActive: true },
      { id: C_INACTIVE, isActive: false }
    ];
    programs = [];
    batchesOutside = 0;
    asRole('admin');
  });

  it('creates a program with a college and persists collegeId', async () => {
    const res = await createProgramAction(
      form({ name: 'P', code: 'p1', capacity: '10', collegeId: C1 })
    );
    expect(res.success).toBe(true);
    expect(programs[0]).toMatchObject({ code: 'P1', collegeId: C1 });
  });

  it('creates a program without a college (NULL stays valid)', async () => {
    const res = await createProgramAction(
      form({ name: 'P', code: 'p2', capacity: '10', collegeId: '__none__' })
    );
    expect(res.success).toBe(true);
    expect(programs[0].collegeId).toBeNull();
    const res2 = await createProgramAction(form({ name: 'Q', code: 'q', capacity: '5' }));
    expect(res2.success).toBe(true);
    expect(programs[1].collegeId).toBeNull();
  });

  it('rejects inactive, unknown or malformed colleges on create', async () => {
    const bad = [C_INACTIVE, '00000000-0000-4000-8000-0000000000aa', 'nope'];
    for (const [i, collegeId] of bad.entries()) {
      const res = await createProgramAction(
        form({ name: 'P', code: `x${i}`, capacity: '1', collegeId })
      );
      expect(res.success).toBe(false);
    }
    expect(programs).toHaveLength(0);
  });

  it('edits a program to another college', async () => {
    programs.push({ id: 1, code: 'P', collegeId: C1 });
    const res = await updateProgramCollegeAction(1, C2);
    expect(res.success).toBe(true);
    expect(programs[0].collegeId).toBe(C2);
  });

  it('assigns a college to an existing NULL-college program and can clear it', async () => {
    programs.push({ id: 1, code: 'P', collegeId: null });
    expect((await updateProgramCollegeAction(1, C1)).success).toBe(true);
    expect(programs[0].collegeId).toBe(C1);
    expect((await updateProgramCollegeAction(1, null)).success).toBe(true);
    expect(programs[0].collegeId).toBeNull();
  });

  it('leaves a NULL program NULL on a no-op update', async () => {
    programs.push({ id: 1, code: 'P', collegeId: null });
    expect((await updateProgramCollegeAction(1, null)).success).toBe(true);
    expect(programs[0].collegeId).toBeNull();
  });

  it('keeps an already-referenced inactive college but refuses switching to one', async () => {
    programs.push({ id: 1, code: 'P', collegeId: C_INACTIVE });
    expect((await updateProgramCollegeAction(1, C_INACTIVE)).success).toBe(true);
    expect((await updateProgramCollegeAction(1, C1)).success).toBe(true);
    expect((await updateProgramCollegeAction(1, C_INACTIVE)).success).toBe(false);
    expect(programs[0].collegeId).toBe(C1);
  });

  it('refuses to move a program whose batches belong to another college', async () => {
    programs.push({ id: 1, code: 'P', collegeId: C1 });
    batchesOutside = 2;
    const res = await updateProgramCollegeAction(1, C2);
    expect(res.success).toBe(false);
    expect(programs[0].collegeId).toBe(C1);
  });

  it('program actions require an admin role server-side', async () => {
    programs.push({ id: 1, code: 'P', collegeId: null });
    for (const role of [undefined, 'student', 'tutor']) {
      asRole(role);
      expect(
        (await createProgramAction(form({ name: 'P', code: 'zz', capacity: '1' }))).success
      ).toBe(false);
      expect((await updateProgramStatusAction(1, 'active')).success).toBe(false);
      expect((await updateProgramCollegeAction(1, C1)).success).toBe(false);
    }
    expect(programs).toHaveLength(1);
    expect(programs[0].collegeId).toBeNull();
  });
});
