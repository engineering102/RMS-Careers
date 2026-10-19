import React from 'react';
import { CloudOff, Library, ListChecks } from 'lucide-react';
import { percentOf } from '@/lib/dsa/sheet-view';
import type { DsaProgressSummary } from '@/lib/types/dsa';

const DIFFICULTY_TRACKS = [
  { key: 'easy', label: 'Easy', bar: 'bg-success', text: 'text-success' },
  { key: 'medium', label: 'Medium', bar: 'bg-warning', text: 'text-warning' },
  { key: 'hard', label: 'Hard', bar: 'bg-destructive', text: 'text-destructive' }
] as const;

export type DifficultyCounts = Record<'easy' | 'medium' | 'hard', { solved: number; total: number }>;

interface DsaProgressCardProps {
  label: string;
  solved: number;
  total: number;
  byDifficulty: DifficultyCounts;
  /** Progress could not be loaded: show that instead of misleading zeros. */
  unavailable?: boolean;
}

/** Percentage, progress bar and per-difficulty split, shared by the catalog and a selected sheet. */
export function DsaProgressCard({ label, solved, total, byDifficulty, unavailable = false }: DsaProgressCardProps) {
  const percent = percentOf(solved, total);
  return (
    <section aria-label={label} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
        {!unavailable && (
          <span className="text-xs text-muted-foreground">
            {solved} / {total} solved
          </span>
        )}
      </div>
      {unavailable ? (
        <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Your progress could not be loaded right now. Refresh the page to try again.</p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-4xl font-bold tracking-tight text-foreground tabular-nums">{percent}%</p>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={label}
          >
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
            {DIFFICULTY_TRACKS.map((track) => {
              const counts = byDifficulty[track.key];
              return (
                <div key={track.key} className="min-w-0">
                  <p className={`text-xs font-medium ${track.text}`}>{track.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {counts.solved} <span className="font-normal text-muted-foreground">/ {counts.total}</span>
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${track.bar}`}
                      style={{ width: `${percentOf(counts.solved, counts.total)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

interface DsaHeaderProps {
  summary: DsaProgressSummary;
  sheetCount: number;
  progressUnavailable?: boolean;
}

/** DSA Practice catalog heading with the student's overall progress (each problem counted once). */
export function DsaHeader({ summary, sheetCount, progressUnavailable = false }: DsaHeaderProps) {
  const meta = [
    { icon: Library, value: sheetCount, label: sheetCount === 1 ? 'Sheet' : 'Sheets' },
    { icon: ListChecks, value: summary.totalProblems, label: summary.totalProblems === 1 ? 'Unique problem' : 'Unique problems' }
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch">
      <div className="flex flex-col justify-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">DSA Practice</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Choose a curated problem sheet and work through it pattern by pattern. Progress and notes follow the problem,
          so a problem you solve in one sheet is solved in every sheet that lists it.
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {meta.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="font-semibold text-foreground">{value}</span>{' '}
                <span className="text-muted-foreground">{label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <DsaProgressCard
        label="Overall progress"
        solved={summary.totalSolved}
        total={summary.totalProblems}
        unavailable={progressUnavailable}
        byDifficulty={{
          easy: { solved: summary.easySolved, total: summary.easyTotal },
          medium: { solved: summary.mediumSolved, total: summary.mediumTotal },
          hard: { solved: summary.hardSolved, total: summary.hardTotal }
        }}
      />
    </div>
  );
}
