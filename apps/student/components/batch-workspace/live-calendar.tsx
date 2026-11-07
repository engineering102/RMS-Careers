'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  dayOfMonth,
  formatHour,
  formatLongDate,
  formatMinutes,
  formatShortDate,
  formatTimeRange,
  layoutDay,
  weekdayShort
} from '@/lib/live/calendar';
import type { CalendarEvent, CalendarLecture, LiveCalendarData } from '@/lib/types/live-calendar';
import { LectureDetailsDialog } from './lecture-details-dialog';
import { eventTone } from './live-event-tones';

const HOUR_PX = 56;
const PX_PER_MINUTE = HOUR_PX / 60;
const MIN_BLOCK_PX = 22;
const MONTH_CHIPS = 3;
const IST_OFFSET_MINUTES = 5 * 60 + 30;

interface LiveCalendarProps extends LiveCalendarData {
  /** The Live Lectures page path; month-view day numbers and "+N more" link to `?view=day&date=…` on it. */
  dayHrefBase: string;
}

/**
 * Teams-style calendar of a batch's live lectures. Desktop: a time grid (day / week) or month grid; phones: an agenda
 * list of the same range. Selecting a lecture opens its details with the Join link.
 */
export function LiveCalendar(props: LiveCalendarProps) {
  const { view, days, month, today, nowIso, startHour, endHour, events, lectures, dayHrefBase } = props;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const now = useNow(nowIso);

  const lectureById = useMemo(() => new Map(lectures.map((l) => [l.id, l])), [lectures]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [events]);

  const selected = events.find((e) => e.key === selectedKey) ?? null;
  const selectedLecture = selected ? (lectureById.get(selected.sessionId) ?? null) : null;
  const dayHref = (date: string) => `${dayHrefBase}?view=day&date=${date}`;
  const select = (key: string) => setSelectedKey(key);

  return (
    <>
      <div className="hidden md:block">
        {view === 'month' ? (
          <MonthGrid
            days={days}
            month={month}
            today={today}
            eventsByDay={eventsByDay}
            lectureById={lectureById}
            onSelect={select}
            dayHref={dayHref}
          />
        ) : (
          <TimeGrid
            days={days}
            today={today}
            now={now}
            startHour={startHour}
            endHour={endHour}
            eventsByDay={eventsByDay}
            lectureById={lectureById}
            onSelect={select}
            emptyLabel={view === 'day' ? 'No live lectures on this day' : 'No live lectures this week'}
          />
        )}
      </div>

      <div className="md:hidden">
        <Agenda
          days={days}
          today={today}
          eventsByDay={eventsByDay}
          lectureById={lectureById}
          onSelect={select}
          emptyLabel={`No live lectures this ${view}.`}
        />
      </div>

      <LectureDetailsDialog
        event={selected}
        lecture={selectedLecture}
        onOpenChange={(open) => {
          if (!open) setSelectedKey(null);
        }}
      />
    </>
  );
}

