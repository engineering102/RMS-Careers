import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';

export const metadata = {
  title: 'Enrollments | Academy Enrollment'
};

export default function EnrollmentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
          <p className="text-sm text-muted-foreground">
            View and manage student enrollments across all programs.
          </p>
        </div>
      </div>

      <EmptyState
        icon={ClipboardList}
        title="No enrollments yet"
        description="Students who enroll in active programs will appear here for review and confirmation."
      />
    </div>
  );
}
