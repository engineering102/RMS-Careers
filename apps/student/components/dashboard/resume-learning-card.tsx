import React from 'react';
import Link from 'next/link';
import {
  Video,
  FileText,
  Code2,
  HelpCircle,
  FolderGit2,
  Bookmark,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trophy,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ResumeLearningTarget } from '@/lib/types/progress';
import type { ContentType } from '@/lib/types/library';

interface ResumeLearningCardProps {
  target: ResumeLearningTarget;
}

function getContentTypeMeta(type?: ContentType) {
  switch (type) {
    case 'lecture':
      return {
        label: 'Lecture',
        icon: Video,
        badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-300'
      };
    case 'notes':
      return {
        label: 'Notes',
        icon: FileText,
        badgeClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
      };
    case 'dsa_sheet':
      return {
        label: 'DSA Practice',
        icon: Code2,
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      };
    case 'quiz':
      return {
        label: 'Quiz',
        icon: HelpCircle,
        badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-300'
      };
    case 'project':
      return {
        label: 'Project',
        icon: FolderGit2,
        badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      };
    case 'resource':
    default:
      return {
        label: 'Resource',
        icon: Bookmark,
        badgeClass: 'border-slate-700 bg-slate-800 text-slate-300'
      };
  }
}

export function ResumeLearningCard({ target }: ResumeLearningCardProps) {
  // 1. Un-enrolled State
  if (target.hasNoEnrollments) {
    return (
      <section
        data-testid="resume-learning-no-enrollment"
        className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/20 p-6 md:p-7 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Explore the Self-Paced Library
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                You are not currently enrolled in an active cohort. Dive into curated learning tracks and documentation.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 h-9 gap-1.5 shrink-0"
          >
            <Link href="/library">
              <span>Explore Library</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  // 2. Entire Curriculum Completed
  if (target.isCurriculumCompleted) {
    return (
      <section
        data-testid="resume-learning-completed"
        className="rounded-2xl border border-emerald-800/40 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 p-6 md:p-7 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                  Curriculum Completed
                </span>
                <span className="text-xs text-slate-500">· {target.batchName}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 mt-1">
                Congratulations! You completed all scheduled milestones.
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Maintain your daily streak by solving DSA patterns or reviewing key concept notes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              asChild
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 h-9 gap-1.5"
            >
              <Link href="/dsa">
                <span>Practice DSA</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // 3. Caught-Up State (Unlocked weeks completed, future weeks locked)
  if (target.isCaughtUp) {
    return (
      <section
        data-testid="resume-learning-caught-up"
        className="rounded-2xl border border-blue-800/40 bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900 p-6 md:p-7 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">
                  All Caught Up
                </span>
                <span className="text-xs text-slate-500">· {target.batchName}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 mt-1">
                You are caught up with this week&apos;s modules.
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {target.nextUnlockDate ? (
                  <>Next modules unlock on {new Date(target.nextUnlockDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}. Keep practicing DSA in the meantime!</>
                ) : (
                  <>Next modules unlock soon. Stay sharp by practicing DSA problem patterns!</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              asChild
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 h-9 gap-1.5"
            >
              <Link href="/dsa">
                <span>Practice DSA</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // 4. Actionable Resume Learning Target
  if (!target.hasTarget || !target.contentItemId) {
    return null;
  }

  const meta = getContentTypeMeta(target.contentType);
  const Icon = meta.icon;
  const isRevision = target.status === 'needs_revision';
  const isInProgress = target.status === 'in_progress';

  let ctaLabel = 'Start Module';
  if (isRevision) {
    ctaLabel = 'Revise Submission';
  } else if (isInProgress) {
    ctaLabel = 'Continue Learning';
  }

  const targetHref =
    target.contentType === 'dsa_sheet'
      ? `/dsa?batchId=${encodeURIComponent(target.batchId || '')}`
      : `/content/${encodeURIComponent(target.contentItemId)}?batchId=${encodeURIComponent(
          target.batchId || ''
        )}`;

  const percent = target.completionPercentage ?? 0;

  return (
    <section
      data-testid="resume-learning-card"
      className={`rounded-2xl border p-6 md:p-7 shadow-sm transition-all ${
        isRevision
          ? 'border-rose-800/50 bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900'
          : 'border-blue-800/40 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/30'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Context, Badge, Title & Details */}
        <div className="space-y-3.5 flex-1">
          {/* Top Label & Cohort Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isRevision ? (
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-rose-400 uppercase">
                <AlertCircle className="h-3.5 w-3.5" />
                Revision Requested
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-blue-400 uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Resume Learning
              </span>
            )}
            <span className="text-slate-600">·</span>
            <span className="font-semibold text-slate-300">{target.batchName}</span>
            {target.weekNumber !== undefined && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 font-medium">Week {target.weekNumber}</span>
              </>
            )}
          </div>

          {/* Main Title & Type Icon */}
          <div className="flex items-start gap-3.5">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                isRevision
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-100">
                  {target.contentTitle}
                </h2>
                <Badge variant="outline" className={`text-[10px] py-0 px-2 ${meta.badgeClass}`}>
                  {meta.label}
                </Badge>
              </div>

              {/* Status / Due info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                {target.dueAt && (
                  <span className="flex items-center gap-1 text-amber-300/90 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    Due {new Date(target.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {isRevision && (
                  <span className="text-rose-400 font-medium">
                    Tutor requested updates on your submission.
                  </span>
                )}
                {!isRevision && target.reason === 'due_soon' && (
                  <span className="text-amber-400 font-medium">
                    Upcoming milestone deadline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-1 max-w-md">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Cohort Progress</span>
              <span className="text-slate-300 font-semibold">{percent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: CTA */}
        <div className="flex items-center lg:self-center shrink-0">
          <Button
            asChild
            size="default"
            className={`font-semibold text-xs px-6 h-11 gap-2 shadow-sm transition-all ${
              isRevision
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Link href={targetHref}>
              <span>{ctaLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
