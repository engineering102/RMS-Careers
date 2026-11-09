import React from 'react';
import Link from 'next/link';
import { ContentTypeTag } from '@/components/ui/content-type-tag';
import { contentTypeMeta } from '@/lib/content/content-types';
import { ArrowRight, Clock } from 'lucide-react';
import { StatusMark, type ItemStatus } from '@/components/ui/status-mark';
import { dueLabel } from '@/lib/format/relative-dates';
import { cn } from '@/lib/utils';
import type { CurriculumItem } from '@/lib/types/batch-workspace';
import type { ContentType } from '@/lib/types/library';
import { formatDate } from '@/lib/format/datetime';
import { buildDsaHref } from '@/lib/dsa/sheet-view';

interface CurriculumItemRowProps {
  item: CurriculumItem;
  /** False when the week header already shows the topic shared by every item in the week. */
  showTopic?: boolean;
  /** False when the section holds a single content type, so the type badge would repeat its heading. */
  showType?: boolean;
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
        actionLabel: 'Watch Lecture',
        defaultHref: contentHref
      };
    case 'notes':
      return {
        actionLabel: 'Read Notes',
        defaultHref: contentHref
      };
    case 'dsa_sheet':
      return {
        actionLabel: 'Solve Problem',
        defaultHref: buildDsaHref(slug, batchId)
      };
    case 'quiz':
      return {
        actionLabel: 'Take Quiz',
        // The runner accepts the content item id; the batch id attributes the attempt to this cohort.
        defaultHref: contentItemId
          ? `/assessments/${contentItemId}${batchId ? `?batchId=${encodeURIComponent(batchId)}` : ''}`
          : '/assessments'
      };
    case 'project':
      return {
        actionLabel: 'View Project',
        defaultHref: contentHref
      };
    case 'external_test':
      return {
        actionLabel: 'View Test',
        // Sat on the external platform; the link, window and imported result live on Assessments.
        defaultHref: '/assessments?type=external'
      };
    case 'resource':
    default:
      return {
        actionLabel: 'Open Resource',
        defaultHref: contentHref
      };
  }
}

export function CurriculumItemRow({ item, showTopic = true, showType = true }: CurriculumItemRowProps) {
  const meta = getContentTypeMeta(item.contentType, item.contentItemId, item.batchId, item.slug);
  const duration = item.metadata.durationMinutes;
  const isRevision = item.status === 'needs_revision';
  const isReview = item.status === 'in_review';

  const mark: ItemStatus = item.isCompleted
    ? 'done'
    : item.isLocked
      ? 'locked'
      : isRevision
        ? 'revise'
        : isReview
          ? 'current'
          : 'todo';

  // One short status, in words, only when there is something to say. Colour only for state that needs action.
  let status: { text: string; className: string } | null = null;
  if (!item.isCompleted) {
    if (isRevision) status = { text: 'Needs revision', className: 'font-medium text-destructive' };
    else if (isReview) status = { text: 'In review', className: 'text-muted-foreground' };
    else if (item.isLocked)
      status = {
        text: item.availableFrom ? `Opens ${formatDate(item.availableFrom, { day: 'numeric', month: 'short' })}` : 'Locked',
        className: 'text-muted-foreground'
      };
    else if (item.dueAt) {
      const due = dueLabel(item.dueAt);
      status =
        due.tone === 'overdue'
          ? { text: 'Overdue', className: 'font-medium text-destructive' }
          : {
              text: `Due ${due.text.replace(/^(Today|Tomorrow)$/, (m) => m.toLowerCase())}`,
              className: due.tone === 'soon' ? 'font-medium text-warning' : 'text-muted-foreground'
            };
    }
  }

  const actionLabel = item.isCompleted ? 'Review' : isRevision ? 'Revise' : isReview ? 'View' : meta.actionLabel;
  const isPrimaryAction = !item.isCompleted && !isReview;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border px-3 py-3 transition-colors first:border-t-0 sm:flex-row sm:items-center sm:gap-4 sm:px-4',
        !item.isLocked && 'hover:bg-accent/40'
      )}
    >
      <div className={cn('flex min-w-0 flex-1 items-start gap-3', item.isLocked && 'opacity-70')}>
        <StatusMark status={mark} label={mark === 'todo' ? null : undefined} className="mt-0.5" />

        <div className="min-w-0 flex-1 space-y-1">
          <h4 className={cn('line-clamp-2 text-sm font-medium leading-snug', item.isCompleted ? 'text-muted-foreground' : 'text-foreground')}>
            {item.title}
          </h4>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {showType && <ContentTypeTag type={item.contentType} />}
            {!item.isRequired && <span>Optional</span>}
            {item.isArchived && <span>Archived</span>}
            {duration ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {duration} min
              </span>
            ) : null}
            {showTopic && item.metadata.topic && <span className="truncate">{item.metadata.topic}</span>}
          </div>

          {item.description && <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 pl-[30px] sm:justify-end sm:pl-0">
        {status ? <span className={cn('tabular whitespace-nowrap text-xs', status.className)}>{status.text}</span> : <span aria-hidden="true" />}

        {!item.isLocked && (
          <Link
            href={meta.defaultHref}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isPrimaryAction
                ? 'border border-border-strong bg-card text-foreground hover:bg-accent'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
