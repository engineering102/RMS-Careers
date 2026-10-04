import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@rms/auth';

describe('Password Hashing & Verification', () => {
  it('should hash a password and produce a valid bcrypt string', async () => {
    const password = 'SuperSecretAdminPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
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
  });
});
