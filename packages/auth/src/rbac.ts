import type { RoleEnum } from '@rms/db';

/**
 * Authoritative administrative roles recognized across RMS platform applications.
 */
export const ADMIN_ROLES = ['super_admin', 'admin'] as const satisfies readonly RoleEnum[];

export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Flexible input type representing user role assignments.
 * Supports single strings, string arrays, or relation objects ({ role: RoleEnum }).
 */
export type RoleInput =
  | RoleEnum
  | string
  | readonly (RoleEnum | string)[]
  | readonly { role: RoleEnum | string }[]
  | null
  | undefined;

/**
 * Normalizes diverse role inputs into a clean array of lowercase role strings.
 */
export function normalizeRoles(input: RoleInput): RoleEnum[] {
  if (!input) return [];

  if (typeof input === 'string') {
    return [input.trim().toLowerCase() as RoleEnum];
  }

  if (Array.isArray(input)) {
    const normalized: RoleEnum[] = [];
    for (const item of input) {
      if (!item) continue;
      if (typeof item === 'string') {
        normalized.push(item.trim().toLowerCase() as RoleEnum);
      } else if (typeof item === 'object' && 'role' in item && typeof item.role === 'string') {
        normalized.push(item.role.trim().toLowerCase() as RoleEnum);
      }
    }
    return normalized;
  }

  return [];
}

/**
 * Checks whether a user possesses a specific required role or any of the allowed roles.
 *
 * @param userRoles Roles held by the user (array of strings, relation objects, or single string)
 * @param requiredRole Single required role or array of permissible roles
 * @returns boolean indicating whether the user possesses at least one matching role
 */
export function hasRole(
  userRoles: RoleInput,
  requiredRole: RoleEnum | readonly RoleEnum[]
): boolean {
  const normalized = normalizeRoles(userRoles);
  if (normalized.length === 0) return false;

  const allowedRoles = Array.isArray(requiredRole)
    ? (requiredRole as readonly RoleEnum[])
    : [requiredRole as RoleEnum];

  return normalized.some((userRole) => allowedRoles.includes(userRole));
}

/**
 * Checks whether a user possesses administrative privileges ('admin' or 'super_admin').
 *
 * @param userRoles Roles held by the user
 * @returns boolean
 */
export function hasAdminPrivileges(userRoles: RoleInput): boolean {
  return hasRole(userRoles, ADMIN_ROLES);
}

/**
 * Error thrown when server-side role assertion fails.
 */
export class AuthorizationError extends Error {
  readonly code = 'FORBIDDEN';

  constructor(message: string = 'Unauthorized: Insufficient role permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Server-side assertion that a user holds at least one of the required roles.
 * Throws `AuthorizationError` if the assertion fails.
 *
 * @param userRoles Roles held by the user
 * @param requiredRole Required role or list of acceptable roles
 * @param customMessage Optional custom error message
 */
export function assertRole(
  userRoles: RoleInput,
  requiredRole: RoleEnum | readonly RoleEnum[],
  customMessage?: string
): void {
  if (!hasRole(userRoles, requiredRole)) {
    const expected = Array.isArray(requiredRole) ? requiredRole.join(' | ') : requiredRole;
    throw new AuthorizationError(
      customMessage || `Access denied: requires role [${expected}]`
    );
  }
}

/**
 * Server-side assertion that a user possesses administrative privileges.
 * Throws `AuthorizationError` if the assertion fails.
 *
 * @param userRoles Roles held by the user
 * @param customMessage Optional custom error message
 */
export function assertAdminPrivileges(
  userRoles: RoleInput,
  customMessage?: string
): void {
  if (!hasAdminPrivileges(userRoles)) {
    throw new AuthorizationError(
      customMessage || 'Access denied: requires administrative privileges'
    );
  }
}
