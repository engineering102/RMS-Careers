'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { SectionAccordion } from './section-accordion';
import { WeekNavigator } from './week-navigator';
import {
  currentWeekNumber,
  defaultOpenSections,
  groupWeekSections,
  initialWeekIndex,
  weekTopic,
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
  const safeIndex = Math.min(weekIndex, weeks.length - 1);
  const week = weeks[safeIndex];
  const sections = useMemo(() => groupWeekSections(week), [week]);
  const [openSections, setOpenSections] = useState<Set<WeekSectionKey>>(() => defaultOpenSections(sections));

  const sharedTopic = weekTopic(week);
  const allOpen = sections.length > 0 && sections.every((s) => openSections.has(s.key));
  const prevWeek = safeIndex > 0 ? weeks[safeIndex - 1] : null;
  const nextWeek = safeIndex < weeks.length - 1 ? weeks[safeIndex + 1] : null;

  const goToWeek = (index: number) => {
    const next = Math.min(Math.max(0, index), weeks.length - 1);
    if (next === safeIndex) return;
    setWeekIndex(next);
    setOpenSections(defaultOpenSections(groupWeekSections(weeks[next])));
    // Keep the week in the URL so a reload or shared link returns to it, without a server round-trip.
    const url = new URL(window.location.href);
    url.searchParams.set('week', String(weeks[next].weekNumber));
    window.history.replaceState(window.history.state, '', url);
  };

  const toggleSection = (key: WeekSectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <WeekNavigator
        weeks={weeks}
        weekIndex={safeIndex}
        currentWeek={currentWeek}
        onSelect={goToWeek}
        actions={
          <button
            type="button"
            onClick={() => setOpenSections(allOpen ? new Set() : new Set(sections.map((s) => s.key)))}
            aria-label={allOpen ? 'Collapse all sections' : 'Expand all sections'}
            title={allOpen ? 'Collapse all' : 'Expand all'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {allOpen ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
          </button>
        }
      />

      {/* key: remount on week change so the new week fades in instead of swapping rows in place */}
      <div key={week.weekNumber} className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
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

      {/* Previous / up next: the neighbouring weeks, named with their topic */}
      {(prevWeek || nextWeek) && (
        <div className="grid grid-cols-2 border-t border-border">
          {prevWeek ? <WeekLink week={prevWeek} direction="prev" onClick={() => goToWeek(safeIndex - 1)} /> : <span />}
          {nextWeek && <WeekLink week={nextWeek} direction="next" onClick={() => goToWeek(safeIndex + 1)} />}
        </div>
      )}
    </div>
  );
}

function WeekLink({ week, direction, onClick }: { week: CurriculumWeek; direction: 'prev' | 'next'; onClick: () => void }) {
  const topic = weekTopic(week);
  const isNext = direction === 'next';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 ${
        isNext ? 'col-start-2 justify-end border-l border-border text-right' : 'text-left'
      }`}
    >
      {!isNext && (
        <ArrowLeft
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      )}
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {isNext ? 'Up next' : 'Previous'}
        </span>
        <span className="block truncate text-sm font-semibold text-foreground">
          Week {week.weekNumber}
          {topic && <span className="hidden font-normal text-muted-foreground sm:inline"> · {topic}</span>}
        </span>
      </span>
      {isNext && (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      )}
    </button>
  );
}
