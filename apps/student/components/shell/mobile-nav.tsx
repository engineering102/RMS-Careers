'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drawer } from 'vaul';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, Palette } from 'lucide-react';
import {
  STUDENT_NAV_ITEMS,
  STUDENT_SECONDARY_NAV_ITEMS,
  STUDENT_TAB_ITEMS,
  isNavItemActive
} from './nav-items';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { CohortSwitcher } from './cohort-switcher';
import { UnreadCount, UnreadDot } from './unread-indicators';
import type { BellNotificationSummary } from '@/lib/types/notifications';
import { SignOutButton } from './sign-out-button';
import { NavLink } from './sidebar';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  bellNotifications?: Promise<BellNotificationSummary>;
}

const TAB_HREFS = new Set(STUDENT_TAB_ITEMS.map((t) => t.href));

/**
 * Phone navigation: a bottom tab bar for the four main places, and a "More" sheet (vaul: follows the finger,
 * dismisses on a downward flick, traps focus) for the batch switcher, the remaining sections and sign-out.
 */
export function MobileNav({ context, activeCohort = null, bellNotifications }: MobileNavProps) {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const student = context.student;
  const moreItems = [...STUDENT_NAV_ITEMS.filter((i) => !TAB_HREFS.has(i.href)), ...STUDENT_SECONDARY_NAV_ITEMS];
  const moreActive = moreItems.some((i) => isNavItemActive(pathname, i.href));
  const affiliation = [student?.collegeName, student?.branch].filter(Boolean).join(' · ');

  const tabClass = (active: boolean) =>
    cn(
      'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      active ? 'text-foreground' : 'text-muted-foreground'
    );

  return (
    <>
      <nav
        aria-label="Main"
        className="material-chrome fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/90 px-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        {STUDENT_TAB_ITEMS.map((tab) => {
          const active = isNavItemActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
              {tab.title}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className={tabClass(moreActive || open)} aria-haspopup="dialog">
          <Menu className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.25 : 1.75} aria-hidden="true" />
          More
          <UnreadDot summary={bellNotifications} />
        </button>
      </nav>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 md:hidden" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-xl border-t border-border bg-popover pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] text-popover-foreground outline-none md:hidden"
          >
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />
            <Drawer.Title className="sr-only">More</Drawer.Title>

            <div className="overflow-y-auto overscroll-contain px-4 pt-3">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-accent"
              >
                <Avatar name={student?.fullName} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{student?.fullName || 'Student'}</span>
                  {affiliation && <span className="block truncate text-xs text-muted-foreground">{affiliation}</span>}
                </span>
              </Link>

              <div className="mt-3">
                <CohortSwitcher activeBatches={context.activeBatches} activeCohort={activeCohort} />
              </div>

              <nav className="mt-3 flex flex-col gap-0.5" aria-label="More">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isNavItemActive(pathname, item.href)}
                    badge={item.href === '/notifications' ? <UnreadCount summary={bellNotifications} /> : undefined}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
                <Link
                  href="/profile#appearance"
                  onClick={() => setOpen(false)}
                  className="flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                >
                  <Palette className="h-4 w-4" aria-hidden="true" />
                  Appearance
                </Link>
              </nav>

              <div className="mt-2 border-t border-border pt-2">
                <SignOutButton
                  label="Sign out"
                  className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </SignOutButton>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
