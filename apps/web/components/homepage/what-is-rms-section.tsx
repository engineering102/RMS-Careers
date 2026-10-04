import Link from 'next/link';
import { Sparkles, ArrowRight, BookOpen, Building2, Users2 } from 'lucide-react';
import { whatIsRmsContent } from '@/lib/data/homepage-content';

export function WhatIsRmsSection() {
  const pillarIcons = [BookOpen, Building2, Users2];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/30 relative" id="what-is-rms">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12 md:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{whatIsRmsContent.eyebrow}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {whatIsRmsContent.headline}
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {whatIsRmsContent.description}
          </p>
        </div>

        {/* Conceptual Pillar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {whatIsRmsContent.pillars.map((pillar, idx) => {
            const Icon = pillarIcons[idx % pillarIcons.length];
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm hover:border-primary/40 transition-all glow-card"
              >
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Action */}
        <div className="mt-10 text-center">
          <Link
            href={whatIsRmsContent.cta.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group"
          >
            <span>{whatIsRmsContent.cta.label}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" />
          </Link>
        </div>
      </div>
    </section>
  );
}
