'use client';

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProgressRing } from './progress-ring';
import { weekState, weekTopic, type WeekState } from '@/lib/batch-workspace/week-pages';
import type { CurriculumWeek } from '@/lib/types/batch-workspace';

interface WeekNavigatorProps {
  weeks: CurriculumWeek[];
  weekIndex: number;
  currentWeek: number | null;
  onSelect: (index: number) => void;
  /** Extra controls on the right of the header (e.g. expand/collapse all). */
  actions?: React.ReactNode;
}

const percentOf = (w: CurriculumWeek) => (w.totalCount > 0 ? Math.round((w.completedCount / w.totalCount) * 100) : 0);

const STATE_LABEL: Record<WeekState, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  not_started: 'Not started',
  locked: 'Locked'
};

const RAIL_FILL: Record<WeekState, string> = {
  completed: 'bg-success',
  in_progress: 'bg-primary',
  not_started: 'bg-transparent',
  locked: 'bg-transparent'
};

const iconButton =
  'inline-flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

/**
 * Header of the selected week: progress ring, a week picker (dropdown listing every week with its progress),
 * previous/next arrows, and a segmented rail showing each week's completion that also jumps between weeks.
 */
export function WeekNavigator({ weeks, weekIndex, currentWeek, onSelect, actions }: WeekNavigatorProps) {
  const week = weeks[weekIndex];
  const state = weekState(week);
  const topic = weekTopic(week);
  const percent = percentOf(week);
  const isCurrent = week.weekNumber === currentWeek;
  const hasMany = weeks.length > 1;

  return (
    <div className="border-b border-border bg-gradient-to-b from-secondary/40 to-transparent px-4 pb-4 pt-4 sm:px-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <ProgressRing percent={percent} size={48} strokeWidth={3.5} complete={state === 'completed'}>
          {state === 'completed' ? (
            <Check className="h-4 w-4 text-success" strokeWidth={3} />
          ) : (
            <span className="text-[11px] font-semibold tabular-nums text-foreground">{percent}%</span>
          )}
        </ProgressRing>

        {/* Week picker */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="tabular-nums">
              Week {weekIndex + 1} of {weeks.length}
            </span>
            {isCurrent && state !== 'completed' && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 text-[10px] normal-case tracking-normal text-primary">
                Current
              </span>
            )}
            {state === 'completed' && (
              <span className="rounded-full border border-success/30 bg-success/10 px-1.5 text-[10px] normal-case tracking-normal text-success">
                Completed
              </span>
            )}
          </div>

          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger
              disabled={!hasMany}
              className="group -ml-1.5 mt-0.5 flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
              aria-label={`Week ${week.weekNumber}${topic ? `: ${topic}` : ''}. Choose a week`}
            >
              <h2 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                Week {week.weekNumber}
                {topic && <span className="font-medium text-muted-foreground"> · {topic}</span>}
              </h2>
              {hasMany && (
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  aria-hidden
                />
              )}
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={8}
                className="z-50 max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/20 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              >
                <DropdownMenu.Label className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Curriculum weeks
                </DropdownMenu.Label>
                <DropdownMenu.RadioGroup
                  value={String(weekIndex)}
                  onValueChange={(value) => onSelect(Number(value))}
                >
                  {weeks.map((w, idx) => {
                    const wState = weekState(w);
                    const wTopic = weekTopic(w);
                    return (
                      <DropdownMenu.RadioItem
                        key={w.weekNumber}
                        value={String(idx)}
                        className="flex cursor-pointer select-none items-center gap-3 rounded-lg px-2 py-2 outline-none transition-colors data-[highlighted]:bg-secondary data-[state=checked]:bg-primary/10"
                      >
                        <ProgressRing percent={percentOf(w)} size={30} strokeWidth={2.5} complete={wState === 'completed'}>
                          {wState === 'completed' ? (
                            <Check className="h-3 w-3 text-success" strokeWidth={3} />
                          ) : wState === 'locked' ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <span className="text-[10px] font-semibold tabular-nums text-foreground">{w.weekNumber}</span>
                          )}
                        </ProgressRing>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            Week {w.weekNumber}
                            {w.weekNumber === currentWeek && wState !== 'completed' && (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Current week" />
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {wTopic || STATE_LABEL[wState]}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {w.completedCount}/{w.totalCount}
                        </span>
                      </DropdownMenu.RadioItem>
                    );
                  })}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasMany && (
            <div className="flex overflow-hidden rounded-lg border border-border bg-card">
              <button
                type="button"
                className={iconButton}
                onClick={() => onSelect(weekIndex - 1)}
                disabled={weekIndex <= 0}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="w-px bg-border" aria-hidden />
              <button
                type="button"
                className={iconButton}
                onClick={() => onSelect(weekIndex + 1)}
                disabled={weekIndex >= weeks.length - 1}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {actions}
        </div>
      </div>

      {/* Journey rail: one segment per week, filled by state; the selected week is raised */}
      {hasMany && (
        <TooltipProvider delayDuration={100}>
          <nav aria-label="Curriculum weeks" className="mt-4 flex items-center gap-1">
            {weeks.map((w, idx) => {
              const wState = weekState(w);
              const selected = idx === weekIndex;
              const wTopic = weekTopic(w);
              return (
                <Tooltip key={w.weekNumber}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelect(idx)}
                      aria-current={selected ? 'step' : undefined}
                      aria-label={`Week ${w.weekNumber}, ${STATE_LABEL[wState].toLowerCase()}`}
                      className="group flex h-5 min-w-[6px] flex-1 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={`relative block w-full overflow-hidden rounded-full transition-all motion-reduce:transition-none ${
                          selected
                            ? 'h-2 bg-secondary ring-2 ring-primary/40 ring-offset-1 ring-offset-card'
                            : 'h-1.5 bg-secondary group-hover:h-2'
                        }`}
                      >
                        <span
                          className={`absolute inset-y-0 left-0 rounded-full ${RAIL_FILL[wState]}`}
                          style={{ width: wState === 'in_progress' ? `${percentOf(w)}%` : wState === 'completed' ? '100%' : '0%' }}
                        />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span className="font-semibold">Week {w.weekNumber}</span>
                    {wTopic && <span className="text-muted-foreground"> · {wTopic}</span>}
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      {w.completedCount}/{w.totalCount}
                    </span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>
      )}
    </div>
  );
}
