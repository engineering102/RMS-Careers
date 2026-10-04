import { studentExperienceContent } from '@/lib/data/homepage-content';
import {
  Sparkles,
  BookOpen,
  Code,
  FolderGit2,
  UserCheck,
  Compass,
  Trophy,
  Flame,
  Award
} from 'lucide-react';

export function StudentExperienceSection() {
  const stepIcons = [BookOpen, Code, FolderGit2, UserCheck, Compass];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/30 relative" id="student-experience">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{studentExperienceContent.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {studentExperienceContent.headline}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {studentExperienceContent.description}
          </p>
        </div>

        {/* 5-Step Sequential Journey Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {studentExperienceContent.steps.map((item, idx) => {
            const Icon = stepIcons[idx % stepIcons.length];
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {item.step}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Supporting Product UI & Progress Glimpse (XP, streaks, milestones) */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Progress Explanation */}
            <div className="lg:col-span-6 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span>Motivation & Accountability</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {studentExperienceContent.progressFeature.headline}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {studentExperienceContent.progressFeature.description}
              </p>
              <p className="text-xs text-muted-foreground/80 italic pt-1">
                {studentExperienceContent.progressFeature.disclaimer}
              </p>
            </div>

            {/* Right: Supporting UI Widget Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-border bg-muted/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                    <span className="text-xs font-mono font-bold text-foreground">Student Portal Snapshot</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Active Cohort</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                    <Flame className="h-4 w-4 text-amber-500 mx-auto" />
                    <div className="text-base font-bold text-foreground">18 Days</div>
                    <div className="text-[10px] text-muted-foreground font-mono">Streak</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                    <Trophy className="h-4 w-4 text-primary mx-auto" />
                    <div className="text-base font-bold text-foreground">1,450 XP</div>
                    <div className="text-[10px] text-muted-foreground font-mono">Total Points</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                    <Award className="h-4 w-4 text-emerald-500 mx-auto" />
                    <div className="text-base font-bold text-foreground">Level 3</div>
                    <div className="text-[10px] text-muted-foreground font-mono">Rank 04</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
