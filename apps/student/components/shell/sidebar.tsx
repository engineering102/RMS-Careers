'use client';

import type * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { STUDENT_NAV_ITEMS, STUDENT_SECONDARY_NAV_ITEMS, isNavItemActive, type NavItem } from './nav-items';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { CohortSwitcher } from './cohort-switcher';
import { UnreadCount } from './unread-indicators';
import type { BellNotificationSummary } from '@/lib/types/notifications';
import { SignOutButton } from './sign-out-button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] bg-foreground font-display text-[13px] font-bold text-background',
        className
      )}
    >
      R
    </span>
  );
}

export function NavLink({
  item,
  active,
  badge,
  onNavigate
}: {
  item: NavItem;
  active: boolean;
  /** Trailing content, e.g. the streamed unread count on Notifications. */
  badge?: React.ReactNode;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150 md:h-8',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} aria-hidden="true" />
      <span className="flex-1 truncate">{item.title}</span>
      {badge}
    </Link>
  );
}

export function Sidebar({
  context,
  activeCohort = null,
  bellNotifications
}: {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  bellNotifications?: Promise<BellNotificationSummary>;
}) {
  const pathname = usePathname() ?? '';
  const student = context.student;
  const affiliation = [student?.collegeName, student?.branch].filter(Boolean).join(' · ');

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <BrandMark />
        <span className="text-sm font-semibold tracking-tight text-foreground">RMS Careers</span>
      </div>

      <div className="px-3 pb-3">
        <CohortSwitcher activeBatches={context.activeBatches} activeCohort={activeCohort} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label="Main">
        {STUDENT_NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
        ))}
        <div className="my-2 h-px bg-border" role="separator" />
        {STUDENT_SECONDARY_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavItemActive(pathname, item.href)}
            badge={item.href === '/notifications' ? <UnreadCount summary={bellNotifications} /> : undefined}
          />
        ))}
      </nav>

      <div className="flex items-center gap-1 border-t border-border p-3">
        <Link
          href="/profile"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar name={student?.fullName} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-tight text-foreground">
              {student?.fullName || 'Student'}
            </span>
            {affiliation && <span className="block truncate text-xs leading-tight text-muted-foreground">{affiliation}</span>}
          </span>
        </Link>
        <SignOutButton
          label="Sign out"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </SignOutButton>
      </div>
    </aside>
  );
}
