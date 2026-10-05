import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Video, FileText, Code2, HelpCircle, FolderGit2, Bookmark, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ContentType } from '@/lib/types/library';
import type { RelatedBatchContext } from '@/lib/types/content';

interface ContentHeaderProps {
  title: string;
  contentType: ContentType;
  programCode: string;
  topic?: string;
  durationMinutes?: number;
  relatedBatchContext?: RelatedBatchContext | null;
  batchId?: string;
}

function getContentTypeMeta(type: ContentType) {
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

export function ContentHeader({
  title,
  contentType,
  programCode,
  topic,
  durationMinutes,
  relatedBatchContext,
  batchId
}: ContentHeaderProps) {
  const meta = getContentTypeMeta(contentType);
  const Icon = meta.icon;

  const backHref = batchId
    ? `/batches/${batchId}`
    : relatedBatchContext?.batchId
      ? `/batches/${relatedBatchContext.batchId}`
      : '/library';

  const backLabel = batchId || relatedBatchContext
    ? `Back to ${relatedBatchContext?.batchName || 'Batch Workspace'}`
    : 'Back to Library';

  return (
    <div className="space-y-4">
      {/* Navigation Breadcrumb / Back Button */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 -ml-2 gap-1.5"
        >
          <Link href={backHref}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>
        </Button>
      </div>

      {/* Badges & Meta */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`text-xs py-0.5 px-2 font-medium ${meta.badgeClass}`}>
          <Icon className="h-3 w-3 mr-1" />
          {meta.label}
        </Badge>

        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700/60">
          {programCode}
        </span>

        {topic && (
          <span className="rounded bg-slate-800/50 px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-700/40">
            {topic}
          </span>
        )}

        {durationMinutes ? (
          <span className="flex items-center gap-1 text-xs text-slate-400 ml-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {durationMinutes} min
          </span>
        ) : null}
      </div>

      {/* Main Title */}
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 leading-snug">
        {title}
      </h1>
    </div>
  );
}
