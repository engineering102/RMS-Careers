import React from 'react';
import { Check, ExternalLink, Link2, Loader2, NotebookPen } from 'lucide-react';
import type { DSAQuestion, StudentProblemProgress } from '@/lib/types/dsa';
import { formatDate } from '@/lib/format/datetime';

interface ProblemRowProps {
  question: DSAQuestion;
  /** 1-based position in the roadmap. */
  position?: number;
  progress?: StudentProblemProgress;
  isSaving?: boolean;
  onSelect: (question: DSAQuestion) => void;
  onQuickSolve: (question: DSAQuestion) => void;
}

export const DIFFICULTY_TEXT: Record<string, string> = {
  easy: 'text-success',
  medium: 'text-warning',
  hard: 'text-destructive'
};

/** Difficulty pill colours (shared with the sheet's legend). */
export const DIFFICULTY_PILL: Record<string, string> = {
  easy: 'border-success/30 bg-success/10 text-success',
  medium: 'border-warning/30 bg-warning/10 text-warning',
  hard: 'border-destructive/30 bg-destructive/10 text-destructive'
};

/** Shared column template so the header row and problem rows line up: status, #, problem, practice, notes, difficulty. */
export const PROBLEM_GRID =
  'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 md:grid-cols-[3rem_2.75rem_minmax(0,1fr)_4.5rem_4.5rem_5.5rem]';

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ProblemRow({ question, position, progress, isSaving = false, onSelect, onQuickSolve }: ProblemRowProps) {
  const isSolved = Boolean(progress?.isCompleted);
  const hasNotes = Boolean(progress?.notes);
  const submissionUrl = progress?.submissionUrl || null;

  return (
    <div
      className={`${PROBLEM_GRID} border-t border-border px-3 py-2.5 transition-colors first:border-t-0 hover:bg-secondary/60 ${
        isSolved ? 'bg-success/5' : ''
      }`}
    >
      {/* Status */}
      <div className="flex justify-center">
        {isSolved ? (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded border border-success bg-success text-success-foreground"
            role="img"
            aria-label="Solved"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onQuickSolve(question)}
            disabled={isSaving}
            aria-label={`Mark ${question.title} as solved`}
            title="Mark as solved"
            className="inline-flex h-5 w-5 items-center justify-center rounded border border-input bg-background transition-colors hover:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
          >
            {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </button>
        )}
      </div>

      {/* Roadmap position */}
      <span className="hidden text-xs tabular-nums text-muted-foreground md:block">
        {position !== undefined ? `#${position}` : ''}
      </span>

      {/* Problem */}
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onSelect(question)}
          className={`block max-w-full truncate text-left text-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:underline ${
            isSolved ? 'text-muted-foreground' : 'text-foreground'
          }`}
        >
          {question.title}
        </button>
        {/* Details that do not have their own column at this width (the pattern is the group heading) */}
        {(isSolved && progress?.completedAt) || position !== undefined ? (
          <p className="mt-0.5 flex min-w-0 items-center gap-x-2 text-xs text-muted-foreground">
            {position !== undefined && <span className="tabular-nums md:hidden">#{position}</span>}
            <span className={`shrink-0 font-medium capitalize md:hidden ${DIFFICULTY_TEXT[question.difficulty] ?? ''}`}>
              {question.difficulty}
            </span>
            {isSolved && progress?.completedAt && (
              <span className="shrink-0 text-success">
                Solved {formatDate(progress.completedAt, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </p>
        ) : null}
      </div>

      {/* Practice + solution links */}
      <div className="flex items-center justify-end gap-0.5 md:justify-center">
        {question.externalUrl ? (
          <a
            href={question.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={iconButton}
            aria-label={`Practice ${question.title} (opens in a new tab)`}
            title="Practice"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="hidden h-8 w-8 md:inline-block" aria-hidden />
        )}
        {submissionUrl && (
          <a
            href={submissionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${iconButton} text-primary md:hidden`}
            aria-label="Your solution (opens in a new tab)"
            title="Your solution"
          >
            <Link2 className="h-4 w-4" />
          </a>
        )}
        {/* Notes on small screens live next to the links */}
        <button
          type="button"
          onClick={() => onSelect(question)}
          className={`${iconButton} md:hidden ${hasNotes ? 'text-primary' : ''}`}
          aria-label={hasNotes ? 'View notes' : 'Add notes'}
        >
          <NotebookPen className="h-4 w-4" />
        </button>
      </div>

      {/* Notes */}
      <div className="hidden items-center justify-center gap-0.5 md:flex">
        <button
          type="button"
          onClick={() => onSelect(question)}
          className={`${iconButton} ${hasNotes ? 'text-primary' : ''}`}
          aria-label={hasNotes ? `View notes for ${question.title}` : `Add notes for ${question.title}`}
          title={hasNotes ? 'View notes' : 'Add notes'}
        >
          <NotebookPen className="h-4 w-4" />
        </button>
        {submissionUrl && (
          <a
            href={submissionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${iconButton} text-primary`}
            aria-label={`Your solution for ${question.title} (opens in a new tab)`}
            title="Your solution"
          >
            <Link2 className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Difficulty */}
      <div className="hidden justify-center md:flex">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
            DIFFICULTY_PILL[question.difficulty] ?? ''
          }`}
        >
          {question.difficulty}
        </span>
      </div>
    </div>
  );
}
