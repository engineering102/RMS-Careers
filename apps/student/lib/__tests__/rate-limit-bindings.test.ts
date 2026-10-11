import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('server-only', () => ({}));
import { AUTH_ACCOUNT_LIMIT, AUTH_CLIENT_LIMIT } from '../security/request-limits';

/** Audit PR-08: the Workers bindings and the in-memory fallback must enforce the same numbers. */
describe('wrangler.jsonc rate-limit bindings', () => {
  const jsonc = readFileSync(path.resolve(__dirname, '../../wrangler.jsonc'), 'utf8');
  const bindings = new Map(
    [...jsonc.matchAll(/"name":\s*"(\w+)",\s*"namespace_id":\s*"(\d+)",\s*"simple":\s*\{\s*"limit":\s*(\d+),\s*"period":\s*(\d+)\s*\}/g)].map(
      (m) => [m[1], { namespace: m[2], limit: Number(m[3]), periodMs: Number(m[4]) * 1000 }]
    )
  );

  it.each([AUTH_ACCOUNT_LIMIT, AUTH_CLIENT_LIMIT])('declares $binding with the same limit and window as the code', (rule) => {
    expect(bindings.get(rule.binding)).toMatchObject({ limit: rule.limit, periodMs: rule.windowMs });
  });

  it('uses a distinct namespace_id per binding', () => {
    const ids = [...bindings.values()].map((b) => b.namespace);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
