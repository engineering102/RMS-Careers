/**
 * Server-side admin session revalidation (audit F-09). Pure, so it is unit-testable without Auth.js.
 *
 * The admin JWT only proves who signed in and when. Every server-side use re-checks the account:
 *  - the user still exists and is `active` (deactivation takes effect on the next request);
 *  - the user still holds `admin` or `super_admin` (role comes from the database, never the token);
 *  - the account's credentials have not changed since the session was issued: `users.updated_at`
 *    is written by activation, password changes and sign-out (lib/sign-out.ts, audit PR-02), so a
 *    newer value revokes older sessions on every device.
 * Sessions issued before the `authTime` claim existed cannot be proven newer than the last credential
 * change, so they fail closed: after this ships every admin signs in once more.
 */

export type AdminRole = 'admin' | 'super_admin';

export interface CurrentAdminRecord {
  id: string;
  status: string;
  roles: readonly string[];
  updatedAt: Date | null;
}

export type AdminSessionDecision =
  | { ok: true; userId: string; role: AdminRole }
  | { ok: false; reason: 'missing' | 'not_found' | 'inactive' | 'not_admin' | 'credentials_changed' };

/** Milliseconds since epoch at which the session was established (authTime claim, else JWT iat). */
export function sessionIssuedAtMs(claims: { authTime?: unknown; iat?: unknown }): number | null {
  if (typeof claims.authTime === 'number' && Number.isFinite(claims.authTime)) return claims.authTime;
  if (typeof claims.iat === 'number' && Number.isFinite(claims.iat)) return claims.iat * 1000;
  return null;
}

export function evaluateAdminSession(
  session: { userId?: string | null; issuedAtMs: number | null },
  record: CurrentAdminRecord | null
): AdminSessionDecision {
  if (!session.userId) return { ok: false, reason: 'missing' };
  if (!record || record.id !== session.userId) return { ok: false, reason: 'not_found' };
  if (record.status !== 'active') return { ok: false, reason: 'inactive' };

  const roles = record.roles.map((r) => r.trim().toLowerCase());
  const role: AdminRole | null = roles.includes('super_admin') ? 'super_admin' : roles.includes('admin') ? 'admin' : null;
  if (!role) return { ok: false, reason: 'not_admin' };

  // Unknown issue time cannot be proven newer than a credential change: fail closed.
  if (record.updatedAt && (session.issuedAtMs === null || record.updatedAt.getTime() > session.issuedAtMs)) {
    return { ok: false, reason: 'credentials_changed' };
  }
  return { ok: true, userId: record.id, role };
}
