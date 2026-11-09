'use client';

import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';

import type { BellNotificationSummary } from '@/lib/types/notifications';

interface DashboardShellProps {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  children: React.ReactNode;
  /** Streamed from the layout; the bell, sidebar count and More dot render empty until it resolves. */
  bellNotifications?: Promise<BellNotificationSummary>;
}

export function DashboardShell({
  context,
  activeCohort = null,
  children,
  bellNotifications
}: DashboardShellProps) {
  return (
    // The document scrolls (not an inner container): the sticky header is translucent chrome that content
    // passes under, window.scrollTo works, and mobile browsers can collapse their toolbars while scrolling.
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      <Sidebar context={context} activeCohort={activeCohort} bellNotifications={bellNotifications} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          context={context}
          bellNotifications={bellNotifications}
        />

        {/* Bottom padding on phones keeps the last row clear of the tab bar and the home indicator. */}
        <main className="bg-paper flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <MobileNav context={context} activeCohort={activeCohort} bellNotifications={bellNotifications} />
    </div>
  );
}
