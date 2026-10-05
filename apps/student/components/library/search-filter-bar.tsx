'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X, Filter, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentType } from '@/lib/types/library';

interface SearchFilterBarProps {
  availableTopics: string[];
  currentQuery?: string;
  currentType?: string;
  currentTopic?: string;
}

const TYPE_OPTIONS: { label: string; value: ContentType | 'all' }[] = [
  { label: 'All Items', value: 'all' },
  { label: 'Lectures', value: 'lecture' },
  { label: 'Notes', value: 'notes' },
  { label: 'DSA Practice', value: 'dsa_sheet' },
  { label: 'Quizzes', value: 'quiz' },
  { label: 'Projects', value: 'project' },
  { label: 'Resources', value: 'resource' }
];

export function SearchFilterBar({
  availableTopics,
  currentQuery = '',
  currentType = 'all',
  currentTopic = 'all'
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
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    (currentQuery && currentQuery.trim()) ||
      (currentType && currentType !== 'all') ||
      (currentTopic && currentTopic !== 'all')
  );

  return (
    <div className="space-y-4">
      {/* Top Bar: Search Input & Topic Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search lectures, practice sheets, quizzes, topics..."
              className="w-full h-10 pl-10 pr-10 rounded-lg border border-slate-800 bg-slate-900/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
            />
            {searchVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Topic / Category Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={currentTopic}
              onChange={(e) => updateFilters({ topic: e.target.value })}
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition appearance-none cursor-pointer"
            >
              <option value="all">All Topics</option>
              {availableTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="h-10 border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 text-xs px-3"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Content Type Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TYPE_OPTIONS.map((opt) => {
          const isActive = currentType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateFilters({ type: opt.value })}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {isPending && (
        <div className="text-[11px] text-blue-400 flex items-center gap-1.5 animate-pulse">
          <BookOpen className="h-3 w-3" />
          <span>Updating library results...</span>
        </div>
      )}
    </div>
  );
}
