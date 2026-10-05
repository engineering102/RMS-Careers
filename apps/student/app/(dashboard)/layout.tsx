import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { DashboardShell } from '@/components/shell/dashboard-shell';

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

  return <DashboardShell context={context}>{children}</DashboardShell>;
}
