import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
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
