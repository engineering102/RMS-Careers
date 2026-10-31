import { CalendarClock, ExternalLink, Video } from 'lucide-react';
import {
  describeSchedule,
  formatIstDateTime,
  hasEnded,
  nextOccurrence,
  parseZoomMeetingUrl
} from '@rms/academic/live-sessions';
import type { StudentLiveSession } from '@/lib/db/queries/live-sessions';

/**
 * One live session: schedule, next date (IST) and a Join link. No "live now" status is shown (plan D-5b). The
 * meeting URL is re-validated at render time; an unusable link is never rendered as an anchor.
 */
export function LiveSessionCard({ session, now, isReadOnly }: { session: StudentLiveSession; now: Date; isReadOnly: boolean }) {
  const next = nextOccurrence(session, now);
  const ended = hasEnded(session, now);
  const meeting = parseZoomMeetingUrl(session.meetingUrl);

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Video className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {session.title}
        </h3>
        {session.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{session.description}</p>}
        <p className="text-sm text-foreground">{describeSchedule(session)}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {next ? (
            <span>
              Next session: <span className="font-medium text-foreground">{formatIstDateTime(next.start)}</span>
            </span>
          ) : ended ? (
            <span>Schedule ended {session.endsOn}</span>
          ) : (
            <span>No upcoming session</span>
          )}
        </p>
        {session.joiningInstructions && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Joining instructions</p>
            <p className="whitespace-pre-line">{session.joiningInstructions}</p>
          </div>
        )}
      </div>

      <div className="shrink-0">
        {isReadOnly || ended ? null : meeting.ok ? (
          <a
            href={meeting.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Join ${session.title} on Zoom (opens in new tab)`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Join meeting
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <p className="max-w-[16rem] text-xs text-muted-foreground">Meeting link unavailable. Contact your coordinator.</p>
        )}
      </div>
    </article>
  );
}
