import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TUTOR_SESSION_COOKIE } from '../auth/config';

// The exact @auth/core that next-auth uses (next-auth/jwt itself pulls in next/server, which Vitest cannot load).
const require = createRequire(import.meta.url);
const nextAuthDir = path.dirname(require.resolve('next-auth/package.json'));
const coreJwt = createRequire(path.join(nextAuthDir, 'package.json')).resolve('@auth/core/jwt');
type JwtParams = { token?: unknown; secret: string; salt: string };
const { encode, decode } = (await import(pathToFileURL(coreJwt).href)) as {
  encode(params: JwtParams & { token: Record<string, unknown> }): Promise<string>;
  decode(params: JwtParams & { token: string }): Promise<Record<string, unknown> | null>;
};

/**
 * Cross-portal isolation (tutor plan T-07). Auth.js uses the cookie name as the key-derivation salt, so a session
 * token from the admin or student portal cannot be decrypted by the tutor portal, and the reverse, even if the same
 * secret were ever used for two portals by mistake. (Each portal also has its own AUTH_SECRET.)
 */
const ADMIN_COOKIE = '__Host-rms-admin-sess';
const STUDENT_COOKIE = '__Host-student-sess';

const claims = { id: 'u1', sub: 'u1', role: 'tutor', authTime: Date.now() };

describe('session tokens are bound to their portal', () => {
  const secret = 'one-secret-shared-by-mistake';

  it('decodes its own tutor token', async () => {
    const token = await encode({ token: claims, secret, salt: TUTOR_SESSION_COOKIE });
    expect(await decode({ token, secret, salt: TUTOR_SESSION_COOKIE })).toMatchObject({ id: 'u1', role: 'tutor' });
  });

  it.each([
    ['admin', ADMIN_COOKIE],
    ['student', STUDENT_COOKIE]
  ])('rejects a %s portal token, and the tutor token is rejected there', async (_label, otherCookie) => {
    const foreign = await encode({ token: { ...claims, role: 'admin' }, secret, salt: otherCookie });
    await expect(decode({ token: foreign, secret, salt: TUTOR_SESSION_COOKIE })).rejects.toThrow();
    const tutorToken = await encode({ token: claims, secret, salt: TUTOR_SESSION_COOKIE });
    await expect(decode({ token: tutorToken, secret, salt: otherCookie })).rejects.toThrow();
  });

  it('rejects a tutor token signed with another secret', async () => {
    const token = await encode({ token: claims, secret: 'other-secret', salt: TUTOR_SESSION_COOKIE });
    await expect(decode({ token, secret, salt: TUTOR_SESSION_COOKIE })).rejects.toThrow();
  });
});
