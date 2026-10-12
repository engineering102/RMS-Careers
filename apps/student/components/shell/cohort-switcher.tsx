'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Check, ChevronDown, Loader2 } from 'lucide-react';
import type { StudentBatchItem } from '@/lib/db/queries/entitlements';
import { setActiveCohortAction } from '@/lib/actions/cohort';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CohortSwitcherProps {
  activeBatches: StudentBatchItem[];
  activeCohort: StudentBatchItem | null;
  variant?: 'header' | 'sidebar';
  className?: string;
}

export function CohortSwitcher({
  activeBatches,
  activeCohort,
  variant = 'header',
  className
}: CohortSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelectCohort = (batchId: string) => {
    if (!batchId || batchId === activeCohort?.batchId) return;

    startTransition(async () => {
      const res = await setActiveCohortAction(batchId);
      if (res.success) {
        router.refresh();
      }
    });
  };

  // State 1: No active cohorts assigned
  if (!activeBatches || activeBatches.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs text-warning',
          className
        )}
      >
        <span>No Active Batch</span>
      </div>
    );
  }

  // State 2: Exactly 1 active cohort (Static presentation, no unnecessary switcher)
  if (activeBatches.length === 1) {
    const singleBatch = activeBatches[0];
    if (variant === 'sidebar') {
      return (
        <div className={cn('space-y-1', className)}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground truncate">{singleBatch.batchName}</p>
            <span
              className="flex h-2 w-2 shrink-0 rounded-full bg-success ring-2 ring-success/20"
              title="Active Cohort"
            />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{singleBatch.programName}</p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'hidden sm:flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary',
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <span className="font-medium truncate max-w-[200px]">{singleBatch.batchName}</span>
      </div>
    );
  }

  // State 3: Multiple active cohorts (Interactive Cohort Switcher)
  const currentBatchId = activeCohort?.batchId || activeBatches[0].batchId;

  if (variant === 'sidebar') {
    return (
      <div className={cn('space-y-1.5', className)}>
        <Select
          value={currentBatchId}
          onValueChange={handleSelectCohort}
          disabled={isPending}
        >
          <SelectTrigger
            className="w-full h-9 bg-card border-input/80 text-xs text-foreground px-2.5 hover:bg-secondary hover:border-input focus:ring-1 focus:ring-ring"
            aria-label="Switch current cohort"
          >
            <div className="flex items-center gap-2 truncate text-left">
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-success shrink-0" />
              )}
              <span className="truncate font-medium">{activeCohort?.batchName || 'Select Cohort'}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            {activeBatches.map((batch) => (
              <SelectItem
                key={batch.batchId}
                value={batch.batchId}
                className="text-xs focus:bg-secondary focus:text-foreground cursor-pointer"
              >
                <div className="flex flex-col py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{batch.batchName}</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/30 text-primary">
                      {batch.programCode}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{batch.programName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Header Variant (Compact Pill)
  return (
    <div className={cn('hidden sm:flex items-center gap-2', className)}>
      <Select
        value={currentBatchId}
        onValueChange={handleSelectCohort}
        disabled={isPending}
      >
        <SelectTrigger
          className="h-8 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs text-foreground hover:bg-primary/20 hover:border-primary/50 focus:ring-1 focus:ring-ring transition"
          aria-label="Select active cohort"
        >
          <div className="flex items-center gap-2 truncate">
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
            )}
            <span className="font-medium truncate max-w-[180px]">
              {activeCohort?.batchName || 'Select Cohort'}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-card border-border text-foreground">
          {activeBatches.map((batch) => (
            <SelectItem
              key={batch.batchId}
              value={batch.batchId}
              className="text-xs focus:bg-secondary focus:text-foreground cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3 py-0.5">
                <div className="flex flex-col">
                  <span className="font-medium">{batch.batchName}</span>
                  <span className="text-[10px] text-muted-foreground">{batch.programName}</span>
                </div>
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/30 text-primary shrink-0">
                  {batch.programCode}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
