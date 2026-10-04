import { deliveryModelContent } from '@/lib/data/homepage-content';
import {
  Calendar,
  Laptop,
  CheckCircle2,
  Video,
  FileCode2,
  Briefcase,
  Users2,
  GraduationCap
} from 'lucide-react';

export function DeliveryModelSection() {
  const pillarIcons = [Video, FileCode2, Briefcase, Users2, GraduationCap];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 relative" id="delivery-model">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5" />
            <span>{deliveryModelContent.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {deliveryModelContent.headline}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {deliveryModelContent.description}
          </p>
        </div>

        {/* 5 Interconnected Delivery Pillars Flow */}
        <div className="mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Structured Program Components
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {deliveryModelContent.pillars.map((pillar, idx) => {
              const Icon = pillarIcons[idx % pillarIcons.length];
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-base text-foreground">
                      {pillar.title}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pillar.detail}
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] font-mono text-muted-foreground border-t border-border/60">
                    Pillar 0{idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Modes Strip (Emphasizing Online as Primary) */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Institutional Delivery Formats
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {deliveryModelContent.deliveryModes.map((mode, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 border transition-all ${
                  mode.isPrimary
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-md'
                    : 'border-border bg-card/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-foreground">
                    {mode.mode}
                  </h3>
                  <span
                    className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                      mode.isPrimary
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {mode.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {mode.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
