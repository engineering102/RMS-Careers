import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { enrollmentStatusEnum } from '@rms/db/schema';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

import {
  ACCESS_GRANTING_ENROLLMENT_STATUSES,
  ACCESS_GRANTING_BATCH_STATUSES,
  enrollmentGrantsAccess
} from '../db/access-policy';
import { hasBatchAccess } from '../db/queries/entitlements';

/**
 * Audit F-05 / F-06: one lifecycle predicate for student access. The live-database behaviour is
 * covered by access-policy.int.test.ts; here we pin the policy and its wiring.
 */
const dialect = new PgDialect();
const render = (q: Parameters<PgDialect['sqlToQuery']>[0]) => {
  const out = dialect.sqlToQuery(q);
  return { text: out.sql.replace(/\s+/g, ' '), params: out.params };
};

describe('enrollment lifecycle policy', () => {
  const allStatuses = enrollmentStatusEnum.enumValues;

  it('grants access only for active and confirmed enrollments', () => {
    expect([...ACCESS_GRANTING_ENROLLMENT_STATUSES]).toEqual(['active', 'confirmed']);
    const { text, params } = render(enrollmentGrantsAccess());
    // The enrollment-status clause comes first and binds exactly the granting statuses.
    expect(text.startsWith('("enrollments"."status" in ($1, $2)')).toBe(true);
    const enrollmentParams = params.slice(0, 2);
    for (const status of allStatuses) {
      const granted = status === 'active' || status === 'confirmed';
      expect(enrollmentParams.includes(status), status).toBe(granted);
    }
  });

  it('adds completed only where read-only history is requested', () => {
    const { text, params } = render(enrollmentGrantsAccess({ includeCompleted: true }));
    expect(text.startsWith('("enrollments"."status" in ($1, $2, $3)')).toBe(true);
    expect(params.slice(0, 3)).toEqual(['active', 'confirmed', 'completed']);
  });

  it.each(['revoked', 'suspended', 'cancelled', 'dropped', 'transferred', 'pending', 'waitlisted'])(
    'never grants access for %s, even with includeCompleted',
    (status) => {
      expect(render(enrollmentGrantsAccess({ includeCompleted: true })).params).not.toContain(status);
    }
  );

  it('requires a live program, an active college and an active/completed batch', () => {
    const { text, params } = render(enrollmentGrantsAccess());
    expect(text).toContain(`ep.status = 'archived'`);
    expect(text).toContain('ec.is_active = false');
    expect(text).toContain('ebc.is_active = true');
    expect(text).toContain(`ebp.status <> 'archived'`);
    expect(text).toMatch(/eb\.status IN \(\$\d+, \$\d+\)/);
    expect(params).toEqual(expect.arrayContaining([...ACCESS_GRANTING_BATCH_STATUSES]));
    expect(params).not.toContain('draft');
    expect(params).not.toContain('archived');
  });
});

describe('hasBatchAccess (used by every student Server Action)', () => {
  it('applies the shared lifecycle predicate to the enrollment lookup', async () => {
    let captured: any;
    const client = {
      select: () => ({
        from: () => ({
          where: (cond: any) => {
            captured = cond;
            return { limit: async () => [] };
          }
        })
      })
    } as any;

    await expect(hasBatchAccess(7, '22222222-2222-4222-8222-222222222222', client)).resolves.toBe(false);
    const { text, params } = render(captured);
    expect(text).toContain('"enrollments"."student_id" = $');
    expect(text).toContain('"enrollments"."batch_id" = $');
    expect(text).toContain('ebc.is_active = true');
    expect(params).toEqual(expect.arrayContaining([7, 'active', 'confirmed']));
  });

  it('returns true only when a granting enrollment row exists', async () => {
    const client = (rows: unknown[]) =>
      ({ select: () => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }) }) as any;
    await expect(hasBatchAccess(7, 'b', client([{ id: 1 }]))).resolves.toBe(true);
    await expect(hasBatchAccess(7, 'b', client([]))).resolves.toBe(false);
    await expect(hasBatchAccess(0, 'b', client([{ id: 1 }]))).resolves.toBe(false);
  });
});
