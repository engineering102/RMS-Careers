import * as React from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function PublicLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-slate-100 hover:opacity-90 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg tracking-tight">Academy Enrollment</span>
          </Link>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full border">
            Student Registration Portal
          </span>
        </div>
      </header>
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="container max-w-2xl mx-auto">{children}</div>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground bg-background">
        <div className="container max-w-5xl mx-auto px-4">
          Academy Enrollment &copy; {new Date().getFullYear()} &bull; All rights reserved.
        </div>
      </footer>
    </div>
  );
}
