import { NextResponse, type NextRequest } from 'next/server';
import { isAdminSessionCookie, requiresSecure } from '@/lib/session-cookies';

/**
 * Ends a session that is still cryptographically valid but no longer authorised (deactivated
 * account, removed admin role, changed credentials). Server components cannot clear cookies, and the
 * middleware would keep bouncing a signed JWT from /login back into the app, so revoked sessions
 * are sent here to drop the Auth.js session cookie (including chunked parts) before /login.
 * /api/* is outside the middleware matcher.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login?error=SessionExpired', request.url));
  for (const cookie of request.cookies.getAll()) {
    if (isAdminSessionCookie(cookie.name)) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
        secure: requiresSecure(cookie.name)
      });
    }
  }
  return response;
}
