/**
 * Pure Web-standard, Edge/Workers-compatible token utilities.
 *
 * Implements cryptographically secure token generation and deterministic
 * SHA-256 token hashing for account activation, password reset, and session verification.
 * Raw security tokens are never stored in the database.
 */

/**
 * Compares two strings in constant time to prevent timing attacks.
 * Pure Web-standard implementation requiring zero Node-specific builtins.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates a cryptographically random token string.
 * Uses Web Crypto `crypto.getRandomValues` to ensure sufficient entropy.
 *
 * @param byteLength Number of random bytes to generate (default: 32 bytes = 256 bits)
 * @returns Hex-encoded string (64 chars for 32 bytes)
 */
export function generateToken(byteLength: number = 32): string {
  if (byteLength < 16) {
    throw new Error('Token length must be at least 16 bytes for security');
  }
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deterministically computes the SHA-256 hex digest of a raw token string.
 * Uses standard Web Crypto `crypto.subtle.digest`.
 *
 * @param token The raw token string to hash
 * @returns Promise resolving to a 64-character lowercase hex string
 */
export async function hashToken(token: string): Promise<string> {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token provided for hashing');
  }
  const data = new TextEncoder().encode(token);
  const digestBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digestBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Securely verifies a raw token candidate against a stored SHA-256 token hash.
 * Computes the hash of the candidate token and compares in constant time.
 * Returns false safely if inputs are missing or invalid.
 *
 * @param rawToken The candidate plaintext token provided by the user
 * @param storedHash The stored 64-char SHA-256 hash from the database
 * @returns Promise resolving to true if candidate matches stored hash
 */
export async function verifyToken(rawToken: string, storedHash: string): Promise<boolean> {
  if (!rawToken || !storedHash || typeof rawToken !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  try {
    const computedHash = await hashToken(rawToken);
    return timingSafeEqual(computedHash.toLowerCase(), storedHash.toLowerCase());
  } catch {
    return false;
  }
}
