// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Tutor activation, sign-in, password reset and the per-request tutor context against a real database.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  }
}));

import {
  db,
  accountTokens,
  batches,
  colleges,
  programs,
  tutorBatchAssignments,
  tutors,
  userRoles,
  users
} from '@rms/db';
import { and, eq, inArray, isNull, like } from 'drizzle-orm';
import { generateToken, hashPassword, hashToken } from '@rms/auth';
import {
  activateTutorAccount,
  authenticateTutor,
  resetTutorPassword,
  validateActivationToken,
  validatePasswordResetToken
} from '../db/tutor-accounts';
import { getTutorContext, requireTutorBatch } from '../db/tutor-context';

describe('tutor authentication on the test database', { timeout: 120000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  const prefix = `ws9.${stamp}`;
  const email = (n: string) => `${prefix}.${n}@example.test`;
  const PASSWORD = 'correct horse battery';
  let collegeId: string;
  let programId: number;
  let archivedProgramId: number;
  let liveBatch: string;
  let draftBatch: string;
  let archivedBatch: string;
  let otherBatch: string;
  let tutorUserId: string;
  let tutorId: string;
  let activationToken: string;

  async function token(userId: string, type: 'activation' | 'password_reset', ttlMs = 3_600_000) {
    const raw = generateToken(32);
    await db.insert(accountTokens).values({ userId, tokenHash: await hashToken(raw), tokenType: type, expiresAt: new Date(Date.now() + ttlMs) });
    return raw;
  }

  async function makeAccount(name: string, roles: Array<'tutor' | 'admin' | 'student'>, opts: { status?: 'active' | 'pending_activation'; tutor?: boolean; tutorActive?: boolean } = {}) {
    const [user] = await db
      .insert(users)
      .values({ email: email(name), name, passwordHash: await hashPassword(PASSWORD), status: opts.status ?? 'active' })
      .returning({ id: users.id });
    for (const role of roles) await db.insert(userRoles).values({ userId: user.id, role });
    let profileId: string | null = null;
    if (opts.tutor !== false) {
      const [profile] = await db.insert(tutors).values({ userId: user.id, fullName: `Tutor ${name}`, isActive: opts.tutorActive ?? true }).returning({ id: tutors.id });
      profileId = profile.id;
    }
    return { userId: user.id, tutorId: profileId };
  }

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `WS9 College ${stamp}`, code: `WS9_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db.insert(programs).values({ name: `WS9 P ${stamp}`, code: `WS9_P_${suffix}`, collegeId, status: 'active' }).returning();
    programId = program.id;
    const [archived] = await db.insert(programs).values({ name: `WS9 Old ${stamp}`, code: `WS9_O_${suffix}`, collegeId, status: 'archived' }).returning();
    archivedProgramId = archived.id;
    const created = await db
      .insert(batches)
      .values([
        { name: `WS9 Live ${stamp}`, programId, collegeId, status: 'active' },
        { name: `WS9 Draft ${stamp}`, programId, collegeId, status: 'draft' },
        { name: `WS9 Archived ${stamp}`, programId: archivedProgramId, collegeId, status: 'active' },
        { name: `WS9 Other ${stamp}`, programId, collegeId, status: 'active' }
      ])
      .returning();
    [liveBatch, draftBatch, archivedBatch, otherBatch] = created.map((b) => b.id);

    const invited = await makeAccount('invited', ['tutor'], { status: 'pending_activation' });
    tutorUserId = invited.userId;
    tutorId = invited.tutorId!;
    activationToken = await token(tutorUserId, 'activation');
  });

  afterAll(async () => {
    const ids = (await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}.%`))).map((u) => u.id);
    if (ids.length) {
      await db.delete(tutorBatchAssignments).where(inArray(tutorBatchAssignments.tutorId, db.select({ id: tutors.id }).from(tutors).where(inArray(tutors.userId, ids))));
      await db.delete(users).where(inArray(users.id, ids));
    }
    await db.delete(batches).where(inArray(batches.id, [liveBatch, draftBatch, archivedBatch, otherBatch]));
    await db.delete(programs).where(inArray(programs.id, [programId, archivedProgramId]));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  describe('activation', () => {
    it('shows the invited tutor and refuses sign-in before activation', async () => {
      expect(await validateActivationToken(activationToken)).toEqual({ status: 'valid', email: email('invited'), name: 'Tutor invited' });
      expect(await authenticateTutor(email('invited'), PASSWORD)).toBeNull();
      expect(await validateActivationToken('f'.repeat(64))).toEqual({ status: 'invalid' });
      expect(await validateActivationToken('not-a-token')).toEqual({ status: 'invalid' });
    });

    it('requires a 12-character password and keeps the link usable after a refusal', async () => {
      expect(await activateTutorAccount(activationToken, 'short')).toEqual({ success: false, error: 'Password must be at least 12 characters.' });
      expect((await validateActivationToken(activationToken)).status).toBe('valid');
    });

    it('activates once', async () => {
      expect(await activateTutorAccount(activationToken, 'tutor password 2026')).toEqual({ success: true });
      const [user] = await db.select({ status: users.status, verified: users.emailVerifiedAt }).from(users).where(eq(users.id, tutorUserId));
      expect(user.status).toBe('active');
      expect(user.verified).not.toBeNull();
      expect((await activateTutorAccount(activationToken, 'tutor password 2026')).success).toBe(false);
      expect(await validateActivationToken(activationToken)).toEqual({ status: 'already_active' });
    });

    it('refuses to activate an account that is not a tutor (e.g. a student invitation)', async () => {
      const student = await makeAccount('student-invite', ['student'], { status: 'pending_activation', tutor: false });
      const raw = await token(student.userId, 'activation');
      expect(await validateActivationToken(raw)).toEqual({ status: 'invalid' });
      expect((await activateTutorAccount(raw, 'a long enough password')).success).toBe(false);
      // The failed activation rolled back: the link was not consumed.
      const [row] = await db.select({ consumedAt: accountTokens.consumedAt }).from(accountTokens).where(eq(accountTokens.tokenHash, await hashToken(raw)));
      expect(row.consumedAt).toBeNull();
    });
  });

  describe('sign-in', () => {
    it('accepts the activated tutor with the right password only', async () => {
      expect(await authenticateTutor(` ${email('invited').toUpperCase()} `, 'tutor password 2026')).toEqual({
        userId: tutorUserId,
        tutorId,
        email: email('invited'),
        name: 'Tutor invited'
      });
      expect(await authenticateTutor(email('invited'), 'wrong password')).toBeNull();
      expect(await authenticateTutor(email('nobody'), 'tutor password 2026')).toBeNull();
    });

    it('refuses admins, students, tutors without a profile and deactivated tutors', async () => {
      await makeAccount('admin-tutor', ['tutor', 'admin']);
      await makeAccount('student-only', ['student'], { tutor: false });
      await makeAccount('no-profile', ['tutor'], { tutor: false });
      await makeAccount('deactivated', ['tutor'], { tutorActive: false });
      for (const name of ['admin-tutor', 'student-only', 'no-profile', 'deactivated']) {
        expect(await authenticateTutor(email(name), PASSWORD), name).toBeNull();
      }
    });
  });

  describe('password reset', () => {
    it('sets the new password, revokes older sessions and is single-use', async () => {
      const raw = await token(tutorUserId, 'password_reset');
      expect(await validatePasswordResetToken(raw)).toEqual({ valid: true, email: email('invited') });
      const before = (await db.select({ updatedAt: users.updatedAt }).from(users).where(eq(users.id, tutorUserId)))[0].updatedAt;

      expect(await resetTutorPassword(raw, 'a brand new password')).toEqual({ success: true });
      const after = (await db.select({ updatedAt: users.updatedAt }).from(users).where(eq(users.id, tutorUserId)))[0].updatedAt;
      expect(after!.getTime()).toBeGreaterThan(before!.getTime());
      expect(await authenticateTutor(email('invited'), 'tutor password 2026')).toBeNull();
      expect(await authenticateTutor(email('invited'), 'a brand new password')).not.toBeNull();
      expect((await resetTutorPassword(raw, 'another new password')).success).toBe(false);
      const open = await db
        .select({ id: accountTokens.id })
        .from(accountTokens)
        .where(and(eq(accountTokens.userId, tutorUserId), eq(accountTokens.tokenType, 'password_reset'), isNull(accountTokens.consumedAt)));
      expect(open).toEqual([]);
    });
  });

  describe('per-request tutor context', () => {
    const session = (authTime = Date.now()) => ({ user: { id: tutorUserId, role: 'tutor', authTime } });

    it('lists only live assigned batches and scopes to them', async () => {
      await db.insert(tutorBatchAssignments).values([liveBatch, draftBatch, archivedBatch].map((batchId) => ({ tutorId, batchId })));
      authMock.mockResolvedValue(session());
      const context = await getTutorContext();
      expect(context).toMatchObject({ userId: tutorUserId, tutorId, email: email('invited'), batchIds: [liveBatch] });
      await expect(requireTutorBatch(liveBatch)).resolves.toMatchObject({ tutorId });
      // Unassigned, draft, archived-program and unknown batches all give the same 404.
      for (const batchId of [otherBatch, draftBatch, archivedBatch, '00000000-0000-4000-8000-000000000000']) {
        await expect(requireTutorBatch(batchId)).rejects.toThrow('NEXT_NOT_FOUND');
      }
    });

    it('drops a batch as soon as the tutor is unassigned', async () => {
      await db.delete(tutorBatchAssignments).where(and(eq(tutorBatchAssignments.tutorId, tutorId), eq(tutorBatchAssignments.batchId, liveBatch)));
      authMock.mockResolvedValue(session());
      expect((await getTutorContext())?.batchIds).toEqual([]);
      await expect(requireTutorBatch(liveBatch)).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('rejects a session issued before the last password change', async () => {
      authMock.mockResolvedValue(session(Date.now() - 24 * 60 * 60 * 1000));
      expect(await getTutorContext()).toBeNull();
      await expect(requireTutorBatch(liveBatch)).rejects.toThrow('NEXT_REDIRECT /api/session/revoked');
    });

    it('rejects a deactivated tutor and a non-tutor session immediately', async () => {
      await db.update(tutors).set({ isActive: false }).where(eq(tutors.id, tutorId));
      authMock.mockResolvedValue(session());
      expect(await getTutorContext()).toBeNull();
      await db.update(tutors).set({ isActive: true }).where(eq(tutors.id, tutorId));
      expect(await getTutorContext()).not.toBeNull();
      authMock.mockResolvedValue({ user: { id: tutorUserId, role: 'student', authTime: Date.now() } });
      expect(await getTutorContext()).toBeNull();
      authMock.mockResolvedValue(null);
      expect(await getTutorContext()).toBeNull();
    });
  });
});
