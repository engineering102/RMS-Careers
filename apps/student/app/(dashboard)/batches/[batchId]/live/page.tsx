import Link from 'next/link';
import { ArrowLeft, CalendarClock, ExternalLink, Video } from 'lucide-react';
import { formatIstDateTime, istDateOf } from '@rms/academic/live-sessions';
import { requireStudentEntitlement, assertBatchEntitlement } from '@/lib/db/queries/entitlements';
import { getPublishedLiveSessions } from '@/lib/db/queries/live-sessions';
import { parseCalendarParams } from '@/lib/live/calendar';
import { buildLiveCalendar, nextLecture } from '@/lib/live/live-calendar-data';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { WorkspaceSubnav } from '@/components/batch-workspace/workspace-subnav';
import { LiveCalendar } from '@/components/batch-workspace/live-calendar';
import { LiveCalendarToolbar, calendarHref } from '@/components/batch-workspace/live-calendar-toolbar';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = {
  title: 'Live Lectures — RMS Student Portal',
  description: 'Calendar of your batch’s live lectures, with the details and Zoom link of each session.'
};

interface BatchLivePageProps {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ view?: string | string[]; date?: string | string[] }>;
}

export default async function BatchLivePage({ params, searchParams }: BatchLivePageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const { batchId } = await params;

  // The entitlement check runs alongside the read; its notFound() rejects the whole Promise.all, so nothing is shown
  // to a student outside this batch (same 404 as the workspace). Like the workspace, this page does not change the
  // active cohort cookie.
  const [entitlement, sessions, query] = await Promise.all([
    assertBatchEntitlement(context.student.id, batchId),
    getPublishedLiveSessions(batchId),
    searchParams
  ]);
  const isReadOnly = entitlement.enrollmentStatus === 'completed';
  const now = new Date();
  const basePath = `/batches/${batchId}/live`;
  const { view, anchor } = parseCalendarParams(query, istDateOf(now));
  const calendar = buildLiveCalendar(sessions, { view, anchor, now, isReadOnly });
  const upNext = isReadOnly ? null : nextLecture(sessions, now);
  const upNextLecture = upNext ? calendar.lectures.find((l) => l.id === upNext.session.id) : undefined;
  const upNextDate = upNext ? istDateOf(upNext.start) : null;

  return (
    <div className="space-y-6">
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
          {entitlement.programName} · Times are in IST. Select a lecture to see its details and join.
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
          {upNext && upNextLecture && upNextDate && (
            <section
              aria-label="Up next"
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Up next</p>
                  <p className="truncate font-semibold text-foreground">{upNext.session.title}</p>
                  <p className="text-sm text-muted-foreground">{formatIstDateTime(upNext.start)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!calendar.days.includes(upNextDate) && (
                  <Link
                    href={calendarHref(basePath, view, upNextDate)}
                    className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Show in calendar
                  </Link>
                )}
                {upNextLecture.joinUrl ? (
                  <a
                    href={upNextLecture.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Join ${upNextLecture.title} on Zoom (opens in new tab)`}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Video className="h-4 w-4" aria-hidden="true" />
                    Join
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="max-w-[16rem] text-xs text-muted-foreground">Meeting link unavailable. Contact your coordinator.</p>
                )}
              </div>
            </section>
          )}

          <LiveCalendarToolbar basePath={basePath} view={view} anchor={anchor} />
          <LiveCalendar {...calendar} dayHrefBase={basePath} />
        </div>
      )}
    </div>
  );
}
