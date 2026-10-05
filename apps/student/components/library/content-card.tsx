import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Video,
  FileText,
  Code2,
  HelpCircle,
  FolderGit2,
  Bookmark,
  Clock,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import type { LibraryItem, ContentType } from '@/lib/types/library';

interface ContentCardProps {
  item: LibraryItem;
}

function getContentTypeMeta(type: ContentType, itemId?: string) {
  const contentHref = itemId ? `/content/${itemId}` : '/library';

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
        defaultHref: '/dsa'
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
        defaultHref: '/assessments'
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

export function ContentCard({ item }: ContentCardProps) {
  const meta = getContentTypeMeta(item.contentType, item.id);
  const Icon = meta.icon;
  const duration = item.metadata.durationMinutes;

  return (
    <Card className="group flex flex-col justify-between overflow-hidden border-slate-800 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-200">
      <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Header Row: Content Type & Topic Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs py-0.5 px-2 font-medium ${meta.badgeClass}`}>
                <Icon className="h-3 w-3 mr-1" />
                {meta.label}
              </Badge>
              {item.topic && (
                <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/60">
                  {item.topic}
                </span>
              )}
            </div>

            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Accessible
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500 italic">No description provided.</p>
            )}
          </div>
        </div>

        {/* Footer Meta & Action */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-medium text-slate-300">{item.programCode || 'RMS'}</span>
            {duration ? (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="h-3 w-3 text-slate-400" />
                {duration}m
              </span>
            ) : null}
          </div>

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2.5 h-8 gap-1.5"
          >
            <Link href={meta.defaultHref}>
              <span>{meta.actionLabel}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
