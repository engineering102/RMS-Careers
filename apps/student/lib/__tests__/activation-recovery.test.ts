import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitStore } from '../rate-limit';
import {
  validateActivationToken,
  activateStudentAccount,
  requestActivationResend
} from '../db/activation';
import {
  requestPasswordRecovery,
  validatePasswordResetToken,
  resetStudentPassword
} from '../db/password-recovery';
import { hashToken, hashPassword, verifyPassword } from '@rms/auth';

vi.mock('server-only', () => ({}));

// In-memory test store simulating PostgreSQL tables for @rms/db
interface UserRow {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  status: 'pending_activation' | 'active' | 'suspended' | 'archived';
  emailVerifiedAt: Date | null;
  updatedAt: Date;
}

interface StudentRow {
  id: number;
  userId: string;
  fullName: string;
}

interface UserRoleRow {
  id: string;
  userId: string;
  role: 'student' | 'admin' | 'tutor';
}

interface AccountTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  tokenType: 'activation' | 'password_reset';
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

let mockUsers: UserRow[] = [];
let mockStudents: StudentRow[] = [];
let mockUserRoles: UserRoleRow[] = [];
let mockTokens: AccountTokenRow[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => ({
          where: (clause: any) => ({
            limit: (n: number) => {
              // Simulated queries
              if (table === actual.users) {
                // Return users
                return Promise.resolve(mockUsers);
              }
              if (table === actual.accountTokens) {
                return Promise.resolve(mockTokens);
              }
              if (table === actual.students) {
                return Promise.resolve(mockStudents);
              }
              if (table === actual.userRoles) {
                return Promise.resolve(mockUserRoles);
              }
              return Promise.resolve([]);
            },
            then: (resolve: any) => {
              if (table === actual.userRoles) {
                resolve(mockUserRoles);
              } else if (table === actual.accountTokens) {
                resolve(mockTokens);
              } else {
                resolve([]);
              }
            }
          })
        })
      }),
      insert: (table: any) => ({
        values: (vals: any) => ({
          returning: () => {
            if (table === actual.accountTokens) {
              const rec: AccountTokenRow = {
                id: `tok-${mockTokens.length + 1}`,
                ...vals,
                consumedAt: null,
                createdAt: new Date()
              };
              mockTokens.push(rec);
              return Promise.resolve([rec]);
            }
            return Promise.resolve([vals]);
          },
          then: (resolve: any) => {
            if (table === actual.accountTokens) {
              const rec: AccountTokenRow = {
                id: `tok-${mockTokens.length + 1}`,
                ...vals,
                consumedAt: null,
                createdAt: new Date()
              };
              mockTokens.push(rec);
              resolve([rec]);
            } else {
              resolve([]);
            }
          }
        })
      }),
      update: (table: any) => ({
        set: (vals: any) => ({
          where: (clause: any) => ({
            returning: () => {
              if (table === actual.accountTokens) {
                // Compare and swap token update
                const now = new Date();
                const matched = mockTokens.find(
                  (t) => t.consumedAt === null && t.expiresAt > now
                );
                if (matched) {
                  matched.consumedAt = vals.consumedAt ?? now;
                  return Promise.resolve([{ userId: matched.userId }]);
                }
                return Promise.resolve([]);
              }
              return Promise.resolve([]);
            },
            then: (resolve: any) => {
              if (table === actual.accountTokens) {
                mockTokens.forEach((t) => {
                  if (t.consumedAt === null) {
                    t.consumedAt = vals.consumedAt ?? new Date();
                  }
                });
                resolve([]);
              } else if (table === actual.users) {
                mockUsers.forEach((u) => {
                  if (vals.status) u.status = vals.status;
                  if (vals.passwordHash) u.passwordHash = vals.passwordHash;
                  if (vals.emailVerifiedAt) u.emailVerifiedAt = vals.emailVerifiedAt;
                  if (vals.updatedAt) u.updatedAt = vals.updatedAt;
                });
                resolve([]);
              } else {
                resolve([]);
              }
            }
          })
        })
      }),
      transaction: async (cb: any) => {
        const tx = {
          select: (fields?: any) => ({
            from: (table: any) => ({
              where: (clause: any) => ({
                limit: (n: number) => {
                  if (table === actual.users) return Promise.resolve(mockUsers);
                  if (table === actual.students) return Promise.resolve(mockStudents);
                  return Promise.resolve([]);
                },
                then: (resolve: any) => {
                  if (table === actual.userRoles) resolve(mockUserRoles);
                  else resolve([]);
                }
              })
            })
          }),
          update: (table: any) => ({
            set: (vals: any) => ({
              where: (clause: any) => ({
                returning: () => {
                  if (table === actual.accountTokens) {
                    const now = new Date();
                    const matched = mockTokens.find(
                      (t) => t.consumedAt === null && t.expiresAt > now
                    );
                    if (matched) {
                      matched.consumedAt = vals.consumedAt ?? now;
                      return Promise.resolve([{ userId: matched.userId }]);
                    }
                    return Promise.resolve([]);
                  }
                  return Promise.resolve([]);
                },
                then: (resolve: any) => {
                  if (table === actual.users) {
                    mockUsers.forEach((u) => {
                      if (vals.status) u.status = vals.status;
                      if (vals.passwordHash) u.passwordHash = vals.passwordHash;
                      if (vals.emailVerifiedAt) u.emailVerifiedAt = vals.emailVerifiedAt;
                      if (vals.updatedAt) u.updatedAt = vals.updatedAt;
                    });
                    resolve([]);
                  } else if (table === actual.accountTokens) {
                    mockTokens.forEach((t) => {
                      if (t.consumedAt === null) {
                        t.consumedAt = vals.consumedAt ?? new Date();
                      }
                    });
                    resolve([]);
                  }
                }
              })
            })
          })
        };
        return cb(tx);
      }
    }
  };
});

