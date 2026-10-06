import 'server-only';

import { db, notifications } from '@rms/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { NotificationItem, NotificationSummary } from '@/lib/types/notifications';

/**
 * Returns notifications for the given user, ordered with newest first.
 * Includes total count and unread count for fast UI presentation.
 */
export async function getStudentNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<NotificationSummary> {
  const { limit = 50, unreadOnly = false } = options;

  if (!userId) {
    return {
      notifications: [],
      unreadCount: 0,
      totalCount: 0
    };
  }

  // 1. Fetch unread count
  const [unreadResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  const unreadCount = Number(unreadResult?.count || 0);

  // 2. Fetch total count
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(eq(notifications.userId, userId));

  const totalCount = Number(totalResult?.count || 0);

  // 3. Build where conditions for notifications list
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      actionUrl: notifications.actionUrl,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt
    })
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  const mappedNotifications: NotificationItem[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    type: r.type,
    title: r.title,
    body: r.body,
    actionUrl: r.actionUrl,
    isRead: r.isRead,
    createdAt: new Date(r.createdAt)
  }));

  return {
    notifications: mappedNotifications,
    unreadCount,
    totalCount
  };
}

/**
 * Fast lookup for the number of unread notifications for a student.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return Number(row?.count || 0);
}
