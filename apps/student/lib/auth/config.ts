import type { NextAuthConfig } from 'next-auth';

export const STUDENT_SESSION_COOKIE = '__Host-student-session';

export const studentAuthConfig: NextAuthConfig = {
  trustHost: true,
  pages: { signIn: '/login' },
  cookies: {
    sessionToken: {
      name: STUDENT_SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLogin = nextUrl.pathname === '/login';
      if (isLogin) return auth?.user ? Response.redirect(new URL('/dashboard', nextUrl)) : true;
      if (!auth?.user) return false;
      if (auth.user.role !== 'student') {
        const url = new URL('/login', nextUrl);
        url.searchParams.set('error', 'Unauthorized');
        return Response.redirect(url);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'student';
      }
      return session;
    }
  },
  providers: []
};
