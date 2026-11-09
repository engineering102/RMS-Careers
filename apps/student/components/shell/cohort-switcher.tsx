'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Loader2 } from 'lucide-react';
import type { StudentBatchItem } from '@/lib/db/queries/entitlements';
import { setActiveCohortAction } from '@/lib/actions/cohort';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CohortSwitcherProps {
  activeBatches: StudentBatchItem[];
  activeCohort: StudentBatchItem | null;
  className?: string;
}

/**
 * The one place a student sees and changes their active batch (sidebar on desktop, "More" sheet on phones).
 * One batch: a plain label. Several: a select. None: a quiet note.
 */
export function CohortSwitcher({ activeBatches, activeCohort, className }: CohortSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelectCohort = (batchId: string) => {
    if (!batchId || batchId === activeCohort?.batchId) return;
    startTransition(async () => {
      const res = await setActiveCohortAction(batchId);
      if (res.success) router.refresh();
    });
  };

  if (!activeBatches || activeBatches.length === 0) {
    return <p className={cn('px-2.5 text-sm text-muted-foreground', className)}>No active batch</p>;
  }

  const current = activeCohort ?? activeBatches[0]!;

  if (activeBatches.length === 1) {
    return (
      <div className={cn('rounded-md border border-border bg-card px-2.5 py-2', className)}>
        <p className="truncate text-[13px] font-medium leading-snug text-foreground">{current.batchName}</p>
        <p className="truncate text-xs leading-snug text-muted-foreground">{current.programName}</p>
      </div>
    );
  }

  return (
    <Select value={current.batchId} onValueChange={handleSelectCohort} disabled={isPending}>
      <SelectTrigger
        className={cn('h-auto px-2.5 py-2 text-left hover:bg-accent sm:h-auto', className)}
        aria-label={`Active batch: ${current.batchName}. Switch batch`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-snug text-foreground">{current.batchName}</span>
          <span className="block truncate text-xs leading-snug text-muted-foreground">{current.programName}</span>
        </span>
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </SelectTrigger>
      <SelectContent>
        {activeBatches.map((batch) => (
          <SelectItem key={batch.batchId} value={batch.batchId}>
            <span className="flex flex-col py-0.5">
              <span className="font-medium">{batch.batchName}</span>
              <span className="text-xs text-muted-foreground">
                {batch.programName} · {batch.programCode}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
