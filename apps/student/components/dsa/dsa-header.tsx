import React from 'react';
import { Clock, Code2, Layers, ListChecks } from 'lucide-react';
import { percentOf } from '@/lib/dsa/sheet-view';
import type { DsaProgressSummary } from '@/lib/types/dsa';

interface DsaHeaderProps {
  summary: DsaProgressSummary;
  topicCount: number;
  patternCount: number;
  estimatedHours: number;
}

const DIFFICULTY_TRACKS = [
  { key: 'easy', label: 'Easy', bar: 'bg-success', text: 'text-success' },
  { key: 'medium', label: 'Medium', bar: 'bg-warning', text: 'text-warning' },
  { key: 'hard', label: 'Hard', bar: 'bg-destructive', text: 'text-destructive' }
] as const;

export function DsaHeader({ summary, topicCount, patternCount, estimatedHours }: DsaHeaderProps) {
  const { totalProblems, totalSolved, overallPercentage } = summary;
  const counts = {
    easy: { solved: summary.easySolved, total: summary.easyTotal },
    medium: { solved: summary.mediumSolved, total: summary.mediumTotal },
    hard: { solved: summary.hardSolved, total: summary.hardTotal }
  };

  const meta = [
    { icon: Layers, value: topicCount, label: topicCount === 1 ? 'Topic' : 'Topics' },
    { icon: ListChecks, value: totalProblems, label: totalProblems === 1 ? 'Problem' : 'Problems' },
    { icon: Code2, value: patternCount, label: patternCount === 1 ? 'Pattern' : 'Patterns' },
    { icon: Clock, value: estimatedHours, label: 'Hrs' }
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch">
      {/* Title, description and sheet facts */}
      <div className="flex flex-col justify-center">
        <p className="text-xs font-medium text-muted-foreground">Practice / DSA Sheet</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">DSA Practice Center</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Pattern-based problems in a clear sequence, from fundamentals to interview-level questions. Tick a problem
          off when you solve it, and keep your solution link and revision notes alongside.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:flex-wrap">
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

      {/* Progress card */}
      <section aria-label="Your progress" className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-muted-foreground">Your Progress</h2>
          <span className="text-xs text-muted-foreground">
            {totalSolved} / {totalProblems} solved
          </span>
        </div>
        <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">{overallPercentage}%</p>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallPercentage}
          aria-label="Overall progress"
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${overallPercentage}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
          {DIFFICULTY_TRACKS.map((track) => {
            const { solved, total } = counts[track.key];
            return (
              <div key={track.key} className="min-w-0">
                <p className={`text-xs font-medium ${track.text}`}>{track.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {solved} <span className="font-normal text-muted-foreground">/ {total}</span>
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full ${track.bar}`} style={{ width: `${percentOf(solved, total)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
