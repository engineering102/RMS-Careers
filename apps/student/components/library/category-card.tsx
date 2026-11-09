import Link from 'next/link';
import { ArrowRight, Bookmark, Code2, FileText, FolderGit2, HelpCircle, Video, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatCategoryCount,
  libraryCategoryHref,
  type LibraryCategory,
  type LibraryCategoryType
} from '@/lib/data/library-categories';

export interface CategoryTheme {
  /** What tells categories apart: each has its own icon. */
  icon: LucideIcon;
  /** Card surface (shared: categories are not colour-coded). */
  surface: string;
  /** Kept for callers; no decorative glow in the redesign. */
  glow: string;
  /** Icon tile. */
  iconTile: string;
  /** Accent text (CTA). */
  accent: string;
  /** Focus ring. */
  ring: string;
}

const SHARED = {
  surface: 'border-border bg-card hover:border-border-strong',
  glow: '',
  iconTile: 'bg-muted text-foreground',
  accent: 'text-foreground',
  ring: 'focus-visible:ring-ring'
} as const;

// Categories share one quiet look and differ by icon and name. Colour stays reserved for state.
export const CATEGORY_THEMES: Record<LibraryCategoryType, CategoryTheme> = {
  lecture: { icon: Video, ...SHARED },
  notes: { icon: FileText, ...SHARED },
  dsa_sheet: { icon: Code2, ...SHARED },
  quiz: { icon: HelpCircle, ...SHARED },
  project: { icon: FolderGit2, ...SHARED },
  resource: { icon: Bookmark, ...SHARED }
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
      <div className="flex items-start justify-between gap-4">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', theme.iconTile)} aria-hidden="true">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="tabular font-display text-2xl font-semibold leading-none tracking-tight text-foreground">
          {itemCount}
        </span>
      </div>

      <div className="mt-5 flex-1 space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{category.label}</h2>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{category.description}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">
          {isEmpty
            ? 'Nothing here yet'
            : `${formatCategoryCount(category, itemCount)}${
                topicCount > 0 ? ` · ${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}` : ''
              }`}
        </span>
        {!isEmpty && (
          <span className={cn('flex items-center gap-1 font-medium', theme.accent)}>
            Explore
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </span>
        )}
      </div>
    </>
  );

  const baseClass = cn('group flex flex-col rounded-lg border p-5', theme.surface);

  if (isEmpty) {
    return (
      <div className={cn(baseClass, 'opacity-60')} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={libraryCategoryHref(category.type)}
      className={cn(
        baseClass,
        'transition-[border-color,transform] duration-150 active:scale-[0.99] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        theme.ring
      )}
    >
      {body}
    </Link>
  );
}
