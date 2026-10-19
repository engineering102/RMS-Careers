import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_THEMES } from '@/components/library/category-card';
import { formatCategoryCount, type LibraryCategory } from '@/lib/data/library-categories';

interface CategoryHeaderProps {
  category: LibraryCategory;
  totalCount: number;
}

/** Themed banner shown at the top of an opened My Library category. */
export function CategoryHeader({ category, totalCount }: CategoryHeaderProps) {
  const theme = CATEGORY_THEMES[category.type];
  const Icon = theme.icon;

  return (
    <div className="space-y-4">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All categories
      </Link>

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-6 shadow-sm md:p-8',
          theme.surface
        )}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-70 blur-3xl',
            theme.glow
          )}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ring-1 ring-inset ring-white/20',
              theme.iconTile
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('text-[11px] font-semibold uppercase tracking-widest', theme.accent)}>
              My Library · {category.tagline}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {category.label}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground md:text-sm">
              {category.description}
            </p>
          </div>
          <div className="self-start rounded-xl border border-foreground/[0.08] bg-background/60 px-4 py-2.5 text-xs backdrop-blur sm:self-center">
            <span className="font-semibold text-foreground">
              {formatCategoryCount(category, totalCount)}
            </span>
            <span className="text-muted-foreground"> available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
