import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import { requireStudentEntitlement, assertBatchEntitlement } from '@/lib/db/queries/entitlements';
import { getPublishedLiveSessions } from '@/lib/db/queries/live-sessions';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { WorkspaceSubnav } from '@/components/batch-workspace/workspace-subnav';
import { LiveSessionCard } from '@/components/batch-workspace/live-session-card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = {
  title: 'Live Lectures — RMS Student Portal',
  description: 'Weekly live sessions of your batch, with the next date and the Zoom link.'
};

interface BatchLivePageProps {
  params: Promise<{ batchId: string }>;
}

export default async function BatchLivePage({ params }: BatchLivePageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const { batchId } = await params;

  // The entitlement check runs alongside the read; its notFound() rejects the whole Promise.all, so nothing is shown
  // to a student outside this batch (same 404 as the workspace). Like the workspace, this page does not change the
  // active cohort cookie.
  const [entitlement, sessions] = await Promise.all([
    assertBatchEntitlement(context.student.id, batchId),
    getPublishedLiveSessions(batchId)
  ]);
  const isReadOnly = entitlement.enrollmentStatus === 'completed';
  const now = new Date();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href={`/batches/${batchId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {entitlement.batchName}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Lectures</h1>
        <p className="text-sm text-muted-foreground">
          {entitlement.programName} · Times are in IST.
          {isReadOnly ? ' This batch is completed, so the meeting links are no longer shown.' : ''}
        </p>
      </header>

      <WorkspaceSubnav batchId={batchId} activeTab="live" />

      {sessions.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No live lectures yet"
          description="Your coordinator hasn't added live sessions for this batch."
        />
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <LiveSessionCard key={session.id} session={session} now={now} isReadOnly={isReadOnly} />
          ))}
        </div>
      )}
    </div>
  );
}
