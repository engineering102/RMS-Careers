import Link from 'next/link';
import { ArrowRight, Clock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_THEMES } from '@/components/library/category-card';
import type { LibraryCategoryType } from '@/lib/data/library-categories';
import type { LibraryItem, ContentType } from '@/lib/types/library';

interface ContentCardProps {
  item: LibraryItem;
}

export function getContentTypeMeta(type: ContentType, itemId?: string, slug?: string) {
  const contentHref = itemId ? `/content/${itemId}` : '/library';

  switch (type) {
    case 'lecture':
      return { label: 'Lecture', actionLabel: 'Watch Lecture', defaultHref: contentHref };
    case 'notes':
      return { label: 'Notes', actionLabel: 'Read Notes', defaultHref: contentHref };
    case 'dsa_sheet':
      return {
        label: 'DSA Practice',
        actionLabel: 'Open DSA Sheet',
        defaultHref: slug ? `/dsa?sheet=${encodeURIComponent(slug)}` : '/dsa'
      };
    case 'quiz':
      return { label: 'Quiz', actionLabel: 'Take Quiz', defaultHref: '/assessments' };
    case 'project':
      return { label: 'Project', actionLabel: 'View Project', defaultHref: '/assessments' };
    case 'resource':
    default:
      return { label: 'Resource', actionLabel: 'Open Resource', defaultHref: contentHref };
  }
}

// Difficulty as a short bar count (1-3), the way problem sheets show it, in neutral ink.
const DIFFICULTY_STYLES: Record<string, { label: string; level: number }> = {
  beginner: { label: 'Beginner', level: 1 },
  intermediate: { label: 'Intermediate', level: 2 },
  advanced: { label: 'Advanced', level: 3 }
};

export function ContentCard({ item }: ContentCardProps) {
  const meta = getContentTypeMeta(item.contentType, item.id, item.slug);
  const themeKey: LibraryCategoryType =
    item.contentType in CATEGORY_THEMES ? (item.contentType as LibraryCategoryType) : 'resource';
  const theme = CATEGORY_THEMES[themeKey];
  const Icon = theme.icon;
  const duration = item.metadata.durationMinutes;
  const difficulty = item.metadata.difficulty ? DIFFICULTY_STYLES[item.metadata.difficulty] : null;

  return (
    <Link
      href={meta.defaultHref}
      aria-label={`${meta.actionLabel}: ${item.title}`}
      className={cn(
        'group flex flex-col rounded-lg border p-5 transition-[border-color,transform] duration-150 active:scale-[0.99] motion-reduce:transform-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        theme.surface,
        theme.ring
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', theme.iconTile)} aria-hidden="true">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="truncate">{meta.label}</span>
        </span>
        {item.topic && <span className="max-w-[50%] truncate text-sm text-muted-foreground">{item.topic}</span>}
      </div>

      <div className="mt-4 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">{item.title}</h3>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          {item.programCode || 'RMS'}
        </span>
        {duration ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {duration} min
          </span>
        ) : null}
        {difficulty && (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex items-end gap-px" aria-hidden="true">
              {[1, 2, 3].map((l) => (
                <span
                  key={l}
                  className={cn('w-[3px] rounded-sm', l <= difficulty.level ? 'bg-foreground' : 'bg-border-strong')}
                  style={{ height: `${4 + l * 3}px` }}
                />
              ))}
            </span>
            {difficulty.label}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className={cn('font-medium', theme.accent)}>{meta.actionLabel}</span>
        <ArrowRight
          className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
