import Link from 'next/link';
import { Sparkles, ArrowRight, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { careerReadinessContent } from '@/lib/data/homepage-content';

export function CareerReadinessSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-gradient-to-b from-card/60 to-background" id="readiness">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="rounded-3xl border border-primary/30 bg-card/90 p-8 sm:p-10 lg:p-14 shadow-xl glow-card relative overflow-hidden">
          {/* Subtle accent glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

          <div className="relative z-10 space-y-8">
            {/* Header */}
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{careerReadinessContent.eyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                {careerReadinessContent.headline}
              </h2>
              <p className="text-base sm:text-lg text-primary font-semibold">
                {careerReadinessContent.subhead}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {careerReadinessContent.description}
              </p>
            </div>

            {/* The Six Core Components Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {careerReadinessContent.components.map((comp, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card/80 p-4 sm:p-5 space-y-1.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-bold text-foreground text-sm">
                      {comp.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                    {comp.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Institutional Commercial Note & CTA (NO PRICE, purely institutional partnership) */}
            <div className="pt-6 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Institutional Partnership Model</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {careerReadinessContent.commercialNote}
                </p>
              </div>

              <Link
                href={careerReadinessContent.cta.href}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Building2 className="h-4 w-4" />
                <span>{careerReadinessContent.cta.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
