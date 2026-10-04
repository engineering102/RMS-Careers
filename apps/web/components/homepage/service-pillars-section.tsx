import {
  Code2,
  GitBranch,
  FileText,
  Briefcase,
  BookOpen,
  Users2,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { servicePillarsContent } from '@/lib/data/homepage-content';

export function ServicePillarsSection() {
  const [p1, p2, p3, p4, p5, p6] = servicePillarsContent.pillars;

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/40" id="offerings">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{servicePillarsContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {servicePillarsContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {servicePillarsContent.description}
          </p>
        </div>

        {/* Asymmetric Multi-Tier Grid */}
        <div className="space-y-6">
          {/* Row 1: Asymmetric 7-col + 5-col split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 01 Technical Skills (7 col) */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:border-primary/40 transition-all group glow-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {p1.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {p1.id}
                  </span>
                </div>

                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Code2 className="h-6 w-6" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {p1.title}
                </h3>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {p1.description}
                </p>

                {/* Topics / Technologies */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {p1.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono px-2.5 py-1 rounded-md bg-muted text-foreground/80 border border-border"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/80">
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-foreground/90">
                  {p1.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 02 Projects & Portfolio (5 col) */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:border-primary/40 transition-all group glow-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {p2.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {p2.id}
                  </span>
                </div>

                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <GitBranch className="h-6 w-6" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {p2.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p2.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {p2.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/80"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/80">
                <ul className="space-y-1.5 text-xs text-foreground/90">
                  {p2.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Row 2: 4-Column Grid for Pillars 03, 04, 05, 06 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* 03 Career Preparation */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all group glow-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {p3.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {p3.id}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {p3.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p3.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-1">
                  {p3.topics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/80 text-xs text-foreground/80 space-y-1">
                {p3.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 04 Job Preparation */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all group glow-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {p4.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {p4.id}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {p4.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p4.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-1">
                  {p4.topics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/80 text-xs text-foreground/80 space-y-1">
                {p4.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 05 Curated Resources */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all group glow-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {p5.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {p5.id}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {p5.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p5.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-1">
                  {p5.topics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/80 text-xs text-foreground/80 space-y-1">
                {p5.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 06 Personalized Guidance */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all group glow-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    {p6.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {p6.id}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Users2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {p6.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p6.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-1">
                  {p6.topics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/80 text-xs text-foreground/80 space-y-1">
                {p6.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
