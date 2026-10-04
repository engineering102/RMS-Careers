import Link from 'next/link';
import { Sparkles, Building2, CheckCircle2, ArrowRight, ShieldCheck, Users, BarChart3, LineChart } from 'lucide-react';
import { institutionBenefitsContent } from '@/lib/data/homepage-content';

export function InstitutionBenefitsSection() {
  const benefitIcons = [ShieldCheck, Users, BarChart3, LineChart];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-muted/20" id="institutions">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT: Context, Audience & CTA */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{institutionBenefitsContent.eyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {institutionBenefitsContent.headline}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {institutionBenefitsContent.description}
              </p>
            </div>

            {/* Target Stakeholders */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Engineered For Campus Leadership:
              </span>
              <div className="flex flex-wrap gap-2">
                {institutionBenefitsContent.targetRoles.map((role, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium px-3 py-1 rounded-lg bg-card border border-border text-foreground/90 shadow-sm"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Institutional Partnership CTA */}
            <div className="pt-4">
              <Link
                href={institutionBenefitsContent.cta.href}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Building2 className="h-5 w-5" />
                <span>{institutionBenefitsContent.cta.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* RIGHT: Institutional Benefit Cards Grid */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {institutionBenefitsContent.benefits.map((benefit, idx) => {
              const Icon = benefitIcons[idx % benefitIcons.length];
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 transition-all glow-card space-y-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {benefit.desc}
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
