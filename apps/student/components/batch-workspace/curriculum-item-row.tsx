import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  FileText,
  Code2,
  HelpCircle,
  FolderGit2,
  Bookmark,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import type { CurriculumItem } from '@/lib/types/batch-workspace';
import type { ContentType } from '@/lib/types/library';
import { formatDate } from '@/lib/format/datetime';
import { buildDsaHref } from '@/lib/dsa/sheet-view';

interface CurriculumItemRowProps {
  item: CurriculumItem;
  /** False when the week header already shows the topic shared by every item in the week. */
  showTopic?: boolean;
}

function getContentTypeMeta(type: ContentType, contentItemId?: string, batchId?: string, slug?: string) {
  const contentHref = contentItemId
    ? batchId
      ? `/content/${contentItemId}?batchId=${encodeURIComponent(batchId)}`
      : `/content/${contentItemId}`
    : '/library';

  switch (type) {
    case 'lecture':
      return {
        label: 'Lecture',
        icon: Video,
        badgeClass: 'border-primary/30 bg-primary/10 text-primary',
        actionLabel: 'Watch Lecture',
        defaultHref: contentHref
      };
    case 'notes':
      return {
        label: 'Notes',
        icon: FileText,
        badgeClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
        actionLabel: 'Read Notes',
        defaultHref: contentHref
      };
    case 'dsa_sheet':
      return {
        label: 'DSA Practice',
        icon: Code2,
        badgeClass: 'border-success/30 bg-success/10 text-success',
        actionLabel: 'Solve Problem',
        defaultHref: buildDsaHref(slug, batchId)
      };
    case 'quiz':
      return {
        label: 'Quiz',
        icon: HelpCircle,
        badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
        actionLabel: 'Take Quiz',
        // The runner accepts the content item id; the batch id attributes the attempt to this cohort.
        defaultHref: contentItemId
          ? `/assessments/${contentItemId}${batchId ? `?batchId=${encodeURIComponent(batchId)}` : ''}`
          : '/assessments'
      };
    case 'project':
      return {
        label: 'Project',
        icon: FolderGit2,
        badgeClass: 'border-warning/30 bg-warning/10 text-warning',
        actionLabel: 'View Project',
        defaultHref: contentHref
      };
    case 'resource':
    default:
      return {
        label: 'Resource',
        icon: Bookmark,
        badgeClass: 'border-input bg-secondary text-foreground/80',
        actionLabel: 'Open Resource',
        defaultHref: contentHref
      };
  }
}

function formatRelativeDue(dueAt: Date | null, isCompleted: boolean) {
  if (!dueAt) return null;
  if (isCompleted) {
    return { text: 'Completed', isOverdue: false, isUrgent: false };
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return { text: 'Overdue', isOverdue: true, isUrgent: true };
  } else if (diffDays <= 0) {
    return { text: 'Due Today', isOverdue: false, isUrgent: true };
  } else if (diffDays === 1) {
    return { text: 'Due Tomorrow', isOverdue: false, isUrgent: true };
  } else if (diffDays <= 3) {
    return { text: `Due in ${diffDays} days`, isOverdue: false, isUrgent: true };
  } else {
    return {
      text: `Due ${formatDate(due, { month: 'short', day: 'numeric' })}`,
      isOverdue: false,
      isUrgent: false
    };
  }
}

export function CurriculumItemRow({ item, showTopic = true }: CurriculumItemRowProps) {
  const meta = getContentTypeMeta(item.contentType, item.contentItemId, item.batchId, item.slug);
  const Icon = meta.icon;
  const duration = item.metadata.durationMinutes;
  const dueInfo = formatRelativeDue(item.dueAt, item.isCompleted);

  // One status chip, only when there is something to say (a plain not-started item needs none).
  const status = item.isCompleted
    ? { label: 'Completed', icon: CheckCircle2, className: 'border-success/30 bg-success/10 text-success' }
    : item.status === 'needs_revision'
    ? { label: 'Needs revision', icon: AlertCircle, className: 'border-destructive/30 bg-destructive/10 text-destructive' }
    : item.status === 'in_review'
    ? { label: 'In review', icon: Clock, className: 'border-warning/30 bg-warning/10 text-warning' }
    : item.isLocked
    ? {
        label: item.availableFrom ? `Unlocks ${formatDate(item.availableFrom, { month: 'short', day: 'numeric' })}` : 'Locked',
        icon: Lock,
        className: 'border-input bg-secondary text-muted-foreground'
      }
    : dueInfo
    ? {
        label: dueInfo.text,
        icon: dueInfo.isOverdue ? AlertCircle : Clock,
        className: dueInfo.isOverdue
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : dueInfo.isUrgent
          ? 'border-warning/30 bg-warning/10 text-warning'
          : 'border-input bg-secondary text-muted-foreground'
      }
    : null;

  const actionLabel = item.isCompleted
    ? 'Review'
    : item.status === 'needs_revision'
    ? 'Revise'
    : item.status === 'in_review'
    ? 'View'
    : meta.actionLabel;

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-4.5 transition-colors ${
        item.isCompleted
          ? 'border-success/25 bg-success/[0.04]'
          : item.status === 'needs_revision' || item.isOverdue
          ? 'border-destructive/30 bg-destructive/5'
          : item.status === 'in_review'
          ? 'border-warning/30 bg-warning/5'
          : item.isLocked
          ? 'border-border/60 bg-card/20'
          : 'border-border bg-card/50 hover:border-input hover:bg-card/80'
      }`}
    >
      {/* Icon */}
      <div
        className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border sm:flex ${
          item.isCompleted
            ? 'border-success/30 bg-success/10 text-success'
            : item.isLocked
            ? 'border-border bg-secondary/60 text-muted-foreground'
            : 'border-input/60 bg-secondary/80 text-foreground/80'
        }`}
        aria-hidden="true"
      >
        {item.isLocked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>

      {/* Title, facts, description */}
      <div className={`min-w-0 flex-1 space-y-1.5 ${item.isLocked ? 'opacity-75' : ''}`}>
        <h4 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{item.title}</h4>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${meta.badgeClass}`}>
            <Icon className="mr-1 h-3 w-3 sm:hidden" aria-hidden="true" />
            {meta.label}
          </Badge>
          <span className={item.isRequired ? 'font-medium text-warning' : ''}>
            {item.isRequired ? 'Required' : 'Optional'}
          </span>
          {item.isArchived && <span>· Archived</span>}
          {duration ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true">·</span>
              <Clock className="h-3 w-3" aria-hidden="true" />
              {duration} min
            </span>
          ) : null}
          {showTopic && item.metadata.topic && <span className="truncate">· {item.metadata.topic}</span>}
        </div>

        {item.description && (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p>
        )}
      </div>

      {/* Status + action */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 pt-3 sm:w-44 sm:flex-col sm:items-end sm:justify-center sm:gap-2 sm:border-t-0 sm:pt-0">
        {status ? (
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}
          >
            <status.icon className="h-3 w-3" aria-hidden="true" />
            {status.label}
          </span>
        ) : (
          <span className="hidden sm:block" aria-hidden="true" />
        )}

        {!item.isLocked && (
          <Link
            href={meta.defaultHref}
            className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              item.isCompleted
                ? 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                : 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
