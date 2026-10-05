import React from 'react';
import { CheckCircle2, Circle, ExternalLink, FileText, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DSAQuestion, StudentProblemProgress } from '@/lib/types/dsa';

interface ProblemRowProps {
  question: DSAQuestion;
  progress?: StudentProblemProgress;
  onSelect: (question: DSAQuestion) => void;
}

export function ProblemRow({ question, progress, onSelect }: ProblemRowProps) {
  const isSolved = Boolean(progress?.isCompleted);
  const hasUrl = Boolean(progress?.submissionUrl);
  const hasNotes = Boolean(progress?.notes);

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
      case 'medium':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
      case 'hard':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
      default:
        return 'border-slate-700 bg-slate-800 text-slate-300';
    }
  };

  return (
    <div
      onClick={() => onSelect(question)}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all cursor-pointer"
    >
      {/* Left Column: Checkbox indicator, title, pattern */}
      <div className="flex items-start sm:items-center gap-3.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(question);
          }}
          className="mt-0.5 sm:mt-0 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0"
        >
          {isSolved ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 fill-emerald-500/20" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-semibold transition-colors ${
                isSolved ? 'text-slate-300 line-through decoration-slate-600' : 'text-slate-100 group-hover:text-blue-400'
              }`}
            >
              {question.title}
            </span>

            <Badge
              variant="outline"
              className={`text-[10px] py-0 px-1.5 font-medium capitalize ${getDifficultyBadge(
                question.difficulty
              )}`}
            >
              {question.difficulty}
            </Badge>

            <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700/40">
              {question.pattern}
            </span>
          </div>

          {/* Submission and notes indicators */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {hasUrl && (
              <span className="flex items-center gap-1 text-slate-400">
                <ExternalLink className="h-3 w-3 text-blue-400" />
                Solution linked
              </span>
            )}
            {hasNotes && (
              <span className="flex items-center gap-1 text-slate-400">
                <FileText className="h-3 w-3 text-cyan-400" />
                Notes saved
              </span>
            )}
            {isSolved && progress?.completedAt && (
              <span>
                Solved{' '}
                {new Date(progress.completedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Action Button */}
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className={`text-xs h-8 px-2.5 gap-1 ${
            isSolved
              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
          }`}
        >
          <span>{isSolved ? 'Review' : 'Solve'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
