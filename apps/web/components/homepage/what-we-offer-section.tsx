import Link from 'next/link';
import {
  Sparkles,
  Code2,
  FolderGit2,
  Briefcase,
  Users2,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { whatWeOfferContent } from '@/lib/data/homepage-content';

export function WhatWeOfferSection() {
  const areaIcons = [Code2, FolderGit2, Briefcase, Users2];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 relative" id="what-we-offer">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14 md:mb-18">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{whatWeOfferContent.eyebrow}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {whatWeOfferContent.headline}
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {whatWeOfferContent.description}
          </p>
        </div>

        {/* 4 High-Level Concept Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {whatWeOfferContent.areas.map((area, idx) => {
            const Icon = areaIcons[idx % areaIcons.length];
            return (
              <div
                key={area.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-7 sm:p-8 shadow-sm hover:border-primary/40 transition-all glow-card group"
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon, Index & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/20">
                        {area.badge}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground/60">
                        {area.id}
                      </span>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {area.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {area.summary}
                  </p>

                  {/* Highlights checklist */}
                  <ul className="space-y-2 pt-2 text-xs text-foreground/80">
                    {area.highlights.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Link to Programs Architecture */}
                <div className="pt-6 mt-6 border-t border-border/80 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ecosystem Component</span>
                  <Link
                    href={area.href}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <span>View In Programs</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Context Note */}
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            {whatWeOfferContent.note}
          </p>
        </div>
      </div>
    </section>
  );
}
