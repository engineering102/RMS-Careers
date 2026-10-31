import { describeSchedule, nextOccurrence } from '@rms/academic/live-sessions';
import type { TutorLiveSession } from '@rms/academic/tutor/live';
import { formatIstDateTime } from '@/lib/format';

/** The soonest upcoming occurrence over the given sessions, or null. */
export function soonestClass(sessions: TutorLiveSession[], now: Date = new Date()) {
  let best: { session: TutorLiveSession; start: Date; end: Date } | null = null;
  for (const session of sessions) {
    const next = nextOccurrence(session, now);
    if (next && (!best || next.start < best.start)) best = { session, ...next };
  }
  return best;
}

/** `batchNames` labels the class with its batch (overview, where sessions span batches). */
export function NextClassLine({ sessions, batchNames }: { sessions: TutorLiveSession[]; batchNames?: Map<string, string> }) {
  const next = soonestClass(sessions);
  const batchName = batchNames?.get(next?.session.batchId ?? '');
  if (!next) return <p className="text-sm text-muted-foreground">No upcoming live class scheduled.</p>;
  return (
    <div className="text-sm">
      <p className="font-medium text-foreground">
        {next.session.title}
        {batchName ? <span className="text-muted-foreground"> · {batchName}</span> : null}
      </p>
      <p className="text-muted-foreground">
        {formatIstDateTime(next.start)} · {describeSchedule(next.session)}
      </p>
    </div>
  );
}
