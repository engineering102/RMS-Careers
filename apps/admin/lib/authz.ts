import 'server-only';

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
