import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { handleSignOut } from '@/lib/auth/sign-out';
import { revokeAllSessionsForUser } from '@/lib/db/session-store';

// Outside the middleware matcher (`api` is excluded), so no sliding refresh can re-issue the cookie.
export async function POST(request: NextRequest) {
  const result = await handleSignOut(
    { url: request.url, headers: request.headers, cookieNames: request.cookies.getAll().map((c) => c.name) },
    {
      currentUserId: async () => (await auth())?.user?.id ?? null,
      revokeSessions: revokeAllSessionsForUser
    }
  );
  const response = result.location
    ? NextResponse.redirect(result.location, result.status)
    : new NextResponse(null, { status: result.status });
  for (const cookie of result.setCookies) response.headers.append('Set-Cookie', cookie);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
