import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Tutor accounts and batch assignments (tutor plan WS-7) against a real database.
vi.mock('server-only', () => ({}));

import {
  db,
  accountTokens,
  batches,
  colleges,
  programs,
  students,
  tutorBatchAssignments,
  tutors,
  userRoles,
  users
} from '@rms/db';
import { and, eq, inArray, isNull, like, sql } from 'drizzle-orm';
import { hashToken } from '@rms/auth';
import {
  addTutorToBatch,
  createTutorAccount,
  getAssignableTutors,
  getBatchTutors,
  listTutors,
  reissueTutorInvitation,
  removeTutorFromBatch,
  setTutorActive
} from '../db/queries/tutors';
import { getBatchesWithDetails } from '../db/queries/batches';

describe('tutor accounts and assignments on the test database', { timeout: 120000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  const emailPrefix = `ws7.${stamp}`;
  const email = (name: string) => `${emailPrefix}.${name}@example.test`;
  let collegeId: string;
  let programId: number;
  let batchId: string;
  let adminUserId: string;
  let studentUserId: string;
  let studentRecordId: number;

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `WS7 College ${stamp}`, code: `WS7_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(programs)
      .values({ name: `WS7 Program ${stamp}`, code: `WS7_P_${suffix}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const [batch] = await db.insert(batches).values({ name: `WS7 Batch ${stamp}`, programId, collegeId }).returning();
    batchId = batch.id;

    const [admin] = await db.insert(users).values({ email: email('admin'), passwordHash: 'x', name: 'WS7 Admin' }).returning();
    adminUserId = admin.id;
    await db.insert(userRoles).values({ userId: adminUserId, role: 'admin' });
    const [studentUser] = await db.insert(users).values({ email: email('student'), passwordHash: 'x', name: 'WS7 Student' }).returning();
    studentUserId = studentUser.id;
    await db.insert(userRoles).values({ userId: studentUserId, role: 'student' });
    // A student record without a login account yet (provisioning links it later by email).
    const [record] = await db
      .insert(students)
      .values({ fullName: 'WS7 Unprovisioned', email: email('unprovisioned'), collegeId })
      .returning();
    studentRecordId = record.id;
  });

  afterAll(async () => {
    const created = await db.select({ id: users.id }).from(users).where(like(users.email, `${emailPrefix}.%`));
    const ids = created.map((u) => u.id);
    if (ids.length) {
      await db.delete(tutorBatchAssignments).where(
        inArray(tutorBatchAssignments.tutorId, db.select({ id: tutors.id }).from(tutors).where(inArray(tutors.userId, ids)))
      );
      await db.delete(users).where(inArray(users.id, ids)); // cascades roles, tutors, tokens
    }
    await db.delete(students).where(eq(students.id, studentRecordId));
    await db.delete(batches).where(eq(batches.id, batchId));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  let tutorId: string;
  let tutorUserId: string;
  let firstToken: string;

  it('creates user, tutor role, profile and activation token together', async () => {
    const result = await createTutorAccount({ email: ` ${email('mentor').toUpperCase()} `, fullName: 'Asha Rao', headline: 'Backend' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    ({ tutorId, userId: tutorUserId, rawToken: firstToken } = result.invitation);
    expect(result.invitation.email).toBe(email('mentor'));
    expect(firstToken).toMatch(/^[a-f0-9]{64}$/);

    const [user] = await db.select().from(users).where(eq(users.id, tutorUserId));
    expect(user).toMatchObject({ email: email('mentor'), status: 'pending_activation' });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    const roles = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, tutorUserId));
    expect(roles).toEqual([{ role: 'tutor' }]);
    const [profile] = await db.select().from(tutors).where(eq(tutors.id, tutorId));
    expect(profile).toMatchObject({ userId: tutorUserId, fullName: 'Asha Rao', headline: 'Backend', isActive: true });
    const tokens = await db.select().from(accountTokens).where(eq(accountTokens.userId, tutorUserId));
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ tokenType: 'activation', tokenHash: await hashToken(firstToken), consumedAt: null });
  });

  it.each([
    ['an administrator email', () => email('admin'), 'admin_email'],
    ['a student login email', () => email('student'), 'student_email'],
    ['a student record without a login yet', () => email('unprovisioned'), 'student_email'],
    ['an existing tutor email', () => email('mentor'), 'already_tutor']
  ])('refuses %s and creates nothing', async (_label, emailOf, code) => {
    const before = await db.select({ n: sql<number>`count(*)::int` }).from(tutors);
    expect(await createTutorAccount({ email: emailOf(), fullName: 'Nope' })).toEqual({ ok: false, code });
    const after = await db.select({ n: sql<number>`count(*)::int` }).from(tutors);
    expect(after[0].n).toBe(before[0].n);
  });

  it('lets exactly one of two simultaneous creates of the same email succeed', async () => {
    const results = await Promise.all([
      createTutorAccount({ email: email('race'), fullName: 'Race One' }),
      createTutorAccount({ email: email('race'), fullName: 'Race Two' })
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const failed = results.find((r) => !r.ok);
    expect(failed && !failed.ok && ['email_in_use', 'already_tutor']).toContain(failed && !failed.ok ? failed.code : '');
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email('race')));
    expect(rows).toHaveLength(1);
    expect(await db.select().from(tutors).where(eq(tutors.userId, rows[0].id))).toHaveLength(1);
  });

  it('reissues an invitation and invalidates the earlier link', async () => {
    const result = await reissueTutorInvitation(tutorId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invitation.rawToken).not.toBe(firstToken);
    const live = await db
      .select({ tokenHash: accountTokens.tokenHash })
      .from(accountTokens)
      .where(and(eq(accountTokens.userId, tutorUserId), isNull(accountTokens.consumedAt)));
    expect(live).toEqual([{ tokenHash: await hashToken(result.invitation.rawToken) }]);
  });

  it('does not reissue for an activated account', async () => {
    await db.update(users).set({ status: 'active' }).where(eq(users.id, tutorUserId));
    expect(await reissueTutorInvitation(tutorId)).toEqual({ ok: false, code: 'already_active' });
    await db.update(users).set({ status: 'pending_activation' }).where(eq(users.id, tutorUserId));
  });

  it('assigns idempotently, lists and counts assignments, and unassigns', async () => {
    expect(await addTutorToBatch(tutorId, batchId)).toEqual({ ok: true, created: true });
    expect(await addTutorToBatch(tutorId, batchId)).toEqual({ ok: true, created: false });
    expect(await getBatchTutors(batchId)).toEqual([
      expect.objectContaining({ tutorId, fullName: 'Asha Rao', email: email('mentor'), state: 'pending_activation' })
    ]);
    expect((await listTutors()).find((t) => t.tutorId === tutorId)).toMatchObject({ assignedBatchCount: 1, state: 'pending_activation' });
    expect((await getBatchesWithDetails({ search: `WS7 Batch ${stamp}` }))[0]?.tutorCount).toBe(1);

    expect(await removeTutorFromBatch(tutorId, batchId)).toBe(true);
    expect(await removeTutorFromBatch(tutorId, batchId)).toBe(false);
    expect(await getBatchTutors(batchId)).toEqual([]);
  });

  it('deactivates and reactivates without touching the login account', async () => {
    const [before] = await db.select({ updatedAt: users.updatedAt, status: users.status }).from(users).where(eq(users.id, tutorUserId));
    expect(await setTutorActive(tutorId, false)).toBe(true);
    expect((await getAssignableTutors()).some((t) => t.tutorId === tutorId)).toBe(false);
    expect(await addTutorToBatch(tutorId, batchId)).toEqual({ ok: false, code: 'tutor_inactive' });
    expect(await reissueTutorInvitation(tutorId)).toEqual({ ok: false, code: 'inactive' });
    expect((await listTutors()).find((t) => t.tutorId === tutorId)?.state).toBe('inactive');
    const [after] = await db.select({ updatedAt: users.updatedAt, status: users.status }).from(users).where(eq(users.id, tutorUserId));
    expect(after).toEqual(before);

    expect(await setTutorActive(tutorId, true)).toBe(true);
    expect((await getAssignableTutors()).some((t) => t.tutorId === tutorId)).toBe(true);
  });

  it('reports unknown tutors and batches', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    expect(await addTutorToBatch(missing, batchId)).toEqual({ ok: false, code: 'tutor_not_found' });
    expect(await addTutorToBatch(tutorId, missing)).toEqual({ ok: false, code: 'batch_not_found' });
    expect(await reissueTutorInvitation(missing)).toEqual({ ok: false, code: 'not_found' });
    expect(await setTutorActive(missing, false)).toBe(false);
  });
});
