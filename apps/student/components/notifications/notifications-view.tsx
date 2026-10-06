'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Sparkles,
  Check,
  CheckCheck,
  ExternalLink,
  Filter
} from 'lucide-react';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction
} from '@/lib/actions/notifications';
import type { NotificationItem, NotificationFilter } from '@/lib/types/notifications';

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  initialTotalCount: number;
}

export function NotificationsView({
  initialNotifications,
  initialUnreadCount,
  initialTotalCount
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  const handleMarkAsRead = async (id: string) => {
    if (markingIds.has(id)) return;
    setMarkingIds((prev) => new Set(prev).add(id));

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsReadAction(id);
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'ASSESSMENT_DUE_SOON':
        return <Clock className="h-5 w-5 text-amber-400" />;
      case 'STREAK_MILESTONE':
        return <Flame className="h-5 w-5 text-orange-400" />;
      case 'MILESTONE_UNLOCKED':
        return <Award className="h-5 w-5 text-purple-400" />;
      case 'STUDENT_ACTIVATED':
        return <Sparkles className="h-5 w-5 text-blue-400" />;
      default:
        return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  const formatTimestamp = (dateInput: Date | string) => {
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

    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time updates on your assignments, milestones, deadlines, and learning progress.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50 shadow-sm"
          >
            <CheckCheck className="h-4 w-4 text-blue-400" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <span>All</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              filter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
            filter === 'unread'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                filter === 'unread' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-300'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Notification List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/70 border border-slate-700/60 text-slate-400 mb-4">
            <Bell className="h-7 w-7 text-slate-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">
            {filter === 'unread'
              ? 'You have no unread notifications.'
              : 'You have no notifications yet.'}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'You are all caught up! Check back later for assignment feedback and milestone updates.'
              : 'Activity notifications regarding quizzes, projects, batch curriculum, and streaks will show up here.'}
          </p>
          {filter === 'unread' && notifications.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>View all notifications</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`group relative rounded-xl border p-4 sm:p-5 transition-all ${
                !n.isRead
                  ? 'border-blue-500/30 bg-blue-950/20 shadow-md shadow-blue-950/10'
                  : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Event Type Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm mt-0.5">
                  {getEventIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm ${
                          !n.isRead ? 'font-semibold text-white' : 'font-medium text-slate-200'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {formatTimestamp(n.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {n.body}
                  </p>

                  {/* Actions Bar */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 pt-1">
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition"
                      >
                        <span>View item</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        disabled={markingIds.has(n.id)}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        <span>Mark as read</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
