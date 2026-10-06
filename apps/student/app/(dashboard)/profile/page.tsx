import React from 'react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentProfileData } from '@/lib/db/queries/profile';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { AcademicCard } from '@/components/profile/academic-card';
import { CareerForm } from '@/components/profile/career-form';
import { AnalyticsSection } from '@/components/profile/analytics-section';
import { User, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Profile & Analytics — RMS Student Portal',
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
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-400">
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
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl sm:text-2xl font-bold text-white shadow-lg ring-4 ring-slate-800/80">
              {initials}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {profileData.academic.fullName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Enrolled</span>
                </span>
              </div>

              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                {profileData.academic.collegeName}
                {profileData.academic.branch ? ` · ${profileData.academic.branch}` : ''}
                {profileData.academic.year ? ` · Year ${profileData.academic.year}` : ''}
              </p>

              <p className="mt-1 font-mono text-xs text-slate-500 break-words">
                Roll No: {profileData.academic.collegeRollNumber || 'N/A'} · {profileData.academic.email}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-right self-stretch sm:self-auto">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Cumulative Standing
            </span>
            <span className="text-xl font-bold text-amber-400">
              {profileData.stats.totalXp.toLocaleString()} XP
            </span>
            <span className="text-xs text-slate-500 block">
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
    </div>
  );
}
