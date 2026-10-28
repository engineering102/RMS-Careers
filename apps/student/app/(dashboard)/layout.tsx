import { cookies } from 'next/headers';
import { requireStudentEntitlement, resolveActiveCohort } from '@/lib/db/queries/entitlements';
import { getStudentNotifications } from '@/lib/db/queries/notifications';
import {
  claimDerivedNotificationSync,
  releaseDerivedNotificationSync,
  syncDerivedNotifications
} from '@/lib/services/derived-notifications';
import { DashboardShell } from '@/components/shell/dashboard-shell';
import { COHORT_COOKIE_NAME } from '@/lib/constants/cohort';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';
import type { BellNotificationSummary } from '@/lib/types/notifications';

export const metadata = {
  title: 'Student Dashboard — RMS Careers',
  description: 'Enterprise technical learning portal and career readiness workbench.'
};

const EMPTY_SUMMARY: BellNotificationSummary = { notifications: [], unreadCount: 0 };

/**
 * Syncs derived notifications, then reads the bell's summary. Never rejects: a failure leaves the bell empty
 * rather than breaking the page.
 */
async function loadBellNotifications(context: StudentEntitlementContext): Promise<BellNotificationSummary> {
  if (!context.isActive || !context.student?.userId) return EMPTY_SUMMARY;

  // Turn new reviews, deadlines, published content and streak milestones into notifications before reading them,
  // at most once per DERIVED_SYNC_INTERVAL_MS per student rather than on every page view.
  if (claimDerivedNotificationSync(context.student.id)) {
    try {
      await syncDerivedNotifications({
        studentId: context.student.id,
        userId: context.student.userId,
        batchIds: context.activeBatches.map((b) => b.batchId),
        programs: context.enrollments.map((e) => ({ programId: e.programId, programName: e.programName }))
      });
    } catch (err) {
      releaseDerivedNotificationSync(context.student.id);
      console.error('[DashboardLayout] Failed to sync derived notifications:', err);
    }
  }

  try {
    const summary = await getStudentNotifications(context.student.userId, { limit: 5 });
    return { notifications: summary.notifications, unreadCount: summary.unreadCount };
  } catch (err) {
    console.error('[DashboardLayout] Failed to load notification summary:', err);
    return EMPTY_SUMMARY;
  }
}

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Server-side entitlement guard asserts valid authenticated Student
  const context = await requireStudentEntitlement();

  // Read active cohort cookie and resolve active cohort server-authoritatively
  const cookieStore = await cookies();
  const cookieBatchId = cookieStore.get(COHORT_COOKIE_NAME)?.value;
  const activeCohort = resolveActiveCohort(context.activeBatches, { cookieBatchId });

  // Not awaited: the bell streams in when it is ready, so the notification sync (several sequential DB
  // round-trips) no longer holds back the shell and the page.
  const bellNotifications = loadBellNotifications(context);

  return (
    <DashboardShell
      context={context}
      activeCohort={activeCohort}
      bellNotifications={bellNotifications}
    >
      {children}
    </DashboardShell>
  );
}
