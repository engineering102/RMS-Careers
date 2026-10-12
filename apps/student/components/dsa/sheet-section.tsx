import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ProblemRow, PROBLEM_GRID } from './problem-row';
import { percentOf, type ProgressMap, type SheetView } from '@/lib/dsa/sheet-view';
import type { DSAQuestion } from '@/lib/types/dsa';

interface SheetSectionProps {
  view: SheetView;
  isOpen: boolean;
  progressMap: ProgressMap;
  savingSlug: string | null;
  onToggle: (slug: string) => void;
  onSelect: (question: DSAQuestion) => void;
  onQuickSolve: (question: DSAQuestion) => void;
}

export function SheetSection({
  view,
  isOpen,
  progressMap,
  savingSlug,
  onToggle,
  onSelect,
  onQuickSolve
}: SheetSectionProps) {
  const { sheet, questions, solvedCount, totalCount } = view;
  const percent = percentOf(solvedCount, totalCount);
  const panelId = `dsa-sheet-${sheet.slug}`;
  const isComplete = totalCount > 0 && solvedCount === totalCount;

  return (
    <section id={`topic-${sheet.slug}`} className="scroll-mt-24 border-t border-border first:border-t-0">
      <h2>
        <button
          type="button"
          onClick={() => onToggle(sheet.slug)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
            isOpen ? 'bg-secondary/40' : ''
          }`}
        >
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{sheet.title}</span>
            {isOpen && sheet.shortDescription && (
              <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                {sheet.shortDescription}
              </span>
            )}
          </span>
          <span
            className="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-secondary sm:block"
            aria-hidden
          >
            <span
              className={`block h-full rounded-full ${isComplete ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${percent}%` }}
            />
          </span>
          <span
            className={`w-12 shrink-0 text-right text-xs font-medium tabular-nums ${
              isComplete ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            <span className="sr-only">Solved </span>
            {solvedCount}/{totalCount}
          </span>
        </button>
      </h2>

      {isOpen && (
        <div id={panelId} className="px-2 pb-3 sm:px-4">
          <div className="overflow-hidden rounded-lg border border-border bg-background/40">
            <div
              className={`${PROBLEM_GRID} hidden border-b border-border bg-secondary/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid`}
              aria-hidden
            >
              <span className="text-center">Status</span>
              <span>Problem</span>
              <span className="hidden xl:block">Pattern</span>
              <span className="text-center">Practice</span>
              <span className="text-center">Notes</span>
              <span className="text-center">Difficulty</span>
            </div>
            {questions.map((q) => (
              <ProblemRow
                key={q.slug}
                question={q}
                progress={progressMap[q.slug]}
                isSaving={savingSlug === q.slug}
                onSelect={onSelect}
                onQuickSolve={onQuickSolve}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
