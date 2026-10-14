'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import { STUDENT_NAV_ITEMS } from './nav-items';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { CohortSwitcher } from './cohort-switcher';
import { SignOutButton } from './sign-out-button';
import { cn } from '@/lib/utils';

export function Sidebar({
  context,
  activeCohort = null
}: {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
}) {
  const pathname = usePathname();
  const student = context.student;

  return (
    <aside className="hidden md:flex sticky top-0 h-dvh w-64 flex-col border-r border-border bg-background text-foreground shrink-0">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <div>
          <span className="text-xs font-bold tracking-widest text-primary uppercase">RMS Careers</span>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Student Portal</h2>
        </div>
        <GraduationCap className="h-5 w-5 text-primary" />
      </div>

      {/* Batch / Cohort Context */}
      <div className="border-b border-border/80 p-4 bg-card/40">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Current Cohort</p>
        <CohortSwitcher
          activeBatches={context.activeBatches}
          activeCohort={activeCohort}
          variant="sidebar"
        />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3" aria-label="Sidebar Navigation">
        {STUDENT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const itemHref =
            item.href === '/batches' && activeCohort
              ? `/batches/${activeCohort.batchId}`
              : item.href;
          const isActive =
            pathname === itemHref ||
            (item.href !== '/overview' && pathname.startsWith(item.href));

          if (item.disabled) {
            return (
              <div
                key={item.title}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground cursor-not-allowed select-none"
                title={`${item.title} — ${item.badge || 'Coming Soon'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 opacity-60" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground font-semibold">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition active:scale-[0.99] motion-reduce:active:scale-100',
                isActive
                  ? 'bg-primary/15 text-primary font-semibold border-l-2 border-primary pl-2.5'
                  : 'text-foreground/80 hover:bg-card hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span>{item.title}</span>
              </div>
              {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* User & College Footer */}
      <div className="border-t border-border p-4 bg-card/60">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <p className="truncate text-xs font-semibold text-foreground">{student?.fullName || 'Student'}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate mt-0.5">
              <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{student?.collegeName || 'RMS Partner College'}</span>
            </div>
          </div>
          <SignOutButton
            label="Sign out"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <LogOut className="h-4 w-4" />
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
}
