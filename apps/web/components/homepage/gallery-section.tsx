import { Sparkles, Camera, Users, Presentation, Terminal, Code2 } from 'lucide-react';
import { galleryContent } from '@/lib/data/homepage-content';

export function GallerySection() {
  const categoryIcons = {
    Mentorship: Users,
    Workshops: Presentation,
    Simulations: Terminal,
    Projects: Code2
  };

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/40" id="gallery">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{galleryContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {galleryContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {galleryContent.description}
          </p>
        </div>

        {/* Gallery Cards Grid (Clean Replaceable Photo Slots) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryContent.moments.map((moment, idx) => {
            const Icon = categoryIcons[moment.category as keyof typeof categoryIcons] || Camera;
            return (
              <div
                key={idx}
                className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/40 transition-all glow-card group"
              >
                {/* Replaceable Visual Frame Slot */}
                <div className="relative aspect-[4/3] bg-muted/60 border-b border-border flex flex-col items-center justify-center p-6 text-center group-hover:bg-muted/80 transition-colors">
                  <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 z-10 group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-muted-foreground z-10 uppercase tracking-wide">
                    {moment.category} Frame
                  </span>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground/60">
                    Slot 0{idx + 1}
                  </div>
                </div>

                {/* Content Box */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                      {moment.subtitle}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-0.5 group-hover:text-primary transition-colors">
                      {moment.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                      {moment.desc}
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
