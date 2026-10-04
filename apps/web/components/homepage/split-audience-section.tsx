import Link from 'next/link';
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Code2,
  ShieldCheck
} from 'lucide-react';
import { audienceSplitContent } from '@/lib/data/homepage-content';

export function SplitAudienceSection() {
  const { students, institutions } = audienceSplitContent;

  return (
    <section className="py-16 md:py-24 border-b border-border/70 relative" id="institutions">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{audienceSplitContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {audienceSplitContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {audienceSplitContent.description}
          </p>
        </div>

        {/* Two-Sided Composed Split Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          {/* PANEL 1: FOR STUDENTS */}
          <div className="flex flex-col justify-between rounded-3xl border border-blue-500/20 bg-gradient-to-br from-card via-card to-blue-500/5 p-8 sm:p-10 shadow-sm hover:border-blue-500/40 transition-all glow-card">
            <div className="space-y-6">
              {/* Badge & Icon Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {students.badge}
                </span>
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3">
                  {students.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {students.description}
                </p>
              </div>

              {/* Checklist */}
              <ul className="space-y-3 pt-2 text-sm text-foreground/90">
                {students.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA & Invariant info */}
            <div className="pt-8 mt-8 border-t border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <Link
                href={students.cta.href}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Code2 className="h-4 w-4" />
                <span>{students.cta.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-muted-foreground text-center sm:text-right font-medium">
                {students.footnote}
              </span>
            </div>
          </div>

          {/* PANEL 2: FOR ACADEMIC INSTITUTIONS */}
          <div className="flex flex-col justify-between rounded-3xl border border-purple-500/20 bg-gradient-to-br from-card via-card to-purple-500/5 p-8 sm:p-10 shadow-sm hover:border-purple-500/40 transition-all glow-card">
            <div className="space-y-6">
              {/* Badge & Icon Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {institutions.badge}
                </span>
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3">
                  {institutions.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {institutions.description}
                </p>
              </div>

              {/* Checklist */}
              <ul className="space-y-3 pt-2 text-sm text-foreground/90">
                {institutions.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA & Architecture info */}
            <div className="pt-8 mt-8 border-t border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <Link
                href={institutions.cta.href}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm shadow-sm hover:bg-muted/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{institutions.cta.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-muted-foreground text-center sm:text-right font-medium">
                {institutions.footnote}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
