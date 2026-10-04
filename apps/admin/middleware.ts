import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export const { auth: middleware } = NextAuth(authConfig);

// Exclude static assets, API handlers, and public student enrollment routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|enroll).*)']
};
