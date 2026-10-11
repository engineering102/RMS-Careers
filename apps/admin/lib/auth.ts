import NextAuth, { CredentialsSignin, type DefaultSession, type Session } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { authenticateAdmin, getUserByEmail, getCurrentAdminRecord } from '@/lib/db/queries/users';
import { hasAdminPrivileges } from '@rms/auth';
import { evaluateAdminSession, sessionIssuedAtMs } from '@/lib/session-validation';
import { accountKey, enforceAuthLimits, ipKey, trustedClientIp } from '@/lib/security/request-limits';

/** Raised when admin sign-in attempts exceed the limit (error code `rate_limited`). */
class RateLimitedSignin extends CredentialsSignin {
  code = 'rate_limited';
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'super_admin';
      /** When this sign-in happened (ms since epoch); used to revoke sessions after credential changes. */
      authTime?: number;
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'admin' | 'super_admin';
  }
}

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET
    }),
    Credentials({
      name: 'Admin Credentials',
      credentials: {
        username: { label: 'Username or Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, request) {
        const usernameOrEmail = credentials?.username;
        const password = credentials?.password;

        if (
          !usernameOrEmail ||
          !password ||
          typeof usernameOrEmail !== 'string' ||
          typeof password !== 'string'
        ) {
          return null;
        }

        // Per client and per account; covers direct calls to /api/auth/callback/credentials too.
        const limit = await enforceAuthLimits({
          client: ipKey('admin-login', trustedClientIp(request?.headers)),
          account: accountKey('admin-login', usernameOrEmail)
        });
        if (!limit.allowed) throw new RateLimitedSignin();

        // Database-backed verification: status check, role check, bcrypt verification
        const admin = await authenticateAdmin(usernameOrEmail, password);
        if (!admin) {
          return null;
        }

        return {
          id: admin.id,
          name: admin.name || 'RMS Administrator',
          email: admin.email,
          role: admin.role
        };
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // If authenticating via OAuth (e.g. GitHub), verify that email belongs to an authorized active admin
      if (account?.provider === 'github') {
        if (!user.email) return false;
        const dbUser = await getUserByEmail(user.email);
        if (!dbUser || dbUser.status !== 'active') return false;
        const isAuthorizedAdmin = hasAdminPrivileges(dbUser.roles);
        if (!isAuthorizedAdmin) return false;
      }
      return true;
    },
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      if (token && params.user) {
        token.authTime = Date.now();
        // GitHub sign-ins carry GitHub's id; bind the session to the database account instead, so
        // revalidation and the role (including super_admin) come from our records.
        if (params.account?.provider === 'github' && params.user.email) {
          const dbUser = await getUserByEmail(params.user.email);
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.roles.some((r) => r.role === 'super_admin') ? 'super_admin' : 'admin';
          }
        }
      }
      return token;
    },
    async session(params) {
      const session = await authConfig.callbacks!.session!(params as never);
      if (session.user && typeof params.token?.authTime === 'number') {
        (session.user as Session['user']).authTime = params.token.authTime;
      }
      return session;
    }
  }
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * Session for server-side use (pages, layouts, Server Actions), revalidated against the database on
 * every call: an existing JWT stops working as soon as the admin is deactivated, loses the admin
 * role, or changes credentials. The role is taken from the database. Fails closed (null) when the
 * account cannot be verified, including when the database is unreachable.
 */
export async function auth(): Promise<Session | null> {
  const session = await nextAuth.auth();
  if (!session?.user?.id) return null;

  let record;
  try {
    record = await getCurrentAdminRecord(session.user.id);
  } catch (error) {
    console.error('[admin-auth] Session revalidation failed:', error instanceof Error ? error.message : 'unknown');
    return null;
  }

  const decision = evaluateAdminSession(
    { userId: session.user.id, issuedAtMs: sessionIssuedAtMs({ authTime: session.user.authTime }) ?? null },
    record
  );
  if (!decision.ok) return null;

  return { ...session, user: { ...session.user, id: decision.userId, role: decision.role } };
}
