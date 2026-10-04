import Link from 'next/link';
import { Code2, ArrowRight, ShieldCheck, Clock, Layers, Sparkles } from 'lucide-react';
import type { DSASheet } from '@/lib/data/dsa-sheets';
import { publicDsaContent } from '@/lib/data/homepage-content';

export function PublicDsaSection({ sheets }: { sheets: DSASheet[] }) {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <Code2 className="h-3.5 w-3.5" />
              <span>{publicDsaContent.eyebrow}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {publicDsaContent.headline}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {publicDsaContent.description}
            </p>
          </div>

          <Link
            href={publicDsaContent.viewAllCta.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group shrink-0"
          >
            <span>{publicDsaContent.viewAllCta.label}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Anonymous Privacy Assurance Banner */}
        <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {publicDsaContent.privacyCallout.title}:
              </span>{' '}
              <span>{publicDsaContent.privacyCallout.description}</span>
            </div>
          </div>
          <div className="shrink-0 text-xs font-mono font-medium px-2.5 py-1 rounded bg-background border border-border">
            localStorage only
          </div>
        </div>

        {/* Starter Sheets Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm hover:border-primary/40 transition-all group glow-card"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span className="font-mono font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                    {sheet.questions.length} Problems
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                    <Layers className="h-3 w-3" />
                    {sheet.patternCount} Patterns
                  </span>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors mb-2">
                  {sheet.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-5">
                  {sheet.shortDescription}
                </p>
              </div>

              <div className="pt-5 border-t border-border/80 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  ~{sheet.estimatedHours} hrs study
                </span>
                <Link
                  href={`/learn/dsa/${sheet.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Practice Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
