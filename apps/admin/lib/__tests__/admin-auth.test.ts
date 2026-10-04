import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword } from '@rms/auth';

vi.mock('server-only', () => ({}));

let currentUserInDb: any = null;
let currentRolesInDb: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve(currentRolesInDb);
            (promise as any).limit = vi.fn().mockImplementation(() => {
              return Promise.resolve(currentUserInDb ? [currentUserInDb] : []);
            });
            return promise;
          })
        }))
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue([])
        }))
      }))
    }
  };
});

describe('Admin Authentication & Authorization Rules', () => {
  let mockUser: any;
  let mockRoles: any[];

  beforeEach(async () => {
    vi.clearAllMocks();
    const passwordHash = await hashPassword('CorrectAdminPass123!');
    mockUser = {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@rmscareers.com',
      name: 'RMS Administrator',
      passwordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
      lastLoginAt: null
    };
    mockRoles = [
      {
        id: 1,
        userId: mockUser.id,
        role: 'super_admin',
        grantedAt: new Date()
      }
    ];

    currentUserInDb = mockUser;
    currentRolesInDb = mockRoles;
  });

  it('should authenticate successfully with valid credentials and active admin role', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');

    const result = await authenticateAdmin('admin@rmscareers.com', 'CorrectAdminPass123!');

    expect(result).not.toBeNull();
    expect(result?.id).toBe(mockUser.id);
    expect(result?.email).toBe('admin@rmscareers.com');
    expect(result?.role).toBe('super_admin');
    // Ensure sensitive passwordHash is NOT returned in result
    expect((result as any).passwordHash).toBeUndefined();
  });

  it('should reject authentication when password candidate is incorrect', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');

    const result = await authenticateAdmin('admin@rmscareers.com', 'WrongPassword123!');
    expect(result).toBeNull();
  });

  it('should reject authentication when user does not exist in database', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');
    currentUserInDb = null;

    const result = await authenticateAdmin('nonexistent@rmscareers.com', 'AnyPassword123!');
    expect(result).toBeNull();
  });

  it('should reject authentication if account status is suspended', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');
    currentUserInDb = {
      ...mockUser,
      status: 'suspended'
    };

    const result = await authenticateAdmin('admin@rmscareers.com', 'CorrectAdminPass123!');
    expect(result).toBeNull();
  });

  it('should reject authentication if account status is pending_activation', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');
    currentUserInDb = {
      ...mockUser,
      status: 'pending_activation'
    };

    const result = await authenticateAdmin('admin@rmscareers.com', 'CorrectAdminPass123!');
    expect(result).toBeNull();
  });

  it('should reject authentication if user does NOT possess admin or super_admin role', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');
    currentRolesInDb = [
      {
        id: 2,
        userId: mockUser.id,
        role: 'student',
        grantedAt: new Date()
      }
    ];

    const result = await authenticateAdmin('admin@rmscareers.com', 'CorrectAdminPass123!');
    expect(result).toBeNull();
  });

  it('should reject empty or malformed inputs without throwing', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');

    expect(await authenticateAdmin('', 'password')).toBeNull();
    expect(await authenticateAdmin('admin@example.com', '')).toBeNull();
    // @ts-expect-error test invalid inputs
    expect(await authenticateAdmin(null, null)).toBeNull();
    // @ts-expect-error test invalid inputs
    expect(await authenticateAdmin(undefined, undefined)).toBeNull();
  });

  it('should verify that legacy hardcoded credentials do NOT work unless backed by DB', async () => {
    const { authenticateAdmin } = await import('../db/queries/users');
    currentUserInDb = null;

    // The old insecure fallback was admin / admin123
    const result = await authenticateAdmin('admin', 'admin123');
    expect(result).toBeNull();
  });
});
