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

const DIFFICULTY_STYLES: Record<string, { label: string; dot: string }> = {
  beginner: { label: 'Beginner', dot: 'bg-emerald-500' },
  intermediate: { label: 'Intermediate', dot: 'bg-amber-500' },
  advanced: { label: 'Advanced', dot: 'bg-rose-500' }
};

const metaChipClass =
  'inline-flex items-center gap-1 rounded-md border border-foreground/[0.08] bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur';

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
        'group relative flex flex-col overflow-hidden rounded-2xl border p-5 shadow-sm',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] motion-reduce:transform-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        theme.surface,
        theme.ring
      )}
    >
      {/* Decorative glow + hairline highlight */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-90',
          theme.glow
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20"
      />

      {/* Type + topic */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-md ring-1 ring-inset ring-white/20',
              theme.iconTile
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <span
            className={cn('truncate text-[11px] font-semibold uppercase tracking-widest', theme.accent)}
          >
            {meta.label}
          </span>
        </div>
        {item.topic && (
          <span className="max-w-[45%] truncate rounded-full border border-foreground/[0.08] bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80 backdrop-blur">
            {item.topic}
          </span>
        )}
      </div>

      {/* Title & description */}
      <div className="relative mt-4 flex-1">
        <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
          {item.title}
        </h3>
        {item.description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        ) : (
          <p className="mt-1.5 text-xs italic text-muted-foreground">No description provided.</p>
        )}
      </div>

      {/* Meta chips */}
      <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
        <span className={metaChipClass}>
          <Layers className="h-3 w-3" />
          {item.programCode || 'RMS'}
        </span>
        {duration ? (
          <span className={metaChipClass}>
            <Clock className="h-3 w-3" />
            {duration} min
          </span>
        ) : null}
        {difficulty && (
          <span className={metaChipClass}>
            <span className={cn('h-1.5 w-1.5 rounded-full', difficulty.dot)} />
            {difficulty.label}
          </span>
        )}
      </div>

      {/* Action */}
      <div className="relative mt-4 flex items-center justify-between border-t border-foreground/[0.06] pt-3.5">
        <span className={cn('text-xs font-semibold', theme.accent)}>{meta.actionLabel}</span>
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border border-foreground/[0.08] bg-background/60',
            theme.accent
          )}
        >
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </span>
      </div>
    </Link>
  );
}
