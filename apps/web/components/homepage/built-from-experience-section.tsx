import Link from 'next/link';
import {
  Sparkles,
  Users2,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Layers,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { builtFromExperienceContent } from '@/lib/data/homepage-content';

export function BuiltFromExperienceSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/40 relative" id="built-from-experience">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Human Credibility Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{builtFromExperienceContent.eyebrow}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {builtFromExperienceContent.headline}
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {builtFromExperienceContent.description}
            </p>

            {/* Principles Checklist */}
            <div className="space-y-4 pt-2">
              {builtFromExperienceContent.principles.map((principle, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {principle.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5">
                      {principle.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Teaser CTA */}
            <div className="pt-4">
              <Link
                href={builtFromExperienceContent.cta.href}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group"
              >
                <span>{builtFromExperienceContent.cta.label}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" />
              </Link>
            </div>
          </div>

          {/* Right Column: Clearly Marked Replaceable Visual Slot */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg glow-card">
              {/* Replaceable Visual Frame Header */}
              <div className="px-4 py-3 bg-muted/60 border-b border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="font-mono text-muted-foreground">Classroom Context</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                  {builtFromExperienceContent.placeholderNote.tag}
                </span>
              </div>

              {/* Visual Area: Technical Classroom Framework */}
              <div className="p-6 sm:p-8 bg-muted/20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <Users2 className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {builtFromExperienceContent.placeholderNote.title}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                    {builtFromExperienceContent.placeholderNote.subtitle}
                  </p>
                </div>
              </div>

              {/* Pedagogy Invariant Footer */}
              <div className="px-5 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Real Engineering Undergraduates</span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground/80">
                  Live Cohorts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
