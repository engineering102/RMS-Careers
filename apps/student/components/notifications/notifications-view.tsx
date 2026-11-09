'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, Clock, Flame, Award, Check, CheckCheck, ArrowRight, BookOpen } from 'lucide-react';
import { markNotificationAsReadAction, markAllNotificationsAsReadAction } from '@/lib/actions/notifications';
import type { NotificationItem } from '@/lib/types/notifications';
import { formatDate } from '@/lib/format/datetime';

interface NotificationsViewProps {
  /** Unread notifications only: a notification leaves the list as soon as it is read. */
  initialNotifications: NotificationItem[];
}

function getEventIcon(type: string) {
  // Neutral icons: the title carries the meaning, not a colour per event type.
  const cls = 'h-4 w-4 text-muted-foreground';
  switch (type) {
    case 'PROJECT_REVIEWED':
      return <CheckCircle2 className={cls} aria-hidden="true" />;
    case 'ASSESSMENT_DUE_SOON':
      return <Clock className={cls} aria-hidden="true" />;
    case 'STREAK_MILESTONE':
      return <Flame className={cls} aria-hidden="true" />;
    case 'MILESTONE_UNLOCKED':
      return <Award className={cls} aria-hidden="true" />;
    case 'CONTENT_PUBLISHED':
      return <BookOpen className={cls} aria-hidden="true" />;
    default:
      return <Bell className={cls} aria-hidden="true" />;
  }
}

function formatTimestamp(dateInput: Date | string) {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(d, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * An inbox, not an archive: only unread notifications are listed, and marking one read (or opening it) removes it.
 */
export function NotificationsView({ initialNotifications }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const dismiss = (id: string) => {
    // Optimistic: the item leaves the list straight away.
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    void markNotificationAsReadAction(id);
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || notifications.length === 0) return;
    setIsMarkingAll(true);
    setNotifications([]);
    try {
      await markAllNotificationsAsReadAction();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const count = notifications.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count > 0
              ? `${count} unread. Reviews, deadlines and new content land here.`
              : 'Reviews, deadlines and new content land here.'}
          </p>
        </div>

        {count > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100 sm:self-auto"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all as read
          </button>
        )}
      </div>

      {count === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-foreground">You're all caught up</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            New reviews, deadlines and course content will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-3 p-4 sm:px-5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                {getEventIcon(n.type)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-medium text-foreground">{n.title}</h2>
                  {/* Relative time can tick over between the server render and hydration ("6h" vs "7h"). */}
                  <span className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
                    {formatTimestamp(n.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>

                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      onClick={() => dismiss(n.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Open
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Mark as read
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
