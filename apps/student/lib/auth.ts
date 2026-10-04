import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { authenticateStudent } from '@/lib/db/student-identity';
import { studentAuthConfig } from '@/lib/auth/config';

declare module 'next-auth' {
  interface Session { user: { id: string; role: 'student' } & DefaultSession['user']; }
  interface User { role?: 'student'; }
}

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...studentAuthConfig,
  providers: [Credentials({ name: 'Student credentials', credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } }, async authorize(input) {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) return null;
    const student = await authenticateStudent(parsed.data.email, parsed.data.password);
    return student ? { id: student.userId, name: student.name, email: student.email, role: 'student' } : null;
  } })]
});
