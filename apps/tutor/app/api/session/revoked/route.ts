import { NextResponse, type NextRequest } from 'next/server';
import { sessionCookiesToClear } from '@/lib/auth/sign-out';

/**
 * Ends a session that is still cryptographically valid but no longer authorised (deactivated tutor, removed role,
 * changed password, signed out elsewhere). Server components cannot clear cookies, and the middleware would keep
 * sending a signed JWT from /login back into the app, so revoked sessions come here first. /api/* is outside the
 * middleware matcher.
 */
export function GET(request: NextRequest) {
  // After the tutor changed their own password the ending is expected; say so instead of "session has ended".
  const code = request.nextUrl.searchParams.get('reason') === 'password-changed' ? 'PasswordChanged' : 'SessionExpired';
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
  for (const name of sessionCookiesToClear(request.cookies.getAll().map((c) => c.name))) {
    response.cookies.set(name, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: true });
  }
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
