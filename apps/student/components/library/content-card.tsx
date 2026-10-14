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

function getContentTypeMeta(type: ContentType, itemId?: string, slug?: string) {
  const contentHref = itemId ? `/content/${itemId}` : '/library';

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
        defaultHref: slug ? `/dsa?sheet=${encodeURIComponent(slug)}` : '/dsa'
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
        defaultHref: '/assessments'
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

export function ContentCard({ item }: ContentCardProps) {
  const meta = getContentTypeMeta(item.contentType, item.id, item.slug);
  const Icon = meta.icon;
  const duration = item.metadata.durationMinutes;

  return (
    <Card className="group flex flex-col justify-between overflow-hidden border-border bg-card/60 hover:border-input hover:bg-card/80 transition-all duration-200">
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
                <span className="rounded bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-foreground/80 border border-input/60">
                  {item.topic}
                </span>
              )}
            </div>

            <span className="flex items-center gap-1 text-[11px] font-medium text-success">
              <CheckCircle2 className="h-3 w-3" />
              Accessible
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {item.description}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground italic">No description provided.</p>
            )}
          </div>
        </div>

        {/* Footer Meta & Action */}
        <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{item.programCode || 'RMS'}</span>
            {duration ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {duration}m
              </span>
            ) : null}
          </div>

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-xs text-primary hover:text-primary hover:bg-primary/10 px-2.5 h-8 gap-1.5"
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
