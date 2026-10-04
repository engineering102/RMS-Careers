import { Sparkles, CheckCircle2, GraduationCap, Compass, Lightbulb, Shield } from 'lucide-react';
import { founderContent } from '@/lib/data/homepage-content';

export function FounderSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/30" id="founder">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT: Replaceable Visual Slot (Teaching / Workshop Framing) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative rounded-2xl border border-border bg-muted/40 p-6 sm:p-8 overflow-hidden glow-card">
              {/* Decorative background grid & glow */}
              <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                  <GraduationCap className="h-4 w-4" />
                  <span>Classroom Pedagogy</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Classroom First. Not A Course Factory.
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Formed through live chalk-and-board derivations, interactive coding labs, and direct student conversations across multiple engineering branches.
                  </p>
                </div>

                {/* Clean replaceable visual container slot */}
                <div className="rounded-xl border border-dashed border-border bg-card/60 p-6 text-center space-y-3">
                  <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Compass className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Real Classroom & Workshop Slot
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Structured for authentic workshop photo integration without layout shift.
                    </p>
                  </div>
                </div>

                {/* Pedagogy Triad */}
                <div className="pt-4 border-t border-border/80 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-background/50 border border-border/60">
                    <span className="font-semibold text-foreground block">Algorithmic</span>
                    <span className="text-muted-foreground text-[10px]">Intuition</span>
                  </div>
                  <div className="p-2 rounded-lg bg-background/50 border border-border/60">
                    <span className="font-semibold text-foreground block">Production</span>
                    <span className="text-muted-foreground text-[10px]">Git Standards</span>
                  </div>
                  <div className="p-2 rounded-lg bg-background/50 border border-border/60">
                    <span className="font-semibold text-foreground block">Accountable</span>
                    <span className="text-muted-foreground text-[10px]">Progress</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Narrative, Subhead & Principles */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{founderContent.eyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {founderContent.headline}
              </h2>
              <p className="text-base text-primary/90 font-medium">
                {founderContent.subhead}
              </p>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {founderContent.narrative.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Principles */}
            <div className="pt-4 space-y-3 border-t border-border/80">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                Foundational Principles
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {founderContent.principles.map((principle, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{principle.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {principle.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
              <div>
                <span className="font-semibold text-foreground block">
                  {founderContent.signature.name}
                </span>
                <span>{founderContent.signature.title} • {founderContent.signature.location}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>Verified Pedagogy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
