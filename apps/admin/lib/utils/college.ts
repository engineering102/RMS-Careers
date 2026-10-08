/**
 * Pure college helpers (no server-only imports) shared by queries, actions and UI.
 */

export const COLLEGE_CODE_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** Canonical form for college codes: trimmed + upper-cased. */
export function normalizeCollegeCode(code: string): string {
  return code.trim().toUpperCase();
}

export class DuplicateCollegeCodeError extends Error {
  constructor(public readonly code: string) {
    super(`College code ${code} already exists.`);
    this.name = 'DuplicateCollegeCodeError';
  }
}

/** Detects a PostgreSQL unique-violation (23505), including driver-wrapped causes. */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string }; message?: string } | null;
  if (!e) return false;
  if (e.code === '23505' || e.cause?.code === '23505') return true;
  return typeof e.message === 'string' && /duplicate key value violates unique constraint/i.test(e.message);
}

interface SelectableCollege {
  id: string;
  isActive: boolean;
}

/**
 * Colleges that may be offered as a new selection: all active ones, plus the
 * college an existing record already references (so it stays visible/preserved).
 */
export function selectableColleges<T extends SelectableCollege>(
  all: T[],
  currentCollegeId?: string | null
): T[] {
  return all.filter((c) => c.isActive || (!!currentCollegeId && c.id === currentCollegeId));
}
