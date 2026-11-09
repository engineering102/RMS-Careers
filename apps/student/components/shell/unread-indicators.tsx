'use client';

import { Suspense, use } from 'react';
import type { BellNotificationSummary } from '@/lib/types/notifications';

type Summary = Promise<BellNotificationSummary> | undefined;

function Count({ summary }: { summary: Promise<BellNotificationSummary> }) {
  const { unreadCount } = use(summary);
  if (!unreadCount) return null;
  return (
    <span className="tabular rounded bg-muted px-1.5 text-[11px] font-medium leading-5 text-foreground">
      {unreadCount > 99 ? '99+' : unreadCount}
      <span className="sr-only"> unread</span>
    </span>
  );
}

function Dot({ summary }: { summary: Promise<BellNotificationSummary> }) {
  const { unreadCount } = use(summary);
  if (!unreadCount) return null;
  return (
    <span
      className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"
      aria-hidden="true"
    />
  );
}

/**
 * Unread count for the Notifications nav item. The layout streams the summary (it syncs derived notifications
 * first), so this renders nothing until it arrives instead of holding back the sidebar.
 */
export function UnreadCount({ summary }: { summary: Summary }) {
  if (!summary) return null;
  return (
    <Suspense fallback={null}>
      <Count summary={summary} />
    </Suspense>
  );
}

/** Red dot on the phone's "More" tab when there are unread notifications. */
export function UnreadDot({ summary }: { summary: Summary }) {
  if (!summary) return null;
  return (
    <Suspense fallback={null}>
      <Dot summary={summary} />
    </Suspense>
  );
}
