import Link from 'next/link';
import {
  Code2,
  BookOpen,
  Layers,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  Sparkles,
  Terminal,
  Cpu
} from 'lucide-react';
import { getPublicPrograms } from '@/lib/db/queries/programs';
import { getAllPublicSheets } from '@/lib/data/dsa-sheets';
import { ProgramCard } from '@/components/program-card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const publicPrograms = await getPublicPrograms();
  const dsaSheets = getAllPublicSheets();

  return (
    <div className="flex flex-col w-full bg-gradient-hero">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-medium tracking-wide">
              <Sparkles className="h-4 w-4" />
              <span>RMS Careers Technical Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl leading-[1.15]">
              Structured Technical Curriculum <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
                Built for Engineering Careers
              </span>
            </h1>

            <p className="max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
              RMS Careers connects academic institutions and ambitious learners with rigorous, pattern-driven computer science curriculum, full-stack training, and anonymous starter DSA practice.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/learn/dsa"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Code2 className="h-5 w-5" />
                <span>Practice Starter DSA (Free)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/programs"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card/80 text-foreground font-semibold text-sm sm:text-base shadow-sm hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Layers className="h-5 w-5 text-muted-foreground" />
                <span>Explore Public Programs</span>
              </Link>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>No Login Required for Starter Sheets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Zero Database Writes in Anonymous Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Institutional Partner Cohorts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHAT RMS CAREERS PROVIDES */}
      <section className="py-16 md:py-24 border-b border-border/60 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              What RMS Careers Delivers
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              A comprehensive technical ecosystem engineered to eliminate gaps between college classrooms and modern software engineering demands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Code2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Pattern-First DSA Curriculum</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rather than memorizing arbitrary problems, learners master core algorithmic patterns—two pointers, sliding window, topological sort, dynamic programming—transferable to any interview setting.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="h-12 w-12 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Terminal className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Production Full-Stack Engineering</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hands-on training in modern stacks: Next.js App Router, TypeScript, relational databases (PostgreSQL/Drizzle), REST/GraphQL APIs, and server-side architecture.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Institutional Cohort Model</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Colleges partner with RMS Careers to deploy standardized, tutor-guided technical training for student batches with structured milestone reviews and batch analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PUBLIC PROGRAMS SHOWCASE */}
      <section className="py-16 md:py-24 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                <Layers className="h-4 w-4" />
                <span>Available Offerings</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Public Training Programs
              </h2>
            </div>
            <Link
              href="/programs"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <span>View all programs</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {publicPrograms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicPrograms.slice(0, 3).map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                New Cohorts Opening Soon
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Public platform programs are scheduled periodically. You can explore the structured curriculum tracks or start practicing with our free starter DSA sheets.
              </p>
              <Link
                href="/curriculum"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <span>Browse Curriculum Pathways</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="py-16 md:py-24 border-b border-border/60 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              How the Platform Works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              A transparent, step-by-step framework taking learners from fundamentals to verified technical competency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-3 relative">
              <div className="text-3xl font-black text-primary/30 font-mono">01</div>
              <h3 className="text-base font-bold text-foreground">Discovery & Orientation</h3>
              <p className="text-sm text-muted-foreground">
                Explore curriculum tracks and test fundamental problem-solving concepts using our free, anonymous starter DSA sheets.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3 relative">
              <div className="text-3xl font-black text-primary/30 font-mono">02</div>
              <h3 className="text-base font-bold text-foreground">Institutional Cohort Onboarding</h3>
              <p className="text-sm text-muted-foreground">
                Colleges enroll student batches into structured programs with direct tutor mentorship and scheduled curriculum milestones.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3 relative">
              <div className="text-3xl font-black text-primary/30 font-mono">03</div>
              <h3 className="text-base font-bold text-foreground">Active Practice & Code Review</h3>
              <p className="text-sm text-muted-foreground">
                Students solve targeted problem sets, implement production full-stack assignments, and receive feedback from expert tutors.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3 relative">
              <div className="text-3xl font-black text-primary/30 font-mono">04</div>
              <h3 className="text-base font-bold text-foreground">Verifiable Technical Readiness</h3>
              <p className="text-sm text-muted-foreground">
                Tracked milestones, verified algorithmic competency, and capstone software artifacts prepare students for competitive engineering roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INSTITUTION & STUDENT VALUE */}
      <section className="py-16 md:py-24 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* For Students */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">For Students & Learners</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bridge the gap between theoretical computer science coursework and the practical problem-solving standards expected by top engineering teams.
                </p>
                <ul className="space-y-2.5 text-sm text-foreground/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Curated, high-yield DSA sheets organized by pattern</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Multi-language code templates in Python, C++, Java, and JavaScript</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Free starter practice with zero login barriers</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-border">
                <Link
                  href="/learn/dsa"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <span>Start with Free DSA Sheets</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* For Colleges */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">For Academic Institutions</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Equip campus engineering batches with enterprise-grade learning infrastructure, industry-standard curricula, and verifiable student progress tracking.
                </p>
                <ul className="space-y-2.5 text-sm text-foreground/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Multi-institution data isolation and dedicated batch orchestration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Cross-college tutor assignments and standardized evaluations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Administrative student roster imports via CSV/Excel</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-border">
                <Link
                  href="/curriculum"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <span>Review Curriculum Specifications</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FEATURED PUBLIC DSA STARTER */}
      <section className="py-16 md:py-24 border-b border-border/60 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                <Code2 className="h-4 w-4" />
                <span>Freemium Starter Catalog</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Public Starter DSA Sheets
              </h2>
            </div>
            <Link
              href="/learn/dsa"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <span>Explore all sheets</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dsaSheets.map((sheet) => (
              <div
                key={sheet.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span className="font-mono font-medium">{sheet.questions.length} Questions</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                      Starter
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{sheet.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                    {sheet.shortDescription}
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    ~{sheet.estimatedHours} hrs study
                  </span>
                  <Link
                    href={`/learn/dsa/${sheet.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <span>Practice</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. TRUST & PLATFORM INTEGRITY */}
      <section className="py-16 md:py-24 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="rounded-2xl border border-border bg-muted/40 p-8 sm:p-12">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Academic & Technical Integrity</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                No Exaggerations. Real Engineering Standards.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                RMS Careers does not make speculative placement guarantees or publish inflated statistics. We focus exclusively on what actually matters: rigorous curriculum design, deliberate algorithmic practice, verifiable student milestones, and transparent institutional collaboration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border">
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Server-Authoritative</h4>
                <p className="text-xs text-muted-foreground">
                  Authenticated student progress is calculated and secured server-side to guarantee uncompromised metrics.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Privacy by Design</h4>
                <p className="text-xs text-muted-foreground">
                  Anonymous visitors practice DSA sheets without tracking cookies, unauthenticated database writes, or forced registration.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Institutional Boundaries</h4>
                <p className="text-xs text-muted-foreground">
                  Colleges maintain autonomous batch administration and student rosters with multi-role access control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION BANNER */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Begin Exploring the Curriculum
          </h2>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-muted-foreground">
            Try our starter DSA questions right now in your browser. No sign-up, no credit card, and zero tracking.
          </p>
          <div className="pt-2">
            <Link
              href="/learn/dsa"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-md hover:bg-primary/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Code2 className="h-5 w-5" />
              <span>Open Starter Practice Sheets</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
