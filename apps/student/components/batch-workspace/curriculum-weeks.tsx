'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionAccordion } from './section-accordion';
import {
  currentWeekNumber,
  defaultOpenSections,
  groupWeekSections,
  initialWeekIndex,
  type WeekSectionKey
} from '@/lib/batch-workspace/week-pages';
import type { CurriculumWeek } from '@/lib/types/batch-workspace';

interface CurriculumWeeksProps {
  weeks: CurriculumWeek[];
  /** `?week=` from the URL; falls back to the student's current week when absent or unknown. */
  requestedWeek?: number | null;
}

/** The weekly curriculum, one week per page, each split into collapsible content-type sections. */
export function CurriculumWeeks({ weeks, requestedWeek }: CurriculumWeeksProps) {
  const currentWeek = useMemo(() => currentWeekNumber(weeks), [weeks]);
  const [weekIndex, setWeekIndex] = useState(() => initialWeekIndex(weeks, requestedWeek));
  const week = weeks[Math.min(weekIndex, weeks.length - 1)];
  const sections = useMemo(() => groupWeekSections(week), [week]);
  const [openSections, setOpenSections] = useState<Set<WeekSectionKey>>(() => defaultOpenSections(sections));
  const stripRef = useRef<HTMLDivElement>(null);

  // A topic shared by every item is shown once under the week title instead of on each row.
  const topics = new Set(week.items.map((item) => item.metadata.topic || ''));
  const sharedTopic = topics.size === 1 ? [...topics][0] : '';
  const isWeekComplete = week.totalCount > 0 && week.completedCount === week.totalCount;
  const weekPercent = week.totalCount > 0 ? Math.round((week.completedCount / week.totalCount) * 100) : 0;
  const allOpen = sections.length > 0 && sections.every((s) => openSections.has(s.key));

  const goToWeek = (index: number) => {
    const next = Math.min(Math.max(0, index), weeks.length - 1);
    if (next === weekIndex) return;
    setWeekIndex(next);
    setOpenSections(defaultOpenSections(groupWeekSections(weeks[next])));
    // Keep the week in the URL so a reload or shared link returns to it, without a server round-trip.
    const url = new URL(window.location.href);
    url.searchParams.set('week', String(weeks[next].weekNumber));
    window.history.replaceState(window.history.state, '', url);
  };

  // Keep the selected week's chip in view in the scrollable strip (horizontally only, never scrolling the page).
  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!strip || !chip) return;
    const left = chip.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = left - (strip.clientWidth - chip.offsetWidth) / 2;
    }
  }, [weekIndex]);

  const toggleSection = (key: WeekSectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Week strip: one chip per week, a check once the week is done */}
      {weeks.length > 1 && (
        <nav aria-label="Curriculum weeks">
          <div ref={stripRef} className="flex gap-1.5 overflow-x-auto pb-1">
            {weeks.map((w, idx) => {
              const done = w.totalCount > 0 && w.completedCount === w.totalCount;
              const selected = idx === weekIndex;
              return (
                <button
                  key={w.weekNumber}
                  type="button"
                  onClick={() => goToWeek(idx)}
                  aria-current={selected ? 'step' : undefined}
                  aria-label={`Week ${w.weekNumber}${done ? ', completed' : ''}${w.weekNumber === currentWeek ? ', current' : ''}`}
                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-3 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : done
                      ? 'border-success/30 bg-success/5 text-success hover:bg-success/10'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  {done && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                  W{w.weekNumber}
                  {w.weekNumber === currentWeek && !selected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* The selected week */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">Week {week.weekNumber}</h2>
              {week.weekNumber === currentWeek && !isWeekComplete && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                  Current
                </span>
              )}
              {isWeekComplete && (
                <span className="rounded-full border border-success/30 bg-success/10 px-1.5 text-[10px] font-semibold text-success">
                  Completed
                </span>
              )}
            </div>
            {sharedTopic && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sharedTopic}</p>}
          </div>

          <div className="flex items-center gap-3">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <span
                className={`block h-full rounded-full ${isWeekComplete ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${weekPercent}%` }}
              />
            </span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {week.completedCount} / {week.totalCount} done
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setOpenSections(allOpen ? new Set() : new Set(sections.map((s) => s.key)))}
              aria-label={allOpen ? 'Collapse all sections' : 'Expand all sections'}
              title={allOpen ? 'Collapse all' : 'Expand all'}
            >
              {allOpen ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {sections.map((section) => (
          <SectionAccordion
            key={section.key}
            weekNumber={week.weekNumber}
            section={section}
            isOpen={openSections.has(section.key)}
            hideTopic={Boolean(sharedTopic)}
            onToggle={toggleSection}
          />
        ))}
      </div>

      {/* Previous / next week */}
      {weeks.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={weekIndex <= 0}
            onClick={() => goToWeek(weekIndex - 1)}
            className="gap-1.5 text-xs"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {weekIndex > 0 ? `Week ${weeks[weekIndex - 1].weekNumber}` : 'Previous'}
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {weekIndex + 1} of {weeks.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={weekIndex >= weeks.length - 1}
            onClick={() => goToWeek(weekIndex + 1)}
            className="gap-1.5 text-xs"
          >
            {weekIndex < weeks.length - 1 ? `Week ${weeks[weekIndex + 1].weekNumber}` : 'Next'}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
