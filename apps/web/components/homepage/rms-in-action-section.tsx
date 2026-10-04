import Image from 'next/image';
import { rmsInActionContent } from '@/lib/data/homepage-content';
import { Sparkles } from 'lucide-react';

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
          <div className="lg:col-span-7 rounded-3xl border border-border bg-card p-3 sm:p-4 shadow-sm group">
            <div className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] rounded-2xl overflow-hidden">
              <Image
                src={featured.imageSrc || '/images/homepage/classroom/classroom02.jpeg'}
                alt={featured.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-primary/90 text-primary-foreground backdrop-blur-sm uppercase shadow-sm">
                  {featured.category}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-xl bg-card/85 backdrop-blur-md border border-border/80">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">{featured.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{featured.caption}</p>
              </div>
            </div>
          </div>

          {/* 2 Supporting Smaller Photo Frames */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {supporting.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-border bg-card p-3 shadow-xs group flex-1"
              >
                <div className="relative w-full h-[180px] sm:h-[195px] rounded-2xl overflow-hidden">
                  <Image
                    src={item.imageSrc || '/images/homepage/workshops/workshop01.jpeg'}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-muted/90 text-foreground backdrop-blur-sm uppercase shadow-2xs">
                      {item.category}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2.5 rounded-lg bg-card/85 backdrop-blur-md border border-border/80">
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Wide Photo Frame */}
          <div className="lg:col-span-12 rounded-3xl border border-border bg-card p-3 sm:p-4 shadow-xs group">
            <div className="relative w-full h-[220px] sm:h-[280px] md:h-[320px] rounded-2xl overflow-hidden">
              <Image
                src={wide.imageSrc || '/images/homepage/classroom/classroom04.jpeg'}
                alt={wide.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/90 text-white backdrop-blur-sm uppercase shadow-sm">
                  {wide.category}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-xl bg-card/85 backdrop-blur-md border border-border/80 max-w-xl">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">{wide.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{wide.caption}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
