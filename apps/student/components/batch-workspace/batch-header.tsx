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
    const start = new Date(batch.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const end = batch.endDate
      ? new Date(batch.endDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Ongoing';
    return `${start} – ${end}`;
  };

  const dateRange = formatDateRange();

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30 p-6 md:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">
              Cohort Workspace
            </span>
            <span className="text-slate-600">·</span>
            <Badge
              variant="outline"
              className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[11px] font-semibold uppercase tracking-wider"
            >
              {batch.programCode}
            </Badge>
            {isReadOnly && (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-semibold uppercase tracking-wider"
              >
                Read-Only (Completed)
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
            {batch.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <BookOpen className="h-3.5 w-3.5 text-blue-400" />
              {batch.programName}
            </span>
            {batch.collegeName && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  {batch.collegeName}
                </span>
              </>
            )}
            {dateRange && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  {dateRange}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Multi-Batch Switcher if enrolled in > 1 cohort */}
        {hasMultipleBatches && (
          <div className="flex flex-col sm:items-end gap-1.5 self-start lg:self-auto shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <ArrowRightLeft className="h-3 w-3 text-blue-400" />
              Switch Cohort:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeEnrolledBatches.map((b) => {
                const isCurrent = b.batchId === batch.id;
                return isCurrent ? (
                  <span
                    key={b.batchId}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm shadow-blue-500/20"
                  >
                    {b.batchName}
                  </span>
                ) : (
                  <Link
                    key={b.batchId}
                    href={`/batches/${b.batchId}`}
                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition"
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
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              {weeksCount} Curriculum {weeksCount === 1 ? 'Week' : 'Weeks'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {completedMilestones} / {totalMilestones} Milestones Completed
            </span>
          </div>

          <span className="font-semibold text-blue-300">{overallProgressPercent}% Complete</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
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
