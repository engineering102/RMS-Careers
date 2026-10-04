import * as React from 'react';
import { getProgramByCode, getProgramEnrollmentCount } from '@/lib/db';
import { EnrollmentForm } from './enrollment-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: {
  params: Promise<{ programCode: string }>;
}) {
  const { programCode } = await props.params;
  const program = await getProgramByCode(programCode);
  if (!program) {
    return { title: 'Program Not Found | Academy Enrollment' };
  }
  return {
    title: `Register for ${program.name} | Academy Enrollment`,
    description: program.description || `Student enrollment for ${program.name}`
  };
}

export default async function PublicEnrollmentPage(props: {
  params: Promise<{ programCode: string }>;
}) {
  const { programCode } = await props.params;
  const program = await getProgramByCode(programCode);

  // 1. Program Not Found
  if (!program) {
    return (
      <Card className="border-destructive/30 shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Program Not Found</CardTitle>
          <CardDescription>
            The program code <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">{programCode}</code> does not exist or may have been removed.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // 2. Program Archived
  if (program.status === 'archived') {
    return (
      <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Registration Closed</CardTitle>
          <CardDescription className="text-sm">
            Registration for <strong className="font-semibold text-foreground">{program.name}</strong> is no longer available.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // 3. Program Draft / Inactive
  if (program.status !== 'active') {
    return (
      <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Registration Unavailable</CardTitle>
          <CardDescription className="text-sm">
            Registration for <strong className="font-semibold text-foreground">{program.name}</strong> is not currently open.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // 4. Capacity Check
  const enrolledCount = await getProgramEnrollmentCount(program.id);
  const isFull = program.capacity > 0 && enrolledCount >= program.capacity;

  if (isFull) {
    return (
      <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <Users className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Registration Full</CardTitle>
          <CardDescription className="text-sm">
            Registration for <strong className="font-semibold text-foreground">{program.name}</strong> is currently full.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-xs text-muted-foreground">
          Capacity limit of {program.capacity} students reached. Please check back later or contact academy administration.
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const startDateStr = formatDate(program.startDate);
  const endDateStr = formatDate(program.endDate);

  return (
    <div className="space-y-6">
      {/* Program Info Card */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Open for Registration
            </Badge>
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Code: {program.code}
            </span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {program.name}
          </CardTitle>
          {program.description && (
            <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {program.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 border-t pt-3 mt-1">
            {(startDateStr || endDateStr) && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {startDateStr && endDateStr
                    ? `${startDateStr} – ${endDateStr}`
                    : startDateStr
                    ? `Starts ${startDateStr}`
                    : `Ends ${endDateStr}`}
                </span>
              </div>
            )}
            {program.capacity > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Capacity: <strong>{enrolledCount}</strong> / <strong>{program.capacity}</strong> seats registered
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registration Form Component */}
      <EnrollmentForm
        programCode={program.code}
        programName={program.name}
      />
    </div>
  );
}
