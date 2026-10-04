import Link from 'next/link';
import { Sparkles, CheckCircle2, ArrowRight, Code2, GraduationCap, Unlock, Lock } from 'lucide-react';
import { studentBenefitsContent } from '@/lib/data/homepage-content';

export function StudentBenefitsSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/20" id="students">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{studentBenefitsContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {studentBenefitsContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {studentBenefitsContent.description}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {studentBenefitsContent.benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all glow-card space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                0{idx + 1}
              </div>
              <h3 className="text-base font-bold text-foreground">
                {benefit.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {benefit.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Distinct Guest vs Enrolled Experience Box */}
        <div className="rounded-2xl border border-border bg-card/90 p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Guest Experience */}
            <div className="space-y-4 md:pr-6 md:border-r border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Unlock className="h-4 w-4" />
                </div>
                <h4 className="text-base font-bold text-foreground">
                  {studentBenefitsContent.distinction.guestTitle}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {studentBenefitsContent.distinction.guestDesc}
              </p>
              <Link
                href={studentBenefitsContent.cta.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-sm hover:bg-primary/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Code2 className="h-4 w-4" />
                <span>{studentBenefitsContent.cta.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Enrolled Experience */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <h4 className="text-base font-bold text-foreground">
                  {studentBenefitsContent.distinction.enrolledTitle}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {studentBenefitsContent.distinction.enrolledDesc}
              </p>
              <a
                href="https://student.rms-careers.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card text-foreground font-semibold text-xs sm:text-sm shadow-sm hover:bg-muted/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Go to Student Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
