'use client';

import { Menu, LogOut, GraduationCap } from 'lucide-react';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { CohortSwitcher } from './cohort-switcher';
import { SignOutButton } from './sign-out-button';

import { NotificationBell } from './notification-bell';
import type { NotificationItem } from '@/lib/types/notifications';

interface HeaderProps {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  onOpenMobileNav: () => void;
  initialUnreadCount?: number;
  initialNotifications?: NotificationItem[];
}

export function Header({
  context,
  activeCohort = null,
  onOpenMobileNav,
  initialUnreadCount = 0,
  initialNotifications = []
}: HeaderProps) {
  const student = context.student;

  const initials = student?.fullName
    ? student.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/90 px-4 md:px-8 backdrop-blur-md">
      {/* Left: Mobile Menu Trigger + Mobile Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground/80 hover:bg-card md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 md:hidden">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="text-xs font-bold tracking-wider text-foreground uppercase">RMS Portal</span>
        </div>

        {/* Desktop Breadcrumb / Title */}
        <div className="hidden md:block">
          <h1 className="text-base font-semibold text-foreground">Learning Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {student?.collegeName || 'RMS Partner College'}
            {student?.branch ? ` · ${student.branch}` : ''}
          </p>
        </div>
      </div>

      {/* Right: Batch Context Switcher + Profile + Sign Out */}
      <div className="flex items-center gap-3">
        <CohortSwitcher
          activeBatches={context.activeBatches}
          activeCohort={activeCohort}
          variant="header"
        />

        {/* Notification Bell */}
        <NotificationBell
          initialUnreadCount={initialUnreadCount}
          initialNotifications={initialNotifications}
        />

        {/* Student Avatar */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm"
          title={`${student?.fullName} (${student?.email})`}
        >
          {initials}
        </div>

        {/* Sign Out Button */}
        <SignOutButton
          formClassName="hidden sm:block"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-secondary hover:text-foreground transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </SignOutButton>
      </div>
    </header>
  );
}
