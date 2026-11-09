import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { BatchWorkspaceBatch, EnrolledBatchSummary } from '@/lib/types/batch-workspace';
import { formatDate } from '@/lib/format/datetime';

interface BatchHeaderProps {
  batch: BatchWorkspaceBatch;
  totalMilestones: number;
  completedMilestones: number;
  overallProgressPercent: number;
  weeksCount: number;
  activeEnrolledBatches: EnrolledBatchSummary[];
  isReadOnly?: boolean;
}

/** Page header for a batch's curriculum: name, programme and dates, and overall progress. */
export function BatchHeader({
  batch,
  totalMilestones,
  completedMilestones,
  overallProgressPercent,
  weeksCount,
  activeEnrolledBatches,
  isReadOnly
}: BatchHeaderProps) {
  const otherBatches = activeEnrolledBatches.filter((b) => b.batchId !== batch.id);
  const range = batch.startDate
    ? `${formatDate(batch.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} – ${
        batch.endDate ? formatDate(batch.endDate, { day: 'numeric', month: 'short', year: 'numeric' }) : 'ongoing'
      }`
    : null;

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{batch.programName}</span>
          {range && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular">{range}</span>
            </>
          )}
          {isReadOnly && <Badge variant="outline">Finished, read only</Badge>}
        </p>
        <h1 className="text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground md:text-[2rem]">
          {batch.name}
        </h1>
        {otherBatches.length > 0 && (
          <p className="pt-1 text-sm text-muted-foreground">
            Also in{' '}
            {otherBatches.map((b, i) => (
              <React.Fragment key={b.batchId}>
                {i > 0 && ', '}
                <Link href={`/batches/${b.batchId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {b.batchName}
                </Link>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      <div className="w-full shrink-0 space-y-2 lg:w-72">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            <span className="tabular font-medium text-foreground">{completedMilestones}</span> of{' '}
            <span className="tabular">{totalMilestones}</span> done · {weeksCount} {weeksCount === 1 ? 'week' : 'weeks'}
          </span>
          <span className="tabular font-medium text-foreground">{overallProgressPercent}%</span>
        </div>
        <Progress value={overallProgressPercent} label="Batch progress" size="md" />
      </div>
    </header>
  );
}
