import Link from 'next/link';
import { Sparkles, Flame, Award, Trophy, TrendingUp, Info, ArrowRight } from 'lucide-react';
import { rewardsTeaserContent } from '@/lib/data/homepage-content';

export function RewardsPreviewSection() {
  const icons = [TrendingUp, Flame, Award, Trophy];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/40 relative" id="rewards">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{rewardsTeaserContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {rewardsTeaserContent.headline}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-primary tracking-wide">
            {rewardsTeaserContent.subhead}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {rewardsTeaserContent.description}
          </p>
        </div>

        {/* Feature Cards Grid (Compact 4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {rewardsTeaserContent.features.map((feature, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all glow-card"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>

                <div className="pt-4 mt-5 border-t border-border/80">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(idx + 1) * 25}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer & Teaser Link */}
        <div className="mt-8 rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="leading-relaxed">
              {rewardsTeaserContent.disclaimer}
            </p>
          </div>
          <Link
            href={rewardsTeaserContent.link.href}
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80 shrink-0 transition-colors"
          >
            <span>{rewardsTeaserContent.link.label}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
