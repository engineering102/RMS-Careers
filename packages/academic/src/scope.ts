import { inArray, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Authorization scope for academic queries (tutor plan §5.3).
 *
 * Every exported query in this package takes a scope. A `batchId` argument is a filter, never proof of access:
 * the query returns nothing when the batch is outside the scope. Scopes come only from the two factories below
 * (checked at runtime too), so a plain object literal cannot stand in for one.
 *  - adminScope(): every batch. Only apps/admin may use it (enforced by a source test in apps/tutor).
 *  - tutorScope(ids): exactly the batches the caller resolved from tutor_batch_assignments this request.
 */
export type AcademicScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'batches'; readonly batchIds: readonly string[] };

const issued = new WeakSet<object>();

function issue<T extends AcademicScope>(scope: T): T {
  const frozen = Object.freeze(scope);
  issued.add(frozen);
  return frozen;
}

export function adminScope(): AcademicScope {
  return issue({ kind: 'all' });
}

export function tutorScope(batchIds: readonly string[]): AcademicScope {
  return issue({ kind: 'batches', batchIds: Object.freeze([...new Set(batchIds)]) });
}

/** Throws unless `scope` came from adminScope() or tutorScope(). */
export function assertScope(scope: AcademicScope): void {
  if (!scope || typeof scope !== 'object' || !issued.has(scope)) {
    throw new Error('[academic] invalid scope: use adminScope() or tutorScope().');
  }
}

export function isBatchInScope(scope: AcademicScope, batchId: string): boolean {
  assertScope(scope);
  return scope.kind === 'all' || scope.batchIds.includes(batchId);
}

/**
 * WHERE fragment restricting a batch column to the scope: undefined for every batch (and() drops it), FALSE for
 * an empty tutor scope, `column IN (...)` otherwise. For queries that span batches.
 */
export function inScope(column: AnyPgColumn, scope: AcademicScope): SQL | undefined {
  assertScope(scope);
  if (scope.kind === 'all') return undefined;
  if (scope.batchIds.length === 0) return sql`false`;
  return inArray(column, [...scope.batchIds]);
}
