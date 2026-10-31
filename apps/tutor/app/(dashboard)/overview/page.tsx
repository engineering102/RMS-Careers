import Link from 'next/link';
import { ClipboardList, Inbox, Layers, MessageSquareWarning, UserCheck } from 'lucide-react';
import { db } from '@rms/db';
import { batchLoad, getTutorOverviewMetrics } from '@rms/academic/tutor/overview';
import { getPublishedLiveSessions } from '@rms/academic/tutor/live';
import { requireTutor } from '@/lib/db/tutor-context';
import { getAssignedBatchSummaries } from '@/lib/db/queries/batches';
import { formatIstDate, plural, waitingFor } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { NextClassLine } from '@/components/batches/next-class';

export const metadata = { title: 'Overview — RMS Tutor Portal' };

export default async function OverviewPage() {
  const tutor = await requireTutor();
  // Three queries in parallel after the guard (plan §14: overview ≤ 7 queries, 2 hops).
  const [batches, metrics, sessions] = await Promise.all([
    getAssignedBatchSummaries(tutor.scope),
    getTutorOverviewMetrics(db, tutor.scope, tutor.userId),
    getPublishedLiveSessions(db, tutor.scope)
  ]);
  const batchNames = new Map(batches.map((b) => [b.batchId, b.batchName]));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Welcome, {tutor.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          {batches.length === 0 ? 'You have no batches yet.' : `You are assigned to ${plural(batches.length, 'batch', 'batches')}.`}
        </p>
      </header>

      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches assigned"
          description="Your coordinator assigns batches to you. They appear here as soon as they do."
        />
      ) : (
        <>
          <section aria-label="Review workload" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Awaiting review"
              value={metrics.totals.awaitingReview}
              icon={Inbox}
              tone={metrics.totals.awaitingReview > 0 ? 'warning' : 'default'}
              hint={
                metrics.totals.oldestAwaitingAt
                  ? `Oldest waiting ${waitingFor(metrics.totals.oldestAwaitingAt)} (since ${formatIstDate(metrics.totals.oldestAwaitingAt)})`
                  : 'Nothing waiting'
              }
            />
            <StatCard label="In review" value={metrics.totals.underReview} icon={ClipboardList} tone="info" hint="Claimed by any reviewer" />
            <StatCard label="My open reviews" value={metrics.myClaims} icon={UserCheck} hint="In review, last acted on by you" />
            <StatCard label="Changes requested" value={metrics.totals.changesRequested} icon={MessageSquareWarning} hint="Waiting on students" />
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reviews"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open the review queue
            </Link>
          </div>

          <section aria-labelledby="next-class-heading" className="space-y-2 rounded-lg border border-border bg-card p-4">
            <h2 id="next-class-heading" className="font-semibold">Next live class</h2>
            <NextClassLine sessions={sessions} batchNames={batchNames} />
            {sessions.length > 0 ? (
              <p className="text-xs text-muted-foreground">Join links are on each batch&apos;s Live classes tab.</p>
            ) : null}
          </section>

          <section aria-labelledby="batches-heading" className="space-y-3">
            <h2 id="batches-heading" className="text-lg font-semibold">Your batches</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batches.map((b) => {
                const load = batchLoad(metrics, b.batchId);
                return (
                  <li key={b.batchId}>
                    <Link
                      href={`/batches/${b.batchId}`}
                      className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{b.programCode}</p>
                      <p className="mt-1 font-semibold text-foreground">{b.batchName}</p>
                      <p className="text-sm text-muted-foreground">{b.collegeName}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {plural(b.activeStudents, 'student')} · {load.awaitingReview} awaiting review
                        {b.status === 'completed' ? ' · Completed' : ''}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
