import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Award, ClipboardCheck, ExternalLink, FolderGit2, Lock, Timer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AssessmentHubItem, AssessmentKind, AssessmentTone } from '@/lib/types/assessment-hub';

export const KIND_META: Record<AssessmentKind, { label: string; icon: LucideIcon; tile: string }> = {
  formal: { label: 'Timed test', icon: Timer, tile: 'bg-muted text-muted-foreground' },
  practice: { label: 'Practice quiz', icon: ClipboardCheck, tile: 'bg-muted text-muted-foreground' },
  project: { label: 'Project', icon: FolderGit2, tile: 'bg-muted text-muted-foreground' },
  external_test: { label: 'External test', icon: ExternalLink, tile: 'bg-muted text-muted-foreground' },
  report: { label: 'Report card', icon: Award, tile: 'bg-muted text-muted-foreground' }
};

const TONE_CLASSES: Record<AssessmentTone, string> = {
  primary: 'border-transparent bg-muted text-foreground',
  success: 'border-transparent bg-success/10 text-success',
  warning: 'border-transparent bg-warning/10 text-warning',
  destructive: 'border-transparent bg-destructive/10 text-destructive',
  muted: 'border-border bg-transparent text-muted-foreground'
};

const ACTION_CLASSES: Record<NonNullable<AssessmentHubItem['action']>['emphasis'], string> = {
  primary: '',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  secondary: ''
};

function Meta({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center before:mr-1.5 before:text-muted-foreground/50 before:content-['·'] first:before:hidden">
      {children}
    </span>
  );
}

/** One assessment of any kind, laid out the same way so a mixed list reads as one list. */
export function AssessmentRow({ item }: { item: AssessmentHubItem }) {
  const kind = KIND_META[item.kind];
  const Icon = kind.icon;
  const action = item.action;

  return (
    <li
      className={cn(
        'relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5',
        item.urgent && 'bg-warning/[0.04]'
      )}
    >
      {item.urgent ? <span className="absolute inset-y-0 left-0 w-0.5 bg-warning" aria-hidden="true" /> : null}

      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md', kind.tile)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:line-clamp-1">
            {item.title}
          </h3>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            <Meta>
              <span className="font-medium text-foreground/80">{kind.label}</span>
            </Meta>
            {item.source ? (
              <Meta>
                <span className="font-mono">{item.source}</span>
              </Meta>
            ) : null}
            {item.batchName ? (
              <Meta>
                <span className="max-w-[16rem] truncate">{item.batchName}</span>
              </Meta>
            ) : null}
            {item.facts.map((fact) => (
              <Meta key={fact}>{fact}</Meta>
            ))}
          </p>
          {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pl-12 sm:shrink-0 sm:justify-end sm:pl-0">
        <div className="flex min-w-0 flex-col items-start gap-1 sm:w-48 sm:items-end">
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                TONE_CLASSES[item.status.tone]
              )}
            >
              {item.status.label}
            </span>
            {item.score ? (
              <span className="text-xs font-semibold tabular-nums text-foreground">{item.score}</span>
            ) : null}
          </div>
          {item.dateText ? (
            <span
              className={cn(
                'text-xs tabular-nums',
                item.urgent ? 'font-medium text-warning' : 'text-muted-foreground'
              )}
            >
              {item.dateText}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end sm:w-36">
          {action ? (
            <Button
              asChild
              size="sm"
              variant={action.emphasis === 'secondary' ? 'outline' : 'default'}
              className={cn('h-8 gap-1.5 px-3 text-xs', ACTION_CLASSES[action.emphasis])}
            >
              {action.external ? (
                <a href={action.href} target="_blank" rel="noopener noreferrer">
                  <span className="max-w-[9rem] truncate">{action.label}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <Link href={action.href}>
                  <span>{action.label}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </Button>
          ) : item.bucket === 'upcoming' ? (
            <span className="inline-flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Locked
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
