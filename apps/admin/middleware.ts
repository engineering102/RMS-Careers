import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export const { auth: middleware } = NextAuth(authConfig);

// Exclude static assets, API handlers, and the public student enrollment form (/enroll/<programCode>).
// 'enroll/' (with the slash) is deliberate: a bare 'enroll' prefix would also exempt the
// protected /enrollments and /enrollments/import admin pages.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|enroll/).*)']
};
