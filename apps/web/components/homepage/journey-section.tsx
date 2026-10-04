import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { journeyContent } from '@/lib/data/homepage-content';

export function JourneySection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{journeyContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {journeyContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {journeyContent.description}
          </p>
        </div>

        {/* Connected Progression Framework */}
        <div className="relative">
          {/* Desktop Connecting Line behind nodes */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/30 to-blue-500/20 -translate-y-12 -z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 relative z-10">
            {journeyContent.steps.map((item, index) => (
              <div
                key={item.step}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all group glow-card relative"
              >
                <div>
                  {/* Step Header with Step Number & Phase Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-mono font-bold text-base flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      {item.step}
                    </div>
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {item.phase}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Step Quality Badge */}
                <div className="pt-4 mt-6 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{item.badge}</span>
                  </span>
                  {index < journeyContent.steps.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:block lg:hidden" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
