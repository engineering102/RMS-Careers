import Link from 'next/link';
import { Building2, ArrowRight, Code2, Sparkles, ShieldCheck } from 'lucide-react';
import { finalCtaContent } from '@/lib/data/homepage-content';

export function FinalCtaSection() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-grid-pattern border-b border-border/70" id="final-cta">
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 p-8 sm:p-12 text-center shadow-xl shadow-blue-500/5 space-y-6 glow-card">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{finalCtaContent.badge}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
            {finalCtaContent.headline}
          </h2>

          <p className="max-w-xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
            {finalCtaContent.description}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={finalCtaContent.studentCta.href}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Code2 className="h-4 w-4" />
              <span>{finalCtaContent.studentCta.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={finalCtaContent.institutionCta.href}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{finalCtaContent.institutionCta.label}</span>
            </a>
          </div>

          <div className="pt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{finalCtaContent.footnote}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
