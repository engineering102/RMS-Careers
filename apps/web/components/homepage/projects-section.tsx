import { Sparkles, Terminal, CheckCircle2, Cpu, Database, Globe } from 'lucide-react';
import { projectsContent } from '@/lib/data/homepage-content';

export function ProjectsSection() {
  const categoryIcons = {
    'Backend Architecture': Database,
    'Full-Stack & Systems': Globe,
    'Data & Dashboard': Cpu
  };

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/20" id="projects">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{projectsContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {projectsContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {projectsContent.description}
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projectsContent.projects.map((project, idx) => {
            const Icon = categoryIcons[project.category as keyof typeof categoryIcons] || Terminal;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all glow-card group space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-primary/10 text-primary">
                      {project.category}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>

                  {/* Problem & Outcome */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-foreground/90 block mb-0.5">Problem Solved:</span>
                      <p className="text-muted-foreground leading-relaxed">{project.problem}</p>
                    </div>
                    <div className="pt-2">
                      <span className="font-semibold text-foreground/90 block mb-0.5">Engineered Outcome:</span>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">{project.outcome}</p>
                    </div>
                  </div>
                </div>

                {/* Tech Stack Tags */}
                <div className="pt-4 border-t border-border/80">
                  <div className="flex flex-wrap gap-1.5">
                    {project.tech.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
