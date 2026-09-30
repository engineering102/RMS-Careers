import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { signIn } from '@/lib/auth';
import { GraduationCap } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-8 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Academy Enrollment</span>
          </div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>
            Sign in to access the Academy Enrollment administration console.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <form
            action={async () => {
              'use server';
              await signIn('github', {
                redirectTo: '/programs'
              });
            }}
            className="w-full"
          >
            <Button className="w-full">Sign in with GitHub</Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
