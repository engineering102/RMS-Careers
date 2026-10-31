import Link from 'next/link';
import { GraduationCap, LogOut } from 'lucide-react';
import { SignOutButton } from './sign-out-button';
import { TutorNav } from './tutor-nav';

/**
 * Signed-in frame: brand, primary navigation, who is signed in, sign-out. Server component; only the nav (active
 * link) and the sign-out confirmation run on the client.
 */
export function TutorShell({ fullName, email, children }: { fullName: string; email: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/overview" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>RMS Careers</span>
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">Tutor</span>
          </Link>
          <TutorNav />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium text-foreground">{fullName}</p>
              <p className="text-muted-foreground">{email}</p>
            </div>
            <SignOutButton className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </SignOutButton>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
