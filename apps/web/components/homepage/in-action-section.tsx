import {
  Sparkles,
  Presentation,
  Terminal,
  Code2,
  Users2
} from 'lucide-react';
import { inActionContent } from '@/lib/data/homepage-content';

export function InActionSection() {
  const categoryIcons: Record<string, React.ElementType> = {
    Teaching: Users2,
    Workshops: Presentation,
    'Code Reviews': Terminal,
    Projects: Code2
  };

  return (
    <section className="py-16 md:py-24 border-b border-border/70 relative" id="in-action">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{inActionContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {inActionContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {inActionContent.description}
          </p>
        </div>

        {/* Visual Strip (Compact 4 Categories with Honest Replaceable Framing) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {inActionContent.categories.map((item) => {
            const Icon = categoryIcons[item.category] || Presentation;
            return (
              <div
                key={item.id}
                className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/40 transition-all glow-card group"
              >
                {/* Visual Slot Area */}
                <div className="relative aspect-[4/3] bg-muted/50 border-b border-border flex flex-col items-center justify-center p-6 text-center group-hover:bg-muted/70 transition-colors">
                  <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 z-10 group-hover:scale-105 transition-transform motion-reduce:transform-none">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-muted-foreground z-10 uppercase tracking-wide">
                    {item.category} Visual Slot
                  </span>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground/60">
                    Slot {item.id}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                      {item.category}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-0.5 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                      {item.caption}
                    </p>
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
