import Link from 'next/link';
import { Layers, ArrowRight, Calendar, Users, BookOpen, Sparkles } from 'lucide-react';
import type { PublicProgram } from '@/lib/db/queries/programs';
import { programsContent } from '@/lib/data/homepage-content';

export function ProgramsSection({ programs }: { programs: PublicProgram[] }) {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 scroll-mt-12" id="programs">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" />
              <span>{programsContent.eyebrow}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {programsContent.headline}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {programsContent.description}
            </p>
          </div>

          <Link
            href={programsContent.viewAllCta.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group shrink-0"
          >
            <span>{programsContent.viewAllCta.label}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Programs Grid or Intentional Empty State */}
        {programs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {programs.slice(0, 3).map((program) => {
              const formattedStartDate = program.startDate
                ? new Date(program.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : null;

              return (
                <div
                  key={program.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm hover:border-primary/40 transition-all group glow-card"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-mono font-semibold text-primary">
                        {program.code}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Open for Inquiry
                      </span>
                    </div>

                    <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {program.name}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {program.description ||
                        'Comprehensive technical curriculum focused on production engineering standards, algorithmic mastery, and interview readiness.'}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-border/80 flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {formattedStartDate ? (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          Starts {formattedStartDate}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-primary" />
                          Rolling Cohorts
                        </span>
                      )}

                      {program.capacity > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Capacity: {program.capacity}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/programs/${program.code}`}
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span>Explore Program Track</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Intentional Availability State (matches prompt spec) */
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Layers className="h-7 w-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{programsContent.emptyState.badge}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              {programsContent.emptyState.title}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto mb-6">
              {programsContent.emptyState.description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={programsContent.emptyState.cta.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:bg-primary/90 transition-all"
              >
                <span>{programsContent.emptyState.cta.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/learn/dsa"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-all"
              >
                <span>Start Free DSA Sheets</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
