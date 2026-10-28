'use client';

import { useState } from 'react';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';

import type { BellNotificationSummary } from '@/lib/types/notifications';

interface DashboardShellProps {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  children: React.ReactNode;
  /** Streamed from the layout; the bell renders empty until it resolves. */
  bellNotifications?: Promise<BellNotificationSummary>;
}

export function DashboardShell({
  context,
  activeCohort = null,
  children,
  bellNotifications
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    // The document scrolls (not an inner container): the sticky header is translucent chrome that content
    // passes under, window.scrollTo works, and mobile browsers can collapse their toolbars while scrolling.
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar context={context} activeCohort={activeCohort} />

      {/* Mobile Drawer */}
      <MobileNav
        context={context}
        activeCohort={activeCohort}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <Header
          context={context}
          activeCohort={activeCohort}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          bellNotifications={bellNotifications}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
