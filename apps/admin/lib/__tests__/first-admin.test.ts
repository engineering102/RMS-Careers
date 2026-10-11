import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SqlExecutor } from '@rms/db/migration-runner';
import { createFirstAdmin, FirstAdminError } from '../../scripts/lib/first-admin';

const HASH = '$2a$12$abcdefghijklmnopqrstuuJ7d8X7X5bQnZ8m2sZq1vG6eYh0lHq3a';

function fakeDb(state: { admins: number; existingEmail?: string }) {
  const log: string[] = [];
  const exec: SqlExecutor = {
    async query(text, params) {
      log.push(text);
      if (text.startsWith('SELECT count(*)::int AS n FROM user_roles')) return [{ n: state.admins }];
      if (text.startsWith('SELECT id FROM users')) return params?.[0] === state.existingEmail ? [{ id: 'old' }] : [];
      if (text.startsWith('INSERT INTO users')) return [{ id: 'new-user-id' }];
      return [];
    }
  };
  return { exec, log };
}

/** Audit PR-06: the first production admin is created once, deliberately, without a default secret. */
describe('createFirstAdmin', () => {
  it('creates exactly one super_admin in a single locked transaction', async () => {
    const { exec, log } = fakeDb({ admins: 0 });
    const now = new Date('2026-10-11T00:00:00Z');
    await expect(createFirstAdmin(exec, { email: ' Ops@RMS-Careers.com ', name: 'Ops', passwordHash: HASH, now })).resolves.toEqual({ userId: 'new-user-id' });
    expect(log[0]).toBe('BEGIN');
    expect(log[1]).toMatch(/pg_advisory_xact_lock/);
    expect(log.filter((q) => q.startsWith('INSERT'))).toEqual([
      expect.stringMatching(/^INSERT INTO users .*'active'/),
      expect.stringMatching(/^INSERT INTO user_roles .*'super_admin'/)
    ]);
    expect(log.at(-1)).toBe('COMMIT');
  });

  it('refuses once any admin exists (one-time bootstrap) and rolls back', async () => {
    const { exec, log } = fakeDb({ admins: 1 });
    await expect(createFirstAdmin(exec, { email: 'a@b.co', name: 'x', passwordHash: HASH, now: new Date() })).rejects.toThrow(/already exists/);
    expect(log.some((q) => q.startsWith('INSERT'))).toBe(false);
    expect(log.at(-1)).toBe('ROLLBACK');
  });

  it('refuses to take over an existing account with that email', async () => {
    const { exec, log } = fakeDb({ admins: 0, existingEmail: 'a@b.co' });
    await expect(createFirstAdmin(exec, { email: 'A@B.co', name: 'x', passwordHash: HASH, now: new Date() })).rejects.toThrow(FirstAdminError);
    expect(log.some((q) => q.startsWith('INSERT'))).toBe(false);
  });

  it.each([['not-an-email', HASH], ['a@b.co', 'plaintext-password']])('validates input (%s)', async (email, passwordHash) => {
    const { exec, log } = fakeDb({ admins: 0 });
    await expect(createFirstAdmin(exec, { email, name: 'x', passwordHash, now: new Date() })).rejects.toThrow(FirstAdminError);
    expect(log).toEqual([]);
  });

  it('the CLI never accepts the password from argv or the environment', () => {
    const cli = readFileSync(path.resolve(__dirname, '../../scripts/bootstrap-first-admin.ts'), 'utf8');
    expect(cli).toMatch(/promptHidden\(/);
    expect(cli).not.toMatch(/process\.env\.[A-Z_]*PASSWORD/);
    expect(cli).not.toMatch(/flag\('password'\)/);
    expect(cli).toMatch(/resolveMigrationTarget/);
    expect(cli).toMatch(/verifyLiveIdentity/);
  });

  it('the seed script imports the schema entry (no server-only crash) and refuses argv passwords', () => {
    const seed = readFileSync(path.resolve(__dirname, '../../scripts/seed-admin.ts'), 'utf8');
    expect(seed).toMatch(/from '@rms\/db\/schema'/);
    expect(seed).not.toMatch(/from '@rms\/db';/);
    expect(seed).toMatch(/Do not pass the password on the command line/);
  });
});
