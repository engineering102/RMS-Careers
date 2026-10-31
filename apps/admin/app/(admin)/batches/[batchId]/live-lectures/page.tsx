import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getBatchById, getProgramById, listBatchLiveSessions } from '@/lib/db/queries';
import { requireAdminSession } from '@/lib/authz';
import { PageHeader } from '@/components/ui/page-header';
import { BatchNav } from '@/components/admin/batch-nav';
import { LiveLecturesClient } from './live-lectures-client';

export const metadata = {
  title: 'Live Lectures | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function BatchLiveLecturesPage(props: { params: Promise<{ batchId: string }> }) {
  await requireAdminSession();
  const { batchId } = await props.params;

  const batch = await getBatchById(batchId);
  if (!batch) notFound();

  const [program, sessions] = await Promise.all([getProgramById(batch.programId), listBatchLiveSessions(batch.id)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        leading={
          <Link
            href={`/batches/${batch.id}`}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Batch overview
          </Link>
        }
        eyebrow={program ? `${program.name} (${program.code})` : 'Batch'}
        title={`${batch.name}: Live Lectures`}
        description="Weekly Zoom sessions for this batch. Students and assigned tutors see published sessions with the next date and a Join button."
      />
      <BatchNav batchId={batch.id} active="live-lectures" />
      <LiveLecturesClient
        batchId={batch.id}
        batchName={batch.name}
        nowIso={new Date().toISOString()}
        sessions={sessions.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          meetingUrl: s.meetingUrl,
          joiningInstructions: s.joiningInstructions,
          recurrenceDays: s.recurrenceDays,
          startTime: s.startTime,
          durationMinutes: s.durationMinutes,
          startsOn: s.startsOn,
          endsOn: s.endsOn,
          isPublished: s.isPublished
        }))}
      />
    </div>
  );
}