/** The server's `now`, ticking every minute on the client so the current-time line moves. */
function useNow(nowIso: string): Date {
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function istMinutesOfDay(instant: Date): number {
  const minutes = Math.floor(instant.getTime() / 60_000) + IST_OFFSET_MINUTES;
  return ((minutes % 1440) + 1440) % 1440;
}

function eventLabel(lecture: CalendarLecture, event: CalendarEvent): string {
  const state = event.ended ? ', ended' : '';
  return `${lecture.title}, ${formatShortDate(event.date)}, ${formatTimeRange(event.startMinutes, event.endMinutes)} IST${state}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Day / week time grid
// ---------------------------------------------------------------------------------------------------------------

interface GridProps {
  days: string[];
  today: string;
  eventsByDay: Map<string, CalendarEvent[]>;
  lectureById: Map<string, CalendarLecture>;
  onSelect: (key: string) => void;
}

function TimeGrid({
  days,
  today,
  now,
  startHour,
  endHour,
  eventsByDay,
  lectureById,
  onSelect,
  emptyLabel
}: GridProps & { now: Date; startHour: number; endHour: number; emptyLabel: string }) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = hours.length * HOUR_PX;
  const columns = { gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` };
  const nowMinutes = istMinutesOfDay(now);
  const nowTop = (nowMinutes - startHour * 60) * PX_PER_MINUTE;
  const showNow = days.includes(today) && nowTop >= 0 && nowTop <= height;
  const isEmpty = days.every((d) => !eventsByDay.get(d)?.length);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Day headers */}
      <div className="grid border-b border-border" style={columns}>
        <div className="flex items-end justify-center pb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          IST
        </div>
        {days.map((date) => {
          const isToday = date === today;
          return (
            <div
              key={date}
              className={cn('border-l border-border px-3 py-2', isToday && 'bg-primary/5')}
              aria-current={isToday ? 'date' : undefined}
            >
              <p className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>{weekdayShort(date)}</p>
              <p
                className={cn(
                  'mt-0.5 inline-flex h-8 min-w-8 items-center justify-center text-xl font-semibold tabular-nums',
                  isToday ? 'rounded-full bg-primary px-2 text-primary-foreground' : 'text-foreground'
                )}
              >
                {dayOfMonth(date)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hours */}
      <div className="relative grid" style={{ ...columns, height }}>
        <div className="relative" aria-hidden="true">
          {hours.map((hour, i) =>
            i === 0 ? null : (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                style={{ top: i * HOUR_PX }}
              >
                {formatHour(hour)}
              </span>
            )
          )}
        </div>

        {days.map((date) => {
          const isToday = date === today;
          const placed = layoutDay(eventsByDay.get(date) ?? []);
          return (
            <div key={date} className={cn('relative border-l border-border', isToday && 'bg-primary/[0.03]')}>
              {hours.map((hour, i) => (
                <div key={hour} aria-hidden="true">
                  {i > 0 && <div className="absolute inset-x-0 border-t border-border" style={{ top: i * HOUR_PX }} />}
                  <div className="absolute inset-x-0 border-t border-dashed border-border/50" style={{ top: i * HOUR_PX + HOUR_PX / 2 }} />
                </div>
              ))}

              {placed.map(({ item: event, lane, lanes }) => {
                const lecture = lectureById.get(event.sessionId);
                if (!lecture) return null;
                const tone = eventTone(lecture.tone);
                const top = Math.max(0, (event.startMinutes - startHour * 60) * PX_PER_MINUTE);
                const bottom = Math.min(height, (event.endMinutes - startHour * 60) * PX_PER_MINUTE);
                const blockHeight = Math.max(MIN_BLOCK_PX, bottom - top);
                const compact = blockHeight < 44;
                return (
                  <button
                    key={event.key}
                    type="button"
                    onClick={() => onSelect(event.key)}
                    aria-label={eventLabel(lecture, event)}
                    className={cn(
                      'absolute overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left text-foreground shadow-sm transition-colors focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      tone.block,
                      event.ended && 'opacity-55'
                    )}
                    style={{
                      top,
                      height: blockHeight,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`
                    }}
                  >
                    <span className="block truncate text-xs font-semibold">{lecture.title}</span>
                    {!compact && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {formatTimeRange(event.startMinutes, event.endMinutes)}
                      </span>
                    )}
                  </button>
                );
              })}

              {isToday && showNow && (
                <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }} aria-hidden="true">
                  <div className="relative border-t-2 border-destructive">
                    <span className="absolute -left-1.5 -top-[7px] h-3 w-3 rounded-full bg-destructive" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pl-16 text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------------------------------------------

function MonthGrid({
  days,
  month,
  today,
  eventsByDay,
  lectureById,
  onSelect,
  dayHref
}: GridProps & { month: string; dayHref: (date: string) => string }) {
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {days.slice(0, 7).map((date) => (
          <div key={date} className="border-l border-border px-3 py-2 text-xs font-medium text-muted-foreground first:border-l-0">
            {weekdayShort(date)}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7 border-b border-border last:border-b-0">
          {week.map((date) => {
            const dayEvents = eventsByDay.get(date) ?? [];
            const inMonth = date.startsWith(month);
            const isToday = date === today;
            const hidden = dayEvents.length - MONTH_CHIPS;
            return (
              <div
                key={date}
                className={cn(
                  'min-h-[7.5rem] space-y-1 border-l border-border p-1.5 first:border-l-0',
                  !inMonth && 'bg-muted/30',
                  isToday && 'bg-primary/5'
                )}
                aria-current={isToday ? 'date' : undefined}
              >
                <Link
                  href={dayHref(date)}
                  aria-label={`Open ${formatLongDate(date)}`}
                  className={cn(
                    'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isToday ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90' : inMonth ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {dayOfMonth(date)}
                </Link>
                {dayEvents.slice(0, MONTH_CHIPS).map((event) => {
                  const lecture = lectureById.get(event.sessionId);
                  if (!lecture) return null;
                  const tone = eventTone(lecture.tone);
                  return (
                    <button
                      key={event.key}
                      type="button"
                      onClick={() => onSelect(event.key)}
                      aria-label={eventLabel(lecture, event)}
                      className={cn(
                        'flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        event.ended && 'opacity-55'
                      )}
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
                      <span className="shrink-0 tabular-nums text-muted-foreground">{formatMinutes(event.startMinutes)}</span>
                      <span className="truncate font-medium text-foreground">{lecture.title}</span>
                    </button>
                  );
                })}
                {hidden > 0 && (
                  <Link
                    href={dayHref(date)}
                    className="block rounded px-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    +{hidden} more
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Agenda (phones)
// ---------------------------------------------------------------------------------------------------------------

function Agenda({ days, today, eventsByDay, lectureById, onSelect, emptyLabel }: GridProps & { emptyLabel: string }) {
  const withEvents = days.filter((d) => eventsByDay.get(d)?.length);
  if (withEvents.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ol className="space-y-5">
      {withEvents.map((date) => (
        <li key={date} className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {formatShortDate(date)}
            {date === today && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Today
              </span>
            )}
          </h3>
          <ul className="space-y-2">
            {(eventsByDay.get(date) ?? []).map((event) => {
              const lecture = lectureById.get(event.sessionId);
              if (!lecture) return null;
              const tone = eventTone(lecture.tone);
              return (
                <li key={event.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(event.key)}
                    aria-label={eventLabel(lecture, event)}
                    className={cn(
                      'flex min-h-[44px] w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      tone.block,
                      event.ended && 'opacity-55'
                    )}
                  >
                    <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{formatMinutes(event.startMinutes)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{lecture.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatTimeRange(event.startMinutes, event.endMinutes)} IST{event.ended ? ' · Ended' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
