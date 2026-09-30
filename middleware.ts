export { auth as middleware } from '@/lib/auth';

// Exclude static assets, API handlers, and future public student enrollment routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|enroll).*)']
};
