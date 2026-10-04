import type { Metadata } from 'next';
import Link from 'next/link';
import { Code2, ArrowRight, Sparkles, ShieldCheck, Layers, Clock } from 'lucide-react';
import { getAllPublicSheets } from '@/lib/data/dsa-sheets';
import { SheetProgressBadge } from '@/components/sheet-progress';

export const metadata: Metadata = {
  title: 'Free Starter DSA Practice Sheets',
  description:
    'Solve curated algorithmic problems in your browser without signing up. Practice fundamental patterns anonymously.',
  openGraph: {
    title: 'Free Starter DSA Sheets | RMS Careers',
    description: 'Solve curated algorithmic problems anonymously with zero sign-up required.'
  }
};

export default function LearnPage() {
  const sheets = getAllPublicSheets();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Code2 className="h-4 w-4" />
          <span>Freemium Practice Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Public Starter DSA Sheets
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Practice essential technical interview patterns directly in your browser. All progress in this portal is maintained exclusively in your local browser storage—no accounts, no passwords, and zero tracking.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 mb-8 flex items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>
            <strong>Anonymous Mode:</strong> Solved status is stored in browser <code className="font-mono bg-background px-1 py-0.5 rounded border border-border">localStorage</code>. To preserve academic integrity, anonymous progress does not award server XP, update streaks, or sync to leaderboards.
          </span>
        </div>
      </div>

      {/* Sheets List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sheets.map((sheet) => (
          <div
            key={sheet.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  {sheet.patternCount} Core Patterns
                </span>
                <SheetProgressBadge
                  sheetSlug={sheet.slug}
                  totalQuestions={sheet.questions.length}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {sheet.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {sheet.description}
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Featured Problems:
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {sheet.questions.slice(0, 3).map((q) => (
                    <li key={q.id} className="flex items-center justify-between">
                      <span className="truncate">{q.title}</span>
                      <span className="text-[11px] font-mono text-muted-foreground capitalize">
                        {q.difficulty}
                      </span>
                    </li>
                  ))}
                  {sheet.questions.length > 3 && (
                    <li className="text-[11px] text-primary italic">
                      + {sheet.questions.length - 3} more problems
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                ~{sheet.estimatedHours} hrs
              </span>
              <Link
                href={`/learn/dsa/${sheet.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:bg-primary/90 transition-colors"
              >
                <span>Open Sheet</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
