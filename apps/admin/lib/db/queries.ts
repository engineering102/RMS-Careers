/**
 * @file lib/db/queries.ts
 *
 * Barrel re-export for all domain query modules.
 *
 * All existing imports from '@/lib/db/queries' continue to work unchanged.
 * Domain logic lives in:
 *   - lib/db/queries/programs.ts
 *   - lib/db/queries/students.ts
 *   - lib/db/queries/enrollments.ts
 */
import 'server-only';

export * from './queries/programs';
export * from './queries/students';
export * from './queries/enrollments';
export * from './queries/users';
export * from './queries/colleges';
export * from './queries/batches';
export * from './queries/tokens';
