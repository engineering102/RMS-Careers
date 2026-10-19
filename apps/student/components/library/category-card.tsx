import Link from 'next/link';
import {
  ArrowUpRight,
  Bookmark,
  Code2,
  FileText,
  FolderGit2,
  HelpCircle,
  Video,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatCategoryCount,
  libraryCategoryHref,
  type LibraryCategory,
  type LibraryCategoryType
} from '@/lib/data/library-categories';

export interface CategoryTheme {
  icon: LucideIcon;
  /** Card surface: soft tinted gradient + border. */
  surface: string;
  /** Decorative glow orb in the top-right corner. */
  glow: string;
  /** Icon tile: saturated gradient. */
  iconTile: string;
  /** Accent text (tagline, CTA). */
  accent: string;
  /** Focus ring colour. */
  ring: string;
}

// Full class strings (no interpolation) so Tailwind's JIT can see them.
export const CATEGORY_THEMES: Record<LibraryCategoryType, CategoryTheme> = {
  lecture: {
    icon: Video,
    surface:
      'border-violet-500/20 bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-500/[0.24] dark:via-card dark:to-indigo-500/[0.10] hover:border-violet-500/45',
    glow: 'bg-violet-500/25 dark:bg-violet-500/45',
    iconTile: 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/30',
    accent: 'text-violet-700 dark:text-violet-300',
    ring: 'focus-visible:ring-violet-500/50'
  },
  notes: {
    icon: FileText,
    surface:
      'border-sky-500/20 bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-sky-500/[0.24] dark:via-card dark:to-cyan-500/[0.10] hover:border-sky-500/45',
    glow: 'bg-sky-500/25 dark:bg-sky-500/45',
    iconTile: 'bg-gradient-to-br from-sky-500 to-cyan-600 shadow-sky-500/30',
    accent: 'text-sky-700 dark:text-sky-300',
    ring: 'focus-visible:ring-sky-500/50'
  },
  dsa_sheet: {
    icon: Code2,
    surface:
      'border-emerald-500/20 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-500/[0.24] dark:via-card dark:to-teal-500/[0.10] hover:border-emerald-500/45',
    glow: 'bg-emerald-500/25 dark:bg-emerald-500/45',
    iconTile: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30',
    accent: 'text-emerald-700 dark:text-emerald-300',
    ring: 'focus-visible:ring-emerald-500/50'
  },
  quiz: {
    icon: HelpCircle,
    surface:
      'border-rose-500/20 bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-rose-500/[0.24] dark:via-card dark:to-pink-500/[0.10] hover:border-rose-500/45',
    glow: 'bg-rose-500/25 dark:bg-rose-500/45',
    iconTile: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30',
    accent: 'text-rose-700 dark:text-rose-300',
    ring: 'focus-visible:ring-rose-500/50'
  },
  project: {
    icon: FolderGit2,
    surface:
      'border-amber-500/25 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-500/[0.24] dark:via-card dark:to-orange-500/[0.10] hover:border-amber-500/50',
    glow: 'bg-amber-500/25 dark:bg-amber-500/45',
    iconTile: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30',
    accent: 'text-amber-700 dark:text-amber-300',
    ring: 'focus-visible:ring-amber-500/50'
  },
  resource: {
    icon: Bookmark,
    surface:
      'border-slate-500/20 bg-gradient-to-br from-slate-50 via-white to-zinc-100 dark:from-slate-400/[0.16] dark:via-card dark:to-zinc-400/[0.08] hover:border-slate-500/45',
    glow: 'bg-slate-500/20 dark:bg-slate-400/35',
    iconTile: 'bg-gradient-to-br from-slate-600 to-zinc-800 shadow-slate-500/30',
    accent: 'text-slate-700 dark:text-slate-300',
    ring: 'focus-visible:ring-slate-500/50'
  }
};

interface CategoryCardProps {
  category: LibraryCategory;
  itemCount: number;
  topicCount: number;
}

export function CategoryCard({ category, itemCount, topicCount }: CategoryCardProps) {
  const theme = CATEGORY_THEMES[category.type];
  const Icon = theme.icon;
  const isEmpty = itemCount === 0;

  const body = (
    <>
      {/* Decorative glow + hairline highlight */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl transition-opacity duration-300',
          theme.glow,
          isEmpty ? 'opacity-30' : 'opacity-60 group-hover:opacity-100'
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ring-1 ring-inset ring-white/20',
            theme.iconTile,
            isEmpty && 'grayscale-[60%]'
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground">
            {itemCount}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {itemCount === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>

      <div className="relative mt-6 space-y-1.5">
        <p className={cn('text-[11px] font-semibold uppercase tracking-widest', theme.accent)}>
          {category.tagline}
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{category.label}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {category.description}
        </p>
      </div>

      <div className="relative mt-6 flex items-center justify-between border-t border-foreground/[0.06] pt-4 text-xs">
        <span className="text-muted-foreground">
          {isEmpty
            ? 'Nothing here yet'
            : `${formatCategoryCount(category, itemCount)}${
                topicCount > 0 ? ` · ${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}` : ''
              }`}
        </span>
        {!isEmpty && (
          <span className={cn('flex items-center gap-1 font-semibold', theme.accent)}>
            Explore
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </span>
        )}
      </div>
    </>
  );

  const baseClass = cn(
    'group relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-sm',
    theme.surface
  );

  if (isEmpty) {
    return (
      <div className={cn(baseClass, 'opacity-70')} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={libraryCategoryHref(category.type)}
      aria-label={`${category.label}: ${formatCategoryCount(category, itemCount)}`}
      className={cn(
        baseClass,
        'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        theme.ring
      )}
    >
      {body}
    </Link>
  );
}
