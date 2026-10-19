import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getBatchWorkspace } from '@/lib/db/queries/batch-workspace';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { BatchHeader } from '@/components/batch-workspace/batch-header';
import { WorkspaceSubnav } from '@/components/batch-workspace/workspace-subnav';
import { CurriculumWeeks } from '@/components/batch-workspace/curriculum-weeks';
import { BatchWorkspaceEmptyState } from '@/components/batch-workspace/batch-workspace-empty-state';

export const metadata = {
  title: 'Cohort Workspace — RMS Student Portal',
  description: 'Chronological weekly milestone curriculum and cohort learning journey.'
};

interface BatchWorkspacePageProps {
  params: Promise<{
    batchId: string;
  }>;
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function BatchWorkspacePage({ params, searchParams }: BatchWorkspacePageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const { batchId } = await params;
  const requestedWeek = Number.parseInt((await searchParams).week ?? '', 10);

  // Server-authoritative query (validates batch entitlement, throws notFound() if unauthorized)
  const data = await getBatchWorkspace(context.student.id, batchId);

  return (
    <div className="space-y-8">
      {/* 1. Cohort Header */}
      <BatchHeader
        batch={data.batch}
        totalMilestones={data.totalMilestones}
        completedMilestones={data.completedMilestones}
        overallProgressPercent={data.overallProgressPercent}
        weeksCount={data.weeks.length}
        activeEnrolledBatches={data.activeEnrolledBatches}
        isReadOnly={data.isReadOnly}
      />

      {/* 2. Workspace Navigation */}
      <WorkspaceSubnav batchId={batchId} activeTab="curriculum" />

      {/* 3. Weekly Curriculum (one week per page, content-type sections) or Empty State */}
      {data.weeks.length === 0 ? (
        <BatchWorkspaceEmptyState />
      ) : (
        <CurriculumWeeks
          weeks={data.weeks}
          requestedWeek={Number.isFinite(requestedWeek) ? requestedWeek : null}
        />
      )}
    </div>
  );
}