describe('Slice 4: In-Memory Bounded Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('allows requests within limit and tracks remaining quota', () => {
    const key = 'test:rate:key1';
    const r1 = checkRateLimit({ key, limit: 3, windowMs: 10000 });
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit({ key, limit: 3, windowMs: 10000 });
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit({ key, limit: 3, windowMs: 10000 });
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request exceeds limit
    const r4 = checkRateLimit({ key, limit: 3, windowMs: 10000 });
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets quota when window expires', () => {
    const key = 'test:rate:expire';
    const r1 = checkRateLimit({ key, limit: 1, windowMs: -100 }); // expired window
    expect(r1.success).toBe(true);

    const r2 = checkRateLimit({ key, limit: 1, windowMs: 10000 });
    expect(r2.success).toBe(true);

    const r3 = checkRateLimit({ key, limit: 1, windowMs: 10000 });
    expect(r3.success).toBe(false);
  });
});

describe('Slice 4: Student Account Activation Pipeline', () => {
  const userId = 'u-student-001';
  const rawActivationToken = 'a'.repeat(64);

  beforeEach(async () => {
    resetRateLimitStore();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    mockUsers = [
      {
        id: userId,
        email: 'student@college.edu',
        name: 'Aarav Patel',
        passwordHash: null,
        status: 'pending_activation',
        emailVerifiedAt: null,
        updatedAt: new Date()
      }
    ];
    mockStudents = [
      {
        id: 101,
        userId,
        fullName: 'Aarav Patel'
      }
    ];
    mockUserRoles = [
      {
        id: 'ur-1',
        userId,
        role: 'student'
      }
    ];
    const tokenHash = await hashToken(rawActivationToken);
    mockTokens = [
      {
        id: 'tok-act-1',
        userId,
        tokenHash,
        tokenType: 'activation',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day TTL
        consumedAt: null,
        createdAt: new Date()
      }
    ];
  });

  it('validates a valid activation token without consuming it', async () => {
    const result = await validateActivationToken(rawActivationToken);
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.email).toBe('student@college.edu');
      expect(result.name).toBe('Aarav Patel');
    }
    // Token must remain unconsumed
    expect(mockTokens[0].consumedAt).toBeNull();
  });

  it('flags an expired activation token', async () => {
    mockTokens[0].expiresAt = new Date(Date.now() - 1000); // 1 sec in past
    const result = await validateActivationToken(rawActivationToken);
    expect(result.status).toBe('expired');
  });

  it('flags an already consumed activation token', async () => {
    mockTokens[0].consumedAt = new Date();
    const result = await validateActivationToken(rawActivationToken);
    expect(result.status).toBe('consumed');
  });

  it('flags an already activated user', async () => {
    mockUsers[0].status = 'active';
    const result = await validateActivationToken(rawActivationToken);
    expect(result.status).toBe('already_active');
  });

  it('rejects an invalid token format', async () => {
    const result = await validateActivationToken('invalid-token');
    expect(result.status).toBe('invalid');
  });

  it('activates account with password >= 12 chars and marks status active', async () => {
    const result = await activateStudentAccount(rawActivationToken, 'ValidPassword123!');
    expect(result.success).toBe(true);
    expect(mockTokens[0].consumedAt).not.toBeNull();
    expect(mockUsers[0].status).toBe('active');
    expect(mockUsers[0].passwordHash).not.toBeNull();
    expect(await verifyPassword('ValidPassword123!', mockUsers[0].passwordHash!)).toBe(true);
  });

  it('rejects activation password shorter than 12 characters', async () => {
    const result = await activateStudentAccount(rawActivationToken, 'short123');
    expect(result.success).toBe(false);
    expect(mockUsers[0].status).toBe('pending_activation');
  });

  it('prevents activation token replay/reuse', async () => {
    // 1st activation succeeds
    const first = await activateStudentAccount(rawActivationToken, 'ValidPassword123!');
    expect(first.success).toBe(true);

    // 2nd activation fails
    const second = await activateStudentAccount(rawActivationToken, 'ValidPassword123!');
    expect(second.success).toBe(false);
  });

  it('enforces anti-enumeration on activation resend', async () => {
    const res1 = await requestActivationResend('nonexistent@college.edu');
    expect(res1.success).toBe(true);
    if (res1.success) {
      expect(res1.message).toContain('If an account pending activation exists');
    }

    const res2 = await requestActivationResend('student@college.edu');
    expect(res2.success).toBe(true);
    if (res2.success) {
      expect(res2.message).toContain('If an account pending activation exists');
    }
  });

  it('enforces rate limiting on activation resend', async () => {
    // 1st request succeeds
    const res1 = await requestActivationResend('student@college.edu');
    expect(res1.success).toBe(true);

    // 2nd request within 15 mins fails rate limit
    const res2 = await requestActivationResend('student@college.edu');
    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error).toContain('Too many requests');
    }
  });
});

