import Link from 'next/link';
import { Sparkles, Code2, BookOpen, Building2, ArrowRight } from 'lucide-react';
import { resourcesContent } from '@/lib/data/homepage-content';

export function ResourcesSection() {
  const icons = [Code2, BookOpen, Building2];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/40" id="resources">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{resourcesContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {resourcesContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {resourcesContent.description}
          </p>
        </div>

        {/* Resources Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resourcesContent.resources.map((item, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all glow-card group space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {item.type}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/80">
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>{item.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
