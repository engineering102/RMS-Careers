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
        badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
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
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
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
        badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        actionLabel: 'View Project',
        defaultHref: contentHref
      };
    case 'resource':
    default:
      return {
        label: 'Resource',
        icon: Bookmark,
        badgeClass: 'border-slate-700 bg-slate-800 text-slate-300',
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
      text: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
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
          ? 'border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-800/60'
          : item.status === 'needs_revision'
          ? 'border-rose-900/50 bg-rose-950/20 hover:border-rose-800/70'
          : item.status === 'in_review'
          ? 'border-amber-900/40 bg-amber-950/10 hover:border-amber-800/60'
          : item.isOverdue
          ? 'border-rose-900/40 bg-rose-950/10 hover:border-rose-800/60'
          : item.isLocked
          ? 'border-slate-800/60 bg-slate-900/20 opacity-75'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
      }`}
    >
      {/* Left Column: Icon & Content Details */}
      <div className="flex items-start gap-3.5 flex-1">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            item.isCompleted
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : item.isLocked
              ? 'border-slate-800 bg-slate-800/60 text-slate-500'
              : 'border-slate-700/60 bg-slate-800/80 text-slate-300'
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
                  ? 'text-slate-200'
                  : 'text-slate-100 group-hover:text-blue-400'
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
                className="text-[10px] py-0 px-1.5 border-amber-500/30 bg-amber-500/10 text-amber-300 font-medium"
              >
                Required
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-slate-700 bg-slate-800 text-slate-400 font-medium"
              >
                Optional
              </Badge>
            )}
            {item.isArchived && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 border-zinc-700 bg-zinc-800/80 text-zinc-400 font-medium"
              >
                Archived
              </Badge>
            )}
            {item.metadata.topic && (
              <span className="text-[11px] text-slate-400 font-medium">
                · {item.metadata.topic}
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            {duration ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration} mins
              </span>
            ) : null}
            {item.availableFrom && item.isLocked && (
              <span className="flex items-center gap-1 text-slate-400">
                <Lock className="h-3 w-3" />
                Unlocks {new Date(item.availableFrom).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Status & Action Button */}
      <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
        <div className="flex items-center gap-2">
          {item.isCompleted ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400"
              aria-label="Completed"
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Completed
            </span>
          ) : item.status === 'needs_revision' ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400"
              aria-label="Needs Revision"
            >
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              Needs Revision
            </span>
          ) : item.status === 'in_review' ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400"
              aria-label="In Review"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              In Review
            </span>
          ) : item.isLocked ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-400"
              aria-label={item.availableFrom ? `Locked until ${new Date(item.availableFrom).toLocaleDateString()}` : 'Locked'}
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Locked
            </span>
          ) : dueInfo ? (
            <span
              className={`flex items-center gap-1 text-xs font-semibold ${
                dueInfo.isOverdue
                  ? 'text-rose-400'
                  : dueInfo.isUrgent
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
              aria-label={dueInfo.isOverdue ? `Overdue deadline: ${dueInfo.text}` : dueInfo.text}
            >
              {dueInfo.isOverdue && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
              {dueInfo.text}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">Scheduled</span>
          )}
        </div>

        {!item.isLocked && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2.5 h-7 gap-1"
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
