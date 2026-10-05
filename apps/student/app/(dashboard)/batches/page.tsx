import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, ArrowRight, Layers } from 'lucide-react';

export const metadata = {
  title: 'Batch Workspaces — RMS Student Portal',
  description: 'Chronological milestone curriculum and timelines for your enrolled cohorts.'
};

export default async function BatchesPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  // If student has exactly one active batch, redirect directly to their workspace
  if (context.activeBatches.length === 1) {
    redirect(`/batches/${context.activeBatches[0].batchId}`);
  }

  // If no active batches are assigned yet
  if (context.activeBatches.length === 0) {
    return <EmptyEnrollmentView context={context} />;
  }

  // If student is enrolled in multiple active batches, render the cohort workspace selector
  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-blue-400 uppercase">
          <Layers className="h-4 w-4" />
          <span>Active Cohorts</span>
        </div>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
          Batch Workspaces
        </h1>
        <p className="mt-1.5 text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Select an enrolled cohort workspace to view its chronological milestone curriculum, weekly
          deadlines, and structured learning journey.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {context.activeBatches.map((batch) => (
          <Card
            key={batch.batchId}
            className="flex flex-col justify-between border-slate-800 bg-slate-900/60 hover:border-slate-700 transition"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold uppercase tracking-wider text-[10px]"
                >
                  {batch.programCode}
                </Badge>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active Cohort
                </span>
              </div>

              <div>
                <CardTitle className="text-base text-slate-100">{batch.batchName}</CardTitle>
                <p className="text-xs text-slate-400 mt-1">{batch.programName}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2 border-t border-slate-800/80">
              {batch.startDate && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    Started {new Date(batch.startDate).toLocaleDateString()}
                    {batch.endDate ? ` – ${new Date(batch.endDate).toLocaleDateString()}` : ''}
                  </span>
                </div>
              )}

              <Button asChild className="w-full gap-2 text-xs font-semibold h-9" size="sm">
                <Link href={`/batches/${batch.batchId}`}>
                  <span>Open Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
