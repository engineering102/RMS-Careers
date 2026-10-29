import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PgDialect } from 'drizzle-orm/pg-core';

vi.mock('server-only', () => ({}));

import { assignmentSubmissions } from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { adminScope, assertScope, inScope, isBatchInScope, tutorScope, type AcademicScope } from '../scope';
import {
  getBatchProjectsOverview,
  getBatchProjectSubmissions,
  getBatchProjectSubmissionDetails,
  computeAllowedTransitions
} from '../projects';
import { getBatchAssessmentsOverview, getBatchAssessmentAttempts } from '../assessments';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const dialect = new PgDialect();

/** A client that fails the test if any query is attempted. */
const untouchable = new Proxy({} as DbClient, {
  get(_target, prop) {
    throw new Error(`database touched (${String(prop)}) for an out-of-scope batch`);
  }
});

describe('scope factories', () => {
  it('adminScope covers every batch', () => {
    expect(isBatchInScope(adminScope(), A)).toBe(true);
    expect(isBatchInScope(adminScope(), B)).toBe(true);
  });

  it('tutorScope covers exactly its batches, deduplicated and frozen', () => {
    const scope = tutorScope([A, A]);
    expect(isBatchInScope(scope, A)).toBe(true);
    expect(isBatchInScope(scope, B)).toBe(false);
    expect(scope.kind === 'batches' && scope.batchIds).toEqual([A]);
    expect(Object.isFrozen(scope)).toBe(true);
    expect(scope.kind === 'batches' && Object.isFrozen(scope.batchIds)).toBe(true);
    // Frozen at runtime too, so a caller cannot widen a scope after it was issued.
    expect(() => (scope as unknown as { batchIds: string[] }).batchIds.push(B)).toThrow(TypeError);
  });

  it('an empty tutorScope covers nothing', () => {
    expect(isBatchInScope(tutorScope([]), A)).toBe(false);
  });

  it('rejects scopes that did not come from a factory', () => {
    const forgedAll = { kind: 'all' } as AcademicScope;
    const forgedBatches = { kind: 'batches', batchIds: [A] } as AcademicScope;
    for (const forged of [forgedAll, forgedBatches, null as unknown as AcademicScope]) {
      expect(() => assertScope(forged)).toThrow(/invalid scope/);
      expect(() => isBatchInScope(forged, A)).toThrow(/invalid scope/);
      expect(() => inScope(assignmentSubmissions.batchId, forged)).toThrow(/invalid scope/);
    }
  });
});

describe('inScope', () => {
  const render = (fragment: ReturnType<typeof inScope>) => (fragment ? dialect.sqlToQuery(fragment) : undefined);

  it('adds no condition for the admin scope', () => {
    expect(inScope(assignmentSubmissions.batchId, adminScope())).toBeUndefined();
  });

  it('matches nothing for an empty tutor scope', () => {
    expect(render(inScope(assignmentSubmissions.batchId, tutorScope([])))?.sql).toBe('false');
  });

  it('restricts the column to the tutor batches', () => {
    const q = render(inScope(assignmentSubmissions.batchId, tutorScope([A, B])));
    expect(q?.sql).toBe('"assignment_submissions"."batch_id" in ($1, $2)');
    expect(q?.params).toEqual([A, B]);
  });
});

describe('queries refuse batches outside the scope without touching the database', () => {
  const scope = tutorScope([A]);

  it('projects', async () => {
    await expect(getBatchProjectsOverview(untouchable, scope, B)).resolves.toEqual([]);
    await expect(getBatchProjectSubmissions(untouchable, scope, B, { status: 'all' })).resolves.toEqual([]);
    await expect(getBatchProjectSubmissionDetails(untouchable, scope, B, 'any-submission')).resolves.toBeNull();
  });

  it('assessments', async () => {
    await expect(getBatchAssessmentsOverview(untouchable, scope, B)).resolves.toEqual([]);
    await expect(getBatchAssessmentAttempts(untouchable, scope, B, 'any-quiz')).resolves.toEqual([]);
  });

  it('throws for a forged scope instead of querying', async () => {
    const forged = { kind: 'all' } as AcademicScope;
    await expect(getBatchProjectsOverview(untouchable, forged, A)).rejects.toThrow(/invalid scope/);
    await expect(getBatchAssessmentsOverview(untouchable, forged, A)).rejects.toThrow(/invalid scope/);
  });
});

describe('review state machine (unchanged from apps/admin)', () => {
  it('allows only the existing forward transitions', () => {
    expect(computeAllowedTransitions('submitted')).toEqual(['under_review']);
    expect(computeAllowedTransitions('under_review')).toEqual(['resubmission_requested', 'approved']);
    expect(computeAllowedTransitions('resubmission_requested')).toEqual(['under_review']);
    expect(computeAllowedTransitions('approved')).toEqual([]);
  });
});

describe('package boundaries', () => {
  const srcDir = path.resolve(__dirname, '..');
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts'));

  it.each(files)('%s reads no environment and imports no global db client or app code', (file) => {
    const source = readFileSync(path.join(srcDir, file), 'utf8');
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/import\s*\{[^}]*\bdb\b[^}]*\}\s*from\s*'@rms\/db'/);
    expect(source).not.toMatch(/from\s*'(@\/|[^']*apps\/)/);
    expect(source).not.toMatch(/from\s*'@rms\/auth'/);
  });
});

describe('restrictScope', () => {
  it('narrows the admin scope to the named batches', async () => {
    const { restrictScope } = await import('../scope');
    const narrowed = restrictScope(adminScope(), [A]);
    expect(isBatchInScope(narrowed, A)).toBe(true);
    expect(isBatchInScope(narrowed, B)).toBe(false);
  });

  it('never widens a tutor scope', async () => {
    const { restrictScope } = await import('../scope');
    const narrowed = restrictScope(tutorScope([A]), [A, B]);
    expect(isBatchInScope(narrowed, A)).toBe(true);
    expect(isBatchInScope(narrowed, B)).toBe(false);
    expect(isBatchInScope(restrictScope(tutorScope([A]), [B]), B)).toBe(false);
  });

  it('rejects a forged scope', async () => {
    const { restrictScope } = await import('../scope');
    expect(() => restrictScope({ kind: 'all' } as AcademicScope, [A])).toThrow(/invalid scope/);
  });
});
