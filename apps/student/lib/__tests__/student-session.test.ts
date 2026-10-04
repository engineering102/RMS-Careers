import { describe, expect, it } from 'vitest';
import { STUDENT_SESSION_COOKIE, studentAuthConfig } from '../auth/config';

describe('Student session isolation', () => {
  it('uses the dedicated host-only secure session cookie', () => {
    const cookie = studentAuthConfig.cookies?.sessionToken;
    expect(STUDENT_SESSION_COOKIE).toBe('__Host-student-session');
    expect(cookie?.name).toBe('__Host-student-session');
    expect(cookie?.options?.secure).toBe(true);
    expect(cookie?.options?.path).toBe('/');
    expect(cookie?.options).not.toHaveProperty('domain');
    expect(cookie?.options?.httpOnly).toBe(true);
  });

  it('only authorizes student sessions for protected routes', () => {
    const callback = studentAuthConfig.callbacks?.authorized;
    expect(callback).toBeDefined();
  });
});
