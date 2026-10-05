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
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    barGradient: 'from-emerald-500 to-teal-400',
    icon: Sparkles
  },
  advanced: {
    label: 'Advanced',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    barGradient: 'from-sky-500 to-blue-400',
    icon: TrendingUp
  },
  proficient: {
    label: 'Proficient',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    barGradient: 'from-amber-500 to-yellow-400',
    icon: CheckCircle2
  },
  developing: {
    label: 'Developing',
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    barGradient: 'from-slate-500 to-slate-400',
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
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
      <CardContent className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* 1. Header Badges: External Provider & Performance Tier */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700/70">
              <Globe className="h-3.5 w-3.5 text-blue-400" />
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
            <h3 className="text-base font-semibold text-slate-100 leading-snug line-clamp-2">
              {record.assessmentName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 font-mono">
              <span>Code: {record.assessmentCode}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Users className="h-3 w-3 text-slate-500" />
                {record.batchName}
              </span>
            </div>
          </div>

          {/* 3. Score Highlight & Computed Percentage */}
          <div className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Score Secured
              </p>
              <p className="text-lg font-bold text-slate-100">
                {record.obtainedScore}{' '}
                <span className="text-xs font-normal text-slate-400">/ {record.maxScore}</span>
              </p>
            </div>

            <div className="text-right space-y-0.5">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Percentage
              </p>
              <p className="text-lg font-bold text-emerald-400 font-mono">
                {record.percentage}%
              </p>
            </div>
          </div>

          {/* 4. Percentile Ranking Gauge */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                Percentile Ranking
              </span>
              <span className="text-slate-200 font-semibold font-mono">
                {record.percentile !== null ? `${record.percentile}th Percentile` : 'N/A'}
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tier.barGradient} transition-all duration-500`}
                style={{
                  width: `${Math.max(4, Math.min(100, record.percentile ?? record.percentage))}%`
                }}
              />
            </div>

            <p className="text-[11px] text-slate-400 italic">
              {record.percentile !== null
                ? 'Standardized ranking across national institutional test takers.'
                : 'Percentile benchmark pending national cohort aggregation.'}
            </p>
          </div>
        </div>

        {/* 5. Footer: Institutional Verification & Import Date */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Verified Institutional Record</span>
          </span>

          <span className="inline-flex items-center gap-1 font-mono text-slate-400">
            <Calendar className="h-3 w-3 text-slate-500" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
