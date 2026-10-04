import { gapContent } from '@/lib/data/homepage-content';
import { ArrowDown, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';

export function GapSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 relative" id="the-gap">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <span>{gapContent.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {gapContent.headline}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {gapContent.narrative}
          </p>
        </div>

        {/* Editorial Storytelling Diagram: Vertical / Horizontal Bridge Flow */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-center">
            {/* Step 1: Academic Foundation */}
            <div className="lg:col-span-3 rounded-2xl border border-border/80 bg-muted/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
                <BookOpen className="h-4 w-4" />
                <span>{gapContent.academicFoundation.title}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {gapContent.academicFoundation.subtitle}
              </p>
              <ul className="space-y-2 pt-2 text-xs text-foreground/80">
                {gapContent.academicFoundation.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bridge 1 */}
            <div className="lg:col-span-1 flex justify-center py-2 lg:py-0">
              <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Leads to</span>
                <ArrowDown className="h-5 w-5 lg:-rotate-90 text-primary" />
              </div>
            </div>

            {/* Step 2: The Gap (What Industry Evaluates) */}
            <div className="lg:col-span-3 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                <AlertCircle className="h-4 w-4" />
                <span>{gapContent.theGap.title}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {gapContent.theGap.subtitle}
              </p>
              <ul className="space-y-2 pt-2 text-xs text-foreground/90">
                {gapContent.theGap.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bridge 2 */}
            <div className="lg:col-span-1 flex justify-center py-2 lg:py-0">
              <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold">RMS Solves</span>
                <ArrowDown className="h-5 w-5 lg:-rotate-90 text-emerald-500" />
              </div>
            </div>

            {/* Step 3: Career Readiness Outcome */}
            <div className="lg:col-span-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                <span>{gapContent.careerReadiness.title}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {gapContent.careerReadiness.subtitle}
              </p>
              <ul className="space-y-2 pt-2 text-xs text-foreground/90">
                {gapContent.careerReadiness.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="font-semibold text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
