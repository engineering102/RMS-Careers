import NextAuth from 'next-auth';
import { studentAuthConfig } from '@/lib/auth/config';

export const { auth: middleware } = NextAuth(studentAuthConfig);
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|activate|forgot-password|reset-password|resend-activation).*)'
  ]
};
