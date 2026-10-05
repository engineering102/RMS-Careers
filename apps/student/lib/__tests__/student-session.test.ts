import { describe, expect, it } from 'vitest';
import { STUDENT_SESSION_COOKIE, studentAuthConfig } from '../auth/config';

describe('Student session and cookie configuration', () => {
  it('uses the authoritative __Host-student-sess host-only cookie', () => {
    const cookie = studentAuthConfig.cookies?.sessionToken;
    expect(STUDENT_SESSION_COOKIE).toBe('__Host-student-sess');
    expect(cookie?.name).toBe('__Host-student-sess');
    expect(cookie?.options?.secure).toBe(true);
    expect(cookie?.options?.path).toBe('/');
    expect(cookie?.options).not.toHaveProperty('domain');
    expect(cookie?.options?.httpOnly).toBe(true);
    expect(cookie?.options?.sameSite).toBe('lax');
  });

  it('configures 30-day maximum lifetime with 24-hour sliding session refresh', () => {
    expect(studentAuthConfig.session?.strategy).toBe('jwt');
    expect(studentAuthConfig.session?.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
    expect(studentAuthConfig.session?.updateAge).toBe(24 * 60 * 60); // 24 hours
  });

  it('defines custom sign-in page at /login', () => {
    expect(studentAuthConfig.pages?.signIn).toBe('/login');
  });
});

describe('Student authorized callback role & route enforcement', () => {
  const authorized = studentAuthConfig.callbacks?.authorized;
  if (!authorized) {
    throw new Error('authorized callback is not defined');
  }

  const runAuthorized = (auth: any, pathname: string) => {
    return authorized({
      auth,
      request: {
        nextUrl: new URL(`http://student.rms-careers.com${pathname}`)
      } as any
    });
  };

  it('rejects unauthenticated requests to protected routes', () => {
    const result = runAuthorized(null, '/dashboard');
    expect(result).toBe(false);

    const resultLibrary = runAuthorized(null, '/library');
    expect(resultLibrary).toBe(false);
  });

  it('allows authenticated student users to access protected routes', () => {
    const studentAuth = { user: { id: 'u1', role: 'student' } };
    const result = runAuthorized(studentAuth, '/dashboard');
    expect(result).toBe(true);
  });

  it('rejects non-student users from protected routes and redirects to /login?error=Unauthorized', () => {
    const adminAuth = { user: { id: 'u2', role: 'admin' } };
    const result = runAuthorized(adminAuth, '/dashboard') as Response;
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(302);
    const location = result.headers.get('location');
    expect(location).toContain('/login?error=Unauthorized');

    const tutorAuth = { user: { id: 'u3', role: 'tutor' } };
    const resultTutor = runAuthorized(tutorAuth, '/dashboard') as Response;
    expect(resultTutor).toBeInstanceOf(Response);
    expect(resultTutor.status).toBe(302);
    expect(resultTutor.headers.get('location')).toContain('/login?error=Unauthorized');
  });

  it('allows unauthenticated access to /login', () => {
    const result = runAuthorized(null, '/login');
    expect(result).toBe(true);
  });

  it('allows unauthenticated access to /activate', () => {
    const result = runAuthorized(null, '/activate');
    expect(result).toBe(true);
  });

  it('redirects authenticated students on /login to /dashboard', () => {
    const studentAuth = { user: { id: 'u1', role: 'student' } };
    const result = runAuthorized(studentAuth, '/login') as Response;
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(302);
    expect(result.headers.get('location')).toContain('/dashboard');
  });

  it('allows non-student users on /login to see the login page with error without looping', () => {
    const adminAuth = { user: { id: 'u2', role: 'admin' } };
    const result = runAuthorized(adminAuth, '/login?error=Unauthorized');
    expect(result).toBe(true);
  });
});

describe('Student JWT and Session callbacks', () => {
  it('propagates student id and role from user to jwt token', async () => {
    const jwtCallback = studentAuthConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error('jwt callback is undefined');

    const token = await (jwtCallback as any)({
      token: {},
      user: { id: 'student-123', role: 'student' } as any,
      account: null as any,
      trigger: 'signIn'
    });

    expect(token?.id).toBe('student-123');
    expect(token?.role).toBe('student');
  });

  it('propagates student id and role from jwt token to session user', async () => {
    const sessionCallback = studentAuthConfig.callbacks?.session;
    if (!sessionCallback) throw new Error('session callback is undefined');

    const session = await (sessionCallback as any)({
      session: { user: {} } as any,
      token: { id: 'student-123', role: 'student' } as any
    });

    expect(session.user?.id).toBe('student-123');
    expect(session.user?.role).toBe('student');
  });
});
