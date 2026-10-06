'use client';

import { useState } from 'react';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';

import type { NotificationItem } from '@/lib/types/notifications';

interface DashboardShellProps {
  context: StudentEntitlementContext;
  children: React.ReactNode;
  initialUnreadCount?: number;
  initialNotifications?: NotificationItem[];
}

export function DashboardShell({
  context,
  children,
  initialUnreadCount = 0,
  initialNotifications = []
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar context={context} />

      {/* Mobile Drawer */}
      <MobileNav
        context={context}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          context={context}
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
