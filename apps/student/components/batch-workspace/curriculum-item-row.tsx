import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ExternalLink
} from 'lucide-react';
import type { CurriculumItem } from '@/lib/types/batch-workspace';
import type { ContentType } from '@/lib/types/library';
import { formatDate } from '@/lib/format/datetime';

interface CurriculumItemRowProps {
  item: CurriculumItem;
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
        actionLabel: 'Open DSA Sheet',
        defaultHref: slug
          ? batchId
            ? `/dsa?sheet=${encodeURIComponent(slug)}&batchId=${encodeURIComponent(batchId)}`
            : `/dsa?sheet=${encodeURIComponent(slug)}`
          : '/dsa'
      };
    case 'quiz':
      return {
        label: 'Quiz',
        icon: HelpCircle,
        badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
        actionLabel: 'Take Quiz',
        defaultHref: '/assessments'
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

export function CurriculumItemRow({ item }: CurriculumItemRowProps) {
  const meta = getContentTypeMeta(item.contentType, item.contentItemId, item.batchId, item.slug);
  const Icon = meta.icon;
  const duration = item.metadata.durationMinutes;
  const dueInfo = formatRelativeDue(item.dueAt, item.isCompleted);

  return (
    <div
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4.5 transition-all ${
        item.isCompleted
          ? 'border-success/30 bg-success/5 hover:border-success/40'
          : item.status === 'needs_revision'
          ? 'border-destructive/40 bg-destructive/5 hover:border-destructive/40'
          : item.status === 'in_review'
          ? 'border-warning/30 bg-warning/5 hover:border-warning/40'
          : item.isOverdue
          ? 'border-destructive/30 bg-destructive/5 hover:border-destructive/40'
          : item.isLocked
          ? 'border-border/60 bg-card/20 opacity-75'
          : 'border-border bg-card/50 hover:border-input hover:bg-card/80'
      }`}
    >
      {/* Left Column: Icon & Content Details */}
      <div className="flex items-start gap-3.5 flex-1">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            item.isCompleted
              ? 'border-success/30 bg-success/10 text-success'
              : item.isLocked
              ? 'border-border bg-secondary/60 text-muted-foreground'
              : 'border-input/60 bg-secondary/80 text-foreground/80'
          }`}
        >
          {item.isLocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>

        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`text-sm font-semibold transition-colors ${
                item.isCompleted
                  ? 'text-foreground'
                  : 'text-foreground group-hover:text-primary'
              }`}
            >
              {item.title}
            </h4>
            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${meta.badgeClass}`}>
              {meta.label}
            </Badge>
            {item.isRequired ? (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-warning/30 bg-warning/10 text-warning font-medium"
              >
                Required
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-input bg-secondary text-muted-foreground font-medium"
              >
                Optional
              </Badge>
            )}
            {item.isArchived && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-input bg-secondary/80 text-muted-foreground font-medium"
              >
                Archived
              </Badge>
            )}
            {item.metadata.topic && (
              <span className="text-[11px] text-muted-foreground font-medium">
                · {item.metadata.topic}
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {duration ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration} mins
              </span>
            ) : null}
            {item.availableFrom && item.isLocked && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                Unlocks {formatDate(item.availableFrom)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Status & Action Button */}
      <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
        <div className="flex items-center gap-2">
          {item.isCompleted ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-2.5 py-0.5 text-[11px] font-semibold text-success"
              aria-label="Completed"
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Completed
            </span>
          ) : item.status === 'needs_revision' ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-[11px] font-semibold text-destructive"
              aria-label="Needs Revision"
            >
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              Needs Revision
            </span>
          ) : item.status === 'in_review' ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/20 px-2.5 py-0.5 text-[11px] font-semibold text-warning"
              aria-label="In Review"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              In Review
            </span>
          ) : item.isLocked ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              aria-label={item.availableFrom ? `Locked until ${formatDate(item.availableFrom)}` : 'Locked'}
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Locked
            </span>
          ) : dueInfo ? (
            <span
              className={`flex items-center gap-1 text-xs font-semibold ${
                dueInfo.isOverdue
                  ? 'text-destructive'
                  : dueInfo.isUrgent
                  ? 'text-warning'
                  : 'text-muted-foreground'
              }`}
              aria-label={dueInfo.isOverdue ? `Overdue deadline: ${dueInfo.text}` : dueInfo.text}
            >
              {dueInfo.isOverdue && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
              {dueInfo.text}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Scheduled</span>
          )}
        </div>

        {!item.isLocked && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-xs text-primary hover:text-primary hover:bg-primary/10 px-2.5 h-7 gap-1"
          >
            <Link href={meta.defaultHref}>
              <span>
                {item.isCompleted
                  ? 'Review'
                  : item.status === 'needs_revision'
                  ? 'Revise'
                  : item.status === 'in_review'
                  ? 'View'
                  : meta.actionLabel}
              </span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
