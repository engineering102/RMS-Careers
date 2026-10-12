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
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3.5 py-2 text-xs font-semibold text-success">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>Completed</span>
          {completedAt && (
            <span className="text-[11px] font-normal text-success/80 border-l border-success/30 pl-2 ml-0.5">
              {formatDate(completedAt, {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>
        {feedback && (
          <span className="text-xs text-success font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
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
        size="sm"
        className="bg-success hover:bg-success/90 text-success-foreground font-medium text-xs px-4 h-9 gap-1.5 shadow-sm transition-all"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{actionLabel}</span>
          </>
        )}
      </Button>

      {feedback && (
        <span className="text-xs text-warning font-medium">
          {feedback}
        </span>
      )}
    </div>
  );
}
