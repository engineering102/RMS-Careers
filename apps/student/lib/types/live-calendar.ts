import type { CalendarView, LectureOccurrence } from '@/lib/live/calendar';

/**
 * Why a session has no Join link: the batch is completed ('read_only'), the schedule is over ('ended') or the stored
 * link failed re-validation ('unavailable'). The meeting URL is only sent to the browser when it is joinable.
 */
export type LectureLinkState = 'available' | 'unavailable' | 'ended' | 'read_only';

export interface CalendarLecture {
  id: string;
  title: string;
  description: string | null;
  joiningInstructions: string | null;
  /** e.g. "Every Mon, Wed, Fri · 7:00 pm – 8:30 pm IST" */
  scheduleLabel: string;
  /** Index into the event colour palette, stable per session. */
  tone: number;
  joinUrl: string | null;
  linkState: LectureLinkState;
}

export interface CalendarEvent extends LectureOccurrence {
  /** True once the occurrence is over (relative to the page's `now`). */
  ended: boolean;
}

export interface LiveCalendarData {
  view: CalendarView;
  days: string[];
  /** For month view: the month the anchor is in ('YYYY-MM'), so days outside it can be muted. */
  month: string;
  today: string;
  nowIso: string;
  startHour: number;
  endHour: number;
  events: CalendarEvent[];
  lectures: CalendarLecture[];
}
