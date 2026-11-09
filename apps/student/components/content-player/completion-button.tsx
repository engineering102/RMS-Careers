'use client';

import React, { useState, useTransition } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markLectureWatched } from '@/lib/actions/content';
import type { ContentType } from '@/lib/types/library';
import { formatDate } from '@/lib/format/datetime';

interface CompletionButtonProps {
  contentItemId: string;
  contentType: ContentType;
  initialCompleted: boolean;
  completedAt: Date | null;
  batchId?: string;
}

export function CompletionButton({
  contentItemId,
  contentType,
  initialCompleted,
  completedAt,
  batchId
}: CompletionButtonProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const actionLabel = contentType === 'lecture' ? 'Mark as Watched' : 'Mark as Completed';

  const handleMarkCompleted = () => {
    if (isCompleted || isPending) return;

    startTransition(async () => {
      try {
        const result = await markLectureWatched(contentItemId, batchId);
        if (result.success) {
          setIsCompleted(true);
          setFeedback(result.message || 'Completed!');
        } else {
          setFeedback(result.error || 'Failed to update progress.');
        }
      } catch {
        setFeedback('Network error. Please try again.');
      }
    });
  };

  if (isCompleted) {
    // Reward moment: the badge settles in and the check pops, only when completed during this visit.
    const justCompleted = !initialCompleted;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div
          className={`inline-flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success ${
            justCompleted
              ? 'animate-in fade-in-0 zoom-in-[0.96] duration-250 ease-out-quint motion-reduce:zoom-in-100'
              : ''
          }`}
        >
          <CheckCircle2
            className={`h-4 w-4 text-success ${justCompleted ? 'animate-pop motion-reduce:animate-none' : ''}`}
          />
          <span>Completed</span>
          {completedAt && (
            <span className="tabular ml-0.5 border-l border-success/30 pl-2 font-normal text-success/80">
              {formatDate(completedAt, {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>
        {feedback && (
          <span className="text-sm font-medium text-success animate-in fade-in-0 slide-in-from-bottom-1 duration-200 delay-75 fill-mode-both ease-out-quint motion-reduce:slide-in-from-bottom-0">
            {feedback}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleMarkCompleted}
        disabled={isPending}
        className="gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Saving…</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{actionLabel}</span>
          </>
        )}
      </Button>

      {feedback && (
        <span role="alert" className="text-sm font-medium text-destructive">
          {feedback}
        </span>
      )}
    </div>
  );
}
