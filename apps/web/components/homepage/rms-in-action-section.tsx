import { rmsInActionContent } from '@/lib/data/homepage-content';
import { Camera, Sparkles } from 'lucide-react';

export function RmsInActionSection() {
  const { gallery } = rmsInActionContent;
  const featured = gallery.find((g) => g.aspect === 'featured') || gallery[0];
  const supporting = gallery.filter((g) => g.aspect === 'supporting');
  const wide = gallery.find((g) => g.aspect === 'wide') || gallery[gallery.length - 1];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-muted/10 relative" id="in-action">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{rmsInActionContent.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {rmsInActionContent.headline}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {rmsInActionContent.description}
          </p>
        </div>

        {/* Asymmetric Editorial Photo Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Featured Large Photo Frame */}
          <div className="lg:col-span-7 rounded-3xl border-2 border-dashed border-border bg-card p-6 sm:p-8 flex flex-col justify-between min-h-[340px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary uppercase">
                {featured.category}
              </span>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="my-auto py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Camera className="h-6 w-6" />
              </div>
              <div className="text-xs font-mono text-muted-foreground">Classroom Photography Slot</div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">{featured.title}</h3>
              <p className="text-xs text-muted-foreground">{featured.caption}</p>
            </div>
          </div>

          {/* 2 Supporting Smaller Photo Frames */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {supporting.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border-2 border-dashed border-border bg-card p-5 flex flex-col justify-between flex-1 min-h-[160px] shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground uppercase">
                    {item.category}
                  </span>
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="py-2">
                  <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Wide Photo Frame */}
          <div className="lg:col-span-12 rounded-3xl border-2 border-dashed border-border bg-card p-6 sm:p-8 flex flex-col justify-between min-h-[180px] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                {wide.category}
              </span>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="py-4">
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">{wide.title}</h3>
              <p className="text-xs text-muted-foreground">{wide.caption}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
