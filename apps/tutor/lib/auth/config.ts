import type { NextAuthConfig } from 'next-auth';

/**
 * Tutor Portal session cookie. Host-only (`__Host-`: Secure, Path=/, no Domain), and different from the admin
 * (`__Host-rms-admin-sess`) and student (`__Host-student-sess`) cookies. Auth.js derives the JWT encryption key from
 * the secret AND the cookie name, so a token issued by another portal cannot be decrypted here even if secrets were
 * ever shared (tests: token-isolation.test.ts). Each portal still has its own AUTH_SECRET.
 */
export const TUTOR_SESSION_COOKIE = '__Host-tutor-sess';

/** Unauthenticated onboarding and recovery routes (keep in sync with middleware.ts). */
const PUBLIC_PREFIXES = ['/login', '/forgot-password', '/reset-password', '/resend-activation'];

/**
 * Edge-safe Auth.js config (no database): used by the middleware. The middleware only checks that a signed tutor JWT
 * is present; every page and action re-checks the account in the database (lib/db/tutor-context.ts).
 */
export const tutorAuthConfig: NextAuthConfig = {
  trustHost: true,
  // Pin the Secure cookie variants for every code path (see the admin portal's PR-10 note in its auth.config.ts).
  useSecureCookies: true,
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30-day maximum session lifetime
    updateAge: 24 * 60 * 60 // 24-hour sliding refresh
  },
  cookies: {
    sessionToken: {
      name: TUTOR_SESSION_COOKIE,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true }
    }
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;
      const isTutor = auth?.user?.role === 'tutor';

      if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        if (isTutor) return Response.redirect(new URL('/overview', nextUrl));
        return true;
      }
      // An activation link must work even in a browser that is signed in.
      if (pathname.startsWith('/activate')) return true;

      // No user (including an error-shaped auth object): sign in first.
      if (!auth?.user) return false;

      if (!isTutor) {
        const redirectUrl = new URL('/login', nextUrl);
        redirectUrl.searchParams.set('error', 'Unauthorized');
        return Response.redirect(redirectUrl);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Sign-in time; survives sliding refreshes (unlike iat) and drives revocation (session-revocation.ts).
        token.authTime = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'tutor';
        session.user.authTime = typeof token.authTime === 'number' ? token.authTime : undefined;
      }
      return session;
    }
  },
  providers: []
};
