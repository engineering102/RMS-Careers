import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap,
  Users2,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Portal Login Gateway',
  description:
    'Routing gateway to dedicated RMS Careers portals for Students, Tutors, and Administrators.',
  openGraph: {
    title: 'Portal Login Gateway | RMS Careers',
    description: 'Select your role to access your dedicated RMS Careers application portal.'
  }
};

export default function LoginGatewayPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-16 md:py-24 max-w-5xl">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <ShieldCheck className="h-4 w-4" />
          <span>Independent Application Surfaces</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Platform Portals
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          RMS Careers separates authenticated workflows across dedicated application boundaries. Select your role to navigate to your application portal.
        </p>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Student Portal */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <GraduationCap className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Learners
              </span>
              <h2 className="text-xl font-bold text-foreground">Student Portal</h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Access enrolled institutional batch curriculum, track assignments, verify submissions, and review campus leaderboards.
            </p>

            <div className="pt-2 text-xs font-mono text-muted-foreground">
              student.rmscareers.com
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-border">
            <a
              href="https://student.rmscareers.com"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Continue to Student</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* 2. Tutor Portal */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Instructors
              </span>
              <h2 className="text-xl font-bold text-foreground">Tutor Portal</h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Review student code submissions across assigned college batches, publish technical articles, and mentor cohort batches.
            </p>

            <div className="pt-2 text-xs font-mono text-muted-foreground">
              tutor.rmscareers.com
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-border">
            <a
              href="https://tutor.rmscareers.com"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted font-semibold text-sm transition-colors border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Continue to Tutor</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* 3. Admin Portal */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Administration
              </span>
              <h2 className="text-xl font-bold text-foreground">Admin Portal</h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Control plane for institutional onboarding, student roster imports, program creation, batch management, and platform audit logs.
            </p>

            <div className="pt-2 text-xs font-mono text-muted-foreground">
              admin.rmscareers.com
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-border">
            <a
              href="https://admin.rmscareers.com/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Continue to Admin</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="mt-12 text-center text-xs text-muted-foreground max-w-xl mx-auto">
        <p>
          Each application surface maintains separate authentication and security domains. The public website does not issue, read, or require session cookies.
        </p>
      </div>
    </div>
  );
}
