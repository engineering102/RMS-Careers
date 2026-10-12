import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Award,
  Calendar,
  CheckCircle2,
  Globe,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import type { ExternalAssessmentRecord, PerformanceTier } from '@/lib/types/external-assessments';

interface ExternalAssessmentCardProps {
  record: ExternalAssessmentRecord;
}

const TIER_CONFIG: Record<
  PerformanceTier,
  { label: string; badgeClass: string; barGradient: string; icon: React.ComponentType<{ className?: string }> }
> = {
  elite: {
    label: 'Elite Performer',
    badgeClass: 'bg-success/10 text-success border-success/20',
    barGradient: 'from-success to-success/60',
    icon: Sparkles
  },
  advanced: {
    label: 'Advanced',
    badgeClass: 'bg-info/10 text-info border-info/20',
    barGradient: 'from-info to-info/60',
    icon: TrendingUp
  },
  proficient: {
    label: 'Proficient',
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
    barGradient: 'from-warning to-warning/60',
    icon: CheckCircle2
  },
  developing: {
    label: 'Developing',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    barGradient: 'from-muted-foreground to-muted-foreground/60',
    icon: Target
  }
};

/**
 * Standardized external assessment report card component presenting
 * imported benchmark scores, percentile gauge, provider attribution, and performance tier.
 */
export function ExternalAssessmentCard({ record }: ExternalAssessmentCardProps) {
  const tier = TIER_CONFIG[record.performanceTier] || TIER_CONFIG.developing;
  const TierIcon = tier.icon;

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(record.importedAt));

  return (
    <Card className="border-border bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-input/80 transition-all duration-200">
      <CardContent className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* 1. Header Badges: External Provider & Performance Tier */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/90 text-foreground/80 border border-input/70">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>Conducted on {record.provider}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tier.badgeClass}`}
            >
              <TierIcon className="h-3.5 w-3.5" />
              <span>{tier.label}</span>
            </span>
          </div>

          {/* 2. Assessment Title & Identification */}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
              {record.assessmentName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground font-mono">
              <span>Code: {record.assessmentCode}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-foreground/80">
                <Users className="h-3 w-3 text-muted-foreground" />
                {record.batchName}
              </span>
            </div>
          </div>

          {/* 3. Score Highlight & Computed Percentage */}
          <div className="p-3.5 rounded-lg bg-background/50 border border-border/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Score Secured
              </p>
              <p className="text-lg font-bold text-foreground">
                {record.obtainedScore}{' '}
                <span className="text-xs font-normal text-muted-foreground">/ {record.maxScore}</span>
              </p>
            </div>

            <div className="text-right space-y-0.5">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Percentage
              </p>
              <p className="text-lg font-bold text-success font-mono">
                {record.percentage}%
              </p>
            </div>
          </div>

          {/* 4. Percentile Ranking Gauge */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-warning" />
                Percentile Ranking
              </span>
              <span className="text-foreground font-semibold font-mono">
                {record.percentile !== null ? `${record.percentile}th Percentile` : 'N/A'}
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tier.barGradient} transition-all duration-500`}
                style={{
                  width: `${Math.max(4, Math.min(100, record.percentile ?? record.percentage))}%`
                }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              {record.percentile !== null
                ? 'Standardized ranking across national institutional test takers.'
                : 'Percentile benchmark pending national cohort aggregation.'}
            </p>
          </div>
        </div>

        {/* 5. Footer: Institutional Verification & Import Date */}
        <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>Verified Institutional Record</span>
          </span>

          <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
