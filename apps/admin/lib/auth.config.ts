import type { NextAuthConfig } from 'next-auth';

/**
 * Pinned admin session cookie (audit PR-10, owner-approved). Without this, Auth.js picks cookie names
 * and the Secure flag per request from the detected protocol: inside a Server Action it reads
 * `x-forwarded-proto`, which Next/OpenNext set to `http` for its internal request, while the
 * middleware sees `https://`. Sign-in then wrote `authjs.session-token` (no Secure) but the middleware
 * looked for `__Secure-authjs.session-token` and treated the admin as signed out. Pinning the name and
 * `useSecureCookies` makes every code path agree. `__Host-` = Secure, Path=/, no Domain (host-only).
 */
export const ADMIN_SESSION_COOKIE = '__Host-rms-admin-sess';

export const authConfig: NextAuthConfig = {
  trustHost: true,
  useSecureCookies: true,
  cookies: {
    sessionToken: {
      name: ADMIN_SESSION_COOKIE,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true }
    }
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuth = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith('/login');

      if (isLoginPage) {
        if (isAuth) {
          return Response.redirect(new URL('/programs', nextUrl));
        }
        return true;
      }

      if (!isAuth) {
        return false; // Automatically redirects unauthenticated requests to /login
      }

      // Enforce server-side role check
      const role = auth?.user?.role;
      if (role !== 'admin' && role !== 'super_admin') {
        const redirectUrl = new URL('/login', nextUrl);
        redirectUrl.searchParams.set('error', 'Unauthorized');
        return Response.redirect(redirectUrl);
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.role = (token.role as 'admin' | 'super_admin') || 'admin';
      }
      return session;
    }
  },
  providers: [] // Configured in auth.ts with database queries
};
