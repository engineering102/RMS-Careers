'use client';

import { useState } from 'react';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';

import type { NotificationItem } from '@/lib/types/notifications';

interface DashboardShellProps {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  children: React.ReactNode;
  initialUnreadCount?: number;
  initialNotifications?: NotificationItem[];
}

export function DashboardShell({
  context,
  activeCohort = null,
  children,
  initialUnreadCount = 0,
  initialNotifications = []
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
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
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          context={context}
          activeCohort={activeCohort}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          initialUnreadCount={initialUnreadCount}
          initialNotifications={initialNotifications}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
