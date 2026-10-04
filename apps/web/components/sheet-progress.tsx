'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { getAnonymousSolvedCount } from '@/lib/client/anonymous-progress';

export function SheetProgressBadge({
  sheetSlug,
  totalQuestions
}: {
  sheetSlug: string;
  totalQuestions: number;
}) {
  const [solvedCount, setSolvedCount] = useState<number | null>(null);

  useEffect(() => {
    // Read count on client mount to avoid SSR hydration mismatch
    const update = () => {
      setSolvedCount(getAnonymousSolvedCount(sheetSlug));
    };

    update();
    window.addEventListener('rms:anonymous-progress-updated', update);
    return () => window.removeEventListener('rms:anonymous-progress-updated', update);
  }, [sheetSlug]);

  if (solvedCount === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Circle className="h-3.5 w-3.5" />
        <span>0 / {totalQuestions} solved</span>
      </span>
    );
  }

  const isComplete = solvedCount === totalQuestions && totalQuestions > 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        isComplete
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : solvedCount > 0
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {isComplete ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Circle className="h-3.5 w-3.5" />
      )}
      <span>
        {solvedCount} / {totalQuestions} solved locally
      </span>
    </span>
  );
}
