import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ProblemRow, PROBLEM_GRID } from './problem-row';
import { patternAnchorId, percentOf, type PatternGroup, type ProgressMap } from '@/lib/dsa/sheet-view';
import type { DSAQuestion } from '@/lib/types/dsa';

interface PatternAccordionProps {
  sheetSlug: string;
  group: PatternGroup;
  isOpen: boolean;
  /** Search or filters are active: the header also says how many problems match. */
  filtering: boolean;
  progressMap: ProgressMap;
  savingSlug: string | null;
  onToggle: (pattern: string) => void;
  onSelect: (question: DSAQuestion) => void;
  onQuickSolve: (question: DSAQuestion) => void;
}

/** One pattern of a sheet: a disclosure header with the pattern's progress, and its problem rows. */
export function PatternAccordion({
  sheetSlug,
  group,
  isOpen,
  filtering,
  progressMap,
  savingSlug,
  onToggle,
  onSelect,
  onQuickSolve
}: PatternAccordionProps) {
  const anchorId = patternAnchorId(sheetSlug, group.pattern);
  const buttonId = `${anchorId}-header`;
  const panelId = `${anchorId}-panel`;
  const isComplete = group.totalCount > 0 && group.solvedCount === group.totalCount;
  const percent = percentOf(group.solvedCount, group.totalCount);

  return (
    <section id={anchorId} className="scroll-mt-24 border-t border-border first:border-t-0">
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={() => onToggle(group.pattern)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
            isOpen ? 'bg-secondary/40' : ''
          }`}
        >
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${
              isOpen ? 'rotate-90' : ''
            }`}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{group.pattern}</span>
            {filtering && (
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {group.questions.length} {group.questions.length === 1 ? 'match' : 'matches'}
              </span>
            )}
          </span>
          <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-secondary sm:block" aria-hidden>
            <span
              className={`block h-full rounded-full ${isComplete ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${percent}%` }}
            />
          </span>
          <span
            className={`shrink-0 text-right text-xs font-medium tabular-nums ${
              isComplete ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            {group.solvedCount} / {group.totalCount} solved
          </span>
        </button>
      </h3>

      {/* The panel stays in the DOM (hidden) so aria-controls always resolves; rows render only while open. */}
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen} className="px-2 pb-3 sm:px-4">
        {isOpen && (
          <div className="overflow-hidden rounded-lg border border-border bg-background/40">
            <div
              className={`${PROBLEM_GRID} hidden border-b border-border bg-secondary/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid`}
              aria-hidden
            >
              <span className="text-center">Status</span>
              <span>#</span>
              <span>Problem</span>
              <span className="text-center">Practice</span>
              <span className="text-center">Notes</span>
              <span className="text-center">Difficulty</span>
            </div>
            {group.questions.map((q) => (
              <ProblemRow
                key={q.slug}
                question={q}
                position={group.positions[q.slug]}
                progress={progressMap[q.slug]}
                isSaving={savingSlug === q.slug}
                onSelect={onSelect}
                onQuickSolve={onQuickSolve}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
