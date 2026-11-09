import React from 'react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentProfileData } from '@/lib/db/queries/profile';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { AcademicCard } from '@/components/profile/academic-card';
import { CareerForm } from '@/components/profile/career-form';
import { AnalyticsSection } from '@/components/profile/analytics-section';
import { AppearanceSettings } from '@/components/theme/appearance-settings';
import { Avatar } from '@/components/ui/avatar';
import { User, ShieldCheck } from 'lucide-react';
import { formatNumber } from '@/lib/format/datetime';

export const metadata = {
  title: 'Profile — RMS Student Portal',
  description: 'Academic credentials, editable career preferences, and 30-day learning analytics.'
};

export default async function ProfilePage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const student = context.student;
  const profileData = await getStudentProfileData(student.id);

  if (!profileData) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground">
        <p>Unable to load student profile record.</p>
      </div>
    );
  }

  const initials = student.fullName
    ? student.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Profile Hero Banner */}
      <div className="border-b border-border pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar name={profileData.academic.fullName} size="lg" />

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                  {profileData.academic.fullName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  <span>Enrolled</span>
                </span>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                {profileData.academic.collegeName}
                {profileData.academic.branch ? ` · ${profileData.academic.branch}` : ''}
                {profileData.academic.year ? ` · Year ${profileData.academic.year}` : ''}
              </p>

              <p className="mt-1 font-mono text-xs text-muted-foreground break-words">
                Roll no. {profileData.academic.collegeRollNumber || '—'} · {profileData.academic.email}
              </p>
            </div>
          </div>

          <div className="self-stretch sm:self-auto sm:text-right">
            <span className="block text-sm text-muted-foreground">Total XP</span>
            <span className="tabular block font-display text-2xl font-semibold tracking-tight text-foreground">
              {formatNumber(profileData.stats.totalXp)}
            </span>
            <span className="text-xs text-muted-foreground block">
              Level {profileData.stats.currentLevel} · {profileData.stats.currentStreak}-day streak
            </span>
          </div>
        </div>
      </div>

      {/* 2. Academic Credentials (Read-Only) & Career Profile (Editable) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AcademicCard academic={profileData.academic} />
        <CareerForm career={profileData.career} />
      </div>

      {/* 3. Learning Analytics Visualizations */}
      <AnalyticsSection
        stats={profileData.stats}
        topicProgress={profileData.topicProgress}
        heatmap={profileData.heatmap}
        xpBreakdown={profileData.xpBreakdown}
      />

      {/* 4. Appearance (theme and colour mode, stored per device) */}
      <AppearanceSettings className="rounded-lg border border-border bg-card p-6" />
    </div>
  );
}
