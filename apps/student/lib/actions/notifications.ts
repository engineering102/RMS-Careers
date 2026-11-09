'use server';

import { revalidatePath } from 'next/cache';
import { db, notifications } from '@rms/db';
import { eq, and, lt } from 'drizzle-orm';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { DEDUPE_LOOKBACK_MS } from '@/lib/services/derived-notifications';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Read notifications are never shown again (the bell and the Notifications page list unread only), so they are
 * not kept. They are deleted once older than the derived-notification dedupe window, not straight away: the sync
 * in lib/services/derived-notifications.ts treats an existing row (read or not) as "already announced", and
 * deleting it sooner would announce the same review, deadline or content again.
 *
 * Best-effort housekeeping: a failure here never fails marking a notification read.
 */
async function purgeStaleReadNotifications(userId: string): Promise<void> {
  try {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, true),
          lt(notifications.createdAt, new Date(Date.now() - DEDUPE_LOOKBACK_MS))
        )
      );
  } catch (err) {
    console.error('[purgeStaleReadNotifications] Error:', err);
  }
}

/**
 * Marks a single notification as read.
 * Asserts that the notification belongs to the authenticated user.
 */
export async function markNotificationAsReadAction(
  notificationId: string
): Promise<ActionResult<{ id: string; isRead: true }>> {
  try {
    const context = await requireStudentEntitlement();

    if (!context.isActive || !context.student || !context.student.userId) {
      return {
        success: false,
        error: 'Unauthorized student session',
        code: 'UNAUTHORIZED'
      };
    }

    if (!notificationId || !UUID_REGEX.test(notificationId)) {
      return {
        success: false,
        error: 'Invalid notification identifier',
        code: 'INVALID_ID'
      };
    }

    const userId = context.student.userId;

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });

    if (!updated) {
      return {
        success: false,
        error: 'Notification not found or access denied',
        code: 'NOT_FOUND'
      };
    }

    await purgeStaleReadNotifications(userId);

    revalidatePath('/notifications');
    revalidatePath('/overview');

    return {
      success: true,
      data: { id: updated.id, isRead: true },
      message: 'Notification marked as read'
    };
  } catch (err) {
    console.error('[markNotificationAsReadAction] Error:', err);
    return {
      success: false,
      error: 'Failed to update notification status',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Marks all unread notifications as read for the authenticated student.
 */
export async function markAllNotificationsAsReadAction(): Promise<ActionResult<{ markedCount: number }>> {
  try {
    const context = await requireStudentEntitlement();

    if (!context.isActive || !context.student || !context.student.userId) {
      return {
        success: false,
        error: 'Unauthorized student session',
        code: 'UNAUTHORIZED'
      };
    }

    const userId = context.student.userId;

    const updatedRows = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning({ id: notifications.id });

    await purgeStaleReadNotifications(userId);

    revalidatePath('/notifications');
    revalidatePath('/overview');

    return {
      success: true,
      data: { markedCount: updatedRows.length },
      message: `Marked ${updatedRows.length} notification${updatedRows.length === 1 ? '' : 's'} as read`
    };
  } catch (err) {
    console.error('[markAllNotificationsAsReadAction] Error:', err);
    return {
      success: false,
      error: 'Failed to mark all notifications as read',
      code: 'INTERNAL_ERROR'
    };
  }
}
