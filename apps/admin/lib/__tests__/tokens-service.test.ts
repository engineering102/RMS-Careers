import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAccountToken, consumeAccountToken } from '../db/queries/tokens';
import { hashToken } from '@rms/auth';

vi.mock('server-only', () => ({}));

let mockTokensDb: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: any) => ({
          returning: vi.fn().mockImplementation(() => {
            const record = {
              id: 'tok-0000-0000-0000-00000000000' + (mockTokensDb.length + 1),
              ...vals,
              consumedAt: null,
              createdAt: new Date()
            };
            mockTokensDb.push(record);
            return Promise.resolve([record]);
          })
        }))
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation((vals: any) => ({
          where: vi.fn().mockImplementation(() => ({
            returning: vi.fn().mockImplementation(() => {
              // Find matching unconsumed, unexpired token
              const now = new Date();
              const matchIndex = mockTokensDb.findIndex((t) => {
                return (
                  t.consumedAt === null &&
                  t.expiresAt > now
                );
              });

              if (matchIndex >= 0) {
                mockTokensDb[matchIndex] = {
                  ...mockTokensDb[matchIndex],
                  consumedAt: vals.consumedAt
                };
                return Promise.resolve([{ userId: mockTokensDb[matchIndex].userId }]);
              }
              return Promise.resolve([]);
            })
          }))
        }))
      }))
    }
  };
});

describe('Phase 1 — Token Service & Atomic Compare-and-Swap Consumption', () => {
  const userId = 'u0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    mockTokensDb = [];
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
  });

  it('persists only the SHA-256 hash in the database, never the raw token', async () => {
    const { rawToken, tokenRecord } = await createAccountToken({
      userId,
      tokenType: 'activation'
    });

    expect(rawToken).toBeDefined();
    expect(typeof rawToken).toBe('string');
    expect(rawToken.length).toBe(64); // 32 bytes hex encoded

    // Database record contains the SHA-256 hash, NOT the raw token
    expect(tokenRecord.tokenHash).not.toBe(rawToken);
    expect(tokenRecord.tokenHash).toBe(await hashToken(rawToken));
    expect(tokenRecord.tokenType).toBe('activation');
    expect(tokenRecord.consumedAt).toBeNull();
    expect(tokenRecord.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('atomically consumes a valid token and returns the corresponding userId', async () => {
    const { rawToken } = await createAccountToken({
      userId,
      tokenType: 'activation'
    });

    const consumedUserId = await consumeAccountToken({
      rawToken,
      expectedType: 'activation'
    });

    expect(consumedUserId).toBe(userId);
    expect(mockTokensDb[0].consumedAt).not.toBeNull();
  });

  it('enforces single-use replay protection: second consumption of same raw token returns null', async () => {
    const { rawToken } = await createAccountToken({
      userId,
      tokenType: 'activation'
    });

    // First consumption succeeds
    const firstConsumption = await consumeAccountToken({
      rawToken,
      expectedType: 'activation'
    });
    expect(firstConsumption).toBe(userId);

    // Second consumption fails (replay protection)
    const secondConsumption = await consumeAccountToken({
      rawToken,
      expectedType: 'activation'
    });
    expect(secondConsumption).toBeNull();
  });

  it('rejects consumption when raw token is empty or invalid', async () => {
    const res = await consumeAccountToken({
      rawToken: '',
      expectedType: 'activation'
    });
    expect(res).toBeNull();
  });
});
