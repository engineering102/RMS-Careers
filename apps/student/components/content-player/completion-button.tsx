'use client';

import React, { useState, useTransition } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markLectureWatched } from '@/lib/actions/content';
import type { ContentType } from '@/lib/types/library';

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
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Completed</span>
          {completedAt && (
            <span className="text-[11px] font-normal text-emerald-400/80 border-l border-emerald-500/30 pl-2 ml-0.5">
              {new Date(completedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>
        {feedback && (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
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
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 h-9 gap-1.5 shadow-sm transition-all"
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
        <span className="text-xs text-amber-400 font-medium">
          {feedback}
        </span>
      )}
    </div>
  );
}
