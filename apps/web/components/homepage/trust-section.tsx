import { ShieldCheck, Lock, Building2, CheckCircle2, Sparkles } from 'lucide-react';
import { trustContent } from '@/lib/data/homepage-content';

export function TrustSection() {
  const icons = [ShieldCheck, Lock, Building2];

  return (
    <section className="py-16 md:py-24 border-b border-border/70">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="rounded-3xl border border-border bg-gradient-to-b from-card to-muted/30 p-8 sm:p-12 lg:p-16 shadow-sm">
          {/* Main Statement & Philosophy */}
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>{trustContent.eyebrow}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              {trustContent.statement}
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {trustContent.description}
            </p>
          </div>

          {/* Architectural Principles Divider & 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-10 border-t border-border/80">
            {trustContent.principles.map((principle, idx) => {
              const Icon = icons[idx] || ShieldCheck;
              return (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {principle.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground">
                    {principle.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {principle.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
