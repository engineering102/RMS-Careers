import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  AUTH_ACCOUNT_LIMIT,
  AUTH_CLIENT_LIMIT,
  enforceAuthLimits,
  accountKey,
  enforceRateLimit,
  ipKey,
  resetMemoryLimits,
  trustedClientIp,
  type RateLimitBinding
} from '../security/request-limits';

/**
 * Audit F-04: distributed rate limiting with a safe fallback.
 * (Identical module and test in apps/web, apps/admin and apps/student.)
 */
const rule = { binding: 'TEST_LIMITER', limit: 3, windowMs: 60_000 };

beforeEach(() => resetMemoryLimits());

describe('enforceRateLimit with the Cloudflare binding', () => {
  it('allows while the binding allows and checks every key', async () => {
    const binding: RateLimitBinding = { limit: vi.fn().mockResolvedValue({ success: true }) };
    const result = await enforceRateLimit(rule, ['a', 'b'], { getBinding: () => binding });
    expect(result).toEqual({ allowed: true, source: 'binding' });
    expect(binding.limit).toHaveBeenCalledWith({ key: 'a' });
    expect(binding.limit).toHaveBeenCalledWith({ key: 'b' });
  });

  it('denies when any key is over its limit', async () => {
    const binding: RateLimitBinding = {
      limit: vi.fn(async ({ key }: { key: string }) => ({ success: key !== 'acct' }))
    };
    expect(await enforceRateLimit(rule, ['ip', 'acct'], { getBinding: () => binding })).toEqual({ allowed: false, source: 'binding' });
  });

  it('falls back to the in-memory limiter when the binding errors, without denying everyone', async () => {
    const binding: RateLimitBinding = { limit: vi.fn().mockRejectedValue(new Error('binding down')) };
    const deps = { getBinding: () => binding, now: 1_000 };
    for (let i = 0; i < 3; i++) expect((await enforceRateLimit(rule, ['client-1'], deps)).allowed).toBe(true);
    expect(await enforceRateLimit(rule, ['client-1'], deps)).toEqual({ allowed: false, source: 'memory' });
    // Other clients are unaffected.
    expect((await enforceRateLimit(rule, ['client-2'], deps)).allowed).toBe(true);
  });
});

describe('in-memory fallback (no binding: tests, local dev)', () => {
  const deps = (now: number) => ({ getBinding: () => undefined, now });

  it('limits per key within the window and resets after it', async () => {
    for (let i = 0; i < 3; i++) expect((await enforceRateLimit(rule, ['k'], deps(0))).allowed).toBe(true);
    expect((await enforceRateLimit(rule, ['k'], deps(10))).allowed).toBe(false);
    expect((await enforceRateLimit(rule, ['k'], deps(60_001))).allowed).toBe(true);
  });

  it('does nothing without keys (e.g. no trusted client IP and no account)', async () => {
    for (let i = 0; i < 10; i++) expect((await enforceRateLimit(rule, [null, undefined, ''], deps(0))).allowed).toBe(true);
  });

  it('keeps separate budgets per rule', async () => {
    for (let i = 0; i < 3; i++) await enforceRateLimit(rule, ['k'], deps(0));
    expect((await enforceRateLimit({ ...rule, binding: 'OTHER' }, ['k'], deps(0))).allowed).toBe(true);
  });
});

describe('client identity', () => {
  it('trusts only cf-connecting-ip', () => {
    expect(trustedClientIp(new Headers({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '6.6.6.6' }))).toBe('203.0.113.9');
    expect(trustedClientIp(new Headers({ 'x-forwarded-for': '6.6.6.6', 'x-real-ip': '7.7.7.7' }))).toBeNull();
    expect(trustedClientIp(undefined)).toBeNull();
  });

  it('builds scoped keys and normalises account identifiers', () => {
    expect(ipKey('login', '203.0.113.9')).toBe('login:ip:203.0.113.9');
    expect(ipKey('login', null)).toBeNull();
    expect(accountKey('login', '  Admin@RMS.test ')).toBe('login:acct:admin@rms.test');
    expect(accountKey('login', 42)).toBeNull();
  });

  it('declares the binding names wired in wrangler.jsonc', () => {
    expect(AUTH_ACCOUNT_LIMIT.binding).toBe('AUTH_ACCOUNT_RATE_LIMITER');
    expect(AUTH_CLIENT_LIMIT.binding).toBe('AUTH_CLIENT_RATE_LIMITER');
  });
});

/** Audit PR-08: classroom NAT must not lock a class out; one account must stay strictly limited. */
describe('enforceAuthLimits (account + client rules)', () => {
  const memoryOnly = (now = 0) => ({ getBinding: () => undefined, now });
  beforeEach(() => resetMemoryLimits());

  it('declares separate bindings for account and client limits', () => {
    expect(AUTH_ACCOUNT_LIMIT).toEqual({ binding: 'AUTH_ACCOUNT_RATE_LIMITER', limit: 5, windowMs: 60_000 });
    expect(AUTH_CLIENT_LIMIT).toEqual({ binding: 'AUTH_CLIENT_RATE_LIMITER', limit: 60, windowMs: 60_000 });
  });

  it('lets a lab of 60 students behind one IP sign in within a minute, but not unbounded attempts', async () => {
    for (let i = 0; i < 60; i++) {
      const decision = await enforceAuthLimits({ client: 'login:ip:198.51.100.7', account: `login:acct:s${i}@college.test` }, memoryOnly());
      expect(decision.allowed).toBe(true);
    }
    const over = await enforceAuthLimits({ client: 'login:ip:198.51.100.7', account: 'login:acct:s61@college.test' }, memoryOnly());
    expect(over.allowed).toBe(false);
  });

  it('limits one account to 5 attempts a minute even when the attempts come from different IPs', async () => {
    for (let i = 0; i < 5; i++) {
      const decision = await enforceAuthLimits({ client: `login:ip:203.0.113.${i}`, account: 'login:acct:victim@college.test' }, memoryOnly());
      expect(decision.allowed).toBe(true);
    }
    expect((await enforceAuthLimits({ client: 'login:ip:203.0.113.99', account: 'login:acct:victim@college.test' }, memoryOnly())).allowed).toBe(false);
    expect((await enforceAuthLimits({ client: 'login:ip:203.0.113.99', account: 'login:acct:victim@college.test' }, memoryOnly(60_001))).allowed).toBe(true);
  });

  it("a client already over its limit does not consume the targeted account's allowance", async () => {
    for (let i = 0; i < 60; i++) await enforceAuthLimits({ client: 'login:ip:192.0.2.1', account: `login:acct:a${i}@x.test` }, memoryOnly());
    for (let i = 0; i < 10; i++) await enforceAuthLimits({ client: 'login:ip:192.0.2.1', account: 'login:acct:victim@x.test' }, memoryOnly());
    expect((await enforceAuthLimits({ client: 'login:ip:192.0.2.2', account: 'login:acct:victim@x.test' }, memoryOnly())).allowed).toBe(true);
  });

  it('uses the Workers bindings by name when present (client first, then account)', async () => {
    const calls: string[] = [];
    const getBinding = (name: string): RateLimitBinding => ({
      limit: async ({ key }) => {
        calls.push(`${name}|${key}`);
        return { success: true };
      }
    });
    await enforceAuthLimits({ client: 'c', account: 'a' }, { getBinding });
    expect(calls).toEqual(['AUTH_CLIENT_RATE_LIMITER|c', 'AUTH_ACCOUNT_RATE_LIMITER|a']);
  });
});
