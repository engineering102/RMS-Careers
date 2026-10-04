import NextAuth, { type DefaultSession } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { authenticateAdmin, getUserByEmail } from '@/lib/db/queries/users';
import { hasAdminPrivileges } from '@rms/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'super_admin';
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'admin' | 'super_admin';
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
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
      async authorize(credentials) {
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
    }
  }
});
