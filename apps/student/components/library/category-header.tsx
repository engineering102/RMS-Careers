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

      <div className="border-b border-border pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md', theme.iconTile)} aria-hidden="true">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Library</p>
            <h1 className="text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground md:text-[2rem]">
              {category.label}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {category.description}
            </p>
          </div>
          <div className="self-start text-sm sm:self-center">
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
