'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';

interface AssessmentSearchProps {
  currentQuery: string;
  currentBatchId: string | null;
  batches: { id: string; name: string }[];
}

/** Title search and (for multi-batch students) a batch filter. Both reset pagination. */
export function AssessmentSearch({ currentQuery, currentBatchId, batches }: AssessmentSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentQuery);

  useEffect(() => setValue(currentQuery), [currentQuery]);

  const push = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val && val.trim()) params.set(key, val.trim());
      else params.delete(key);
    }
    params.delete('page');
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <form
        role="search"
        className="relative w-full sm:w-64"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: value });
        }}
      >
        <label htmlFor="assessment-search" className="sr-only">
          Search assessments
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="assessment-search"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by title or program"
          maxLength={100}
          className="h-9 pl-9 pr-9 text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {isPending ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              setValue('');
              push({ q: null });
            }}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      {batches.length > 1 ? (
        <>
          <label htmlFor="assessment-batch" className="sr-only">
            Batch
          </label>
          <select
            id="assessment-batch"
            value={currentBatchId ?? ''}
            onChange={(e) => push({ batchId: e.target.value || null })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-52"
          >
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </div>
  );
}
