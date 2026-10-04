import { Sparkles, CheckCircle2, Calendar } from 'lucide-react';
import { programJourneyContent } from '@/lib/data/homepage-content';

export function ProgramJourneySection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/20" id="program-journey">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{programJourneyContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {programJourneyContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {programJourneyContent.description}
          </p>
        </div>

        {/* Timeline Progression Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {programJourneyContent.weeks.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all glow-card"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{item.week}</span>
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    Phase {idx + 1}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.focus}
                </p>
              </div>

              {/* Milestone Box */}
              <div className="mt-6 pt-4 border-t border-border/80">
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wide">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Cohort Milestone</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {item.milestone}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
