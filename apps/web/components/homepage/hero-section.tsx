'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { heroContent } from '@/lib/data/homepage-content';

export function HeroSection() {
  const [activeStage, setActiveStage] = useState<number>(0);
  const { systemVisual } = heroContent;

  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-20 md:pt-18 md:pb-24 border-b border-border/70 bg-grid-pattern">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
          {/* LEFT CONTENT COLUMN: Dominant Editorial Typography & Clear Institutional Positioning */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6 text-left">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{heroContent.eyebrow}</span>
            </div>

            {/* Dominant Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] xl:text-[3.5rem] font-extrabold tracking-tight text-foreground leading-[1.12]">
              {heroContent.headlinePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 dark:from-blue-400 dark:via-indigo-300 dark:to-blue-300 block sm:inline">
                {heroContent.headlineHighlight}
              </span>
            </h1>

            {/* Concise Human Supporting Copy */}
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              {heroContent.description}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href={heroContent.primaryCta.href}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{heroContent.primaryCta.label}</span>
              </Link>
              <Link
                href={heroContent.secondaryCta.href}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm sm:text-base shadow-sm hover:bg-muted/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{heroContent.secondaryCta.label}</span>
              </Link>
            </div>

            {/* Verified Proof Points */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground border-t border-border/80">
              {heroContent.proofPoints.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-foreground/80">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT VISUAL ELEMENT: Proprietary 6-Month Career-Readiness Journey System Visual */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="rounded-2xl border border-border bg-card/95 shadow-xl shadow-blue-500/5 backdrop-blur-sm overflow-hidden">
              {/* Journey Header */}
              <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-primary/10 via-background to-indigo-500/10">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/20 text-primary text-xs font-bold font-mono">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{systemVisual.journeyLabel}</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Continuous Guidance
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemVisual.tagline}
                </p>
              </div>

              {/* 5-Stage Interactive System Progression */}
              <div className="p-4 sm:p-5 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                  Integrated Program Progression
                </div>

                {systemVisual.stages.map((stage, idx) => {
                  const isActive = activeStage === idx;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setActiveStage(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-primary/50 bg-primary/10 shadow-sm'
                          : 'border-border/60 bg-muted/30 hover:bg-muted/70 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-1 rounded-md ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {stage.id}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {stage.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {stage.tag}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive ? 'text-primary rotate-90' : 'text-muted-foreground/50'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Continuous Supporting Elements Ribbon */}
              <div className="p-4 bg-muted/40 border-t border-border">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 text-center">
                  Integrated Across All 6 Months
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {systemVisual.supportingPillars.map((pillar, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-background border border-border/80 text-foreground/80 shadow-2xs"
                    >
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
