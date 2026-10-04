import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, BCRYPT_SALT_ROUNDS } from '../passwords';

describe('@rms/auth — Password Hashing & Verification', () => {
  it('should expose cost factor 12 as authoritative constant', () => {
    expect(BCRYPT_SALT_ROUNDS).toBe(12);
  });

  it('should hash a password and produce a valid bcrypt string with cost factor 12', async () => {
    const password = 'SuperSecretAdminPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    // Bcrypt format: $2a$12$... or $2b$12$...
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toBe(password);
  });

  it('should successfully verify a correct password against its hash', async () => {
    const password = 'CorrectPassword#2026';
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'CorrectPassword#2026';
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword('WrongPassword#2026', hash);
    expect(isMatch).toBe(false);
  });

  it('should generate different salts for identical passwords', async () => {
    const password = 'IdenticalPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it('should safely return false for malformed inputs without throwing', async () => {
    expect(await verifyPassword('', 'somehash')).toBe(false);
    expect(await verifyPassword('password', '')).toBe(false);
    // @ts-expect-error test invalid types
    expect(await verifyPassword(null, null)).toBe(false);
    // @ts-expect-error test invalid types
    expect(await verifyPassword(undefined, 'hash')).toBe(false);
    expect(await verifyPassword('password', 'not-a-valid-bcrypt-hash')).toBe(false);
  });

  it('should throw an explicit error when attempting to hash an invalid or empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow('Invalid password provided for hashing');
    // @ts-expect-error test invalid types
    await expect(hashPassword(null)).rejects.toThrow('Invalid password provided for hashing');
  });
});
