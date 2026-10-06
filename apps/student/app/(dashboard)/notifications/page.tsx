import React from 'react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentNotifications } from '@/lib/db/queries/notifications';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { NotificationsView } from '@/components/notifications/notifications-view';

export const metadata = {
  title: 'Notifications & Alerts — RMS Student Portal',
  description: 'Stay updated on project reviews, assessments due, streaks, and batch milestones.'
};

export default async function NotificationsPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const userId = context.student.userId;

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-400">
        <p>No user account associated with this student profile.</p>
      </div>
    );
  }

  const summary = await getStudentNotifications(userId, { limit: 100 });

  return (
    <NotificationsView
      initialNotifications={summary.notifications}
      initialUnreadCount={summary.unreadCount}
      initialTotalCount={summary.totalCount}
    />
  );
}
