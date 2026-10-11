/**
 * Student session revocation rule (audit F-09). Edge-safe and pure.
 *
 * The JWT carries `authTime` (ms since epoch, stamped at sign-in, preserved across sliding refreshes).
 * `users.updated_at` is written when credentials change (activation, password reset) and on sign-out
 * (lib/auth/sign-out.ts, audit PR-02), so a session established before that moment is revoked: a
 * password reset or a sign-out ends the session on every device.
 * A session without `authTime` (issued before this rule existed) cannot be proven current and fails
 * closed, so every student signs in once more after this ships.
 */
export function isSessionCurrent(authTime: unknown, credentialsChangedAt: Date | null | undefined): boolean {
  if (!credentialsChangedAt) return true;
  if (typeof authTime !== 'number' || !Number.isFinite(authTime)) return false;
  return credentialsChangedAt.getTime() <= authTime;
}
