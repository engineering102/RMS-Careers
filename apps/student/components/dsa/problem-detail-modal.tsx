'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ExternalLink,
  Loader2,
  FileText,
  Lightbulb,
  Clock,
  Database,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { recordDsaProblemSolved } from '@/lib/actions/dsa';
import type { DSAQuestion, StudentProblemProgress } from '@/lib/types/dsa';

interface ProblemDetailModalProps {
  question: DSAQuestion | null;
  progress: StudentProblemProgress | undefined;
  batchId?: string;
  onClose: () => void;
  onSuccess?: (problemSlug: string, isNewlySolved: boolean, xpAwarded: number) => void;
}

export function ProblemDetailModal({
  question,
  progress,
  batchId,
  onClose,
  onSuccess
}: ProblemDetailModalProps) {
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSolved = Boolean(progress?.isCompleted);

  useEffect(() => {
    if (question) {
      setSubmissionUrl(progress?.submissionUrl || '');
      setNotes(progress?.notes || '');
      setFeedback(null);
      setShowHints(false);
    }
  }, [question, progress]);

  if (!question) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await recordDsaProblemSolved({
          problemSlug: question.slug,
          submissionUrl,
          notes,
          batchId
        });

        if (result.success) {
          setFeedback({
            text: result.message || (isSolved ? 'Details updated!' : 'Marked as solved!'),
            isError: false
          });
          if (onSuccess && result.data) {
            onSuccess(question.slug, result.data.isNewlySolved, result.data.xpAwarded);
          }
        } else {
          setFeedback({
            text: result.error || 'Failed to record progress.',
            isError: true
          });
        }
      } catch {
        setFeedback({
          text: 'An error occurred while communicating with the server.',
          isError: true
        });
      }
    });
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-slate-900/80 sticky top-0 z-10">
          <div className="space-y-2 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`text-xs py-0.5 px-2 font-medium capitalize ${getDifficultyBadge(question.difficulty)}`}>
                {question.difficulty}
              </Badge>
              <span className="rounded bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-700/60">
                {question.pattern}
              </span>
              {isSolved && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3" />
                  Solved
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">{question.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Problem Statement */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Problem Statement
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {question.problemStatement}
            </p>
          </div>

          {/* Examples */}
          {question.examples && question.examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Examples
              </h4>
              <div className="space-y-2.5">
                {question.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1"
                  >
                    <p className="text-slate-300"><span className="text-slate-500">Input:</span> {ex.input}</p>
                    <p className="text-emerald-400"><span className="text-slate-500">Output:</span> {ex.output}</p>
                    {ex.explanation && (
                      <p className="text-slate-400 font-sans text-[11px] pt-1 border-t border-slate-800/60">
                        {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constraints & Complexity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {question.constraints && question.constraints.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Constraints
                </h4>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                  {question.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Complexity
              </h4>
              <div className="flex flex-col gap-1 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  Time: <code className="text-blue-300">{question.timeComplexity}</code>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                  Space: <code className="text-cyan-300">{question.spaceComplexity}</code>
                </span>
              </div>
            </div>
          </div>

          {/* Practice External Link */}
          {question.externalUrl && (
            <div className="pt-1">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 gap-1.5"
              >
                <a href={question.externalUrl} target="_blank" rel="noopener noreferrer">
                  <span>Open on LeetCode</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          )}

          {/* Hints Toggle */}
          {question.hints && question.hints.length > 0 && (
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowHints(!showHints)}
                className="flex items-center justify-between w-full text-xs font-medium text-amber-300 hover:text-amber-200"
              >
                <span className="flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  {showHints ? 'Hide Hints & Approach' : 'Show Hints & Approach'}
                </span>
                <span className="text-[11px] text-slate-500">{showHints ? '▲' : '▼'}</span>
              </button>
              {showHints && (
                <div className="mt-3 pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                  {question.hints.map((hint, i) => (
                    <p key={i} className="text-slate-400">💡 {hint}</p>
                  ))}
                  {question.approach && (
                    <div className="pt-1">
                      <p className="font-semibold text-slate-200">Recommended Approach:</p>
                      <p className="text-slate-400 mt-0.5">{question.approach}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>Record Solution & Notes</span>
            </h4>

            <div className="space-y-1.5">
              <label htmlFor="submissionUrl" className="text-xs font-medium text-slate-300">
                Submission URL <span className="text-slate-500 font-normal">(optional — LeetCode, GitHub, or GFG link)</span>
              </label>
              <input
                id="submissionUrl"
                type="url"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                placeholder="https://leetcode.com/submissions/detail/..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-xs font-medium text-slate-300">
                Revision Notes <span className="text-slate-500 font-normal">(optional — key pattern, edge cases, learnings)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. Used two pointers. Remember to check for array length <= 1 before loop..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
              />
            </div>

            {feedback && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  feedback.isError
                    ? 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
                    : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {!feedback.isError && <Sparkles className="h-3.5 w-3.5" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 h-9 gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isSolved ? 'Update Notes & Submission' : 'Mark as Solved'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
