// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Audit F-05/F-06: the lifecycle predicate evaluated by real Postgres.
import { describe, it, expect, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

import { db } from '@rms/db';
import * as schema from '@rms/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { hasBatchAccess } from '@/lib/db/queries/entitlements';

describe('student access lifecycle (live test database)', () => {
  const stamp = `${Date.now()}`.slice(-8);
  const ids = { colleges: [] as string[], programs: [] as number[], batches: [] as string[], students: [] as number[] };

  async function scenario(opts: {
    enrollment?: (typeof schema.enrollmentStatusEnum.enumValues)[number];
    batchStatus?: string;
    collegeActive?: boolean;
    programStatus?: 'draft' | 'active' | 'archived';
  }) {
    const n = ids.students.length;
    const [college] = await db
      .insert(schema.colleges)
      .values({ name: `AP ${stamp} ${n}`, code: `AP_${stamp}_${n}`, isActive: opts.collegeActive ?? true })
      .returning();
    ids.colleges.push(college.id);
    const [program] = await db
      .insert(schema.programs)
      .values({ name: `AP P ${n}`, code: `AP_P_${stamp}_${n}`, collegeId: college.id, status: opts.programStatus ?? 'active' })
      .returning();
    ids.programs.push(program.id);
    const [batch] = await db
      .insert(schema.batches)
      .values({ programId: program.id, collegeId: college.id, name: `AP B ${n}`, status: opts.batchStatus ?? 'active' })
      .returning();
    ids.batches.push(batch.id);
    const [student] = await db
      .insert(schema.students)
      .values({ fullName: `AP S ${n}`, email: `ap_${stamp}_${n}@example.test`, collegeId: college.id })
      .returning();
    ids.students.push(student.id);
    await db
      .insert(schema.enrollments)
      .values({ studentId: student.id, programId: program.id, batchId: batch.id, status: opts.enrollment ?? 'active' });
    return hasBatchAccess(student.id, batch.id);
  }

  afterAll(async () => {
    if (ids.students.length) await db.delete(schema.enrollments).where(inArray(schema.enrollments.studentId, ids.students));
    if (ids.students.length) await db.delete(schema.students).where(inArray(schema.students.id, ids.students));
    if (ids.batches.length) await db.delete(schema.batches).where(inArray(schema.batches.id, ids.batches));
    if (ids.programs.length) await db.delete(schema.programs).where(inArray(schema.programs.id, ids.programs));
    for (const id of ids.colleges) await db.delete(schema.colleges).where(eq(schema.colleges.id, id));
  });

  it('grants access to active and confirmed enrollments in a live batch', async () => {
    expect(await scenario({ enrollment: 'active' })).toBe(true);
    expect(await scenario({ enrollment: 'confirmed' })).toBe(true);
    expect(await scenario({ batchStatus: 'completed' })).toBe(true);
    expect(await scenario({ programStatus: 'draft' })).toBe(true);
  });

  it('denies revoked, suspended and other non-granting enrollments', async () => {
    for (const enrollment of ['revoked', 'suspended', 'cancelled', 'dropped', 'pending', 'completed'] as const) {
      expect(await scenario({ enrollment }), enrollment).toBe(false);
    }
  });

  it('denies access when the batch, program or college is deactivated', async () => {
    expect(await scenario({ batchStatus: 'archived' })).toBe(false);
    expect(await scenario({ batchStatus: 'draft' })).toBe(false);
    expect(await scenario({ programStatus: 'archived' })).toBe(false);
    expect(await scenario({ collegeActive: false })).toBe(false);
  });
});