describe('Slice 4: Self-Service Password Recovery Flow', () => {
  const userId = 'u-student-001';
  const rawResetToken = 'b'.repeat(64);

  beforeEach(async () => {
    resetRateLimitStore();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    mockUsers = [
      {
        id: userId,
        email: 'student@college.edu',
        name: 'Aarav Patel',
        passwordHash: await hashPassword('OldPassword123!'),
        status: 'active',
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      }
    ];
    mockStudents = [
      {
        id: 101,
        userId,
        fullName: 'Aarav Patel'
      }
    ];
    mockUserRoles = [
      {
        id: 'ur-1',
        userId,
        role: 'student'
      }
    ];
    const tokenHash = await hashToken(rawResetToken);
    mockTokens = [
      {
        id: 'tok-pw-1',
        userId,
        tokenHash,
        tokenType: 'password_reset',
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1-hour TTL
        consumedAt: null,
        createdAt: new Date()
      }
    ];
  });

  it('exhibits strict anti-enumeration on recovery request', async () => {
    // Request for non-existent email
    const nonexistentRes = await requestPasswordRecovery('unknown@test.com');
    expect(nonexistentRes.success).toBe(true);
    if (nonexistentRes.success) {
      expect(nonexistentRes.message).toBe(
        'If an account exists for this email, a password reset link has been sent.'
      );
    }

    // Request for existing email
    resetRateLimitStore();
    const existingRes = await requestPasswordRecovery('student@college.edu');
    expect(existingRes.success).toBe(true);
    if (existingRes.success) {
      expect(existingRes.message).toBe(
        'If an account exists for this email, a password reset link has been sent.'
      );
    }

    // Messages and response shapes are strictly identical
    expect(nonexistentRes).toEqual(existingRes);
  });

  it('enforces rate limiting on recovery requests (1 per 15 min per email)', async () => {
    const res1 = await requestPasswordRecovery('student@college.edu');
    expect(res1.success).toBe(true);

    const res2 = await requestPasswordRecovery('student@college.edu');
    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error).toContain('Too many requests');
    }
  });

  it('validates a candidate reset token with 1-hour expiration', async () => {
    const result = await validatePasswordResetToken(rawResetToken);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.email).toBe('student@college.edu');
    }
  });

  it('rejects an expired reset token (> 1 hour old)', async () => {
    mockTokens[0].expiresAt = new Date(Date.now() - 5000); // 5 sec expired
    const result = await validatePasswordResetToken(rawResetToken);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('EXPIRED');
    }
  });

  it('rejects an already consumed reset token', async () => {
    mockTokens[0].consumedAt = new Date();
    const result = await validatePasswordResetToken(rawResetToken);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('CONSUMED');
    }
  });

  it('rejects an invalid/malformed reset token format', async () => {
    const result = await validatePasswordResetToken('invalid-hex');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('INVALID');
    }
  });

  it('updates password hash when resetting with valid token and >= 12 char password', async () => {
    const oldHash = mockUsers[0].passwordHash;
    const result = await resetStudentPassword(rawResetToken, 'NewSecurePassword123!');
    expect(result.success).toBe(true);
    expect(mockTokens[0].consumedAt).not.toBeNull();
    expect(mockUsers[0].passwordHash).not.toBe(oldHash);

    // Old password verification fails
    expect(await verifyPassword('OldPassword123!', mockUsers[0].passwordHash!)).toBe(false);
    // New password verification succeeds
    expect(await verifyPassword('NewSecurePassword123!', mockUsers[0].passwordHash!)).toBe(true);
  });

  it('rejects password reset with password shorter than 12 characters', async () => {
    const result = await resetStudentPassword(rawResetToken, 'short123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('at least 12 characters');
    }
    expect(mockTokens[0].consumedAt).toBeNull();
  });

  it('prevents reset token replay / reuse after successful reset', async () => {
    // 1st reset succeeds
    const first = await resetStudentPassword(rawResetToken, 'NewSecurePassword123!');
    expect(first.success).toBe(true);

    // 2nd reset with same token fails
    const second = await resetStudentPassword(rawResetToken, 'AnotherPassword123!');
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toContain('invalid, expired, or has already been used');
    }
  });
});
