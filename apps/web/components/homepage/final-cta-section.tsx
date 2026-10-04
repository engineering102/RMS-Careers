import Link from 'next/link';
import { Code2, ArrowRight, Layers, Sparkles } from 'lucide-react';
import { finalCtaContent } from '@/lib/data/homepage-content';

export function FinalCtaSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-grid-pattern">
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 p-8 sm:p-12 md:p-16 text-center shadow-xl shadow-blue-500/5 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{finalCtaContent.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
            {finalCtaContent.headline}
          </h2>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            {finalCtaContent.description}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={finalCtaContent.primaryCta.href}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg hover:bg-primary/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Code2 className="h-5 w-5" />
              <span>{finalCtaContent.primaryCta.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={finalCtaContent.secondaryCta.href}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-border bg-card text-foreground font-semibold text-base hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Layers className="h-5 w-5 text-muted-foreground" />
              <span>{finalCtaContent.secondaryCta.label}</span>
            </Link>
          </div>

          <div className="pt-4 text-xs text-muted-foreground font-medium">
            Open in browser • 100% Free • No registration barrier
          </div>
        </div>
      </div>
    </section>
  );
}
