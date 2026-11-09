'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';
import { NotificationBell } from './notification-bell';
import { sectionTitleFor } from './nav-items';
import { BrandMark } from './sidebar';
import { Avatar } from '@/components/ui/avatar';
import type { BellNotificationSummary } from '@/lib/types/notifications';
import { cn } from '@/lib/utils';

interface HeaderProps {
  context: StudentEntitlementContext;
  /** Streamed from the layout; the bell renders empty until it resolves. */
  bellNotifications?: Promise<BellNotificationSummary>;
}

function StreamedNotificationBell({ summary }: { summary: Promise<BellNotificationSummary> }) {
  const { notifications, unreadCount } = use(summary);
  return <NotificationBell initialUnreadCount={unreadCount} initialNotifications={notifications} />;
}

/**
 * Top bar: where you are, notifications, and you. Batch, college and sign-out live once, in the sidebar (or the
 * "More" sheet on phones), instead of being repeated here.
 */
export function Header({ context, bellNotifications }: HeaderProps) {
  const student = context.student;
  const sectionTitle = sectionTitleFor(usePathname() ?? '');

  // Scroll edge: no divider at the top of the page; once content passes under the header it becomes a
  // translucent material with a hairline edge.
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 4);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header
      data-scrolled={isScrolled || undefined}
      className={cn(
        'material-chrome sticky top-0 z-30 flex h-14 w-full items-center gap-3 border-b px-4 transition-[background-color,border-color] duration-200 sm:px-6 lg:px-8',
        isScrolled ? 'border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-background'
      )}
    >
      <Link href="/overview" className="md:hidden" aria-label="RMS Careers home">
        <BrandMark />
      </Link>
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{sectionTitle}</p>

      {/* An empty bell holds its place while the summary streams in. */}
      {bellNotifications ? (
        <Suspense fallback={<NotificationBell />}>
          <StreamedNotificationBell summary={bellNotifications} />
        </Suspense>
      ) : (
        <NotificationBell />
      )}

      <Link
        href="/profile"
        aria-label={`Profile: ${student?.fullName ?? 'Student'}`}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar name={student?.fullName} size="sm" />
      </Link>
    </header>
  );
}
