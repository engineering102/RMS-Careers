'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  BookOpen,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction
} from '@/lib/actions/notifications';
import type { NotificationItem } from '@/lib/types/notifications';

interface NotificationBellProps {
  initialUnreadCount?: number;
  initialNotifications?: NotificationItem[];
}

export function NotificationBell({
  initialUnreadCount = 0,
  initialNotifications = []
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state when props change
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
    setNotifications(initialNotifications);
  }, [initialUnreadCount, initialNotifications]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, actionUrl?: string | null) => {
    // Only an unread item changes the count; re-opening a read one just navigates.
    const wasUnread = notifications.some((n) => n.id === id && !n.isRead);
    if (wasUnread) {
      // Optimistic UI update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await markNotificationAsReadAction(id);
    }

    if (actionUrl) {
      setIsOpen(false);
      router.push(actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsReadAction();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getEventIcon = (type: string) => {
    // Neutral icons: the unread dot and the title weight carry the state, not a colour per event type.
    const cls = 'h-4 w-4 text-muted-foreground';
    switch (type) {
      case 'PROJECT_REVIEWED':
        return <CheckCircle2 className={cls} aria-hidden="true" />;
      case 'ASSESSMENT_DUE_SOON':
        return <Clock className={cls} aria-hidden="true" />;
      case 'STREAK_MILESTONE':
        return <Flame className={cls} aria-hidden="true" />;
      case 'CONTENT_PUBLISHED':
        return <BookOpen className={cls} aria-hidden="true" />;
      case 'MILESTONE_UNLOCKED':
        return <Award className={cls} aria-hidden="true" />;
      default:
        return <Bell className={cls} aria-hidden="true" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          // The bell lives in the layout, which client navigation does not re-render: refresh on open so
          // notifications created since the last full render (new content, deadlines, reviews) show up.
          if (!isOpen) router.refresh();
          setIsOpen((prev) => !prev);
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl duration-150 ease-out-quint animate-in fade-in-0 zoom-in-[0.97]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">
              Notifications
              {unreadCount > 0 && <span className="ml-2 font-normal text-muted-foreground">{unreadCount} unread</span>}
            </p>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center">
                <p className="text-sm font-medium">You're all caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">Reviews, deadlines and new weeks show up here.</p>
              </li>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(n.id, n.actionUrl)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
                  >
                    <span className="mt-0.5 shrink-0">{getEventIcon(n.type)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`truncate text-[13px] ${n.isRead ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                          {n.title}
                        </span>
                        {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{n.body}</span>
                      {n.actionUrl && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                          Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
            >
              All notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
