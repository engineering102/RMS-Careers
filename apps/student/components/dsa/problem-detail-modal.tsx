'use client';

import React, { useState, useTransition, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Drawer } from 'vaul';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
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
  onSuccess?: (
    problemSlug: string,
    isNewlySolved: boolean,
    xpAwarded: number,
    details?: { submissionUrl: string | null; notes: string | null }
  ) => void;
}

export function ProblemDetailModal({
  question: requestedQuestion,
  progress: requestedProgress,
  batchId,
  onClose,
  onSuccess
}: ProblemDetailModalProps) {
  // The parent keeps this mounted and passes `question={null}` to close, so the last problem stays on screen
  // while the dialog animates out (state derived from props during render, React's documented pattern).
  const [question, setQuestion] = useState(requestedQuestion);
  const [progress, setProgress] = useState(requestedProgress);
  if (requestedQuestion && requestedQuestion !== question) setQuestion(requestedQuestion);
  if (requestedQuestion && requestedProgress !== progress) setProgress(requestedProgress);
  const isOpen = requestedQuestion !== null;
  // Phones get a bottom sheet (drag down to dismiss); wider screens keep the centred dialog.
  const isDesktop = useMediaQuery('(min-width: 640px)', true);

  const [submissionUrl, setSubmissionUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSolved = Boolean(progress?.isCompleted);

  // Reset the form only when a different problem opens; a progress update after saving must not wipe the
  // confirmation message or the fields the student just saved.
  const questionSlug = requestedQuestion?.slug;
  useEffect(() => {
    if (questionSlug) {
      setSubmissionUrl(progress?.submissionUrl || '');
      setNotes(progress?.notes || '');
      setFeedback(null);
      setShowHints(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionSlug]);

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
            onSuccess(question.slug, result.data.isNewlySolved, result.data.xpAwarded, {
              submissionUrl: submissionUrl.trim() || null,
              notes: notes.trim() || null
            });
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
        return 'border-success/30 bg-success/10 text-success';
      case 'medium':
        return 'border-warning/30 bg-warning/10 text-warning';
      case 'hard':
        return 'border-destructive/30 bg-destructive/10 text-destructive';
      default:
        return 'border-input bg-secondary text-foreground/80';
    }
  };

  // Radix Dialog: focus trap, Escape to close, scroll lock, and enter/exit animation (fade + scale from 0.97,
  // centred). Clicking the backdrop still does not close it, so typed notes are not lost by a stray click.
  // The same header and body render in both containers.
  const body = (
    <>
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border/80 bg-card sticky top-0 z-10">
              <div className="space-y-2 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-xs py-0.5 px-2 font-medium capitalize ${getDifficultyBadge(question.difficulty)}`}>
                    {question.difficulty}
                  </Badge>
                  <span className="rounded bg-secondary/80 px-2 py-0.5 text-xs font-medium text-foreground/80 border border-input/60">
                    {question.pattern}
                  </span>
                  {isSolved && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      Solved
                    </span>
                  )}
                </div>
                <DialogPrimitive.Title className="text-lg sm:text-xl font-bold text-foreground">{question.title}</DialogPrimitive.Title>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Problem Statement */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Problem Statement
                </h4>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                  {question.problemStatement}
                </p>
              </div>

              {/* Examples */}
              {question.examples && question.examples.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Examples
                  </h4>
                  <div className="space-y-2.5">
                    {question.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-background/60 border border-border text-xs font-mono space-y-1"
                      >
                        <p className="text-foreground/80"><span className="text-muted-foreground">Input:</span> {ex.input}</p>
                        <p className="text-success"><span className="text-muted-foreground">Output:</span> {ex.output}</p>
                        {ex.explanation && (
                          <p className="text-muted-foreground font-sans text-[11px] pt-1 border-t border-border/60">
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
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Constraints
                    </h4>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {question.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Complexity
                  </h4>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Time: <code className="text-primary">{question.timeComplexity}</code>
                    </span>
                    <span className="flex items-center gap-1.5 text-foreground/80">
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
                    className="text-xs border-input bg-secondary/80 hover:bg-accent text-foreground gap-1.5"
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
                <div className="border border-border rounded-lg p-3 bg-background/40">
                  <button
                    type="button"
                    onClick={() => setShowHints(!showHints)}
                    className="flex items-center justify-between w-full text-xs font-medium text-warning hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      {showHints ? 'Hide Hints & Approach' : 'Show Hints & Approach'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{showHints ? '▲' : '▼'}</span>
                  </button>
                  {showHints && (
                    <div className="mt-3 pt-2 border-t border-border space-y-2 text-xs text-foreground/80 animate-in fade-in-0 slide-in-from-top-1 duration-200 ease-out-quint motion-reduce:slide-in-from-top-0">
                      {question.hints.map((hint, i) => (
                        <p key={i} className="text-muted-foreground">💡 {hint}</p>
                      ))}
                      {question.approach && (
                        <div className="pt-1">
                          <p className="font-semibold text-foreground">Recommended Approach:</p>
                          <p className="text-muted-foreground mt-0.5">{question.approach}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submission Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-success" />
                  <span>Record Solution & Notes</span>
                </h4>

                <div className="space-y-1.5">
                  <label htmlFor="submissionUrl" className="text-xs font-medium text-foreground/80">
                    Submission URL <span className="text-muted-foreground font-normal">(optional — LeetCode, GitHub, or GFG link)</span>
                  </label>
                  <input
                    id="submissionUrl"
                    type="url"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="https://leetcode.com/submissions/detail/..."
                    className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-success"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="notes" className="text-xs font-medium text-foreground/80">
                    Revision Notes <span className="text-muted-foreground font-normal">(optional — key pattern, edge cases, learnings)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Used two pointers. Remember to check for array length <= 1 before loop..."
                    className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-success resize-none font-sans"
                  />
                </div>

                {feedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out-quint motion-reduce:slide-in-from-bottom-0 ${
                      feedback.isError
                        ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border border-success/30 bg-success/10 text-success'
                    }`}
                  >
                    {!feedback.isError && <Sparkles className="h-3.5 w-3.5 animate-pop motion-reduce:animate-none" />}
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground text-xs px-4 h-9 gap-1.5"
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
    </>
  );

  if (!isDesktop) {
    return (
      <Drawer.Root open={isOpen} onOpenChange={(next) => !next && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <Drawer.Content
            aria-describedby={undefined}
            onInteractOutside={(event) => event.preventDefault()}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border bg-card shadow-2xl outline-none"
          >
            <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/40" />
            {body}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150 ease-out-quint">
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onInteractOutside={(event) => event.preventDefault()}
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto focus:outline-none ease-out-quint data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97] data-[state=closed]:duration-150 motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100"
          >
            {body}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
