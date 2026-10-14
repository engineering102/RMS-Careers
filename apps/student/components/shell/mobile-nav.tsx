'use client';

import Link from 'next/link';
import { Drawer } from 'vaul';
import { usePathname } from 'next/navigation';
import { X, LogOut, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import { STUDENT_NAV_ITEMS } from './nav-items';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { CohortSwitcher } from './cohort-switcher';
import { SignOutButton } from './sign-out-button';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ context, activeCohort = null, open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const student = context.student;

  // vaul (on Radix Dialog): focus trap, Escape / backdrop to close, scroll lock, and a drawer that follows the
  // finger 1:1, resists past its open edge and closes on a left swipe based on release velocity. It slides in
  // from, and back out to, the left edge it is attached to.
  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && onClose()} direction="left">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden" />

        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-background border-r border-border p-4 text-foreground shadow-2xl outline-none md:hidden"
        >
          <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
          {/* Header with Close Button */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <span className="text-[10px] font-bold tracking-wider text-primary uppercase">RMS Careers</span>
                <p className="text-xs font-semibold text-foreground">Student Portal</p>
              </div>
            </div>
            <Drawer.Close
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </Drawer.Close>
          </div>

          {/* Current Cohort Switcher */}
          <div className="mt-3 rounded-lg border border-border bg-card/60 p-3 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Current Cohort</p>
            <CohortSwitcher
              activeBatches={context.activeBatches}
              activeCohort={activeCohort}
              variant="sidebar"
            />
          </div>

          {/* Navigation Items */}
          <nav className="mt-4 flex-1 space-y-1.5 overflow-y-auto" aria-label="Mobile Navigation">
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
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-not-allowed select-none"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 opacity-60" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-semibold">
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
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition',
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

          {/* User Footer */}
          <div className="pt-3 border-t border-border">
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
                className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground transition"
              >
                <LogOut className="h-4 w-4" />
              </SignOutButton>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
