import { Code2, Terminal, Building2, CheckCircle2, Sparkles, Layers, Cpu } from 'lucide-react';
import { capabilitiesContent } from '@/lib/data/homepage-content';

export function CapabilitiesSection() {
  const [dsaCap, stackCap, cohortCap] = capabilitiesContent.items;

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{capabilitiesContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {capabilitiesContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {capabilitiesContent.description}
          </p>
        </div>

        {/* Visual Composition: Varied Editorial Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Card 1: Pattern-First DSA (Prominent 7-col card on desktop) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:border-primary/40 transition-all group glow-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {dsaCap.tag}
                </span>
                <span className="text-xs font-mono text-muted-foreground font-semibold">
                  {dsaCap.id}
                </span>
              </div>

              <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Code2 className="h-6 w-6" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                {dsaCap.title}
              </h3>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {dsaCap.description}
              </p>
            </div>

            {/* Pattern Tags / Highlights */}
            <div className="mt-6 pt-6 border-t border-border/80">
              <div className="flex flex-wrap gap-2 mb-4">
                {['Two Pointers', 'Sliding Window', 'Topological Sort', 'Dynamic Programming'].map(
                  (pattern, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border"
                    >
                      {pattern}
                    </span>
                  )
                )}
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/90">
                {dsaCap.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 2: Production Full-Stack Engineering (5-col card on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:border-primary/40 transition-all group glow-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {stackCap.tag}
                </span>
                <span className="text-xs font-mono text-muted-foreground font-semibold">
                  {stackCap.id}
                </span>
              </div>

              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Terminal className="h-6 w-6" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                {stackCap.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {stackCap.description}
              </p>
            </div>

            {/* Production Stack Badges */}
            <div className="mt-6 pt-6 border-t border-border/80">
              <div className="flex flex-wrap gap-2 mb-4">
                {['Next.js 15', 'TypeScript', 'Drizzle ORM', 'PostgreSQL'].map((tech, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-mono px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <ul className="space-y-2 text-xs text-foreground/90">
                {stackCap.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 3: Institutional Cohort Model (Full-width spanning card) */}
          <div className="lg:col-span-12 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:border-primary/40 transition-all group glow-card">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {cohortCap.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {cohortCap.id}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {cohortCap.title}
                  </h3>
                </div>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {cohortCap.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {cohortCap.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-foreground/90">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architectural isolation callout on the right */}
              <div className="lg:col-span-5 rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Cohort Architecture</span>
                  <span className="text-[11px] font-mono text-primary font-medium">Tenant Isolation</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="p-2 rounded bg-background border border-border flex items-center justify-between">
                    <span>Batch Rosters</span>
                    <span className="font-mono text-[11px] text-emerald-500">Autonomous</span>
                  </div>
                  <div className="p-2 rounded bg-background border border-border flex items-center justify-between">
                    <span>Tutor Evaluation Pipeline</span>
                    <span className="font-mono text-[11px] text-blue-500">Rubric Standardized</span>
                  </div>
                  <div className="p-2 rounded bg-background border border-border flex items-center justify-between">
                    <span>Progress Analytics</span>
                    <span className="font-mono text-[11px] text-purple-500">Institutional Level</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
