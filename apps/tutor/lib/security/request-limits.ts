import 'server-only';

import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Abuse controls for public and authentication endpoints (audit F-04).
 *
 * Primary control: a Cloudflare Workers Rate Limiting binding (declared under `ratelimits` in
 * wrangler.jsonc), shared by every isolate in a Cloudflare location, so it holds across isolates and
 * restarts, unlike process memory. When the binding is unavailable (local dev, tests, a binding error)
 * a bounded in-memory limiter applies instead. A failure of the limiter itself never denies requests
 * wholesale: keys are per client/account, so the worst case is the weaker per-isolate limit.
 *
 * Client identity comes only from `cf-connecting-ip`, which Cloudflare sets on every request to the
 * Worker and clients cannot override. `x-forwarded-for` / `x-real-ip` are never trusted.
 *
 * NOTE: identical copies live in apps/{web,admin,student,tutor}/lib/security/request-limits.ts (no shared
 * non-auth server package exists); keep them in sync.
 */

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface LimitRule {
  /** Name of the `ratelimits` binding in wrangler.jsonc. */
  binding: string;
  /** Fallback limit and window; keep equal to the binding's `simple` settings. */
  limit: number;
  windowMs: number;
}

export interface LimitDecision {
  allowed: boolean;
  source: 'binding' | 'memory';
}

/**
 * Authentication limits (audit PR-08). Two separate bindings, because one rule cannot serve both:
 *  - per ACCOUNT (email): strict. Bounds guessing against one account wherever attempts come from.
 *  - per CLIENT IP: sized for a college lab behind one NAT, where a whole class signs in or activates
 *    accounts within the same minute. A single shared rule of 10/min locked such a class out.
 * Further control belongs at the edge (Cloudflare WAF rate rule / managed challenge on the auth
 * endpoints, Turnstile after repeated failures), not in looser per-IP numbers here.
 */
export const AUTH_ACCOUNT_LIMIT: LimitRule = { binding: 'AUTH_ACCOUNT_RATE_LIMITER', limit: 5, windowMs: 60_000 };
export const AUTH_CLIENT_LIMIT: LimitRule = { binding: 'AUTH_CLIENT_RATE_LIMITER', limit: 60, windowMs: 60_000 };
export const PUBLIC_FORM_LIMIT: LimitRule = { binding: 'PUBLIC_FORM_RATE_LIMITER', limit: 5, windowMs: 60_000 };

// ---- bounded in-memory fallback -------------------------------------------------------------
const MAX_KEYS = 5000;
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, rule: LimitRule, now: number): boolean {
  if (memory.size >= MAX_KEYS) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    if (memory.size >= MAX_KEYS) {
      // Evict the oldest entries rather than refusing service.
      for (const k of Array.from(memory.keys()).slice(0, Math.ceil(MAX_KEYS / 5))) memory.delete(k);
    }
  }
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }
  if (entry.count >= rule.limit) return false;
  entry.count += 1;
  return true;
}

/** Test hook. */
export function resetMemoryLimits(): void {
  memory.clear();
}

function defaultBinding(name: string): RateLimitBinding | undefined {
  try {
    const env = getCloudflareContext().env as unknown as Record<string, unknown>;
    const candidate = env?.[name] as RateLimitBinding | undefined;
    return candidate && typeof candidate.limit === 'function' ? candidate : undefined;
  } catch {
    return undefined; // Not running inside the Workers runtime (e.g. tests, plain `next dev`).
  }
}

/**
 * Applies `rule` to every key; the request is allowed only if all keys are within their limits.
 * Pass several keys to limit per client AND per account.
 */
export async function enforceRateLimit(
  rule: LimitRule,
  keys: readonly (string | null | undefined)[],
  deps: { getBinding?: (name: string) => RateLimitBinding | undefined; now?: number } = {}
): Promise<LimitDecision> {
  const activeKeys = keys.filter((k): k is string => typeof k === 'string' && k.length > 0);
  if (activeKeys.length === 0) return { allowed: true, source: 'memory' };

  const binding = (deps.getBinding ?? defaultBinding)(rule.binding);
  if (binding) {
    try {
      for (const key of activeKeys) {
        const { success } = await binding.limit({ key });
        if (!success) return { allowed: false, source: 'binding' };
      }
      return { allowed: true, source: 'binding' };
    } catch (error) {
      console.error('[rate-limit] Binding unavailable, using in-memory fallback:', error instanceof Error ? error.message : 'unknown');
    }
  }

  const now = deps.now ?? Date.now();
  for (const key of activeKeys) {
    if (!memoryLimit(`${rule.binding}:${key}`, rule, now)) return { allowed: false, source: 'memory' };
  }
  return { allowed: true, source: 'memory' };
}


/**
 * Applies the client-IP rule first, then the account rule: a client that is already over its limit
 * does not also consume the per-account allowance of the accounts it targets (limits a lock-out of
 * victims from one source). Either key may be null (e.g. no IP outside Cloudflare, no email yet).
 */
export async function enforceAuthLimits(
  keys: { client?: string | null; account?: string | null },
  deps: Parameters<typeof enforceRateLimit>[2] = {}
): Promise<LimitDecision> {
  const client = await enforceRateLimit(AUTH_CLIENT_LIMIT, [keys.client], deps);
  if (!client.allowed) return client;
  return enforceRateLimit(AUTH_ACCOUNT_LIMIT, [keys.account], deps);
}

/** The connecting client's IP as reported by Cloudflare, or null outside Cloudflare. */
export function trustedClientIp(headers: { get(name: string): string | null } | null | undefined): string | null {
  const value = headers?.get('cf-connecting-ip')?.trim();
  return value ? value : null;
}

/** Normalises an account identifier (email) for use in a limit key. */
export function accountKey(scope: string, email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized ? `${scope}:acct:${normalized}` : null;
}

export function ipKey(scope: string, ip: string | null): string | null {
  return ip ? `${scope}:ip:${ip}` : null;
}
