'use client';

import { CalendarClock, ExternalLink, Repeat, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatLongDate, formatTimeRange } from '@/lib/live/calendar';
import type { CalendarEvent, CalendarLecture } from '@/lib/types/live-calendar';
import { eventTone } from './live-event-tones';

interface LectureDetailsDialogProps {
  event: CalendarEvent | null;
  lecture: CalendarLecture | null;
  onOpenChange: (open: boolean) => void;
}

/** Details of one lecture occurrence, opened from the calendar (like a Teams meeting card), with the Join link. */
export function LectureDetailsDialog({ event, lecture, onOpenChange }: LectureDetailsDialogProps) {
  const open = Boolean(event && lecture);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-0 overflow-y-auto rounded-lg p-0">
        {event && lecture && <DetailsBody event={event} lecture={lecture} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailsBody({ event, lecture }: { event: CalendarEvent; lecture: CalendarLecture }) {
  const tone = eventTone(lecture.tone);
  const canJoin = lecture.linkState === 'available' && lecture.joinUrl && !event.ended;

  return (
    <>
      <div className={`h-1.5 w-full ${tone.bar}`} aria-hidden="true" />
      <div className="space-y-4 p-5 pr-10">
        <div className="space-y-2">
          <DialogTitle className="text-lg leading-snug">{lecture.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-medium text-foreground">{formatLongDate(event.date)}</span>
                  <br />
                  {formatTimeRange(event.startMinutes, event.endMinutes)} IST
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Repeat className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{lecture.scheduleLabel}</span>
              </p>
            </div>
          </DialogDescription>
        </div>

        {lecture.description && <p className="whitespace-pre-line text-sm text-foreground">{lecture.description}</p>}

        {lecture.joiningInstructions && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Joining instructions</p>
            <p className="whitespace-pre-line">{lecture.joiningInstructions}</p>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-muted/30 px-5 py-4">
        {canJoin ? (
          <a
            href={lecture.joinUrl!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Join ${lecture.title} on Zoom (opens in new tab)`}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Video className="h-4 w-4" aria-hidden="true" />
            Join meeting
            <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">{unavailableMessage(lecture, event)}</p>
        )}
      </div>
    </>
  );
}

function unavailableMessage(lecture: CalendarLecture, event: CalendarEvent): string {
  if (lecture.linkState === 'read_only') return 'This batch is completed, so the meeting link is no longer shown.';
  if (lecture.linkState === 'ended' || event.ended) return 'This lecture has ended.';
  return 'Meeting link unavailable. Contact your coordinator.';
}
