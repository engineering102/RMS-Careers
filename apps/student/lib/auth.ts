import NextAuth, { CredentialsSignin, type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { authenticateStudent } from '@/lib/db/student-identity';
import { studentAuthConfig } from '@/lib/auth/config';
import { accountKey, enforceAuthLimits, ipKey, trustedClientIp } from '@/lib/security/request-limits';

/** Raised when sign-in attempts exceed the limit; surfaces as error code `rate_limited`. */
export class RateLimitedSignin extends CredentialsSignin {
  code = 'rate_limited';
}

declare module 'next-auth' {
  interface Session { user: { id: string; role: 'student'; authTime?: number } & DefaultSession['user']; }
  interface User { role?: 'student'; }
}

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...studentAuthConfig,
  providers: [Credentials({ name: 'Student credentials', credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } }, async authorize(input, request) {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) return null;
    // Applied here (not only in the login form's action) because /api/auth/callback/credentials can be
    // called directly. Counted per client and per account, whether or not the account exists.
    const limit = await enforceAuthLimits({
      client: ipKey('login', trustedClientIp(request?.headers)),
      account: accountKey('login', parsed.data.email)
    });
    if (!limit.allowed) throw new RateLimitedSignin();
    const student = await authenticateStudent(parsed.data.email, parsed.data.password);
    return student ? { id: student.userId, name: student.name, email: student.email, role: 'student' } : null;
  } })]
});
