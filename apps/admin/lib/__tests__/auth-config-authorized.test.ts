import { describe, it, expect } from 'vitest';
import { authConfig } from '../auth.config';

describe('admin authorized callback', () => {
  const authorized = authConfig.callbacks?.authorized;
  if (!authorized) throw new Error('authorized callback is not defined');

  const run = (auth: unknown, pathname: string) =>
    authorized({
      auth: auth as never,
      request: { nextUrl: new URL(`https://admin.rms-careers.com${pathname}`) } as never
    });

  it('rejects unauthenticated requests to protected routes', () => {
    expect(run(null, '/programs')).toBe(false);
  });

  // GHSA-8fpg-xm3f-6cx3: next-auth <= 5.0.0-beta.31 could hand the callback an error object instead of null
  // on a server configuration error. Without a user it must still be treated as signed out.
  it('treats an error-shaped auth object as unauthenticated', () => {
    expect(run({ message: 'There was a problem with the server configuration.' }, '/programs')).toBe(false);
    expect(run({ user: undefined }, '/batches')).toBe(false);
  });

  it('redirects signed-in users without an admin role to /login?error=Unauthorized', () => {
    for (const role of ['tutor', 'student', undefined]) {
      const result = run({ user: { id: 'u1', role } }, '/programs');
      expect(result).toBeInstanceOf(Response);
      const location = new URL((result as Response).headers.get('location')!);
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('error')).toBe('Unauthorized');
    }
  });

  it('allows admin and super_admin sessions', () => {
    expect(run({ user: { id: 'u1', role: 'admin' } }, '/programs')).toBe(true);
    expect(run({ user: { id: 'u1', role: 'super_admin' } }, '/colleges')).toBe(true);
  });

  it('serves /login to signed-out users and sends signed-in users to /programs', () => {
    expect(run(null, '/login')).toBe(true);
    const result = run({ user: { id: 'u1', role: 'admin' } }, '/login');
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/programs');
  });
});
