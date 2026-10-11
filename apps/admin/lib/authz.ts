import 'server-only';

import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';

export type AuthzResult =
  | { ok: true; userId: string; role: 'admin' | 'super_admin' }
  | { ok: false; error: string };

/** Any authenticated global administrator (`admin` or `super_admin`). */
export async function requireAdmin(): Promise<AuthzResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: 'Unauthorized access. Admin authentication required.' };
  }
  const role = session.user.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return { ok: false, error: 'Forbidden. Administrator privileges required.' };
  }
  return { ok: true, userId: session.user.id, role };
}

/** Only `super_admin`. Used for college management. */
export async function requireSuperAdmin(): Promise<AuthzResult> {
  const result = await requireAdmin();
  if (!result.ok) return result;
  if (result.role !== 'super_admin') {
    return { ok: false, error: 'Forbidden. Super administrator privileges required.' };
  }
  return result;
}

/** Where pages send a session that failed server-side revalidation (clears the cookie, then /login). */
export const SESSION_REVOKED_PATH = '/api/session/revoked';

/**
 * Page/layout guard. The middleware only verifies the JWT signature; this re-checks the account in
 * the database (see lib/auth.ts) so a deactivated admin cannot keep reading admin pages.
 */
export async function requireAdminSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect(SESSION_REVOKED_PATH);
  return session;
}
