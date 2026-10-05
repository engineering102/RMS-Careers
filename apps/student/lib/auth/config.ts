import type { NextAuthConfig } from 'next-auth';

export const STUDENT_SESSION_COOKIE = '__Host-student-sess';

export const studentAuthConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30-day maximum session lifetime
    updateAge: 24 * 60 * 60     // 24-hour sliding session refresh
  },
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
      const pathname = nextUrl.pathname;
      const isLoginPage = pathname.startsWith('/login');
      const isActivatePage = pathname.startsWith('/activate');
      const isForgotPasswordPage = pathname.startsWith('/forgot-password');
      const isResetPasswordPage = pathname.startsWith('/reset-password');
      const isResendActivationPage = pathname.startsWith('/resend-activation');

      // Unauthenticated recovery and onboarding routes
      if (isLoginPage || isForgotPasswordPage || isResetPasswordPage || isResendActivationPage) {
        if (auth?.user?.role === 'student') {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      if (isActivatePage) {
        return true;
      }

      if (!auth?.user) {
        return false;
      }

      if (auth.user.role !== 'student') {
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
      }
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
