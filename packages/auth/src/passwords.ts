import bcrypt from 'bcryptjs';

/**
 * Pure JavaScript, Edge/Workers-compatible password hashing utilities.
 * Uses bcryptjs with an authoritative work factor of 12 rounds.
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt.
 * @param password Plaintext password to hash
 * @returns Promise resolving to the hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password provided for hashing');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * Constant-time comparison prevents timing attacks.
 * Malformed or invalid hashes fail safely by returning false instead of throwing.
 *
 * @param password Plaintext candidate password
 * @param hash Stored bcrypt hash
 * @returns Promise resolving to boolean (true if match)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
