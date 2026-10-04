import type { Metadata } from 'next';
import Link from 'next/link';
import { Layers, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { getPublicPrograms } from '@/lib/db/queries/programs';
import { ProgramCard } from '@/components/program-card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Public Programs & Training Cohorts',
  description:
    'Discover available engineering cohorts and career training programs offered directly on the RMS Careers platform.',
  openGraph: {
    title: 'Public Programs | RMS Careers',
    description: 'Discover available engineering cohorts and career training programs.'
  }
};

export default async function ProgramsPage() {
  const programs = await getPublicPrograms();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Layers className="h-4 w-4" />
          <span>Platform Cohorts</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Public Training Programs
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Structured engineering programs designed to build end-to-end technical mastery. Explore our open platform offerings or review institutional track specifications.
        </p>
      </div>

      {/* Program Grid */}
      {programs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No Public Programs Active Today</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Public platform cohorts are scheduled in seasonal windows. In the meantime, all starter Data Structures & Algorithms sheets are open for free practice.
          </p>
          <div className="pt-2">
            <Link
              href="/learn/dsa"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span>Practice Starter DSA</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Institutional Inquiry Card */}
      <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-lg font-bold text-foreground">Looking for College Batch Programs?</h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Partner colleges deploy private institutional batches with dedicated tutor allocations, batch-restricted assignments, and verified roster tracking.
          </p>
        </div>
        <Link
          href="/curriculum"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors shrink-0"
        >
          <span>View Curriculum Framework</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
