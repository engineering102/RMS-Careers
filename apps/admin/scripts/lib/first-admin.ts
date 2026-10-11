/**
 * One-time creation of the first super_admin on an empty, migrated database (audit PR-06).
 * Pure apart from the injected executor, so it is unit-tested (lib/__tests__/first-admin.test.ts).
 * The CLI wrapper is scripts/bootstrap-first-admin.ts.
 */
import type { SqlExecutor } from '@rms/db/migration-runner';

export class FirstAdminError extends Error {
  constructor(message: string) {
    super(`[first-admin] ${message}`);
    this.name = 'FirstAdminError';
  }
}

/** Arbitrary constant: serialises concurrent bootstrap attempts inside the transaction. */
export const FIRST_ADMIN_LOCK_KEY = 72_331_407;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FirstAdminInput {
  email: string;
  name: string;
  /** bcrypt hash: of the operator-entered password, or of a discarded random secret (GitHub-only). */
  passwordHash: string;
  now: Date;
}

export async function createFirstAdmin(exec: SqlExecutor, input: FirstAdminInput): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new FirstAdminError('a valid --email is required.');
  if (!input.passwordHash.startsWith('$2')) throw new FirstAdminError('passwordHash must be a bcrypt hash.');

  await exec.query('BEGIN');
  try {
    await exec.query('SELECT pg_advisory_xact_lock($1)', [FIRST_ADMIN_LOCK_KEY]);
    const admins = await exec.query("SELECT count(*)::int AS n FROM user_roles WHERE role IN ('admin', 'super_admin')");
    if (Number(admins[0]?.n ?? 0) > 0) {
      throw new FirstAdminError('an administrator already exists; this bootstrap runs only once. Use the admin portal.');
    }
    const existing = await exec.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
    if (existing.length > 0) {
      throw new FirstAdminError('a user with this email already exists; refusing to modify an existing account.');
    }
    const inserted = await exec.query(
      "INSERT INTO users (email, name, password_hash, status, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, 'active', $4, $4, $4) RETURNING id",
      [email, input.name.trim() || 'RMS Administrator', input.passwordHash, input.now]
    );
    const userId = String(inserted[0]?.id ?? '');
    if (!userId) throw new FirstAdminError('user insert returned no id.');
    await exec.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'super_admin')", [userId]);
    await exec.query('COMMIT');
    return { userId };
  } catch (error) {
    await exec.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
