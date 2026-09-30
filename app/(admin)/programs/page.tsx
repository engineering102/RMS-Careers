import { PlusCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/admin/empty-state';

export const metadata = {
  title: 'Programs | Academy Enrollment'
};

export default function ProgramsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
          <p className="text-sm text-muted-foreground">
            Manage training programs and enrollment campaigns.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" disabled>
          <PlusCircle className="h-3.5 w-3.5" />
          <span>New Program</span>
        </Button>
      </div>

      <EmptyState
        icon={BookOpen}
        title="Create your first program"
        description="Set up a training program with schedule and capacity to start accepting student enrollments."
        action={
          <Button size="sm" variant="outline" disabled className="gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" />
            Create Program (Next phase)
          </Button>
        }
      />
    </div>
  );
}
