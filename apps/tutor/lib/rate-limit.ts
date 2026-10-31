/**
 * In-memory, bounded sliding-window rate limiter for server-side recovery and activation actions.
 *
 * Implements bounded capacity with automatic pruning to prevent memory exhaustion in Edge/Node environments.
 * Zero external dependencies (no Redis required for V1).
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const MAX_STORE_ENTRIES = 5000;
const store = new Map<string, RateLimitRecord>();

/**
 * Prunes expired records if store size exceeds threshold.
 */
function pruneExpired(now: number): void {
  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
  // If still over capacity after removing expired entries, evict oldest
  if (store.size > MAX_STORE_ENTRIES) {
    const keysToEvict = Array.from(store.keys()).slice(0, Math.floor(MAX_STORE_ENTRIES * 0.2));
    for (const key of keysToEvict) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /**
   * Unique identifier key (e.g. `pw-reset:email:user@domain.com` or `pw-reset:ip:1.2.3.4`)
   */
  key: string;
  /**
   * Maximum allowed attempts within the window
   */
  limit: number;
  /**
   * Window duration in milliseconds (e.g. 15 minutes = 15 * 60 * 1000)
   */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

/**
 * Checks and increments rate limit for a given key.
 *
 * @returns RateLimitResult with success=true if within limit, false if rate limited.
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { key, limit, windowMs } = options;

  if (store.size >= MAX_STORE_ENTRIES) {
    pruneExpired(now);
  }

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt
    };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt
  };
}

/**
 * Clears stored rate limits (useful for testing).
 */
export function resetRateLimitStore(key?: string): void {
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
}
