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
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ResumeLearningTarget } from '@/lib/types/progress';
import type { ContentType } from '@/lib/types/library';
import { formatDate } from '@/lib/format/datetime';
import { buildDsaHref } from '@/lib/dsa/sheet-view';

interface ResumeLearningCardProps {
  target: ResumeLearningTarget;
}

function getContentTypeMeta(type?: ContentType) {
  switch (type) {
    case 'lecture':
      return {
        label: 'Lecture',
        icon: Video,
        badgeClass: 'border-primary/30 bg-primary/10 text-primary'
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
        badgeClass: 'border-success/30 bg-success/10 text-success'
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
        badgeClass: 'border-warning/30 bg-warning/10 text-warning'
      };
    case 'external_test':
      return {
        label: 'External Test',
        icon: ExternalLink,
        badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      };
    case 'resource':
    default:
      return {
        label: 'Resource',
        icon: Bookmark,
        badgeClass: 'border-input bg-secondary text-foreground/80'
      };
  }
}

export function ResumeLearningCard({ target }: ResumeLearningCardProps) {
  // 1. Un-enrolled State
  if (target.hasNoEnrollments) {
    return (
      <section
        data-testid="resume-learning-no-enrollment"
        className="rounded-2xl border border-border bg-gradient-to-r from-card via-card/90 to-primary/5 p-6 md:p-7 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Explore the Self-Paced Library
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                You are not currently enrolled in an active cohort. Dive into curated learning tracks and documentation.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 h-9 gap-1.5 shrink-0"
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
        className="rounded-2xl border border-success/30 bg-gradient-to-r from-card via-success/5 to-card p-6 md:p-7 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-success/30 bg-success/10 text-success">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-success uppercase">
                  Curriculum Completed
                </span>
                <span className="text-xs text-muted-foreground">· {target.batchName}</span>
              </div>
              <h3 className="text-base font-semibold text-foreground mt-1">
                Congratulations! You completed all scheduled milestones.
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Maintain your daily streak by solving DSA patterns or reviewing key concept notes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              asChild
              size="sm"
              className="bg-success hover:bg-success/90 text-success-foreground font-medium text-xs px-4 h-9 gap-1.5"
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
        className="rounded-2xl border border-primary/30 bg-gradient-to-r from-card via-primary/5 to-card p-6 md:p-7 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-primary uppercase">
                  All Caught Up
                </span>
                <span className="text-xs text-muted-foreground">· {target.batchName}</span>
              </div>
              <h3 className="text-base font-semibold text-foreground mt-1">
                You are caught up with this week&apos;s modules.
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {target.nextUnlockDate ? (
                  <>Next modules unlock on {formatDate(target.nextUnlockDate, { month: 'short', day: 'numeric', weekday: 'short' })}. Keep practicing DSA in the meantime!</>
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 h-9 gap-1.5"
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
      ? buildDsaHref(target.contentSlug, target.batchId)
      : target.contentType === 'external_test'
        ? '/assessments#external-tests'
        : `/content/${encodeURIComponent(target.contentItemId)}?batchId=${encodeURIComponent(
          target.batchId || ''
        )}`;

  const percent = target.completionPercentage ?? 0;

  return (
    <section
      data-testid="resume-learning-card"
      className={`rounded-2xl border p-6 md:p-7 shadow-sm transition-all ${
        isRevision
          ? 'border-destructive/40 bg-gradient-to-r from-card via-destructive/5 to-card'
          : 'border-primary/30 bg-gradient-to-r from-card via-card/90 to-primary/5'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Context, Badge, Title & Details */}
        <div className="space-y-3.5 flex-1">
          {/* Top Label & Cohort Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isRevision ? (
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-destructive uppercase">
                <AlertCircle className="h-3.5 w-3.5" />
                Revision Requested
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-primary uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Resume Learning
              </span>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold text-foreground/80">{target.batchName}</span>
            {target.weekNumber !== undefined && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground font-medium">Week {target.weekNumber}</span>
              </>
            )}
          </div>

          {/* Main Title & Type Icon */}
          <div className="flex items-start gap-3.5">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                isRevision
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-primary/30 bg-primary/10 text-primary'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                  {target.contentTitle}
                </h2>
                <Badge variant="outline" className={`text-[10px] py-0 px-2 ${meta.badgeClass}`}>
                  {meta.label}
                </Badge>
              </div>

              {/* Status / Due info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                {target.dueAt && (
                  <span className="flex items-center gap-1 text-warning/90 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    Due {formatDate(target.dueAt, { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {isRevision && (
                  <span className="text-destructive font-medium">
                    Tutor requested updates on your submission.
                  </span>
                )}
                {!isRevision && target.reason === 'due_soon' && (
                  <span className="text-warning font-medium">
                    Upcoming milestone deadline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-1 max-w-md">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>Cohort Progress</span>
              <span className="text-foreground/80 font-semibold">{percent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
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
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
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
