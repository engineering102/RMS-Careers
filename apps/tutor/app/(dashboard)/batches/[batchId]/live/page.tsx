import { Video, ExternalLink } from 'lucide-react';
import { db } from '@rms/db';
import { describeSchedule, formatIstDateTime, hasEnded, nextOccurrence } from '@rms/academic/live-sessions';
import { getBatchLiveSessions } from '@rms/academic/tutor/live';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Live classes — RMS Tutor Portal' };

/** All of the batch's live sessions; unpublished ones are marked (students do not see them yet). */
export default async function BatchLivePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const sessions = await getBatchLiveSessions(db, tutor.scope, batchId);
  const now = new Date();

  if (sessions.length === 0) {
    return <EmptyState icon={Video} title="No live classes" description="Your coordinator schedules live classes for this batch. They will be listed here." />;
  }

  return (
    <section aria-labelledby="live-heading" className="space-y-4">
      <h2 id="live-heading" className="text-xl font-semibold">Live classes</h2>
      <ul className="space-y-3">
        {sessions.map((s) => {
          const next = nextOccurrence(s, now);
          const ended = hasEnded(s, now);
          return (
            <li key={s.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{s.title}</p>
                {!s.isPublished ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Not visible to students</span>
                ) : null}
                {ended ? <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Ended</span> : null}
              </div>
              <p className="text-sm text-muted-foreground">{describeSchedule(s)}</p>
              {next ? <p className="text-sm">Next: {formatIstDateTime(next.start)}</p> : null}
              {s.description ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p> : null}
              {s.joiningInstructions ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.joiningInstructions}</p> : null}
              {!ended ? (
                <a
                  href={s.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Join on Zoom
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
