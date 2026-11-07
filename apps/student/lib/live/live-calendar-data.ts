import { describeSchedule, hasEnded, istDateOf, nextOccurrence, parseZoomMeetingUrl } from '@rms/academic/live-sessions';
import type { StudentLiveSession } from '@/lib/db/queries/live-sessions';
import type { CalendarLecture, LectureLinkState, LiveCalendarData } from '@/lib/types/live-calendar';
import { expandOccurrences, gridHours, visibleDays, type CalendarView } from './calendar';

/**
 * Builds the serialisable data the Live Lectures calendar renders. The meeting URL is re-validated here and only
 * passed on when the student can join (active batch, schedule not over, valid Zoom link); otherwise it never
 * reaches the browser.
 */
export function buildLiveCalendar(
  sessions: readonly StudentLiveSession[],
  options: { view: CalendarView; anchor: string; now: Date; isReadOnly: boolean }
): LiveCalendarData {
  const { view, anchor, now, isReadOnly } = options;
  const days = visibleDays(view, anchor);
  const nowMs = now.getTime();

  const lectures: CalendarLecture[] = sessions.map((session, index) => {
    const meeting = parseZoomMeetingUrl(session.meetingUrl);
    const linkState: LectureLinkState = isReadOnly
      ? 'read_only'
      : hasEnded(session, now)
        ? 'ended'
        : meeting.ok
          ? 'available'
          : 'unavailable';
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      joiningInstructions: session.joiningInstructions,
      scheduleLabel: describeSchedule(session),
      tone: index,
      joinUrl: linkState === 'available' && meeting.ok ? meeting.url : null,
      linkState
    };
  });

  const events = expandOccurrences(sessions, days).map((occurrence) => ({
    ...occurrence,
    ended: new Date(occurrence.end).getTime() <= nowMs
  }));
  const { startHour, endHour } = gridHours(sessions);

  return {
    view,
    days,
    month: anchor.slice(0, 7),
    today: istDateOf(now),
    nowIso: now.toISOString(),
    startHour,
    endHour,
    events,
    lectures
  };
}

/** The soonest current-or-upcoming lecture across all sessions, for the "Up next" strip. */
export function nextLecture(
  sessions: readonly StudentLiveSession[],
  now: Date
): { session: StudentLiveSession; start: Date; end: Date } | null {
  let best: { session: StudentLiveSession; start: Date; end: Date } | null = null;
  for (const session of sessions) {
    const next = nextOccurrence(session, now);
    if (next && (!best || next.start < best.start)) best = { session, ...next };
  }
  return best;
}
