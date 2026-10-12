import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Building2,
  BookOpen,
  CheckCircle2,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import type {
  BatchWorkspaceBatch,
  EnrolledBatchSummary
} from '@/lib/types/batch-workspace';
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

export function BatchHeader({
  batch,
  totalMilestones,
  completedMilestones,
  overallProgressPercent,
  weeksCount,
  activeEnrolledBatches,
  isReadOnly
}: BatchHeaderProps) {
  const hasMultipleBatches = activeEnrolledBatches.length > 1;

  const formatDateRange = () => {
    if (!batch.startDate) return null;
    const start = formatDate(batch.startDate, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const end = batch.endDate
      ? formatDate(batch.endDate, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Ongoing';
    return `${start} – ${end}`;
  };

  const dateRange = formatDateRange();

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-primary/5 p-6 md:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              Cohort Workspace
            </span>
            <span className="text-muted-foreground">·</span>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider"
            >
              {batch.programCode}
            </Badge>
            {isReadOnly && (
              <Badge
                variant="outline"
                className="border-warning/30 bg-warning/10 text-warning text-[11px] font-semibold uppercase tracking-wider"
              >
                Read-Only (Completed)
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {batch.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {batch.programName}
            </span>
            {batch.collegeName && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {batch.collegeName}
                </span>
              </>
            )}
            {dateRange && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {dateRange}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Multi-Batch Switcher if enrolled in > 1 cohort */}
        {hasMultipleBatches && (
          <div className="flex flex-col sm:items-end gap-1.5 self-start lg:self-auto shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <ArrowRightLeft className="h-3 w-3 text-primary" />
              Switch Cohort:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeEnrolledBatches.map((b) => {
                const isCurrent = b.batchId === batch.id;
                return isCurrent ? (
                  <span
                    key={b.batchId}
                    className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20"
                  >
                    {b.batchName}
                  </span>
                ) : (
                  <Link
                    key={b.batchId}
                    href={`/batches/${b.batchId}`}
                    className="rounded-lg border border-input bg-secondary/80 px-2.5 py-1 text-xs text-foreground/80 hover:border-input hover:text-foreground transition"
                  >
                    {b.batchName}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Progress & Milestone Overview Bar */}
      <div className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-foreground/80">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="h-3.5 w-3.5 text-primary" />
              {weeksCount} Curriculum {weeksCount === 1 ? 'Week' : 'Weeks'}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {completedMilestones} / {totalMilestones} Milestones Completed
            </span>
          </div>

          <span className="font-semibold text-primary">{overallProgressPercent}% Complete</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${overallProgressPercent}%` }}
            role="progressbar"
            aria-valuenow={overallProgressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </section>
  );
}
