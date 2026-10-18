import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle2, Clock, ExternalLink, Hourglass, Lock } from 'lucide-react';
import type { ExternalTestSummary } from '@/lib/types/external-assessments';
import { formatDate, formatTime } from '@/lib/format/datetime';

const when = (d: Date) => `${formatDate(d, { month: 'short', day: 'numeric' })}, ${formatTime(d)}`;

/** A test sat on an external platform (e.g. QwikTest): schedule, link while open, and the imported score. */
export function ExternalTestCard({ test }: { test: ExternalTestSummary }) {
  const { windowState, result } = test;

  return (
    <Card className="border-border bg-card/60 hover:border-input transition-all flex flex-col justify-between">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              {test.provider}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[140px]">{test.batchName}</span>
          </div>
          {result ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Scored
            </span>
          ) : windowState === 'open' ? (
            <span className="text-[11px] font-semibold text-warning">Open now</span>
          ) : windowState === 'upcoming' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Lock className="h-3 w-3" /> Upcoming
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">Closed</span>
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground leading-snug">{test.title}</h3>
          {test.description && (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
              {test.description}
            </p>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {test.availableFrom && (
            <p className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Opens {when(test.availableFrom)}
            </p>
          )}
          {test.dueAt && (
            <p className="flex items-center gap-1.5">
              <Hourglass className="h-3.5 w-3.5" /> Closes {when(test.dueAt)}
            </p>
          )}
          {test.durationMinutes && (
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {test.durationMinutes} minutes
            </p>
          )}
        </div>

        {result ? (
          <div className="rounded-lg border border-success/20 bg-success/5 p-3">
            <p className="text-xs text-muted-foreground">Your score</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {result.obtainedScore} / {result.maxScore}{' '}
              <span className="text-sm font-medium text-muted-foreground">({result.percentage}%)</span>
            </p>
          </div>
        ) : windowState === 'closed' ? (
          <p className="text-xs text-muted-foreground">Results appear here once your institute imports them.</p>
        ) : null}
      </CardContent>

      {!result && windowState === 'open' && (
        <div className="px-5 pb-5 space-y-2">
          {test.url ? (
            <>
              <a
                href={test.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" /> Start test on {test.provider}
              </a>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Opens in a new tab. Sign in with your RMS Careers email so your score is matched to you.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">The test link has not been added yet.</p>
          )}
        </div>
      )}
    </Card>
  );
}
