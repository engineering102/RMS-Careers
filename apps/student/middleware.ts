import NextAuth from 'next-auth';
import { studentAuthConfig } from '@/lib/auth/config';

export const { auth: middleware } = NextAuth(studentAuthConfig);
// PWA resources (manifest, service worker, icons, offline page) are public and carry no student data.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|activate|forgot-password|reset-password|resend-activation|manifest.webmanifest|sw.js|icons/|offline).*)'
  ]
};
