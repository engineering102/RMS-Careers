import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentNotifications } from '@/lib/db/queries/notifications';
import { DashboardShell } from '@/components/shell/dashboard-shell';
import type { NotificationItem } from '@/lib/types/notifications';

export const metadata = {
  title: 'Student Dashboard — RMS Careers',
  description: 'Enterprise technical learning portal and career readiness workbench.'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Server-side entitlement guard asserts valid authenticated Student
  const context = await requireStudentEntitlement();

  let initialNotifications: NotificationItem[] = [];
  let initialUnreadCount = 0;

  if (context.isActive && context.student?.userId) {
    try {
      const summary = await getStudentNotifications(context.student.userId, { limit: 5 });
      initialNotifications = summary.notifications;
      initialUnreadCount = summary.unreadCount;
    } catch (err) {
      console.error('[DashboardLayout] Failed to load notification summary:', err);
    }
  }

  return (
    <DashboardShell
      context={context}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </DashboardShell>
  );
}
