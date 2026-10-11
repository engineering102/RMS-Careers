import 'server-only';

import { db, users, userRoles, type User, type UserRole } from '@rms/db';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, hasAdminPrivileges } from '@rms/auth';

let equalizationHashPromise: Promise<string> | undefined;

/** A bcrypt hash of a random secret, computed once per isolate; compared against when no account matches. */
function equalizationHash(): Promise<string> {
  equalizationHashPromise ??= hashPassword(crypto.randomUUID() + crypto.randomUUID());
  return equalizationHashPromise;
}

export interface UserWithRoles extends User {
  roles: UserRole[];
}

export interface AdminAuthResult {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'super_admin';
}

/**
 * Retrieves a user by email (case-insensitive) along with their assigned roles.
 */
export async function getUserByEmail(email: string): Promise<UserWithRoles | null> {
  if (!email || typeof email !== 'string') return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = ${cleanEmail}`)
      .limit(1);

    const user = userResult[0];
    if (!user) return null;

    const rolesResult = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, user.id));

    return {
      ...user,
      roles: rolesResult
    };
  } catch (error) {
    console.error('Error fetching user by email:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

/**
 * Authenticates an admin using database-backed credentials.
 * Enforces:
 * - Case-insensitive email/username lookup
 * - Account status must be 'active'
 * - Must possess 'admin' or 'super_admin' role
 * - Password verified against bcrypt hash
 * - Updates lastLoginAt timestamp upon success
 * - Generic rejection (returns null) on any failure to prevent enumeration attacks
 */
export async function authenticateAdmin(
  emailOrUsername: string,
  passwordCandidate: string
): Promise<AdminAuthResult | null> {
  if (!emailOrUsername || !passwordCandidate) {
    return null;
  }

  try {
    const userWithRoles = await getUserByEmail(emailOrUsername);
    const adminRole = userWithRoles?.roles.find((r) => hasAdminPrivileges([r.role]));
    const eligible = Boolean(userWithRoles && userWithRoles.status === 'active' && adminRole);

    // Exactly one bcrypt comparison on every path (unknown email, inactive, non-admin, wrong password),
    // so response time does not reveal which accounts exist (audit PR-08).
    const isPasswordValid = await verifyPassword(
      passwordCandidate,
      eligible ? userWithRoles!.passwordHash : await equalizationHash()
    );
    if (!eligible || !isPasswordValid || !userWithRoles || !adminRole) {
      return null;
    }

    // 4. Update last_login_at timestamp
    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userWithRoles.id));
    } catch (updateError) {
      // Non-blocking for authentication flow
      console.warn('Could not update lastLoginAt for admin:', updateError instanceof Error ? updateError.name : 'unknown');
    }

    return {
      id: userWithRoles.id,
      email: userWithRoles.email,
      name: userWithRoles.name,
      role: adminRole.role as 'admin' | 'super_admin'
    };
  } catch (error) {
    // Error class only: driver messages can contain SQL text or connection details.
    console.error('[admin-auth] sign-in lookup failed:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

/**
 * Provisions a new admin user with a hashed password and assigned role.
 */
export async function createAdminUser(data: {
  email: string;
  name?: string;
  password: string;
  role?: 'admin' | 'super_admin';
}): Promise<AdminAuthResult | null> {
  const cleanEmail = data.email.trim().toLowerCase();
  const hashedPassword = await hashPassword(data.password);
  const assignedRole = data.role || 'admin';

  try {
    const insertedUsers = await db
      .insert(users)
      .values({
        email: cleanEmail,
        name: data.name || null,
        passwordHash: hashedPassword,
        status: 'active'
      })
      .returning();

    const newUser = insertedUsers[0];
    if (!newUser) return null;

    await db.insert(userRoles).values({
      userId: newUser.id,
      role: assignedRole
    });

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: assignedRole
    };
  } catch (error) {
    console.error('Error creating admin user:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Current account state used to revalidate an admin session on every server-side request
 * (see lib/session-validation.ts). Returns null for unknown ids. Database errors propagate so the
 * caller can fail closed.
 */
export async function getCurrentAdminRecord(
  userId: string
): Promise<{ id: string; status: string; roles: string[]; updatedAt: Date | null } | null> {
  if (!userId || !UUID_REGEX.test(userId) || !process.env.POSTGRES_URL) return null;
  const [user] = await db
    .select({ id: users.id, status: users.status, updatedAt: users.updatedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;
  const roles = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, user.id));
  return {
    id: user.id,
    status: user.status,
    roles: roles.map((r) => r.role),
    updatedAt: user.updatedAt ? new Date(user.updatedAt) : null
  };
}
