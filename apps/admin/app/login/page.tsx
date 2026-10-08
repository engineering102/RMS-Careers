import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { signIn } from '@/lib/auth';
import { GraduationCap } from 'lucide-react';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function LoginPage(props: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-8 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">RMS Careers</span>
          </div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>
            Sign in to access the RMS Careers administration console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParams.error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              Invalid credentials or authentication error.
            </div>
          )}
          <form
            action={async (formData: FormData) => {
              'use server';
              const username = formData.get('username') as string;
              const password = formData.get('password') as string;
              try {
                await signIn('credentials', {
                  username,
                  password,
                  redirectTo: searchParams.callbackUrl || '/programs'
                });
              } catch (error) {
                if (error instanceof AuthError) {
                  const params = new URLSearchParams({ error: 'CredentialsSignin' });
                  if (searchParams.callbackUrl) {
                    params.set('callbackUrl', searchParams.callbackUrl);
                  }
                  redirect(`/login?${params.toString()}`);
                }
                // Rethrow so Next.js redirects (NEXT_REDIRECT) on success still work
                throw error;
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium leading-none">
                Email or Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin@rms-careers.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium leading-none">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in with Admin Credentials
            </Button>
          </form>
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-muted"></div>
            <span className="flex-shrink mx-2 text-xs text-muted-foreground">
              Or
            </span>
            <div className="flex-grow border-t border-muted"></div>
          </div>
          <form
            action={async () => {
              'use server';
              await signIn('github', {
                redirectTo: searchParams.callbackUrl || '/programs'
              });
            }}
            className="w-full"
          >
            <Button variant="outline" className="w-full">
              Sign in with GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
