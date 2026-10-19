'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X, Filter, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchFilterBarProps {
  availableTopics: string[];
  currentQuery?: string;
  currentType?: string;
  currentTopic?: string;
  /** Hide the topic dropdown (e.g. on the category hub, where only search applies). */
  showTopicFilter?: boolean;
  placeholder?: string;
}

export function SearchFilterBar({
  availableTopics,
  currentQuery = '',
  currentType = 'all',
  currentTopic = 'all',
  showTopicFilter = true,
  placeholder = 'Search lectures, practice sheets, quizzes, topics...'
}: SearchFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchVal, setSearchVal] = React.useState(currentQuery);

  // Keep local search input in sync if URL changes externally
  React.useEffect(() => {
    setSearchVal(currentQuery);
  }, [currentQuery]);

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all' || val.trim() === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    // Reset pagination to page 1 on filter changes
    params.delete('page');

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchVal });
  };

  const handleClearSearch = () => {
    setSearchVal('');
    updateFilters({ q: null });
  };

  const handleClearAll = () => {
    setSearchVal('');
    // Clearing search/topic keeps the student inside the category they opened.
    const params = new URLSearchParams();
    if (currentType && currentType !== 'all') params.set('type', currentType);
    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const hasActiveFilters = Boolean(
    (currentQuery && currentQuery.trim()) || (currentTopic && currentTopic !== 'all')
  );

  return (
    <div className="space-y-4">
      {/* Top Bar: Search Input & Topic Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={placeholder}
              className="w-full h-10 pl-10 pr-10 rounded-lg border border-border bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition"
            />
            {searchVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Topic / Category Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {showTopicFilter && (
            <div className="relative min-w-[160px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={currentTopic}
                onChange={(e) => updateFilters({ topic: e.target.value })}
                className="w-full h-10 pl-9 pr-8 rounded-lg border border-border bg-card/80 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition appearance-none cursor-pointer"
              >
                <option value="all">All Topics</option>
                {availableTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="h-10 border-border bg-card/60 text-muted-foreground hover:text-foreground text-xs px-3"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {isPending && (
        <div className="text-[11px] text-primary flex items-center gap-1.5 animate-pulse">
          <BookOpen className="h-3 w-3" />
          <span>Updating library results...</span>
        </div>
      )}
    </div>
  );
}
