import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, GraduationCap, Layers } from 'lucide-react';
import { SHEET_CATEGORY_LABELS, type SheetCardData } from '@/lib/dsa/sheet-view';

interface SheetCardProps {
  card: SheetCardData;
  href: string;
  /** Hide counts that would read as real zeros when progress failed to load. */
  progressUnavailable?: boolean;
}

const CATEGORY_ICON = { general: Layers, interview: GraduationCap, company: Building2 } as const;

/** One problem sheet in the DSA Practice catalog; the whole card opens the sheet. */
export function SheetCard({ card, href, progressUnavailable = false }: SheetCardProps) {
  const Icon = CATEGORY_ICON[card.category];
  const isComplete = card.totalProblems > 0 && card.solvedCount === card.totalProblems;
  const categoryLabel = card.company ?? SHEET_CATEGORY_LABELS[card.category];

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition hover:border-input hover:bg-secondary/40 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {categoryLabel}
      </p>
      <h2 className="mt-2 text-base font-semibold text-foreground">{card.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{card.shortDescription}</p>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{card.totalProblems}</span> problems ·{' '}
        <span className="font-medium text-foreground">{card.patternCount}</span>{' '}
        {card.patternCount === 1 ? 'pattern' : 'patterns'}
      </p>

      <div className="mt-auto pt-4">
        {progressUnavailable ? (
          <p className="text-xs text-muted-foreground">Progress unavailable</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className={isComplete ? 'font-medium text-success' : 'text-muted-foreground'}>
                {card.solvedCount} / {card.totalProblems} solved
              </span>
              <span className={`font-medium tabular-nums ${isComplete ? 'text-success' : 'text-foreground'}`}>
                {card.percentage}%
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={card.percentage}
              aria-label={`${card.title} progress`}
            >
              <div
                className={`h-full rounded-full ${isComplete ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${card.percentage}%` }}
              />
            </div>
          </>
        )}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          {card.solvedCount > 0 && !progressUnavailable ? 'Continue' : 'Open sheet'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
