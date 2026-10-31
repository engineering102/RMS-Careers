/**
 * Who may use the Tutor Portal (tutor plan §5.5, decision D-5). Pure, so every rule is unit-tested.
 *
 * A tutor account is a user with the `tutor` role AND a tutor profile that is active, in the expected account status.
 * Accounts that also hold `admin` or `super_admin` are refused outright: admin credentials must never be verifiable
 * on the tutor domain, and a tutor-side password reset must never be able to change an admin's password. Admin
 * tutor creation already refuses admin emails; this is the defence in depth for accounts changed later by hand.
 */

export interface TutorAccountRecord {
  userId: string;
  status: string;
  roles: readonly string[];
  tutorId: string | null;
  tutorActive: boolean | null;
  updatedAt: Date | null;
}

export type TutorAccountVerdict = 'ok' | 'not_tutor' | 'admin_account' | 'inactive_tutor' | 'wrong_status';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function evaluateTutorAccount(
  account: TutorAccountRecord,
  expectedStatus: 'active' | 'pending_activation'
): TutorAccountVerdict {
  const roles = account.roles.map((r) => r.trim().toLowerCase());
  if (!roles.includes('tutor') || !account.tutorId) return 'not_tutor';
  if (roles.some((r) => ADMIN_ROLES.has(r))) return 'admin_account';
  if (account.tutorActive !== true) return 'inactive_tutor';
  if (account.status !== expectedStatus) return 'wrong_status';
  return 'ok';
}
