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
  Sparkles,
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
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, actionUrl?: string | null) => {
    // Only an unread item changes the count; re-opening a read one just navigates.
    const wasUnread = notifications.some((n) => n.id === id && !n.isRead);
    if (wasUnread) {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
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
    switch (type) {
      case 'PROJECT_REVIEWED':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'ASSESSMENT_DUE_SOON':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'STREAK_MILESTONE':
        return <Flame className="h-4 w-4 text-orange-400" />;
      case 'MILESTONE_UNLOCKED':
        return <Award className="h-4 w-4 text-purple-400" />;
      case 'STUDENT_ACTIVATED':
        return <Sparkles className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/80 text-foreground/80 hover:bg-secondary hover:text-foreground transition active:scale-[0.97] motion-reduce:active:scale-100 focus:outline-none focus:ring-2 focus:ring-ring/40"
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Drawer */}
      {isOpen && (
        <div className="absolute -right-2 sm:right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 rounded-xl border border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl z-50 overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-150 ease-out-quint">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition disabled:opacity-50"
                  title="Mark all as read"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs font-medium text-foreground/80">You have no unread notifications.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">We will alert you on assignments, milestones and deadlines.</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.actionUrl)}
                  className={`flex gap-3 p-3.5 transition cursor-pointer hover:bg-secondary/60 ${
                    !n.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/80 border border-input/50">
                    {getEventIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium truncate ${!n.isRead ? 'text-foreground font-semibold' : 'text-foreground/80'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {n.body}
                    </p>
                    {n.actionUrl && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium mt-1">
                        View item <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5 bg-background/80 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-primary hover:text-primary transition inline-flex items-center gap-1"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
