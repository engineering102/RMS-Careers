'use client';

import React, { useMemo, useState } from 'react';
import { Library, Search, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  buildSheetHref,
  filterSheetCards,
  SHEET_CATEGORY_LABELS,
  type SheetCardData
} from '@/lib/dsa/sheet-view';
import type { DsaSheetCategory } from '@/lib/types/dsa';
import { SheetCard } from './sheet-card';

interface SheetCatalogProps {
  cards: SheetCardData[];
  batchId?: string;
  progressUnavailable?: boolean;
}

/** Search and category filters only earn their space once the catalog is larger than a glance. */
export const CATALOG_CONTROLS_MIN_SHEETS = 7;

const CATEGORY_ORDER: DsaSheetCategory[] = ['general', 'interview', 'company'];

export function SheetCatalog({ cards, batchId, progressUnavailable = false }: SheetCatalogProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DsaSheetCategory | 'all'>('all');

  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => cards.some((card) => card.category === c)),
    [cards]
  );
  const showSearch = cards.length >= CATALOG_CONTROLS_MIN_SHEETS;
  const showCategories = showSearch && categories.length > 1;
  const visible = filterSheetCards(cards, query, category);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="No problem sheets yet"
        description="Problem sheets will appear here once they are published for the portal."
      />
    );
  }

  return (
    <section aria-label="Problem sheets" className="space-y-4">
      {showSearch && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              aria-label="Search problem sheets"
              placeholder="Search sheets"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {showCategories && (
            <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
              {(['all', ...categories] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    category === c
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground/80 hover:border-input hover:text-foreground'
                  }`}
                >
                  {c === 'all' ? 'All' : SHEET_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No sheets match"
          description="Try a different search or category."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        // One group per sheet category (General DSA, Interview Preparation, Company Specific); the headings
        // only appear once the visible sheets span more than one.
        <div className="space-y-8">
          {CATEGORY_ORDER.map((c) => ({ category: c, cards: visible.filter((card) => card.category === c) }))
            .filter((group) => group.cards.length > 0)
            .map((group, _index, groups) => (
              <section
                key={group.category}
                aria-label={SHEET_CATEGORY_LABELS[group.category]}
                className="space-y-3"
              >
                {groups.length > 1 && (
                  <h2 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
                    {SHEET_CATEGORY_LABELS[group.category]}
                    <span className="text-xs font-normal tabular-nums text-muted-foreground">
                      {group.cards.length} {group.cards.length === 1 ? 'sheet' : 'sheets'}
                    </span>
                  </h2>
                )}
                <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {group.cards.map((card) => (
                    <li key={card.slug}>
                      <SheetCard
                        card={card}
                        href={buildSheetHref(card.slug, { batchId })}
                        progressUnavailable={progressUnavailable}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </section>
  );
}
