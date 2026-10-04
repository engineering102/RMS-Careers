import { Sparkles, CheckCircle2, ShieldCheck, GraduationCap, Building2, Terminal } from 'lucide-react';
import { aboutContent } from '@/lib/data/homepage-content';

export function AboutSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 scroll-mt-12 bg-card/40" id="about">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Editorial Statement */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{aboutContent.eyebrow}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              {aboutContent.headline}
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {aboutContent.description}
            </p>

            <div className="space-y-4 pt-2">
              {aboutContent.pillars.map((pillar, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Architecture Box */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5 glow-card">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  RMS Careers Architecture
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                  Multi-Tier Model
                </span>
              </div>

              {/* Surface 1: Guest Learners */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Terminal className="h-4 w-4 text-blue-500" />
                  <span>Public Guest Learning Tier</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Browser-local execution for DSA problem solving. Zero registration friction, zero tracking cookies, zero database writes.
                </p>
              </div>

              {/* Surface 2: Enrolled Students */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <GraduationCap className="h-4 w-4 text-indigo-500" />
                  <span>Enrolled Student Cohort Tier</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Server-authoritative progress tracking, rubric-based tutor evaluations, structured milestones, and production project repositories.
                </p>
              </div>

              {/* Surface 3: Academic Institutions */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  <span>Institutional Administration Tier</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Autonomous college data isolation, batch scheduling, mentor assignments, and verifiable campus competency analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
