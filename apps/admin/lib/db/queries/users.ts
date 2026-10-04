import 'server-only';

import { db, users, userRoles, type User, type UserRole } from '@rms/db';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, hasAdminPrivileges } from '@rms/auth';

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
    console.error('Error fetching user by email:', error);
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
    if (!userWithRoles) {
      return null;
    }

    // 1. Account status verification
    if (userWithRoles.status !== 'active') {
      return null;
    }

    // 2. Authorization check: Must have admin or super_admin role
    const adminRole = userWithRoles.roles.find((r) =>
      hasAdminPrivileges([r.role])
    );
    if (!adminRole) {
      return null;
    }

    // 3. Password hash verification (constant-time compare)
    const isPasswordValid = await verifyPassword(
      passwordCandidate,
      userWithRoles.passwordHash
    );
    if (!isPasswordValid) {
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
      console.warn('Could not update lastLoginAt for admin:', updateError);
    }

    return {
      id: userWithRoles.id,
      email: userWithRoles.email,
      name: userWithRoles.name,
      role: adminRole.role as 'admin' | 'super_admin'
    };
  } catch (error) {
    console.error('Authentication verification error:', error);
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
    console.error('Error creating admin user:', error);
    return null;
  }
}
